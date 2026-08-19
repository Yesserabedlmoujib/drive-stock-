import type { BonDeSortie, CompanyProfile } from "@/db/types";
import { controlCodeOf, cut, fitPayload, formatQty, shortDate } from "@/lib/bonQr";

/* -------------------------------------------------------------------------- */
/*  Contenu du QR code du bon de sortie                                        */
/* -------------------------------------------------------------------------- */
/*  La convention et ses raisons sont décrites dans `bonQr.ts`.                */

/**
 * Capacité en octets d'un symbole de version 10 en correction L, la limite que
 * `encodeQr` accepte par défaut. Au-delà, la grille se densifie et le module
 * imprimé rétrécit.
 */
const MAX_PAYLOAD_BYTES = 271;

/** Contenu qui engage l'émetteur : numéro, date, M.F., lieu et chaque ligne. */
export function bonSortieControlCode(
  bon: BonDeSortie,
  com: CompanyProfile,
): string {
  const items = Array.isArray(bon.items) ? bon.items : [];

  return controlCodeOf(
    [
      cut(bon.number, 64) || cut(bon.id, 64),
      shortDate(bon.createdAt),
      cut(com.matriculeFiscale, 64),
      cut(bon.lieu, 64),
      items.map((i) => `${cut(i.productName, 64)}x${i.quantity}`).join(";"),
    ].join("|"),
  );
}

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

  return fitPayload(lines, [companyLine], MAX_PAYLOAD_BYTES);
}
