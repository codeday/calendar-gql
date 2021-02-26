import { Resolver, Query, Arg, registerEnumType } from 'type-graphql';
import { Event, JCal } from 'ical.js';
import { CalendarEvent, ICalendarEvent } from './CalendarEvent';
import { getCalendars } from '../calendars';
import { htmlToText } from '../utils';

enum Order {
  ASC = 'ASC',
  DESC = 'DESC',
}
enum Format {
  HTML = "HTML",
  MARKDOWN = "MARKDOWN",
}
registerEnumType(Order, { name: 'Order' });
registerEnumType(Format, { name: "Format" });

const MAX_INTERVAL = 1000 * 60 * 60 * 24 * 370;

function filterEvent(e: Event) {
  const allProperies = <JCal>e.component.jCal[1];
  const visibility = allProperies.filter((prop) => (<JCal>prop)[0] === 'class')[0] || null;
  return visibility && (<JCal>visibility)[3] === 'PUBLIC';
}

@Resolver(CalendarEvent)
export class CalendarEventResolver {
  @Query(() => [CalendarEvent])
  async events(
    @Arg('before', () => Date) before: Date,
    @Arg('after', () => Date) after: Date,
    @Arg('order', () => Order, { defaultValue: Order.ASC }) order: Order = Order.ASC,
    @Arg("format", () => Format, { defaultValue: Format.HTML }) format: Format = Format.HTML,
    @Arg('skip', { nullable: true, defaultValue: 0 }) skip: number = 0,
    @Arg('take', { nullable: true, defaultValue: 100 }) take: number = 100,
    @Arg('calendars', () => [String], { nullable: true }) calendarIds?: string[],
  ): Promise<CalendarEvent[]> {
    if (before < after) throw new Error(`Before must be after after.`);
    if (take < 1 || take > 1000) throw new Error(`Must take between 1 and 1000 events (default 100).`);
    if (before.getTime() - after.getTime() > MAX_INTERVAL) throw new Error(`Timespan is too long.`);

    const calendars = calendarIds && calendarIds.length > 0
      ? getCalendars().filter((cal) => calendarIds.includes(cal.id))
      : getCalendars();

    return calendars
      .map((c) => {
        const { events, occurrences } = c.events.between(after, before);
        return [
          ...events.filter(filterEvent).map((e): ICalendarEvent => ({
            calendarId: c.id,
            calendarName: c.name,
            id: e.uid,
            start: e.startDate.toJSDate(),
            end: e.endDate.toJSDate(),
            title: e.summary,
            description: (format === Format.MARKDOWN) ? htmlToText(e.description) : e.description,
            location: e.location,
          })),
          ...occurrences.filter((o) => filterEvent(o.item)).map((o): ICalendarEvent => ({
            calendarId: c.id,
            calendarName: c.name,
            id: `${o.item.uid}/${o.startDate.toUnixTime()}`,
            start: o.startDate.toJSDate(),
            end: o.endDate.toJSDate(),
            title: o.item.summary,
            description: (format === Format.MARKDOWN) ? htmlToText(o.item.description) : o.item.description,
            location: o.item.location,
          })),
        ];
      })
      .reduce((accum, a) => [...accum, ...a], [])
      .sort((a, b) => a.start.getTime() - b.start.getTime() * (order === Order.ASC ? 1 : -1))
      .slice(skip, skip + take);
  }
}
