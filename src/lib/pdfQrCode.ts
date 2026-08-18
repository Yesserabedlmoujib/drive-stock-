import type jsPDF from "jspdf";
import qrcode from "qrcode-generator";

/* -------------------------------------------------------------------------- */
/*  Encodage et tracé d'un QR code vectoriel dans un document jsPDF            */
/* -------------------------------------------------------------------------- */

export type QrErrorCorrection = "L" | "M" | "Q" | "H";

export interface QrSymbol {
  /** Côté de la grille, en modules (21 pour la version 1, +4 par version). */
  moduleCount: number;
  level: QrErrorCorrection;
  isDark: (row: number, col: number) => boolean;
}

/**
 * qrcode-generator encode le mode octet avec `charCodeAt(i) & 0xff`. Une chaîne
 * dont les unités de code SONT déjà les octets UTF-8 fait donc entrer de l'UTF-8
 * réel dans le symbole, sans avoir à réaffecter le `stringToBytes` global de la
 * bibliothèque. Indispensable ici : les accents et le « ° » sont sur plusieurs
 * octets, et un lecteur qui les recevrait en latin-1 afficherait du charabia.
 */
function utf8CodeUnits(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
  return out;
}

/**
 * Encode `text` en privilégiant la taille du module sur le niveau de correction :
 * sur un document imprimé puis manipulé au bord de la route, un module trop fin
 * ne se scanne pas, alors qu'une correction L reste suffisante sur du papier
 * propre. Le premier niveau de `levels` dont la grille tient dans
 * `maxModuleCount` gagne ; si aucun ne tient, on garde le dernier (le plus
 * permissif) et la grille se densifie.
 */
export function encodeQr(
  text: string,
  maxModuleCount = 57,
  levels: QrErrorCorrection[] = ["Q", "M", "L"],
): QrSymbol {
  const data = utf8CodeUnits(text);
  let fallback: QrSymbol | undefined;

  for (const level of levels) {
    const qr = qrcode(0, level);
    qr.addData(data, "Byte");
    qr.make();

    const symbol: QrSymbol = {
      moduleCount: qr.getModuleCount(),
      level,
      isDark: (row, col) => qr.isDark(row, col),
    };

    if (symbol.moduleCount <= maxModuleCount) return symbol;
    fallback = symbol;
  }

  if (!fallback) throw new Error("encodeQr : aucun niveau de correction fourni");
  return fallback;
}

export interface DrawQrOptions {
  /** Coin haut-gauche de la grille, hors zone de silence, en mm. */
  x: number;
  y: number;
  /** Côté de la grille en mm ; la zone de silence déborde autour. */
  size: number;
  /** Zone de silence, en modules (4 = minimum ISO/IEC 18004). */
  quietModules?: number;
}

/**
 * Trace le symbole en vectoriel : il reste net à n'importe quelle résolution
 * d'impression, contrairement à un PNG passé par `addImage`.
 *
 * La zone de silence est peinte en blanc et déborde de `size` : l'appelant doit
 * lui laisser la place (les marges de la page conviennent).
 */
export function drawQrCode(
  doc: jsPDF,
  symbol: QrSymbol,
  { x, y, size, quietModules = 4 }: DrawQrOptions,
): void {
  const module = size / symbol.moduleCount;
  const quiet = module * quietModules;
  const previousFill = doc.getFillColor();

  doc.setFillColor(255, 255, 255);
  doc.rect(x - quiet, y - quiet, size + 2 * quiet, size + 2 * quiet, "F");

  // Noir pur : c'est le contraste que cherche le décodeur, pas la couleur
  // d'encre du reste du document.
  doc.setFillColor(0, 0, 0);

  // Un rectangle par suite horizontale de modules sombres plutôt qu'un par
  // module : quelques centaines d'objets au lieu de quelques milliers, et plus
  // de liseré blanc entre deux modules voisins. Le débord de 0,01 mm couvre le
  // crénelage entre deux lignes dans les visionneuses écran.
  const BLEED = 0.01;

  for (let row = 0; row < symbol.moduleCount; row++) {
    let runStart = -1;

    for (let col = 0; col <= symbol.moduleCount; col++) {
      const dark = col < symbol.moduleCount && symbol.isDark(row, col);

      if (dark && runStart < 0) runStart = col;

      if (!dark && runStart >= 0) {
        doc.rect(
          x + runStart * module,
          y + row * module,
          (col - runStart) * module + BLEED,
          module + BLEED,
          "F",
        );
        runStart = -1;
      }
    }
  }

  doc.setFillColor(previousFill);
}
