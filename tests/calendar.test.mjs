import test from 'node:test';
import assert from 'node:assert/strict';
import { categories } from '../js/event-categories.js';
import { fetchCalendarEvents, toCalendarEvent } from '../js/calendar-api.js';
import { fillEventDetails, initialize } from '../js/agenda.js';
import { eventCategoryId, eventSchedule, printEvents, subscriptionLinks } from '../js/agenda-view.js';

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
  const expected = { 1: '#a4bdfc', 2: '#7ae7bf', 4: '#ff887c', 5: '#fbd75b', 7: '#46d6db', 8: '#e1e1e1', 3: '#DBADFF' };
  for (const [colorId, color] of Object.entries(expected)) {
    assert.equal(toCalendarEvent({ ...timedEvent, colorId }).color, color);
    assert.ok(categories[colorId].label);
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
  const elements = Object.fromEntries(['title', 'category', 'date', 'time', 'location', 'description'].map((name) => [
    name,
    { textContent: '', set innerHTML(_) { assert.fail('Écriture HTML interdite'); } },
  ]));
  fillEventDetails(elements, toCalendarEvent({
    ...timedEvent, summary: payload, description: payload, location: payload,
  }), { date: '28 mars 2026', time: '22:30' });
  for (const name of ['title', 'location', 'description']) {
    assert.equal(elements[name].textContent, payload);
  }
});

function mockAgenda(t, { mobile = false } = {}) {
  const nodes = new Map();
  const node = () => ({
    hidden: true,
    textContent: '',
    style: {},
    children: [],
    handlers: new Map(),
    addEventListener(name, callback) { this.handlers.set(name, callback); },
    attributes: new Map(),
    setAttribute(name, value) { this.attributes.set(name, value); },
    append(...children) { this.children.push(...children); },
    showModal() { this.open = true; },
    close() { this.open = false; },
    getBoundingClientRect() { return { left: 10, right: 100, top: 10, bottom: 100 }; },
    set innerHTML(_) { assert.fail('Écriture HTML interdite'); },
  });
  const get = (id) => {
    if (!nodes.has(id)) nodes.set(id, node());
    return nodes.get(id);
  };

  const state = {
    get,
    options: null,
    events: [],
    commands: [],
    window: node(),
  };
  const globals = {
    document: { getElementById: get, createElement: node },
    window: state.window,
    matchMedia: () => ({ matches: mobile }),
    FullCalendar: {
      Luxon3: {},
      globalLocales: [{ code: 'fr' }],
      Calendar: class {
        constructor(_element, options) { state.options = options; }
        render() {}
        changeView(view) { state.commands.push(view); }
        prev() { state.commands.push('prev'); }
        next() { state.commands.push('next'); }
        today() { state.commands.push('today'); }
        getEvents() { return state.events; }
        batchRendering(callback) { callback(); }
      },
    },
    luxon: { DateTime: {} },
  };
  for (const [name, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, name, previous);
      else delete globalThis[name];
    });
  }
  return state;
}

