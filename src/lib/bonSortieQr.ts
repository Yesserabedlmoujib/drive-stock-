import type { BonDeSortie, CompanyProfile } from "@/db/types";

/* -------------------------------------------------------------------------- */
/*  Contenu du QR code du bon de sortie                                        */
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
 * factures et porte une référence délivrée par la plateforme. Un bon de sortie
 * n'a pas de format de QR imposé — celui-ci est une convention interne.
 */

/** Coupe une valeur : le QR est un résumé, la page porte le détail complet. */
const cut = (value: unknown, max: number): string => {
  const s = value === undefined || value === null ? "" : String(value).trim();
  return s.length > max ? s.slice(0, max).trimEnd() : s;
};

const toDate = (d: Date | string | number): Date =>
  d instanceof Date ? d : new Date(d);

const shortDate = (d: Date | string | number): string =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(toDate(d));

/**
 * Quantité destinée à un lecteur de QR : séparateur de milliers ramené à une
 * espace ordinaire, la seule qui s'affiche correctement partout.
 */
const formatQty = (value: number): string =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 })
    .format(Number.isFinite(value) ? value : 0)
    .replace(/[\u202F\u2009\u00A0]/g, " ");

/**
 * Empreinte FNV-1a 32 bits du contenu qui engage l'émetteur : numéro, date,
 * M.F., lieu et chaque ligne d'article avec sa quantité.
 *
 * Ce n'est pas une signature — elle ne protège pas contre une réémission depuis
 * l'application — mais elle rend le papier confrontable : un bon dont une
 * quantité a été retouchée après impression n'affiche plus le code que
 * l'application recalcule à partir de la fiche en base.
 */
export function bonSortieControlCode(
  bon: BonDeSortie,
  com: CompanyProfile,
): string {
  const items = Array.isArray(bon.items) ? bon.items : [];

  const canonical = [
    cut(bon.number, 64) || cut(bon.id, 64),
    shortDate(bon.createdAt),
    cut(com.matriculeFiscale, 64),
    cut(bon.lieu, 64),
    items.map((i) => `${cut(i.productName, 64)}x${i.quantity}`).join(";"),
  ].join("|");

  const bytes = new TextEncoder().encode(canonical);
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  const hex = hash.toString(16).toUpperCase().padStart(8, "0");
  return `${hex.slice(0, 4)}-${hex.slice(4)}`;
}

/**
 * Capacité en octets d'un symbole de version 10 en correction L. Au-delà, la
 * grille passe à 61 modules et le module imprimé à 26 mm tombe sous 0,43 mm,
 * ce qui commence à mettre en difficulté les appareils photo modestes.
 */
const MAX_PAYLOAD_BYTES = 271;

const byteLength = (s: string): number => new TextEncoder().encode(s).length;

/**
 * Texte encodé dans le QR. Les longueurs sont bornées, et si le compte n'y est
 * toujours pas la raison sociale saute : le M.F. identifie déjà l'émetteur, et
 * la page, elle, porte le nom en toutes lettres.
 */
export function buildBonSortieQrText(
  bon: BonDeSortie,
  com: CompanyProfile,
): string {
  const items = Array.isArray(bon.items) ? bon.items : [];
  const totalQty = items.reduce(
    (sum, i) => sum + (Number.isFinite(i.quantity) ? i.quantity : 0),
    0,
  );

  const number = cut(bon.number, 24) || cut(bon.id, 24);
  const lieu = cut(bon.lieu, 24);
  const company = cut(com.companyName, 34);
  const mf = cut(com.matriculeFiscale, 24);
  const transporteur = cut(com.transporteurCoordonnees, 32);
  const plaque = cut(com.plaqueImmatriculation, 16);

  const lines = [
    `BON DE SORTIE N° ${number}`,
    `Date : ${shortDate(bon.createdAt)}`,
  ];

  if (lieu) lines.push(`Lieu : ${lieu}`);

  const companyLine = company ? lines.push(`Émetteur : ${company}`) - 1 : -1;

  if (mf) lines.push(`M.F. : ${mf}`);

  lines.push(
    `Articles : ${items.length} - Qté totale : ${formatQty(totalQty)}`,
  );

  if (transporteur) lines.push(`Transporteur : ${transporteur}`);
  if (plaque) lines.push(`Plaque : ${plaque}`);

  lines.push(`Contrôle : ${bonSortieControlCode(bon, com)}`);

  if (companyLine >= 0 && byteLength(lines.join("\n")) > MAX_PAYLOAD_BYTES) {
    lines.splice(companyLine, 1);
  }

  return lines.join("\n");
}
