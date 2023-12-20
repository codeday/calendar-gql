import { DateTime } from 'luxon';
import { DestinationType, Subscription } from '@prisma/client';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { getCalendars, calendarsToEvents, PartialCalendarEvent } from './calendars';
import config from './config';

const emailer = nodemailer.createTransport(config.email);
const phoneCaller = twilio(config.twilio.accountSid, config.twilio.authToken);

async function notifyPhone(subscription: Subscription, event: PartialCalendarEvent, final: boolean): Promise<void> {
  try {
    await phoneCaller.messages.create({
      from: config.twilio.phone,
      to: subscription.destination,
      body: `"${event.title}" ${final ? 'is starting' : 'starts in about an hour'}. ${event.location || ''} (You subscribed @ CodeDay.)`,
    });
  } catch (ex) {}
}

async function notifyEmail(subscription: Subscription, event: PartialCalendarEvent, final: boolean): Promise<void> {
  try {
    await emailer.sendMail({
      from: config.email.from,
      to: subscription.destination,
      subject: `Starting: ${event.title}`,
      text: `The event "${event.title}" ${final ? 'is starting' : 'starts in about an hour'}. ${event.location || ''}`
            + `\n(You subscribed to be notified when this event started.)`,
    });
  } catch (ex) {}
}

async function notifySubscribersForEvent(event: PartialCalendarEvent, final: boolean ): Promise<void> {
  const subscriptions = await config.prisma.subscription.findMany({
    where: {
      eventId: event.id,
      calendarId: event.calendarId,
      ...(final ? { sentFinal: false } : { sent: false }),
    },
  });
  console.log(`Sending ${final ? 'final' : 'initial'} "${event.title}" notifications to ${subscriptions.length} subscribers.`);
  for (const subscription of subscriptions) {
    console.log(`Notifying ${subscription.destination}`);
    // eslint-disable-next-line no-await-in-loop
    if (subscription.destinationType === DestinationType.Phone) await notifyPhone(subscription, event, final);
    // eslint-disable-next-line no-await-in-loop
    else if (subscription.destinationType === DestinationType.Email) await notifyEmail(subscription, event, final);

    // eslint-disable-next-line no-await-in-loop
    await config.prisma.subscription.update({
      where: {
        calendarId_eventId_destination_destinationType: {
          calendarId: event.calendarId,
          eventId: event.id,
          destination: subscription.destination,
          destinationType: subscription.destinationType,
        },
      },
      data: final ? { sentFinal: true } : { sent: true },
    });
  }
}

async function checkForNotifications(): Promise<void> {
  console.log(`Checking for notifications.`);
  const calendars = getCalendars();
  const soonEvents = calendarsToEvents(
    calendars,
    DateTime.now().plus({ minutes: 55 }).toJSDate(),
    DateTime.now().plus({ minutes: 70 }).toJSDate(),
  );
  const nowEvents = calendarsToEvents(
    calendars,
    DateTime.now().minus({ minutes: 5 }).toJSDate(),
    DateTime.now().plus({ minutes: 5 }).toJSDate(),
  );

  // eslint-disable-next-line no-await-in-loop
  for (const event of soonEvents) await notifySubscribersForEvent(event, false);
  // eslint-disable-next-line no-await-in-loop
  for (const event of nowEvents) await notifySubscribersForEvent(event, true);
}

export function startCheckingForNotifications(): void {
  const fn = async () => {
    await checkForNotifications();
    setTimeout(fn, 1000 * 60);
  };
  fn();
}