test('signale les erreurs Google en mode réel sans afficher la démonstration', async (t) => {
  const cases = [
    [400, { details: [{ reason: 'API_KEY_INVALID' }] }, /clé API Google est invalide/],
    [403, { details: [{ reason: 'API_KEY_HTTP_REFERRER_BLOCKED' }] }, /origine n’est pas autorisée/],
    [403, { errors: [{ reason: 'quotaExceeded' }] }, /Quota/],
    [429, {}, /Quota/],
    [403, { errors: [{ reason: 'forbidden' }], details: [{ reason: 'ACCESS_DENIED' }] }, /Vérifiez les restrictions de la clé et le partage public/],
    [404, {}, /Agenda Google introuvable ou inaccessible/],
  ];
  const ui = mockAgenda(t);
  t.mock.method(globalThis, 'fetch');

  for (const [status, error, message] of cases) {
    globalThis.fetch.mock.mockImplementation(async () => Response.json({
      error: { ...error, message: 'Détail brut à ne pas afficher.' },
    }, { status }));
    initialize(settings);
    await assert.rejects(ui.options.events(range), message);
    assert.match(ui.get('status').textContent, message);
    assert.doesNotMatch(ui.get('status').textContent, /Détail brut/);
    assert.equal(ui.get('retry').hidden, false);
    assert.equal(ui.get('demo').hidden, true);
  }

  ui.options = null;
  initialize({ calendarId: settings.calendarId, apiKey: '' });
  assert.equal(ui.options, null);
  assert.match(ui.get('status').textContent, /Configuration Google incomplète/);
  assert.equal(ui.get('demo').hidden, true);
});
test('configure les quatre vues avec un démarrage adapté à la largeur', async (t) => {
  for (const mobile of [false, true]) {
    await t.test(mobile ? 'smartphone' : 'ordinateur', (t) => {
      const ui = mockAgenda(t, { mobile });
      initialize(settings);
      assert.equal(ui.options.initialView, mobile ? 'listUpcoming' : 'dayGridMonth');
      assert.equal(ui.options.headerToolbar, false);
      const views = ['dayGridMonth', 'timeGridWeek', 'timeGridDay', 'listUpcoming'];
      for (const type of views) {
        ui.get(`view-${type}`).handlers.get('click')();
        ui.options.datesSet({ view: { type, title: `Période ${type}`, currentStart: new Date(0), currentEnd: new Date(1) } });
        assert.equal(ui.get('period-title').textContent, `Période ${type}`);
        for (const name of views) {
          assert.equal(ui.get(`view-${name}`).attributes.get('aria-pressed'), String(name === type));
        }
      }
      for (const id of ['previous-period', 'next-period', 'today']) ui.get(id).handlers.get('click')();
      assert.deepEqual(ui.commands, [...views, 'prev', 'next', 'today']);
      assert.equal(ui.get('today').disabled, false);
      const now = Date.now();
      ui.options.datesSet({ view: { type: 'dayGridMonth', title: 'Mois en cours', currentStart: new Date(now - 60000), currentEnd: new Date(now + 60000) } });
      assert.equal(ui.get('today').disabled, true);
      assert.equal(ui.options.views.listUpcoming.type, 'list');
      assert.deepEqual(ui.options.views.listUpcoming.duration, { days: 30 });
      assert.deepEqual(ui.options.views.listUpcoming.dateIncrement, { days: 30 });
      assert.equal(ui.options.views.listUpcoming.dateAlignment, 'day');
    });
  }
});

test('les filtres modifient le rendu des événements existants sans relire Google', async (t) => {
  const ui = mockAgenda(t);
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({
    items: [
      timedEvent,
      { ...timedEvent, id: 'unknown', colorId: '11' },
      { ...timedEvent, id: 'default', colorId: undefined },
      { ...timedEvent, id: 'phenomenon', summary: 'Pleine lune', colorId: undefined },
    ],
  }));
  initialize(settings);
  const events = await ui.options.events(range);
  ui.events = events.map((event) => ({
    ...event,
    setProp(name, value) { this[name] = value; },
  }));
  assert.deepEqual(ui.events.map((event) => event.display), ['block', 'block', 'block', 'block']);
  assert.deepEqual(ui.events.map(eventCategoryId), ['1', 'unclassified', 'unclassified', '3']);
  assert.deepEqual(ui.events.slice(1, 3).map((event) => event.color), ['#EF108B', '#EF108B']);

  const labels = ui.get('categories').children;
  assert.equal(labels.length, 8);
  const [check] = labels.find((label) => label.children.includes('Non classés')).children;
  assert.equal(check.checked, true);
  check.checked = false;
  check.handlers.get('change')();
  assert.deepEqual(ui.events.map((event) => event.display), ['block', 'none', 'none', 'block']);
  check.checked = true;
  check.handlers.get('change')();
  assert.deepEqual(ui.events.map((event) => event.display), ['block', 'block', 'block', 'block']);
  const [phenomenon] = labels.find((label) => label.children.includes('Phénomènes astronomiques')).children;
  phenomenon.checked = false;
  phenomenon.handlers.get('change')();
  assert.deepEqual(ui.events.map((event) => event.display), ['block', 'block', 'block', 'none']);
  assert.equal(fetch.mock.callCount(), 1);
});

