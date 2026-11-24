import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../js/config.js';
import { fetchCalendarEvents, toCalendarEvent } from '../js/calendar-api.js';
import { fillEventDetails } from '../js/agenda.js';

const range = {
  startStr: '2026-03-01T00:00:00+01:00',
  endStr: '2026-04-01T00:00:00+02:00',
};
const settings = { calendarId: 'test@example.invalid', apiKey: 'clé-de-test' };
const timedEvent = {
  id: 'event-1',
  summary: 'Observation',
  start: { dateTime: '2026-03-28T22:30:00+01:00' },
  end: { dateTime: '2026-03-29T03:30:00+02:00' },
  location: 'Douai',
  description: 'Rendez-vous sur place.',
  colorId: '1',
};

test('conserve les horaires et leurs offsets sur un événement de plusieurs jours', () => {
  const event = toCalendarEvent(timedEvent);
  assert.equal(event.start, timedEvent.start.dateTime);
  assert.equal(event.end, timedEvent.end.dateTime);
  assert.equal(event.allDay, false);
  assert.equal(event.extendedProps.location, timedEvent.location);
  assert.equal(event.extendedProps.description, timedEvent.description);
  assert.equal(event.extendedProps.category, 'Sorties d’observation');
  assert.equal(event.extendedProps.colorId, '1');
});

test('conserve les dates civiles et la fin exclusive des événements en journée entière', () => {
  const start = { date: '2026-03-28' };
  for (const date of ['2026-03-29', '2026-03-31']) {
    const event = toCalendarEvent({ start, end: { date } });
    assert.equal(event.allDay, true);
    assert.equal(event.start, start.date);
    assert.equal(event.end, date);
  }
});

test('applique toutes les couleurs configurées et la couleur par défaut', () => {
  const expected = { 1: '#a4bdfc', 2: '#7ae7bf', 4: '#ff887c', 5: '#fbd75b', 7: '#46d6db', 8: '#e1e1e1' };
  for (const [colorId, color] of Object.entries(expected)) {
    assert.equal(toCalendarEvent({ ...timedEvent, colorId }).color, color);
    assert.ok(config.categories[colorId].label);
  }
  for (const colorId of [undefined, '11', 'constructor', '__proto__']) {
    assert.equal(toCalendarEvent({ ...timedEvent, colorId }).color, '#EF108B');
  }
});

test('demande les occurrences et les exceptions, suit les pages vides et filtre les annulations', async () => {
  const urls = [];
  const moved = {
    ...timedEvent,
    id: 'series_20260315T203000Z',
    start: { dateTime: '2026-03-16T21:30:00+01:00' },
  };
  const pages = [
    { items: [moved], nextPageToken: 'page+2' },
    { nextPageToken: 'page/3' },
    { items: [{ id: 'series_20260322T203000Z', status: 'cancelled' }, timedEvent] },
  ];
  const events = await fetchCalendarEvents(range, {
    ...settings,
    fetchImpl: async (url) => {
      urls.push(new URL(url));
      return { ok: true, json: async () => pages.shift() };
    },
  });
  assert.deepEqual(events.map((event) => event.id), [moved.id, timedEvent.id]);
  assert.equal(events[0].start, moved.start.dateTime);
  assert.deepEqual(urls.map((url) => url.searchParams.get('pageToken')), [null, 'page+2', 'page/3']);
  for (const url of urls) {
    assert.equal(url.pathname, '/calendar/v3/calendars/test%40example.invalid/events');
    for (const [name, value] of Object.entries({
      timeMin: range.startStr, timeMax: range.endStr, timeZone: 'Europe/Paris',
      singleEvents: 'true', showDeleted: 'false',
    })) {
      assert.equal(url.searchParams.get(name), value);
    }
    assert.match(url.searchParams.get('fields'), /colorId/);
  }
});

test('distingue les erreurs réseau, HTTP, JSON et le format de réponse', async () => {
  const cases = [
    [async () => { throw new TypeError('Failed to fetch'); }, /Connexion/],
    [async () => ({ ok: false, status: 403 }), /HTTP 403/],
    [async () => ({ ok: true, json: async () => { throw new SyntaxError(); } }), /illisible/],
    [async () => Response.json({ items: 'invalid' }), /format/],
  ];
  for (const [fetchImpl, message] of cases) {
    await assert.rejects(fetchCalendarEvents(range, { ...settings, fetchImpl }), message);
  }
});

test('refuse un jeton de pagination répété', async () => {
  await assert.rejects(fetchCalendarEvents(range, {
    ...settings,
    fetchImpl: async () => Response.json({ nextPageToken: 'same' }),
  }), /page en double/);
});

test('rend le titre, le lieu et la description comme texte inerte', () => {
  const payload = '<img src=x onerror="alert(1)"><script>alert(2)</script>';
  const elements = Object.fromEntries(['title', 'category', 'location', 'description'].map((name) => [
    name,
    { textContent: '', set innerHTML(_) { assert.fail('Écriture HTML interdite'); } },
  ]));
  fillEventDetails(elements, toCalendarEvent({
    ...timedEvent, summary: payload, description: payload, location: payload,
  }));
  for (const name of ['title', 'location', 'description']) {
    assert.equal(elements[name].textContent, payload);
  }
});