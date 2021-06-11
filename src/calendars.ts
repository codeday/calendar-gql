/* eslint-disable node/no-process-env */
import fetch from 'node-fetch';
import IcalExpander from 'ical-expander';

interface CalendarInfo {
  id: string
  name: string
  url: string
}

export interface Calendar extends CalendarInfo {
  events: IcalExpander
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
