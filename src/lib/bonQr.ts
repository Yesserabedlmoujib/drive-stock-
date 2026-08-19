/* -------------------------------------------------------------------------- */
/*  Briques communes aux QR codes des bons                                     */
/* -------------------------------------------------------------------------- */
/*
 * Le lecteur visé est un téléphone tenu par un agent de la douane ou de la
 * police au bord de la route, souvent sans réseau et sans aucune raison
 * d'ouvrir un lien vers un site privé. Le QR porte donc le bon lui-même, en
 * texte clair : n'importe quel appareil photo l'affiche tel quel, sans
 * application ni connexion, et l'agent compare ligne à ligne avec le papier
 * qu'il a en main et avec le camion qui est devant lui.
 *
 * Ce n'est pas la facture électronique TTN / El Fatoora : celle-ci concerne les
 * factures et porte une référence délivrée par la plateforme. Un bon n'a pas de
 * format de QR imposé — celui-ci est une convention interne, la même pour tous
 * les bons pour qu'un agent qui sait en lire un sache lire les autres.
 */

/** Coupe une valeur : le QR est un résumé, la page porte le détail complet. */
export const cut = (value: unknown, max: number): string => {
  const s = value === undefined || value === null ? "" : String(value).trim();
  return s.length > max ? s.slice(0, max).trimEnd() : s;
};

const toDate = (d: Date | string | number): Date =>
  d instanceof Date ? d : new Date(d);

export const shortDate = (d: Date | string | number): string =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(toDate(d));

/**
 * Séparateurs de milliers qu'Intl peut produire : espace fine insécable, espace
 * fine, espace insécable. Désignés par leur point de code — les écrire tels
 * quels rendrait la source illisible, et c'est justement leur invisibilité qui
 * fait leur nuisance.
 */
const INTL_SPACES = [0x202f, 0x2009, 0x00a0].map((c) => String.fromCharCode(c));

/**
 * Ces espaces ne franchissent pas tous les lecteurs de QR. Ramenées à l'espace
 * ordinaire, elles passent partout : le QR est du texte destiné à être lu à
 * l'oeil, pas analysé.
 */
const plainSpaces = (s: string): string =>
  INTL_SPACES.reduce((acc, space) => acc.split(space).join(" "), s);

/** Quantité : jusqu'à 3 décimales, sans en imposer. */
export const formatQty = (value: number): string =>
  plainSpaces(
    new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(
      Number.isFinite(value) ? value : 0,
    ),
  );

/** Montant en dinars : 3 décimales toujours, les millimes ne se tronquent pas. */
export const formatAmount = (value: number): string =>
  plainSpaces(
    new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(Number.isFinite(value) ? value : 0),
  );

/**
 * Empreinte FNV-1a 32 bits de la chaîne canonique du bon.
 *
 * Ce n'est pas une signature — elle ne protège pas contre une réémission depuis
 * l'application — mais elle rend le papier confrontable : un bon dont une
 * quantité a été retouchée après impression n'affiche plus le code que
 * l'application recalcule à partir de la fiche en base.
 */
export function controlCodeOf(canonical: string): string {
  const bytes = new TextEncoder().encode(canonical);
  let hash = 0x811c9dc5;

  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  const hex = hash.toString(16).toUpperCase().padStart(8, "0");
  return `${hex.slice(0, 4)}-${hex.slice(4)}`;
}

export const byteLength = (s: string): number =>
  new TextEncoder().encode(s).length;

/**
 * Assemble la charge utile en retirant, dans l'ordre donné, les lignes dont on
 * peut se passer tant qu'elle dépasse `maxBytes`. Les index sont ceux de
 * `lines` ; -1 désigne une ligne absente et se saute.
 *
 * Dépasser la capacité n'échoue pas, cela densifie la grille : le symbole reste
 * valide mais son module rétrécit, et c'est le scan au bord de la route qui
 * devient difficile. Mieux vaut perdre une ligne accessoire.
 */
export function fitPayload(
  lines: string[],
  droppable: number[],
  maxBytes: number,
): string {
  const kept = [...lines];
  const join = () => kept.filter((l) => l.length > 0).join("\n");

  for (const index of droppable) {
    if (byteLength(join()) <= maxBytes) break;
    if (index >= 0) kept[index] = "";
  }

  return join();
}
