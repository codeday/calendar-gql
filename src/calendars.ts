/* eslint-disable node/no-process-env */
import fetch from 'node-fetch';
import { Event, JCal, OccuranceDetails } from 'ical.js';
import IcalExpander from 'ical-expander';
import { ICalendarEvent } from './resolvers/CalendarEvent';

interface CalendarInfo {
  id: string
  name: string
  url: string
}

export interface Calendar extends CalendarInfo {
  events: IcalExpander
}

export type PartialCalendarEvent = Omit<ICalendarEvent, 'metadata' | 'subscriberCount'>;

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

export function calendarsToEvents(calendars: Calendar[], after?: Date, before?: Date): PartialCalendarEvent[] {
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

function getCalendarInfoFromEnv(): CalendarInfo[] {
  return Object.keys(process.env)
    .filter((k: string) => k.match(/^CALENDAR_[a-zA-Z0-9]+$/))
    .map((k: string) => k.substring('CALENDAR_'.length))
    .map((id: string): CalendarInfo => ({
      id,
      name: process.env[`CALENDAR_${id}_NAME`] || id,
      url: <string>process.env[`CALENDAR_${id}`],
    }));
}

async function fetchCalendarEvents(url: string): Promise<IcalExpander | undefined> {
  try {
    const resp = await fetch(url);
    return new IcalExpander({ ics: await resp.text() });
  } catch (ex) {
    return undefined;
  }
}

let calendars: Calendar[] = [];

export async function updateCalendars(): Promise<void> {
  const maybeCalendars = await Promise.all(getCalendarInfoFromEnv()
    .map(async (info) => ({
      ...info,
      events: await fetchCalendarEvents(info.url),
    })));
  calendars = <Calendar[]> maybeCalendars.filter(({ events }) => typeof events !== 'undefined');
}

export function startUpdateCalendars(): void {
  setInterval(updateCalendars, 5 * 60 * 1000);
}

export function getCalendars(): Calendar[] {
  return calendars;
}
