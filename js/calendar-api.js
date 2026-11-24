import { config } from './config.js';

const fields = 'nextPageToken,items(id,status,summary,start(date,dateTime),end(date,dateTime),location,description,colorId)';

export function toCalendarEvent(event) {
  if (event.status === 'cancelled') return null;

  const allDay = Boolean(event.start?.date);
  const start = allDay ? event.start.date : event.start?.dateTime;
  const end = allDay ? event.end?.date : event.end?.dateTime;
  if (!start) return null;

  const colorId = event.colorId ?? null;
  const category = Object.hasOwn(config.categories, colorId) ? config.categories[colorId] : null;

  return {
    id: event.id,
    title: event.summary || 'Événement sans titre',
    start,
    end,
    allDay,
    color: category?.color ?? config.defaultColor,
    textColor: '#161923',
    extendedProps: {
      location: event.location ?? '',
      description: event.description ?? '',
      colorId,
      category: category?.label ?? '',
    },
  };
}

export async function fetchCalendarEvents(range, {
  calendarId, apiKey, timeZone = config.timeZone, fetchImpl = fetch, signal,
}) {
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
  url.search = new URLSearchParams({
    key: apiKey,
    timeMin: range.startStr,
    timeMax: range.endStr,
    timeZone,
    singleEvents: 'true',
    showDeleted: 'false',
    maxResults: '2500',
    fields,
  });

  const events = [];
  const pageTokens = new Set();
  let pageToken;

  do {
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    let response;
    try {
      response = await fetchImpl(url.toString(), { signal });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new Error('Connexion à Google Calendar impossible.');
    }
    if (!response.ok) {
      throw new Error(`Google Calendar a refusé la requête ou est indisponible (HTTP ${response.status}).`);
    }

    let page;
    try {
      page = await response.json();
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new Error('La réponse de Google Calendar est illisible.');
    }
    if (!page || (page.items !== undefined && !Array.isArray(page.items))) {
      throw new Error('Le format de la réponse Google Calendar est inattendu.');
    }

    for (const event of page.items ?? []) {
      const converted = toCalendarEvent(event);
      if (converted) events.push(converted);
    }

    pageToken = page.nextPageToken;
    if (pageToken && pageTokens.has(pageToken)) {
      throw new Error('Google Calendar a renvoyé une page en double.');
    }
    pageTokens.add(pageToken);
  } while (pageToken);

  return events;
}