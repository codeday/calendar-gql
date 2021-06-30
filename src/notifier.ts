import { DateTime } from 'luxon';
import { DestinationType, Subscription } from '@prisma/client';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { getCalendars, calendarsToEvents, PartialCalendarEvent } from './calendars';
import config from './config';

const emailer = nodemailer.createTransport(config.email);
const phoneCaller = twilio(config.twilio.accountSid, config.twilio.authToken);

async function notifyPhone(subscription: Subscription, event: PartialCalendarEvent): Promise<void> {
  await phoneCaller.messages.create({
    from: config.twilio.phone,
    to: subscription.destination,
    body: `"${event.title}" starts soon. ${event.location || ''} (You subscribed @ CodeDay.)`,
  });
}

async function notifyEmail(subscription: Subscription, event: PartialCalendarEvent): Promise<void> {
  await emailer.sendMail({
    from: config.email.from,
    to: subscription.destination,
    subject: `Starting: ${event.title}`,
    text: `The event "${event.title}" starts soon. ${event.location || ''}`
          + `\n(You subscribed to be notified when this event started.)`,
  });
}

async function notifySubscribersForEvent(event: PartialCalendarEvent): Promise<void> {
  const subscriptions = await config.prisma.subscription.findMany({
    where: {
      eventId: event.id,
      calendarId: event.calendarId,
      sent: false,
    },
  });
  for (const subscription of subscriptions) {
    // eslint-disable-next-line no-await-in-loop
    if (subscription.destinationType === DestinationType.Phone) await notifyPhone(subscription, event);
    // eslint-disable-next-line no-await-in-loop
    else if (subscription.destinationType === DestinationType.Email) await notifyEmail(subscription, event);

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
      data: {
        sent: true,
      },
    });
  }
}

async function checkForNotifications(): Promise<void> {
  const soonEvents = calendarsToEvents(
    getCalendars(),
    DateTime.now().minus({ minutes: 15 }).toJSDate(),
    DateTime.now().plus({ minutes: 15 }).toJSDate(),
  );

  // eslint-disable-next-line no-await-in-loop
  for (const event of soonEvents) await notifySubscribersForEvent(event);
}

export function startCheckingForNotifications(): void {
  setInterval(checkForNotifications, 1000 * 60);
  checkForNotifications();
}