test('les réponses tardives sont ignorées et les filtres actifs persistent entre les périodes', async (t) => {
  const ui = mockAgenda(t);
  const requests = [];
  t.mock.method(globalThis, 'fetch', (_url, options) => new Promise((resolve) => {
    requests.push({ resolve, signal: options.signal });
  }));
  initialize(settings);
  const old = ui.options.events(range);
  const recent = ui.options.events({
    startStr: '2026-04-01T00:00:00+02:00', endStr: '2026-05-01T00:00:00+02:00',
  });
  assert.equal(requests[0].signal.aborted, true);

  const label = ui.get('categories').children.find((label) => label.children.includes('Sorties d’observation'));
  const [check] = label.children;
  check.checked = false;
  check.handlers.get('change')();
  const recentEvent = { ...timedEvent, id: 'recent',
    start: { dateTime: '2026-04-28T22:30:00+02:00' },
    end: { dateTime: '2026-04-28T23:30:00+02:00' } };
  requests[1].resolve(Response.json({ items: [recentEvent] }));
  assert.deepEqual((await recent).map((event) => [event.id, event.display]), [['recent', 'none']]);
  requests[0].resolve(Response.json({ items: [] }));
  assert.deepEqual(await old, []);
  assert.equal(ui.get('status').textContent, '');
  assert.equal(requests.length, 2);
});

test('la modale affiche les horaires de Paris et respecte les fins exclusives', (t) => {
  const ui = mockAgenda(t);
  initialize(settings);
  const event = {
    ...toCalendarEvent(timedEvent),
    start: new Date(timedEvent.start.dateTime),
    end: new Date(timedEvent.end.dateTime),
  };
  ui.options.eventClick({ event });
  assert.equal(ui.get('event-details').open, true);
  assert.equal(ui.get('event-date').textContent, 'Du 28 mars 2026 au 29 mars 2026');
  assert.equal(ui.get('event-time').textContent, '22:30 – 03:30');
  assert.equal(ui.get('event-location').hidden, false);

  const start = new Date('2026-03-28T00:00:00+01:00');
  assert.deepEqual(eventSchedule({ allDay: true, start, end: new Date('2026-03-29T00:00:00+01:00') }),
    { date: '28 mars 2026', time: 'Journée entière' });
  ui.options.eventClick({ event: {
    title: 'Journées', allDay: true, start, end: new Date('2026-03-31T00:00:00+02:00'),
    extendedProps: { category: '', location: '', description: '  ' },
  } });
  assert.equal(ui.get('event-date').textContent, 'Du 28 mars 2026 au 30 mars 2026');
  for (const id of ['event-category', 'event-location', 'event-description']) {
    assert.equal(ui.get(id).hidden, true);
  }
  const dialog = ui.get('event-details');
  dialog.handlers.get('click')({ target: dialog, clientX: 50, clientY: 50 });
  assert.equal(dialog.open, true);
  dialog.handlers.get('click')({ target: dialog, clientX: 5, clientY: 5 });
  assert.equal(dialog.open, false);
});

test('les liens d’abonnement encodent l’identifiant sans exposer la clé', () => {
  const id = 'groupe+test@example.invalid';
  const { google, ical } = subscriptionLinks(` ${id} `);
  assert.equal(new URL(google).searchParams.get('cid'), id);
  assert.equal(new URL(ical).pathname, '/calendar/ical/groupe%2Btest%40example.invalid/public/basic.ics');
  assert.equal(subscriptionLinks(' '), null);
});

