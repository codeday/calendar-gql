import 'reflect-metadata';
import server from './server';
import { updateCalendars, startUpdateCalendars } from './calendars';

(async () => {
  await updateCalendars();
  startUpdateCalendars();
  server();
})();
