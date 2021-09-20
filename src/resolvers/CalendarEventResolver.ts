import {
  Resolver, Query, Arg, registerEnumType, ID, Mutation,
} from 'type-graphql';
import emailValid from 'email-validator';
import phone from 'phone';
import { DestinationType } from '@prisma/client';
import { CalendarEvent } from './CalendarEvent';
import { calendarsToEvents, getCalendars } from '../calendars';
import { Format, formatDescription } from '../utils';
import config from '../config';

enum Order {
  ASC = 'ASC',
  DESC = 'DESC',
}
registerEnumType(Order, { name: 'Order' });

const MAX_INTERVAL = 1000 * 60 * 60 * 24 * 370;

@Resolver(CalendarEvent)
export class CalendarEventResolver {
  @Query(() => CalendarEvent, { nullable: true })
  async event(
    @Arg('id', () => ID) id: string,
      @Arg('format', () => Format, { defaultValue: Format.HTML }) format: Format = Format.HTML,
    @Arg('calendars', () => [String], { nullable: true }) calendarIds?: string[],
  ): Promise<Omit<CalendarEvent, 'subscriberCount'> | undefined> {
    const calendars = calendarIds && calendarIds.length > 0
      ? getCalendars().filter((cal) => calendarIds.includes(cal.id))
      : getCalendars();

    return calendarsToEvents(calendars)
      .filter((e) => e.id === id)
      .map(({ description, ...rest }) => ({ ...rest, ...formatDescription(description, format) }))[0];
  }

  @Query(() => [CalendarEvent])
  async events(
    @Arg('before', () => Date) before: Date,
    @Arg('after', () => Date) after: Date,
      @Arg('order', () => Order, { defaultValue: Order.ASC }) order: Order = Order.ASC,
      @Arg('format', () => Format, { defaultValue: Format.HTML }) format: Format = Format.HTML,
      @Arg('skip', () => Number, { nullable: true, defaultValue: 0 }) skip = 0,
      @Arg('take', () => Number, { nullable: true, defaultValue: 100 }) take = 100,
    @Arg('calendars', () => [String], { nullable: true }) calendarIds?: string[],
    @Arg('exceptCalendars', () => [String], { nullable: true }) exceptCalendarIds?: string[],
  ): Promise<Omit<CalendarEvent, 'subscriberCount'>[]> {
    if (before < after) throw new Error(`Before must be after after.`);
    if (take < 1 || take > 1000) throw new Error(`Must take between 1 and 1000 events (default 100).`);
    if (before.getTime() - after.getTime() > MAX_INTERVAL) throw new Error(`Timespan is too long.`);

    const calendars = getCalendars()
      .filter((cal) => !calendarIds || calendarIds.includes(cal.id))
      .filter((cal) => !exceptCalendarIds || !exceptCalendarIds.includes(cal.id));

    return calendarsToEvents(calendars, after, before)
      .sort((a, b) => a.start.getTime() - b.start.getTime() * (order === Order.ASC ? 1 : -1))
      .slice(skip, skip + take)
      .map(({ description, ...rest }) => ({ ...rest, ...formatDescription(description, format) }));
  }

  @Mutation(() => Boolean)
  async subscribe(
    @Arg('calendarId', () => String) calendarId: string,
    @Arg('eventId', () => String) eventId: string,
    @Arg('destination', () => String) destination: string,
  ): Promise<boolean> {
    let type: DestinationType | undefined;
    const phoneDestination = phone(destination, '', true)[0] || null;
    if (emailValid.validate(destination)) type = DestinationType.Email;
    else if (phoneDestination) type = DestinationType.Phone;

    if (!type) throw Error('Not a valid email or phone number.');

    await config.prisma.subscription.create({
      data: {
        calendarId,
        eventId,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        destination: type === DestinationType.Phone ? phoneDestination! : destination,
        destinationType: type,
        sent: false,
      },
    });

    return true;
  }
}
