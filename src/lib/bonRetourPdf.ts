import type { BonDeRetour, CompanyProfile, UserProfile } from "@/db/types";
import { drawQrCode, encodeQr, type QrSymbol } from "@/lib/pdfQrCode";
import {
  bonRetourControlCode,
  buildBonRetourQrText,
  RETOUR_QR_MAX_MODULES,
} from "@/lib/bonRetourQr";
import { FileOpener } from "@capacitor-community/file-opener";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* -------------------------------------------------------------------------- */
/*  Mise en page — bon de retour tunisien (A4 portrait, mm)                    */
/* -------------------------------------------------------------------------- */
/*
 * Même système que les deux autres bons : carte identité à gauche, colonne de
 * titre au centre, QR à droite, en-tête et pied redessinés sur chaque page. Ce
 * qui change tient à la nature du document — la marchandise fait le chemin
 * inverse. Il n'est donc pas valorisé (l'avoir viendra ensuite chiffrer le
 * retour), il n'a pas de destinataire, et il porte deux blocs qui lui sont
 * propres : le motif du retour et le traitement à cocher à la réception.
 */

const PAGE_W = 210;
const PAGE_H = 297;
const M = 15; // marge gauche / droite
const RIGHT = PAGE_W - M; // 195
const CONTENT_W = PAGE_W - 2 * M; // 180

const FOOTER_H = 22; // bandeau réservé en bas de page

// Espace insécable : présent dans l'encodage WinAnsi de jsPDF. Désigné par son
// point de code, l'écrire tel quel rendrait la source illisible.
const NB = String.fromCharCode(0x00a0);

// Espaces qu'Intl peut glisser dans un nombre et dont jsPDF n'a pas le glyphe :
// laissées telles quelles, elles s'impriment en carrés vides.
const THIN_SPACES = [0x202f, 0x2009].map((c) => String.fromCharCode(c));

type RGB = [number, number, number];

const INK: RGB = [33, 37, 41];
const MUTED: RGB = [110, 116, 124];
const HAIRLINE: RGB = [176, 183, 191];
const ACCENT: RGB = [59, 77, 143];
const ZEBRA: RGB = [245, 247, 250];

/* -------------------------------------------------------------------------- */
/*  Générateur synchrone                                                       */
/* -------------------------------------------------------------------------- */

