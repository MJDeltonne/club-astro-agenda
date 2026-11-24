import { config } from './config.js';

export const categories = {
  ...config.categories,
  '3': { label: 'Phénomènes astronomiques', color: '#DBADFF' },
};
export const unclassified = { id: 'unclassified', label: 'Non classés', color: config.defaultColor };

// En cas de conflit, les activités du club priment sur leur sujet astronomique.
const activityRules = [
  ['8', /\b(?:assemblees? generales?|inscriptions?|reunions? du bureau|conseils? d administration)\b/],
  ['4', /\bseances? (?:du club|club astronomie)\b/],
  ['5', /\b(?:fetes? de la science|nuits? des etoiles|manifestations? publiques?)\b/],
  ['1', /\b(?:(?:sorties?|soirees?) d observation|observations? nocturnes?)\b/],
  ['2', /\b(?:conferences?|ateliers?|presentations?|journees? astro ?imagerie)\b/],
  ['7', /\b(?:voyages?|excursions?|visites?)\b/],
];

const phenomenon = /\b(?:conjonctions?|elongations?|occultations?|eclipses?|solstices?|equinoxes?|pleine lune|nouvelle lune|(?:premier |dernier )?quartier de lune|premier quartier|dernier quartier|superlune)\b/;
const opposition = /\b(?:en opposition|oppositions? (?:de|d|du) (?:mercure|venus|mars|jupiter|saturne|uranus|neptune|pluton|ceres|vesta))\b/;
const meteorPeak = /\bmaximum (?:des? |d un |du )?(?:essaims? (?:meteoritiques?|de meteores)|perseides|geminides|ursides|quadrantides|leonides|lyrides|orionides|taurides|aquariides|draconides|andromedides)\b/;
const celestialSubject = /^(?:(?:la )?lune|mercure|venus|mars|jupiter|saturne|uranus|neptune|pluton|ceres|vesta|soleil|spica|regulus|aldebaran|antares|pollux|castor|les pleiades)\b/;
const celestialRelation = /\b(?:pres (?:de|du|des|d)|se rapproche (?:de|du|des|d)|forme un arc avec)\b/;
const celestialTarget = /\b(?:lune|mercure|venus|mars|jupiter|saturne|uranus|neptune|pluton|ceres|vesta|soleil|spica|regulus|aldebaran|antares|pollux|castor|pleiades)\b/;

export function classifyEvent(colorId, title = '') {
  if (colorId != null && colorId !== '') {
    return Object.hasOwn(categories, colorId) ? String(colorId) : unclassified.id;
  }

  const normalized = title.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
  const activity = activityRules.find(([, pattern]) => pattern.test(normalized));
  if (activity) return activity[0];

  const relation = celestialRelation.exec(normalized);
  if (phenomenon.test(normalized) || opposition.test(normalized) || meteorPeak.test(normalized) ||
      (relation && celestialSubject.test(normalized) && celestialTarget.test(normalized.slice(relation.index + relation[0].length))) ||
      /\brapprochements? entre astres\b/.test(normalized)) return '3';

  return unclassified.id;
}
