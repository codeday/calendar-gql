import 'reflect-metadata';
import server from './server';
import { updateCalendars, startUpdateCalendars } from './calendars';
import { startCheckingForNotifications } from './notifier';

(async () => {
  await updateCalendars();
  startUpdateCalendars();
  startCheckingForNotifications();
  server();
})();