export function generateBonPDF(
  bon: BonDeRetour,
  com: CompanyProfile,
  us: UserProfile | null | undefined,
): jsPDF {
  const doc = new jsPDF();

  /* ----- Helpers ---------------------------------------------------------- */

  /** Renvoie une chaîne sûre : jamais undefined/null (doc.text lève sinon). */
  const txt = (v: unknown): string =>
    v === undefined || v === null ? "" : String(v).trim();

  const has = (v: unknown): boolean => txt(v).length > 0;

  const toDate = (d: Date | string | number): Date =>
    d instanceof Date ? d : new Date(d);

  const formatDate = (d: Date | string | number) =>
    new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(toDate(d));

  const winAnsiSpaces = (s: string) =>
    THIN_SPACES.reduce((acc, space) => acc.split(space).join(NB), s);

  const formatQty = (value: unknown) => {
    const n = typeof value === "number" ? value : parseFloat(String(value));
    return winAnsiSpaces(
      new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(
        Number.isFinite(n) ? n : 0,
      ),
    );
  };

  const setColor = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const setStroke = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);

  /** Interligne de `doc.text` pour une taille donnée, en mm. */
  const lineHeightMm = (size: number) => (size * 1.15) / (72 / 25.4);

  /**
   * Découpe la valeur en fonction de la largeur réellement occupée par
   * l'étiquette. Ne dessine rien : sert à mesurer avant de tracer un cadre.
   */
  const wrapLabelValue = (
    label: string,
    value: string,
    maxWidth: number,
    size = 8.5,
  ) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", "bold");
    const labelW = doc.getTextWidth(label) + 1.5;
    doc.setFont("helvetica", "normal");
    const lines: string[] = doc.splitTextToSize(
      value,
      Math.max(12, maxWidth - labelW),
    );
    return { labelW, lines };
  };

  /** Étiquette en gras + valeur en normal, renvoie le nombre de lignes tracées. */
  const labelValue = (
    label: string,
    value: string,
    x: number,
    y: number,
    maxWidth: number,
    size = 8.5,
  ) => {
    const { labelW, lines } = wrapLabelValue(label, value, maxWidth, size);
    doc.setFontSize(size);
    doc.setFont("helvetica", "bold");
    setColor(INK);
    doc.text(label, x, y);
    doc.setFont("helvetica", "normal");
    setColor(MUTED);
    doc.text(lines, x + labelW, y);
    return lines.length;
  };

  /* ----- Données société (tous les champs sont facultatifs en base) -------- */

  const companyName = has(com.companyName)
    ? txt(com.companyName)
    : "Votre entreprise";

  const addressFull = [txt(com.address), txt(com.city)]
    .filter((s) => s.length > 0)
    .join(" – ");

  const identity: Array<[string, string]> = [];
  if (has(addressFull)) identity.push([`Adresse${NB}:`, addressFull]);
  if (has(com.matriculeFiscale))
    identity.push([`M.F.${NB}:`, txt(com.matriculeFiscale)]);
  if (has(com.phone)) identity.push([`Tél.${NB}:`, txt(com.phone)]);
  if (has(com.email)) identity.push([`E-mail${NB}:`, txt(com.email)]);

  /* ----- Logo : ratio préservé, type sniffé (le "PNG" codé en dur ment) --- */

  const LOGO_MAX_W = 20;
  const LOGO_MAX_H = 14;
  let logo: { data: string; format: string; w: number; h: number } | null =
    null;

  if (has(com.logo)) {
    try {
      const props = doc.getImageProperties(com.logo as string);
      const ratio = props.height / props.width;
      let w = LOGO_MAX_W;
      let h = w * ratio;
      if (h > LOGO_MAX_H) {
        h = LOGO_MAX_H;
        w = h / ratio;
      }
      logo = { data: com.logo as string, format: props.fileType, w, h };
    } catch (error) {
      // Type non supporté (SVG/TIFF) ou data-URL non base64 : on continue sans.
      console.warn("Logo ignoré dans le PDF :", error);
    }
  }

  /* ----- Géométrie de l'en-tête (identique sur toutes les pages) ---------- */

  // Même largeur que sur le bon de livraison : « BON DE RETOUR » réclame sa
  // place au centre, et la carte reste assez large pour l'adresse.
  const IDENT_X = M;
  const IDENT_Y = 12;
  const IDENT_W = 86;
  const identTextX = IDENT_X + 4 + (logo ? LOGO_MAX_W + 4 : 0);
  const identNameY = IDENT_Y + 8;
  const identFirstLineY = IDENT_Y + 15;
  const IDENT_LINE_STEP = 4.6;

  const identInnerW = IDENT_X + IDENT_W - 4 - identTextX;

  // Une valeur longue passe à la ligne : la hauteur du cadre suit.
  const identityLines = identity.reduce(
    (n, [label, value]) =>
      n + wrapLabelValue(label, value, identInnerW).lines.length,
    0,
  );

  const identTextBottom =
    identityLines > 0
      ? identFirstLineY + (identityLines - 1) * IDENT_LINE_STEP
      : identNameY;
  const identLogoBottom = logo ? IDENT_Y + 4 + logo.h : IDENT_Y;
  const IDENT_H = Math.max(identTextBottom, identLogoBottom) - IDENT_Y + 5;

  /* ----- QR code : le bon lui-même, lisible hors ligne -------------------- */

  // Un cran plus large que sur le bon de sortie : la charge utile porte en plus
  // le motif, la grille est plus dense, et le module imprimé resterait sinon en
  // dessous de ce qu'un téléphone lit au bord de la route.
  const QR_SIZE = 24;
  const QR_X = RIGHT - QR_SIZE;
  const QR_Y = IDENT_Y;
  const QR_CAPTION_Y = QR_Y + QR_SIZE + 3.5;

  let qr: QrSymbol | null = null;
  let controlCode = "";

  try {
    controlCode = bonRetourControlCode(bon, com);
    qr = encodeQr(buildBonRetourQrText(bon, com), RETOUR_QR_MAX_MODULES);
  } catch (error) {
    // Le bon doit sortir même sans QR : la marchandise, elle, part quand même.
    console.warn("QR code ignoré dans le PDF :", error);
    qr = null;
  }

  const qrBottom = qr ? QR_CAPTION_Y : IDENT_Y;

  const RULE_Y = Math.max(IDENT_Y + IDENT_H, qrBottom, 46) + 5;
  const HEADER_H = RULE_Y + 6; // = margin.top des pages de continuation

  const docNumber = has(bon.number) ? txt(bon.number) : txt(bon.id);
  const dateline = has(bon.lieu)
    ? `Fait à ${txt(bon.lieu)}, le ${formatDate(bon.createdAt)}`
    : `Le ${formatDate(bon.createdAt)}`;

  /* ----- Bloc titre : ce que le QR laisse comme largeur ------------------- */

  const TITLE = "BON DE RETOUR";
  const SUBTITLE = "Document accompagnant la marchandise retournée";
  const TITLE_CHAR_SPACE = 0.6;

  // Colonne du milieu : entre le cadre identité et le QR. Son axe, et non celui
  // de la page, sert de repère commun au titre et à tout ce qui le suit.
  const titleLeft = IDENT_X + IDENT_W;
  const titleRight = qr ? QR_X - 4 : RIGHT;
  const titleCx = (titleLeft + titleRight) / 2;
  const titleMaxW = titleRight - titleLeft - 4;

  /** Plus grande taille (par pas de 0,5 pt) à laquelle le texte tient. */
  const fitFontSize = (
    text: string,
    maxWidth: number,
    style: "bold" | "normal",
    from: number,
    to: number,
    charSpace = 0,
  ) => {
    doc.setFont("helvetica", style);
    for (let size = from; size > to; size -= 0.5) {
      doc.setFontSize(size);
      if (doc.getTextWidth(text) + charSpace * text.length <= maxWidth) {
        return size;
      }
    }
    return to;
  };

  const titleSize = fitFontSize(
    TITLE,
    titleMaxW,
    "bold",
    17,
    11,
    TITLE_CHAR_SPACE,
  );
  const subtitleSize = fitFontSize(SUBTITLE, titleMaxW, "normal", 7, 5.5);
  const numberSize = fitFontSize(
    `N°${NB}${docNumber}`,
    titleMaxW,
    "bold",
    10,
    7,
  );
  const datelineSize = fitFontSize(dateline, titleMaxW, "normal", 9, 6.5);

  /* ----- En-tête de page -------------------------------------------------- */

  const drawPageHeader = () => {
    // Cadre identité société
    setStroke(HAIRLINE);
    doc.setLineWidth(0.3);
    doc.roundedRect(IDENT_X, IDENT_Y, IDENT_W, IDENT_H, 2, 2, "D");

    if (logo) {
      try {
        doc.addImage(
          logo.data,
          logo.format,
          IDENT_X + 4,
          IDENT_Y + 4,
          logo.w,
          logo.h,
          "companyLogo",
          "FAST",
        );
      } catch (error) {
        console.warn("Logo ignoré dans le PDF :", error);
      }
    }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    setColor(INK);
    doc.text(
      doc.splitTextToSize(companyName, identInnerW)[0] as string,
      identTextX,
      identNameY,
    );

    let identY = identFirstLineY;
    identity.forEach(([label, value]) => {
      const drawn = labelValue(label, value, identTextX, identY, identInnerW);
      identY += drawn * IDENT_LINE_STEP;
    });

    // Titre + références (colonne du centre)
    doc.setFontSize(titleSize);
    doc.setFont("helvetica", "bold");
    setColor(ACCENT);
    // jsPDF mesure les polices standard sans tenir compte du charSpace : avec
    // align "center" le titre lettré partirait vers la droite du sous-titre.
    // On calcule donc l'encombrement réel et on centre nous-mêmes.
    const titleW =
      doc.getTextWidth(TITLE) + TITLE_CHAR_SPACE * (TITLE.length - 1);
    doc.text(TITLE, titleCx - titleW / 2, IDENT_Y + 9, {
      charSpace: TITLE_CHAR_SPACE,
    });

    doc.setFontSize(subtitleSize);
    doc.setFont("helvetica", "normal");
    setColor(MUTED);
    doc.text(SUBTITLE, titleCx, IDENT_Y + 14, { align: "center" });

    doc.setFontSize(numberSize);
    doc.setFont("helvetica", "bold");
    setColor(INK);
    doc.text(`N°${NB}${docNumber}`, titleCx, IDENT_Y + 23, {
      align: "center",
    });

    doc.setFontSize(datelineSize);
    doc.setFont("helvetica", "normal");
    setColor(MUTED);
    doc.text(dateline, titleCx, IDENT_Y + 29, { align: "center" });

    // QR code + code de contrôle (colonne de droite)
    if (qr) {
      drawQrCode(doc, qr, { x: QR_X, y: QR_Y, size: QR_SIZE });

      if (controlCode) {
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        setColor(MUTED);
        doc.text(
          `Contrôle${NB}: ${controlCode}`,
          QR_X + QR_SIZE / 2,
          QR_CAPTION_Y,
          { align: "center" },
        );
      }
    }

    // Filet de séparation
    setStroke(ACCENT);
    doc.setLineWidth(0.6);
    doc.line(M, RULE_Y, RIGHT, RULE_Y);
  };

  /* ----- Pied de page ----------------------------------------------------- */

  const footerLine = [
    companyName,
    has(com.matriculeFiscale)
      ? `M.F.${NB}: ${txt(com.matriculeFiscale)}`
      : "",
    addressFull,
    has(com.phone) ? `Tél.${NB}: ${txt(com.phone)}` : "",
  ]
    .filter((s) => s.length > 0)
    .join("  –  ");

  const drawPageFooter = (pageNumber: number, totalPages: number) => {
    setStroke(HAIRLINE);
    doc.setLineWidth(0.3);
    doc.line(M, PAGE_H - 16, RIGHT, PAGE_H - 16);

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    setColor(MUTED);

    const lines: string[] = doc.splitTextToSize(footerLine, CONTENT_W - 30);
    doc.text(lines[0] ?? "", PAGE_W / 2, PAGE_H - 11, { align: "center" });

    doc.text(`Page ${pageNumber} / ${totalPages}`, RIGHT, PAGE_H - 11, {
      align: "right",
    });
  };

  /* ----- Tableau des articles --------------------------------------------- */

  const items = Array.isArray(bon.items) ? bon.items : [];

  // Bon de retour non valorisé : il constate le mouvement de la marchandise, il
  // ne la chiffre pas. Aucun prix, aucune TVA, aucun total monétaire ne doit y
  // figurer — c'est l'avoir, émis ensuite, qui porte les montants.
  const tableData = items.map((item, index) => [
    String(index + 1),
    txt(item.productName),
    formatQty(item.quantity),
  ]);

  autoTable(doc, {
    head: [["N°", "Désignation", "Qté retournée"]],
    body: tableData.length > 0 ? tableData : [["", "—", ""]],
    startY: HEADER_H,
    theme: "grid",
    showHead: "everyPage",
    // Une ligne d'article ne doit jamais être coupée en deux par un saut de page.
    rowPageBreak: "avoid",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 2.2,
      lineColor: HAIRLINE,
      lineWidth: 0.15,
      textColor: INK,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: ACCENT,
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
      valign: "middle",
    },
    alternateRowStyles: { fillColor: ZEBRA },
    columnStyles: {
      0: { halign: "center", cellWidth: 14 },
      1: { halign: "left", cellWidth: 132 },
      2: { halign: "center", cellWidth: 34 },
    },
    margin: { top: HEADER_H, right: M, bottom: FOOTER_H, left: M },
    // willDrawPage précède la ligne d'en-tête répétée -> l'endroit correct.
    willDrawPage: () => drawPageHeader(),
  });

  let y =
    ((doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ??
      HEADER_H) + 8;

  /** Passe à la page suivante si `needed` mm ne tiennent pas sous `y`. */
  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_H - FOOTER_H) {
      doc.addPage();
      drawPageHeader();
      y = HEADER_H;
    }
  };

  /* ----- Motif du retour --------------------------------------------------- */

  // Ce qui distingue ce bon des deux autres : la marchandise revient, et le
  // papier doit dire pourquoi. Le cadre occupe toute la largeur.
  const MOTIF_PAD = 4;
  const MOTIF_SIZE = 9;
  const MOTIF_LINE = lineHeightMm(MOTIF_SIZE);
  const MOTIF_HEAD = 11; // du haut du cadre à la ligne de base du premier texte

  if (has(bon.description)) {
    doc.setFontSize(MOTIF_SIZE);
    doc.setFont("helvetica", "normal");
    let rest: string[] = doc.splitTextToSize(
      txt(bon.description),
      CONTENT_W - 2 * MOTIF_PAD,
    );

    // Le motif est saisi librement : rien ne garantit qu'il tienne sur ce qui
    // reste de la page, ni même sur une page entière. On le débite en tranches
    // et le cadre se referme au bas de chacune.
    let first = true;
    while (rest.length > 0) {
      const room = PAGE_H - FOOTER_H - y - MOTIF_HEAD - 2;
      const fits = Math.floor(room / MOTIF_LINE);

      if (fits < 1) {
        doc.addPage();
        drawPageHeader();
        y = HEADER_H;
        continue;
      }

      const chunk = rest.slice(0, fits);
      rest = rest.slice(fits);

      const MOTIF_H = MOTIF_HEAD + (chunk.length - 1) * MOTIF_LINE + 4;

      setStroke(HAIRLINE);
      doc.setLineWidth(0.3);
      doc.roundedRect(M, y, CONTENT_W, MOTIF_H, 2, 2, "D");

      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      setColor(ACCENT);
      doc.text(
        first ? "MOTIF DU RETOUR" : "MOTIF DU RETOUR (SUITE)",
        M + MOTIF_PAD,
        y + 5,
        { charSpace: 0.4 },
      );

      doc.setFontSize(MOTIF_SIZE);
      doc.setFont("helvetica", "normal");
      setColor(INK);
      doc.text(chunk, M + MOTIF_PAD, y + MOTIF_HEAD);

      y += MOTIF_H + 8;
      first = false;
    }
  }

  /* ----- Traitement du retour ---------------------------------------------- */

  // Le sort de la marchandise se décide à la réception, pas à la saisie : la
  // ligne part avec ses cases vides et se coche au stylo. Le carré est tracé en
  // vectoriel — l'encodage WinAnsi de jsPDF n'a pas de glyphe de case à cocher.
  const TREAT_LABEL = `Traitement du retour${NB}:`;
  const TREAT_OPTIONS = ["Remise en stock", "Échange", "Avoir", "Mise au rebut"];
  const TREAT_BOX = 3; // côté de la case à cocher
  const TREAT_GAP = 1.8; // entre une case et son libellé
  const TREAT_PAD = 4;
  const TREAT_H = 12;

  /** Encombrement de la ligne entière, cases et écarts compris. */
  const treatWidth = (size: number, gap: number) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", "bold");
    let w = doc.getTextWidth(TREAT_LABEL);
    doc.setFont("helvetica", "normal");
    for (const option of TREAT_OPTIONS) {
      w += gap + TREAT_BOX + TREAT_GAP + doc.getTextWidth(option);
    }
    return w;
  };

  // Les libellés sont fixes mais la ligne doit tenir quoi qu'il arrive : on
  // resserre, puis on rapetisse, plutôt que de laisser filer hors du cadre.
  let treatSize = 9;
  let treatGap = 7;
  while (
    treatWidth(treatSize, treatGap) > CONTENT_W - 2 * TREAT_PAD &&
    treatSize > 6.5
  ) {
    if (treatGap > 3) treatGap -= 0.5;
    else treatSize -= 0.5;
  }

  ensureSpace(TREAT_H);

  setStroke(HAIRLINE);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, CONTENT_W, TREAT_H, 2, 2, "D");

  const treatBaseline = y + TREAT_H / 2 + (treatSize * 0.35) / (72 / 25.4);
  let treatX = M + TREAT_PAD;

  doc.setFontSize(treatSize);
  doc.setFont("helvetica", "bold");
  setColor(INK);
  doc.text(TREAT_LABEL, treatX, treatBaseline);
  treatX += doc.getTextWidth(TREAT_LABEL);

  doc.setFont("helvetica", "normal");
  for (const option of TREAT_OPTIONS) {
    treatX += treatGap;

    setStroke(INK);
    doc.setLineWidth(0.25);
    doc.rect(treatX, treatBaseline - TREAT_BOX + 0.4, TREAT_BOX, TREAT_BOX, "D");
    treatX += TREAT_BOX + TREAT_GAP;

    setColor(INK);
    doc.text(option, treatX, treatBaseline);
    treatX += doc.getTextWidth(option);
  }

  y += TREAT_H + 8;

  /* ----- Transport et signature -------------------------------------------- */

  const BOX_GAP = 6;
  const BOX_W = (CONTENT_W - BOX_GAP) / 2;
  const BOX_PAD = 4;
  const BOX_LINE = 4.6;

  const transportRows: Array<[string, string]> = [
    [
      `Transporteur${NB}:`,
      has(com.transporteurCoordonnees) ? txt(com.transporteurCoordonnees) : "—",
    ],
    [
      `Plaque${NB}:`,
      has(com.plaqueImmatriculation) ? txt(com.plaqueImmatriculation) : "—",
    ],
  ];

  const transportLines = transportRows.reduce(
    (n, [label, value]) =>
      n + wrapLabelValue(label, value, BOX_W - 2 * BOX_PAD).lines.length,
    0,
  );

  // Les deux cadres partagent la même hauteur : celle du plus exigeant.
  const BOX_H = Math.max(30, 11 + transportLines * BOX_LINE + 3);

  ensureSpace(BOX_H);

  const drawBoxFrame = (x: number, title: string) => {
    setStroke(HAIRLINE);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, BOX_W, BOX_H, 2, 2, "D");

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    setColor(ACCENT);
    doc.text(title.toUpperCase(), x + BOX_PAD, y + 5, { charSpace: 0.4 });
  };

  // Cadre gauche : transport
  drawBoxFrame(M, "Transport");

  let rowY = y + 11;
  for (const [label, value] of transportRows) {
    const drawn = labelValue(label, value, M + BOX_PAD, rowY, BOX_W - 2 * BOX_PAD);
    rowY += drawn * BOX_LINE;
  }

  // Cadre droit : celui qui reprend la marchandise signe
  const RIGHT_BOX_X = M + BOX_W + BOX_GAP;
  drawBoxFrame(RIGHT_BOX_X, "Cachet et signature");

  if (has(us?.fullName)) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    setColor(MUTED);
    doc.text(
      doc.splitTextToSize(
        txt(us?.fullName),
        BOX_W - 2 * BOX_PAD,
      )[0] as string,
      RIGHT_BOX_X + BOX_PAD,
      y + 11,
    );
  }

  setStroke(HAIRLINE);
  doc.setLineWidth(0.25);
  doc.line(
    RIGHT_BOX_X + BOX_PAD,
    y + BOX_H - 5,
    RIGHT_BOX_X + BOX_W - BOX_PAD,
    y + BOX_H - 5,
  );

  /* ----- Pieds de page (une fois le nombre total de pages connu) ---------- */

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawPageFooter(i, totalPages);
  }

  return doc;
}

