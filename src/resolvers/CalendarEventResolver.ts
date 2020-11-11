import { Resolver, Query, Arg } from 'type-graphql';
import { Event, JCal } from 'ical.js';
import { CalendarEvent, ICalendarEvent } from './CalendarEvent';
import { getCalendars } from '../calendars';

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
    @Arg('take', { nullable: true, defaultValue: 100 }) take: number,
    @Arg('calendars', () => [String], { nullable: true }) calendarIds?: string[],
  ): Promise<CalendarEvent[]> {
    if (before < after) throw new Error(`Before must be after after.`);
    if (take < 1 || take > 1000) throw new Error(`Must take between 1 and 1000 events (default 100).`);

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
            description: e.description,
            location: e.location,
          })),
          ...occurrences.filter((o) => filterEvent(o.item)).map((o): ICalendarEvent => ({
            calendarId: c.id,
            calendarName: c.name,
            id: `${o.item.uid}/${o.startDate.toUnixTime()}`,
            start: o.startDate.toJSDate(),
            end: o.endDate.toJSDate(),
            title: o.item.summary,
            description: o.item.description,
            location: o.item.location,
          })),
        ];
      })
      .reduce((accum, a) => [...accum, ...a], []);
  }
}
