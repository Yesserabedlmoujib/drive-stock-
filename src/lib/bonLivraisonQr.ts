import type { BonDeLivraison, CompanyProfile } from "@/db/types";
import {
  controlCodeOf,
  cut,
  fitPayload,
  formatAmount,
  formatQty,
  shortDate,
} from "@/lib/bonQr";

/* -------------------------------------------------------------------------- */
/*  Contenu du QR code du bon de livraison                                     */
/* -------------------------------------------------------------------------- */
/*  La convention et ses raisons sont décrites dans `bonQr.ts`.                */

/**
 * Capacité en octets d'un symbole de version 11 en correction L. Le bon de
 * livraison porte un destinataire et un montant que le bon de sortie n'a pas :
 * la version 10 n'y suffit plus. La grille passe à 61 modules, compensés par un
 * symbole tracé un peu plus large — le module imprimé reste au-dessus de
 * 0,39 mm, comme sur le bon de sortie.
 */
const MAX_PAYLOAD_BYTES = 321;

/** Nombre de modules que `encodeQr` peut atteindre pour tenir ce budget. */
export const LIVRAISON_QR_MAX_MODULES = 61;

/** Le destinataire est saisi soit nommément, soit via la destination du bon. */
const destinataireOf = (bon: BonDeLivraison): string =>
  cut(bon.customerName, 64) || cut(bon.destination, 64);

/**
 * Contenu qui engage l'émetteur : numéro, date, M.F., lieu, destinataire, ses
 * références, chaque ligne d'article avec sa quantité, et le montant dû.
 */
export function bonLivraisonControlCode(
  bon: BonDeLivraison,
  com: CompanyProfile,
): string {
  const items = Array.isArray(bon.items) ? bon.items : [];

  return controlCodeOf(
    [
      cut(bon.number, 64) || cut(bon.id, 64),
      shortDate(bon.createdAt),
      cut(com.matriculeFiscale, 64),
      cut(bon.lieu, 64),
      destinataireOf(bon),
      cut(bon.customerMF, 64),
      items.map((i) => `${cut(i.productName, 64)}x${i.quantity}`).join(";"),
      formatAmount(bon.totalTTC ?? bon.totalAmount ?? 0),
    ].join("|"),
  );
}

/**
 * Texte encodé dans le QR. Les longueurs sont bornées ; si le compte n'y est
 * toujours pas, la raison sociale saute d'abord — le M.F. identifie déjà
 * l'émetteur — puis les coordonnées du transporteur, la plaque restant le
 * repère utile au bord de la route.
 */
export function buildBonLivraisonQrText(
  bon: BonDeLivraison,
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
  const destinataire = cut(destinataireOf(bon), 32);
  const transporteur = cut(com.transporteurCoordonnees, 28);
  const plaque = cut(com.plaqueImmatriculation, 16);

  const lines = [
    `BON DE LIVRAISON N° ${number}`,
    `Date : ${shortDate(bon.createdAt)}`,
  ];

  if (lieu) lines.push(`Lieu : ${lieu}`);

  const companyLine = company ? lines.push(`Émetteur : ${company}`) - 1 : -1;

  if (mf) lines.push(`M.F. : ${mf}`);
  if (destinataire) lines.push(`Destinataire : ${destinataire}`);

  lines.push(
    `Articles : ${items.length} - Qté totale : ${formatQty(totalQty)}`,
  );
  lines.push(
    `Total TTC : ${formatAmount(bon.totalTTC ?? bon.totalAmount ?? 0)} TND`,
  );

  const transporteurLine = transporteur
    ? lines.push(`Transporteur : ${transporteur}`) - 1
    : -1;

  if (plaque) lines.push(`Plaque : ${plaque}`);

  lines.push(`Contrôle : ${bonLivraisonControlCode(bon, com)}`);

  return fitPayload(
    lines,
    [companyLine, transporteurLine],
    MAX_PAYLOAD_BYTES,
  );
}
