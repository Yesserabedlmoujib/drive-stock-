import type { BonDeRetour, CompanyProfile } from "@/db/types";
import {
  controlCodeOf,
  cut,
  fitPayload,
  formatQty,
  shortDate,
} from "@/lib/bonQr";

/* -------------------------------------------------------------------------- */
/*  Contenu du QR code du bon de retour                                        */
/* -------------------------------------------------------------------------- */
/*  La convention et ses raisons sont décrites dans `bonQr.ts`.                */

/**
 * Capacité en octets d'un symbole de version 11 en correction L. Le bon de
 * retour porte un motif que le bon de sortie n'a pas, et c'est la ligne qui
 * compte le plus ici : la version 10 obligerait à sacrifier le transporteur
 * pour la garder. La grille passe à 61 modules, compensés par un symbole tracé
 * un peu plus large — le module imprimé reste au-dessus de 0,39 mm, comme sur
 * les autres bons.
 */
const MAX_PAYLOAD_BYTES = 321;

/** Nombre de modules que `encodeQr` peut atteindre pour tenir ce budget. */
export const RETOUR_QR_MAX_MODULES = 61;

/**
 * Contenu qui engage l'émetteur : numéro, date, M.F., lieu, motif et chaque
 * ligne d'article avec sa quantité retournée. Aucun montant : le bon de retour
 * n'est pas valorisé, c'est l'avoir qui le sera.
 */
export function bonRetourControlCode(
  bon: BonDeRetour,
  com: CompanyProfile,
): string {
  const items = Array.isArray(bon.items) ? bon.items : [];

  return controlCodeOf(
    [
      cut(bon.number, 64) || cut(bon.id, 64),
      shortDate(bon.createdAt),
      cut(com.matriculeFiscale, 64),
      cut(bon.lieu, 64),
      cut(bon.description, 120),
      items.map((i) => `${cut(i.productName, 64)}x${i.quantity}`).join(";"),
    ].join("|"),
  );
}

/**
 * Texte encodé dans le QR. Les longueurs sont bornées ; si le compte n'y est
 * toujours pas, la raison sociale saute d'abord — le M.F. identifie déjà
 * l'émetteur — puis les coordonnées du transporteur, la plaque restant le
 * repère utile au bord de la route. Le motif part en dernier : c'est lui qui
 * explique pourquoi la marchandise fait le chemin inverse.
 */
export function buildBonRetourQrText(
  bon: BonDeRetour,
  com: CompanyProfile,
): string {
  const items = Array.isArray(bon.items) ? bon.items : [];
  const totalQty = items.reduce(
    (sum, i) => sum + (Number.isFinite(i.quantity) ? i.quantity : 0),
    0,
  );

  const number = cut(bon.number, 24) || cut(bon.id, 24);
  const lieu = cut(bon.lieu, 24);
  const company = cut(com.companyName, 32);
  const mf = cut(com.matriculeFiscale, 24);
  const motif = cut(bon.description, 40);
  const transporteur = cut(com.transporteurCoordonnees, 28);
  const plaque = cut(com.plaqueImmatriculation, 16);

  const lines = [
    `BON DE RETOUR N° ${number}`,
    `Date : ${shortDate(bon.createdAt)}`,
  ];

  if (lieu) lines.push(`Lieu : ${lieu}`);

  const companyLine = company ? lines.push(`Émetteur : ${company}`) - 1 : -1;

  if (mf) lines.push(`M.F. : ${mf}`);

  lines.push(
    `Articles : ${items.length} - Qté retournée : ${formatQty(totalQty)}`,
  );

  const motifLine = motif ? lines.push(`Motif : ${motif}`) - 1 : -1;

  const transporteurLine = transporteur
    ? lines.push(`Transporteur : ${transporteur}`) - 1
    : -1;

  if (plaque) lines.push(`Plaque : ${plaque}`);

  lines.push(`Contrôle : ${bonRetourControlCode(bon, com)}`);

  return fitPayload(
    lines,
    [companyLine, transporteurLine, motifLine],
    MAX_PAYLOAD_BYTES,
  );
}
