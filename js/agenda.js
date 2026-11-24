import { config } from './config.js';
import { fetchCalendarEvents, toCalendarEvent } from './calendar-api.js';
import {
  applyCategoryFilters, eventCategoryId, eventSchedule, printEvents,
  subscriptionLinks, viewOptions,
} from './agenda-view.js';
import { categories, unclassified } from './event-categories.js';

export function fillEventDetails(elements, event, schedule) {
  const { category, location, description } = event.extendedProps;
  elements.title.textContent = event.title;
  elements.date.textContent = schedule.date;
  elements.time.textContent = schedule.time;

  for (const [element, value] of [
    [elements.category, category],
    [elements.location, location],
    [elements.description, description],
  ]) {
    element.textContent = value;
    element.hidden = !value.trim();
  }
}

function installDialog(dialog) {
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) {
      dialog.close();
    }
  });
}

function installSubscription(calendarId) {
  const links = subscriptionLinks(calendarId);
  if (!links) return;
  const button = document.getElementById('subscribe');
  const dialog = document.getElementById('subscription');
  const address = document.getElementById('ical-address');
  const feedback = document.getElementById('copy-status');
  document.getElementById('google-subscription').href = links.google;
  address.value = links.ical;
  button.hidden = false;
  button.addEventListener('click', () => {
    feedback.textContent = '';
    dialog.showModal();
  });
  document.getElementById('copy-ical').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(address.value);
      feedback.textContent = 'Adresse copiée.';
    } catch {
      address.focus();
      address.select();
      feedback.textContent = 'Adresse sélectionnée. Copiez-la avec votre navigateur.';
    }
  });
  installDialog(dialog);
}

function installFilters(calendar, hiddenCategories) {
  const legend = document.getElementById('categories');
  for (const [id, category] of [...Object.entries(categories), [unclassified.id, unclassified]]) {
    const label = document.createElement('label');
    const check = document.createElement('input');
    const swatch = document.createElement('span');
    check.type = 'checkbox';
    check.checked = true;
    swatch.className = 'category-swatch';
    swatch.style.backgroundColor = category.color;
    swatch.setAttribute('aria-hidden', 'true');
    label.append(check, swatch, category.label);
    legend.append(label);
    check.addEventListener('change', () => {
      if (check.checked) hiddenCategories.delete(id);
      else hiddenCategories.add(id);
      applyCategoryFilters(calendar, hiddenCategories);
    });
  }
  legend.hidden = false;
}

function installPrinting(calendar, hiddenCategories, getStatus) {
  const button = document.getElementById('print');
  const sheet = document.getElementById('print-agenda');
  button.hidden = false;
  button.addEventListener('click', () => window.print());
  window.addEventListener('beforeprint', () => {
    const heading = document.createElement('h2');
    heading.textContent = calendar.view.title;
    sheet.replaceChildren(heading);

    const status = getStatus();
    const events = status ? [] : printEvents(calendar, hiddenCategories);
    if (!events.length) {
      const message = document.createElement('p');
      message.textContent = status || 'Aucun événement visible sur cette période.';
      sheet.append(message);
      return;
    }

    const list = document.createElement('ul');
    for (const event of events) {
      const item = document.createElement('li');
      const title = document.createElement('strong');
      const details = document.createElement('div');
      const { date, time } = eventSchedule(event);
      const { category, location } = event.extendedProps;
      title.textContent = event.title;
      details.textContent = [date, time, category || unclassified.label, location].filter(Boolean).join(' · ');
      item.append(title, details);
      list.append(item);
    }
    sheet.append(list);
  });
}


function demoEvents(DateTime) {
  const month = DateTime.now().setZone(config.timeZone).startOf('month');
  const examples = [
    ['4', 'Séance du club', 3, 1],
    ['1', 'Sortie d’observation', 6, 1],
    ['5', 'Manifestation publique', 10, 2],
    ['2', 'Conférence et atelier', 14, 1],
    ['7', 'Voyage et visite', 18, 2],
    ['8', 'Administration', 22, 1],
    ['3', 'Pleine lune', 24, 1],
    ['', 'Événement sans catégorie', 25, 1],
  ];

  return examples.map(([colorId, summary, day, duration]) => {
    const start = month.plus({ days: day - 1 });
    const timed = colorId === '1';
    return toCalendarEvent({
      id: `demo-${day}`,
      summary: `[Démo] ${summary}`,
      start: timed ? { dateTime: start.set({ hour: 21 }).toISO() } : { date: start.toISODate() },
      end: timed ? { dateTime: start.set({ hour: 23 }).toISO() } : { date: start.plus({ days: duration }).toISODate() },
      colorId,
      description: 'Exemple fictif pour tester l’affichage.',
    });
  });
}

