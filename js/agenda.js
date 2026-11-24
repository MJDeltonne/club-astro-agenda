import { config } from './config.js';
import { fetchCalendarEvents, toCalendarEvent } from './calendar-api.js';

export function fillEventDetails(elements, event) {
  const { category, location, description } = event.extendedProps;
  elements.title.textContent = event.title;

  for (const [element, value] of [
    [elements.category, category],
    [elements.location, location],
    [elements.description, description],
  ]) {
    element.textContent = value;
    element.hidden = !value;
  }
}

function demoEvents(DateTime) {
  const month = DateTime.now().setZone(config.timeZone).startOf('month');
  const categories = [
    ['4', 'Séance du club', 3, 1],
    ['1', 'Sortie d’observation', 6, 1],
    ['5', 'Manifestation publique', 10, 2],
    ['2', 'Conférence et atelier', 14, 1],
    ['7', 'Voyage et visite', 18, 2],
    ['8', 'Administration', 22, 1],
    ['', 'Événement sans catégorie', 25, 1],
  ];

  return categories.map(([colorId, summary, day, duration]) => {
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

function initialize() {
  const { FullCalendar, luxon } = globalThis;
  const status = document.getElementById('status');
  const retry = document.getElementById('retry');
  const demo = !config.calendarId.trim() || !config.apiKey.trim();
  document.getElementById('demo').hidden = !demo;

  if (!FullCalendar?.Calendar || !FullCalendar.Luxon3 || !luxon?.DateTime ||
      !FullCalendar.globalLocales?.some((locale) => locale.code === config.locale)) {
    status.textContent = 'Le calendrier n’a pas pu être chargé. Vérifiez votre connexion, puis rechargez la page.';
    return;
  }

  const dialog = document.getElementById('event-details');
  const elements = {
    title: document.getElementById('event-title'),
    category: document.getElementById('event-category'),
    location: document.getElementById('event-location'),
    description: document.getElementById('event-description'),
  };

  let activeRequest;
  const events = demo ? demoEvents(luxon.DateTime) : async (range) => {
    activeRequest?.abort();
    const request = new AbortController();
    activeRequest = request;
    retry.hidden = true;
    status.textContent = 'Chargement des événements…';

    try {
      const result = await fetchCalendarEvents(range, { ...config, signal: request.signal });
      if (activeRequest === request) {
        status.textContent = result.length ? '' : 'Aucun événement sur cette période.';
      }
      return result;
    } catch (error) {
      if (activeRequest !== request) return [];
      status.textContent = error.message;
      retry.hidden = false;
      throw error;
    }
  };

  const calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
    locale: config.locale,
    timeZone: config.timeZone,
    firstDay: config.firstDay,
    initialView: 'dayGridMonth',
    headerToolbar: { left: 'title', center: '', right: 'prev,next today' },
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
    eventContent({ event, timeText }) {
      const title = document.createElement('span');
      title.className = 'fc-event-title';
      title.textContent = timeText ? `${timeText} ${event.title}` : event.title;
      return { domNodes: [title] };
    },
    eventInteractive: true,
    eventClick({ event }) {
      fillEventDetails(elements, event);
      dialog.showModal();
    },
  });

  retry.addEventListener('click', () => calendar.refetchEvents());
  status.textContent = '';
  calendar.render();
}

if (typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', initialize, { once: true });
}