/* -------------------------------------------------------------------------- */
/*  Export : navigateur                                                        */
/* -------------------------------------------------------------------------- */

function downloadPDFInBrowser(doc: jsPDF, fileName: string) {
  const pdfBlob = doc.output("blob");

  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

function printPDFInBrowser(doc: jsPDF) {
  const pdfBlob = doc.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);

  const printWindow = window.open(pdfUrl, "_blank");

  if (printWindow) {
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }

  setTimeout(() => {
    URL.revokeObjectURL(pdfUrl);
  }, 1000);
}

async function sharePDFInBrowser(doc: jsPDF, fileName: string) {
  try {
    if (navigator.share && navigator.canShare) {
      const pdfBlob = doc.output("blob");

      const pdfFile = new File([pdfBlob], fileName, {
        type: "application/pdf",
      });

      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: "Bon de retour PDF",
          text: "Votre bon de retour est prêt",
          files: [pdfFile],
        });
      } else {
        downloadPDFInBrowser(doc, fileName);
      }
    } else {
      downloadPDFInBrowser(doc, fileName);
    }
  } catch (error) {
    console.error("Error sharing PDF in browser:", error);
    downloadPDFInBrowser(doc, fileName);
  }
}

/* -------------------------------------------------------------------------- */
/*  Export : API unifiée navigateur / natif                                    */
/* -------------------------------------------------------------------------- */