test('l’impression sélectionne les événements visibles et les trie par début', () => {
  const make = (title, start, end, colorId) => ({
    title, start: new Date(start), end: end ? new Date(end) : null, extendedProps: { categoryId: colorId },
  });
  const calendar = {
    view: { activeStart: new Date('2026-04-01'), activeEnd: new Date('2026-04-03') },
    getEvents: () => [
      make('Courant', '2026-04-02', null, '4'),
      make('Ancien', '2026-03-31', '2026-04-01', '4'),
      make('Chevauchement', '2026-03-30', '2026-04-02', '3'),
      make('Masqué', '2026-04-01', null, '1'),
      make('Futur', '2026-04-03', null, '4'),
    ],
  };
  assert.deepEqual(printEvents(calendar, new Set(['1'])).map((event) => event.title), ['Chevauchement', 'Courant']);
});

test('classe les titres sans couleur, avec priorité aux activités du club', () => {
  const cases = [
    ['Séance Club Astronomie', '4'],
    ['Journée astro-imagerie – Prisches', '2'],
    ['Maximum des Géminides', '3'],
    ['Maximum des Ursides', '3'],
    ['La Lune près de Spica', '3'],
    ['La Lune près de l’amas de la Crèche', '3'],
    ['La Lune près de la crèche', 'unclassified'],
    ['Jupiter près de Régulus', '3'],
    ['La Lune forme un arc avec Jupiter, Régulus et Mars', '3'],
    ['Solstice de décembre', '3'],
    ['Pleine Lune (Superlune)', '3'],
    ['Conférence sur les éclipses', '2'],
    ['Événement de test', 'unclassified'],
    ['  SOIRÉE\u00a0D’OBSERVATION — Pleine Lune  ', '1'],
    ["SORTIE D'OBSERVATION", '1'],
    ['Visite et atelier sur la Lune', '2'],
    ['Inscription à la Nuit des étoiles', '8'],
    ['Fête de la Science', '5'],
    ['Excursion à Lille', '7'],
    ['Lune et Mars', 'unclassified'],
    ['Opposition au règlement', 'unclassified'],
    ['Maximum de fréquentation', 'unclassified'],
    ['Surprésentation et réinscription', 'unclassified'],
    ['Jupiter près du parking', 'unclassified'],
  ];
  for (const [summary, categoryId] of cases) {
    const event = toCalendarEvent({ ...timedEvent, colorId: undefined, summary });
    assert.equal(eventCategoryId(event), categoryId, summary);
    assert.equal(event.color, categories[categoryId]?.color ?? '#EF108B', summary);
  }
});

test('une couleur explicite reconnue prévaut et une couleur hors convention reste non classée', () => {
  const summary = 'Conférence sur les éclipses';
  for (const [colorId, expected] of [['3', '3'], ['4', '4'], ['11', 'unclassified'], ['', '2']]) {
    const event = toCalendarEvent({ ...timedEvent, colorId, summary });
    assert.equal(event.extendedProps.colorId, colorId);
    assert.equal(eventCategoryId(event), expected);
  }
});

test('le mois masque visuellement la catégorie et conserve le titre et l’heure', (t) => {
  const ui = mockAgenda(t);
  initialize(settings);
  const event = toCalendarEvent({ ...timedEvent, summary: 'Pleine Lune', colorId: null });
  const render = (type) => ui.options.eventContent({ event, timeText: '22:30', view: { type } }).domNodes;
  const [title, category] = render('dayGridMonth');
  assert.equal(title.textContent, '22:30 Pleine Lune');
  assert.equal(category.textContent, 'Phénomènes astronomiques');
  assert.match(category.className, /visually-hidden/);
  assert.doesNotMatch(render('listUpcoming')[1].className, /visually-hidden/);
});
