import {
  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  Resolver, Query, Arg, registerEnumType, Int, ID,
} from 'type-graphql';
import { Event, JCal, OccuranceDetails } from 'ical.js';
import { CalendarEvent, ICalendarEvent } from './CalendarEvent';
import { Calendar, getCalendars } from '../calendars';
import { Format, formatDescription } from '../utils';

enum Order {
  ASC = 'ASC',
  DESC = 'DESC',
}
registerEnumType(Order, { name: 'Order' });

type PartialCalendarEvent = Omit<ICalendarEvent, 'metadata'>;

const MAX_INTERVAL = 1000 * 60 * 60 * 24 * 370;

function filterEvent(e: Event) {
  const allProperies = <JCal>e.component.jCal[1];
  const visibility = allProperies.filter((prop) => (<JCal>prop)[0] === 'class')[0] || null;
  return visibility && (<JCal>visibility)[3] === 'PUBLIC';
}

function getOccuranceId(o: OccuranceDetails): string {
  return `${o.item.uid.replace(/@.*/g, '')}.${o.startDate.toUnixTime()}`;
}

function icsEventToCalendarEvent(c: Calendar, e: Event): PartialCalendarEvent {
  return {
    calendarId: c.id,
    calendarName: c.name,
    id: e.uid.replace(/@.*/g, ''),
    start: e.startDate.toJSDate(),
    end: e.endDate.toJSDate(),
    title: e.summary,
    location: e.location,
    description: e.description,
  };
}

function icsOccuranceToCalendarEvent(c: Calendar, o: OccuranceDetails): PartialCalendarEvent {
  return {
    calendarId: c.id,
    calendarName: c.name,
    id: getOccuranceId(o),
    start: o.startDate.toJSDate(),
    end: o.endDate.toJSDate(),
    title: o.item.summary,
    location: o.item.location,
    description: o.item.description,
  };
}

function calendarsToEvents(calendars: Calendar[], after?: Date, before?: Date): PartialCalendarEvent[] {
  return calendars
    .map((c) => {
      const { events, occurrences } = c.events.between(after, before);
      return [
        ...events.filter(filterEvent).map((e) => icsEventToCalendarEvent(c, e)),
        ...occurrences.filter((o) => filterEvent(o.item)).map((o) => icsOccuranceToCalendarEvent(c, o)),
      ];
    })
    .reduce((accum, a) => [...accum, ...a], []);
}

@Resolver(CalendarEvent)
export class CalendarEventResolver {
  @Query(() => CalendarEvent, { nullable: true })
  async event(
    @Arg('id', () => ID) id: string,
      @Arg('format', () => Format, { defaultValue: Format.HTML }) format: Format = Format.HTML,
    @Arg('calendars', () => [String], { nullable: true }) calendarIds?: string[],
  ): Promise<CalendarEvent | undefined> {
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
      @Arg('skip', () => Int, { nullable: true, defaultValue: 0 }) skip = 0,
      @Arg('take', () => Int, { nullable: true, defaultValue: 100 }) take = 100,
    @Arg('calendars', () => [String], { nullable: true }) calendarIds?: string[],
  ): Promise<CalendarEvent[]> {
    if (before < after) throw new Error(`Before must be after after.`);
    if (take < 1 || take > 1000) throw new Error(`Must take between 1 and 1000 events (default 100).`);
    if (before.getTime() - after.getTime() > MAX_INTERVAL) throw new Error(`Timespan is too long.`);

    const calendars = calendarIds && calendarIds.length > 0
      ? getCalendars().filter((cal) => calendarIds.includes(cal.id))
      : getCalendars();

    return calendarsToEvents(calendars, after, before)
      .sort((a, b) => a.start.getTime() - b.start.getTime() * (order === Order.ASC ? 1 : -1))
      .slice(skip, skip + take)
      .map(({ description, ...rest }) => ({ ...rest, ...formatDescription(description, format) }));
  }
}