function toBase64(doc: jsPDF): string {
  const bytes = new Uint8Array(doc.output("arraybuffer"));
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function buildFileName(bon: BonDeRetour): string {
  const ref = String(bon.number ?? bon.id ?? "sans-numero").replace(
    /[^a-zA-Z0-9_-]/g,
    "-",
  );
  return `bon_retour_${ref}_${Date.now()}.pdf`;
}

async function writeToDocuments(doc: jsPDF, fileName: string): Promise<string> {
  await Filesystem.writeFile({
    path: fileName,
    data: toBase64(doc),
    directory: Directory.Documents,
    recursive: true,
  });

  const uriResult = await Filesystem.getUri({
    directory: Directory.Documents,
    path: fileName,
  });

  return uriResult.uri;
}

export async function downloadBonPDF(
  bon: BonDeRetour,
  com: CompanyProfile | null | undefined,
  us: UserProfile | null | undefined,
) {
  if (!com) {
    throw new Error("Company profile is required to generate the PDF");
  }

  const doc = generateBonPDF(bon, com, us);
  const fileName = buildFileName(bon);

  if (Capacitor.isNativePlatform()) {
    const uri = await writeToDocuments(doc, fileName);

    await FileOpener.open({
      filePath: uri,
      contentType: "application/pdf",
    });

    await Share.share({
      title: "Bon de retour PDF",
      text: "Votre bon de retour est prêt",
      url: uri,
    });
  } else {
    downloadPDFInBrowser(doc, fileName);
  }
}

export async function printBon(
  bon: BonDeRetour,
  com: CompanyProfile | null | undefined,
  us: UserProfile | null | undefined,
) {
  if (!com) throw new Error("Company profile is required to print the PDF");

  const doc = generateBonPDF(bon, com, us);
  const fileName = buildFileName(bon);

  if (Capacitor.isNativePlatform()) {
    const uri = await writeToDocuments(doc, fileName);

    await FileOpener.open({
      filePath: uri,
      contentType: "application/pdf",
    });
  } else {
    printPDFInBrowser(doc);
  }
}

export async function shareBonPDF(
  bon: BonDeRetour,
  com: CompanyProfile | null | undefined,
  us: UserProfile | null | undefined,
) {
  if (!com) throw new Error("Company profile is required to share the PDF");

  const doc = generateBonPDF(bon, com, us);
  const fileName = buildFileName(bon);

  if (Capacitor.isNativePlatform()) {
    const uri = await writeToDocuments(doc, fileName);

    await Share.share({
      title: "Bon de retour PDF",
      text: "Votre bon de retour est prêt",
      url: uri,
    });
  } else {
    await sharePDFInBrowser(doc, fileName);
  }
}
