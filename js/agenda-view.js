import { config } from './config.js';

export const unclassified = { label: 'Non classés', color: config.defaultColor };
export const viewOptions = {
  desktop: 'dayGridMonth',
  mobile: 'listUpcoming',
  toolbar: 'dayGridMonth,timeGridWeek,timeGridDay,listUpcoming',
  upcoming: { type: 'list', duration: { days: 30 }, dateIncrement: { days: 30 }, dateAlignment: 'day', buttonText: 'À venir' },
};

export function eventCategoryId(event) {
  const { colorId } = event.extendedProps;
  return Object.hasOwn(config.categories, colorId) ? String(colorId) : 'unclassified';
}

export function applyCategoryFilters(calendar, hiddenCategories) {
  calendar.batchRendering(() => {
    for (const event of calendar.getEvents()) {
      event.setProp('display', hiddenCategories.has(eventCategoryId(event)) ? 'none' : 'block');
    }
  });
}

export function subscriptionLinks(calendarId) {
  const id = calendarId.trim();
  if (!id) return null;

  const google = new URL('https://calendar.google.com/calendar/r');
  google.searchParams.set('cid', id);
  return {
    google: google.href,
    ical: `https://calendar.google.com/calendar/ical/${encodeURIComponent(id)}/public/basic.ics`,
  };
}

const dateFormatter = new Intl.DateTimeFormat(config.locale, {
  timeZone: config.timeZone, day: 'numeric', month: 'long', year: 'numeric',
});
const timeFormatter = new Intl.DateTimeFormat(config.locale, {
  timeZone: config.timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

export function eventSchedule(event) {
  const firstDay = dateFormatter.format(event.start);
  // All-day end is exclusive. The preceding instant falls on the last occupied civil day.
  const lastDay = event.end ? dateFormatter.format(event.end.getTime() - (event.allDay ? 1 : 0)) : firstDay;
  const date = firstDay === lastDay ? firstDay : `Du ${firstDay} au ${lastDay}`;
  const time = event.allDay ? 'Journée entière' :
    [event.start, event.end].filter(Boolean).map((value) => timeFormatter.format(value)).join(' – ');
  return { date, time };
}

export function printEvents(calendar, hiddenCategories) {
  const { activeStart, activeEnd } = calendar.view;
  return calendar.getEvents().filter((event) =>
    !hiddenCategories.has(eventCategoryId(event)) &&
    event.start < activeEnd && (event.end ? event.end > activeStart : event.start >= activeStart)
  ).sort((a, b) => a.start - b.start || a.title.localeCompare(b.title, config.locale));
}
