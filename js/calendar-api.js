import { config } from './config.js';
import { categories, classifyEvent, unclassified } from './event-categories.js';

const fields = 'nextPageToken,items(id,status,summary,start(date,dateTime),end(date,dateTime),location,description,colorId)';

export function toCalendarEvent(event) {
  if (event.status === 'cancelled') return null;

  const allDay = Boolean(event.start?.date);
  const start = allDay ? event.start.date : event.start?.dateTime;
  const end = allDay ? event.end?.date : event.end?.dateTime;
  if (!start) return null;

  const colorId = event.colorId ?? null;
  const categoryId = classifyEvent(colorId, event.summary ?? '');
  const category = categories[categoryId];

  return {
    id: event.id,
    title: event.summary || 'Événement sans titre',
    start,
    end,
    allDay,
    color: category?.color ?? unclassified.color,
    textColor: '#161923',
    extendedProps: {
      location: event.location ?? '',
      description: event.description ?? '',
      colorId,
      categoryId,
      category: category?.label ?? '',
    },
  };
}

async function calendarHttpError(response) {
  let details;
  try {
    details = (await response.json())?.error;
  } catch {
    // An HTTP error can arrive without a JSON body.
  }

  const reasons = [
    ...(details?.errors ?? []).map((item) => item.reason),
    ...(details?.details ?? []).map((item) => item.reason),
  ];
  const status = response.status;
  let message = 'Google Calendar a refusé la requête ou est indisponible.';
  if (status === 429 || reasons.some((reason) => [
    'rateLimitExceeded', 'userRateLimitExceeded', 'quotaExceeded', 'dailyLimitExceeded', 'RATE_LIMIT_EXCEEDED',
  ].includes(reason))) {
    message = 'Quota ou limite de requêtes Google Calendar atteint. Réessayez plus tard.';
  } else if (reasons.includes('API_KEY_INVALID') || reasons.includes('keyInvalid')) {
    message = 'La clé API Google est invalide. Vérifiez la configuration.';
  } else if (reasons.includes('API_KEY_HTTP_REFERRER_BLOCKED')) {
    message = 'Cette origine n’est pas autorisée par les restrictions de la clé API Google.';
  } else if (status === 404) {
    message = 'Agenda Google introuvable ou inaccessible. Vérifiez son identifiant et son partage public.';
  } else if (status === 403) {
    message = 'Accès Google Calendar refusé. Vérifiez les restrictions de la clé et le partage public de l’agenda.';
  }
  return new Error(`${message} (HTTP ${status})`);
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
      throw await calendarHttpError(response);
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
