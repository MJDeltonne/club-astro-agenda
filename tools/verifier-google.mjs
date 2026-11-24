import { config } from '../js/config.js';
import { categories } from '../js/event-categories.js';
import { fetchCalendarEvents } from '../js/calendar-api.js';

const calendarId = config.calendarId.trim();
const apiKey = config.apiKey.trim();
if (!calendarId || !apiKey) {
  console.error('Renseignez calendarId et apiKey dans js/config.js.');
  process.exit(1);
}

const origin = new URL(process.argv[2] ?? 'http://127.0.0.1:8000').origin;
const googleFetch = (url, options) => fetch(url, {
  ...options,
  headers: { Referer: origin + '/' },
  redirect: 'error',
  signal: options?.signal ?? AbortSignal.timeout(15000),
});
const now = Date.now();
const day = 86400000;
const range = {
  startStr: new Date(now - 31 * day).toISOString(),
  endStr: new Date(now + 31 * day).toISOString(),
};

async function checkColors() {
  const url = new URL('https://www.googleapis.com/calendar/v3/colors');
  url.search = new URLSearchParams({ key: apiKey, fields: 'event' });
  const response = await googleFetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const { event } = await response.json();
  if (!event || typeof event !== 'object') throw new Error('Palette absente de la réponse.');
  return Object.entries(categories).map(([id, category]) => {
    const actual = event[id]?.background;
    const validColor = typeof actual === 'string' && /^#[0-9a-f]{6}$/i.test(actual);
    return {
      colorId: id,
      catégorie: category.label,
      configuré: category.color,
      Google: validColor ? actual : 'Absent ou invalide',
      conforme: validColor && actual.toLowerCase() === category.color.toLowerCase(),
    };
  });
}

console.log('Origine testée :', origin);
console.log('Période UTC :', range.startStr, '→', range.endStr);
const [events, colors] = await Promise.allSettled([
  fetchCalendarEvents(range, { calendarId, apiKey, fetchImpl: googleFetch }),
  checkColors(),
]);

if (events.status === 'fulfilled') {
  console.log('Événements reçus :', events.value.length);
  console.log('Avec un colorId reconnu :', events.value.filter(({ extendedProps }) => Object.hasOwn(categories, extendedProps.colorId)).length);
} else {
  console.error('Events.list :', events.reason.message);
}

if (colors.status === 'fulfilled') {
  console.table(colors.value);
} else {
  console.error('Colors.get :', colors.reason.message);
}

if (events.status === 'rejected' || colors.status === 'rejected' || colors.value.some((color) => !color.conforme)) {
  process.exitCode = 1;
}