export function initialize(settings = config) {
  const { FullCalendar, luxon } = globalThis;
  const status = document.getElementById('status');
  const retry = document.getElementById('retry');
  const calendarId = settings.calendarId.trim();
  const apiKey = settings.apiKey.trim();
  const demo = !calendarId && !apiKey;
  document.getElementById('demo').hidden = !demo;

  if (!demo && (!calendarId || !apiKey)) {
    status.setAttribute('data-state', 'error');
    status.textContent = 'Configuration Google incomplète. Renseignez l’identifiant de l’agenda et la clé API.';
    return;
  }

  if (!FullCalendar?.Calendar || !FullCalendar.Luxon3 || !luxon?.DateTime ||
      !FullCalendar.globalLocales?.some((locale) => locale.code === config.locale)) {
    status.setAttribute('data-state', 'error');
    status.textContent = 'Le calendrier n’a pas pu être chargé. Vérifiez votre connexion, puis rechargez la page.';
    return;
  }

  const dialog = document.getElementById('event-details');
  const elements = {
    title: document.getElementById('event-title'),
    category: document.getElementById('event-category'),
    date: document.getElementById('event-date'),
    time: document.getElementById('event-time'),
    location: document.getElementById('event-location'),
    description: document.getElementById('event-description'),
  };

  const hiddenCategories = new Set();
  let activeRequest;
  const events = demo ? demoEvents(luxon.DateTime) : async (range) => {
    activeRequest?.abort();
    const request = new AbortController();
    activeRequest = request;
    retry.hidden = true;
    status.setAttribute('data-state', 'loading');
    status.textContent = 'Chargement des événements…';

    let result;
    try {
      result = await fetchCalendarEvents(range, { calendarId, apiKey, timeZone: settings.timeZone, signal: request.signal });
    } catch (error) {
      if (activeRequest !== request) return [];
      status.setAttribute('data-state', 'error');
      status.textContent = error.message;
      retry.hidden = false;
      throw error;
    }
    if (activeRequest !== request) return [];

    status.setAttribute('data-state', 'ready');
    status.textContent = result.length ? '' : 'Aucun événement sur cette période.';
    return result.map((event) => ({
      ...event,
      display: hiddenCategories.has(eventCategoryId(event)) ? 'none' : 'block',
    }));
  };

  const periodTitle = document.getElementById('period-title');
  const today = document.getElementById('today');
  const viewButtons = viewOptions.available.map((view) => [view, document.getElementById(`view-${view}`)]);

  const calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
    locale: config.locale,
    timeZone: config.timeZone,
    firstDay: config.firstDay,
    initialView: globalThis.matchMedia?.('(max-width: 640px)').matches ? viewOptions.mobile : viewOptions.desktop,
    views: {
      dayGridMonth: { dayMaxEvents: 3, dayHeaderFormat: { weekday: 'short' } },
      timeGrid: { dayMaxEventRows: 3, eventMaxStack: 2 },
      listUpcoming: viewOptions.upcoming,
    },
    moreLinkContent({ num }) {
      const label = document.createElement('span');
      label.className = 'more-link-label';
      label.textContent = ' de plus';
      return { domNodes: [document.createTextNode(`+${num}`), label] };
    },
    moreLinkHint: (num) => `Afficher ${num} événement${num > 1 ? 's' : ''} de plus`,
    dayHeaderFormat: { weekday: 'short', day: 'numeric' },
    headerToolbar: false,
    datesSet({ view }) {
      periodTitle.textContent = view.title;
      const now = new Date();
      today.disabled = now >= view.currentStart && now < view.currentEnd;
      for (const [name, button] of viewButtons) {
        button.setAttribute('aria-pressed', String(view.type === name));
      }
    },
    noEventsText: 'Aucun événement visible sur cette période.',
    eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    eventOrderStrict: true,
    eventMinHeight: 32,
    height: 'auto',
    fixedWeekCount: false,
    lazyFetching: false,
    nextDayThreshold: '00:00:00',
    editable: false,
    displayEventTime: true,
    eventDisplay: 'block',
    events,
    eventSourceFailure() {
      // The active request already reports its error in the status region.
    },
    eventContent({ event, timeText, view }) {
      const title = document.createElement('span');
      const category = document.createElement('span');
      title.className = 'fc-event-title';
      title.textContent = timeText && view.type !== 'listUpcoming' ? `${timeText} ${event.title}` : event.title;
      category.className = view.type === 'dayGridMonth'
        ? 'event-category-label visually-hidden' : 'event-category-label';
      category.textContent = event.extendedProps.category || unclassified.label;
      return { domNodes: [title, category] };
    },
    eventInteractive: true,
    eventClick({ event }) {
      fillEventDetails(elements, event, eventSchedule(event));
      dialog.showModal();
    },
  });

  for (const [view, button] of viewButtons) {
    button.addEventListener('click', () => calendar.changeView(view));
  }
  document.getElementById('previous-period').addEventListener('click', () => calendar.prev());
  document.getElementById('next-period').addEventListener('click', () => calendar.next());
  today.addEventListener('click', () => calendar.today());

  installDialog(dialog);
  installSubscription(calendarId);
  installFilters(calendar, hiddenCategories);
  installPrinting(calendar, hiddenCategories, () => status.textContent);
  retry.addEventListener('click', () => calendar.refetchEvents());
  status.textContent = '';
  document.getElementById('calendar-controls').hidden = false;
  calendar.render();
}

if (typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => initialize(), { once: true });
}
