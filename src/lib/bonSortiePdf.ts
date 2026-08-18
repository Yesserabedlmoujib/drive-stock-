import type { BonDeSortie, CompanyProfile, UserProfile } from "@/db/types";
import { bonSortieControlCode, buildBonSortieQrText } from "@/lib/bonSortieQr";
import { drawQrCode, encodeQr, type QrSymbol } from "@/lib/pdfQrCode";
import { FileOpener } from "@capacitor-community/file-opener";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* -------------------------------------------------------------------------- */
/*  Mise en page — bon de sortie tunisien (A4 portrait, mm)                    */
/* -------------------------------------------------------------------------- */

const PAGE_W = 210;
const PAGE_H = 297;
const M = 15; // marge gauche / droite
const RIGHT = PAGE_W - M; // 195
const CONTENT_W = PAGE_W - 2 * M; // 180

const FOOTER_H = 22; // bandeau réservé en bas de page

// Espace insécable : présent dans l'encodage WinAnsi de jsPDF.
// Ne jamais utiliser U+202F ni U+2009 (glyphes absents -> carres vides).
const NB = " ";

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
  bon: BonDeSortie,
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

  /** Quantite : le separateur de milliers d'Intl doit devenir un NBSP WinAnsi. */
  const formatQty = (value: unknown) => {
    const n = typeof value === "number" ? value : parseFloat(String(value));
    return new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 3,
    })
      .format(Number.isFinite(n) ? n : 0)
      .replace(/[\u202F\u2009]/g, NB);
  };

  const setColor = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const setStroke = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);

  /** Hauteur d'une ligne de texte, en mm, pour une taille de police donnée. */
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

  const IDENT_X = M;
  const IDENT_Y = 12;
  const IDENT_W = 96;
  const identTextX = IDENT_X + 4 + (logo ? LOGO_MAX_W + 4 : 0);
  const identNameY = IDENT_Y + 8;
  const identFirstLineY = IDENT_Y + 15;
  const IDENT_LINE_STEP = 4.6;

  const identTextBottom =
    identity.length > 0
      ? identFirstLineY + (identity.length - 1) * IDENT_LINE_STEP
      : identNameY;
  const identLogoBottom = logo ? IDENT_Y + 4 + logo.h : IDENT_Y;
  const IDENT_H = Math.max(identTextBottom, identLogoBottom) - IDENT_Y + 5;

  /* ----- QR code : le bon lui-même, lisible hors ligne -------------------- */

  // Coin haut-droit : la zone de silence déborde dans la marge de la page, qui
  // est blanche, donc la grille peut occuper toute la largeur allouée.
  const QR_SIZE = 22; // côté de la grille, hors zone de silence
  const QR_X = RIGHT - QR_SIZE;
  const QR_Y = IDENT_Y;
  const QR_CAPTION_Y = QR_Y + QR_SIZE + 3.5;

  let qr: QrSymbol | null = null;
  let controlCode = "";

  try {
    controlCode = bonSortieControlCode(bon, com);
    qr = encodeQr(buildBonSortieQrText(bon, com));
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

  const TITLE = "BON DE SORTIE";
  const SUBTITLE = "Document accompagnant la marchandise";
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
      doc.splitTextToSize(
        companyName,
        IDENT_X + IDENT_W - 4 - identTextX,
      )[0] as string,
      identTextX,
      identNameY,
    );

    identity.forEach(([label, value], i) => {
      labelValue(
        label,
        value,
        identTextX,
        identFirstLineY + i * IDENT_LINE_STEP,
        IDENT_X + IDENT_W - 4 - identTextX,
      );
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

  // Bon de sortie non valorisé : il accompagne la marchandise, il ne la facture
  // pas. Aucun prix, aucune TVA, aucun total monétaire ne doit y figurer.
  const tableData = items.map((item, index) => [
    String(index + 1),
    txt(item.productName),
    formatQty(item.quantity),
  ]);

  autoTable(doc, {
    head: [["N°", "Désignation", "Qté"]],
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
      1: { halign: "left", cellWidth: 136 },
      2: { halign: "center", cellWidth: 30 },
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

  /* ----- Expéditeur / Transporteur ---------------------------------------- */

  const BOX_GAP = 6;
  const BOX_W = (CONTENT_W - BOX_GAP) / 2;
  const BOX_PAD = 4;
  const LINE_H = lineHeightMm(8.5);
  const ROW_GAP = 3; // entre deux couples étiquette/valeur
  const LABEL_GAP = 2.2; // entre une étiquette et sa valeur

  const transporteurRows: Array<[string, string]> = [
    [
      `Coordonnées du transporteur${NB}:`,
      has(com.transporteurCoordonnees) ? txt(com.transporteurCoordonnees) : "—",
    ],
    [
      `N° de plaque d'immatriculation${NB}:`,
      has(com.plaqueImmatriculation) ? txt(com.plaqueImmatriculation) : "—",
    ],
  ];

  // Les étiquettes sont longues et le cadre étroit : on empile étiquette puis
  // valeur, et on mesure le retour à la ligne avant de tracer le cadre pour que
  // la valeur ne déborde jamais dessous.
  const transporteurWrapped = transporteurRows.map(([label, value]) => {
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    const lines: string[] = doc.splitTextToSize(value, BOX_W - 2 * BOX_PAD);
    return { label, lines };
  });

  const transporteurH = transporteurWrapped.reduce(
    (h, r) => h + LINE_H + LABEL_GAP + r.lines.length * LINE_H + ROW_GAP,
    0,
  ) - ROW_GAP;

  // Les deux cadres partagent la même hauteur.
  const BOX_H = Math.max(34, 7 + transporteurH + 5);

  ensureSpace(BOX_H);

  const drawBox = (x: number) => {
    setStroke(HAIRLINE);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, BOX_W, BOX_H, 2, 2, "D");
  };

  // Cadre gauche : expéditeur
  drawBox(M);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  setColor(INK);
  doc.text(
    doc.splitTextToSize(
      "Nom et prénom de l'expéditeur",
      BOX_W - 2 * BOX_PAD,
    ) as string[],
    M + BOX_PAD,
    y + 6,
  );

  if (has(us?.fullName)) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    setColor(INK);
    doc.text(
      doc.splitTextToSize(
        txt(us?.fullName),
        BOX_W - 2 * BOX_PAD,
      )[0] as string,
      M + BOX_PAD,
      y + 15,
    );
  }

  setStroke(HAIRLINE);
  doc.setLineWidth(0.25);
  doc.line(M + BOX_PAD, y + BOX_H - 5, M + BOX_W - BOX_PAD, y + BOX_H - 5);

  // Cadre droit : transporteur et immatriculation
  const RIGHT_BOX_X = M + BOX_W + BOX_GAP;
  drawBox(RIGHT_BOX_X);

  let rowY = y + 7;
  for (const { label, lines } of transporteurWrapped) {
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    setColor(INK);
    doc.text(label, RIGHT_BOX_X + BOX_PAD, rowY);

    doc.setFont("helvetica", "normal");
    setColor(MUTED);
    doc.text(lines, RIGHT_BOX_X + BOX_PAD, rowY + LINE_H + LABEL_GAP);

    rowY += LINE_H + LABEL_GAP + lines.length * LINE_H + ROW_GAP;
  }

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
          title: "Bon de sortie PDF",
          text: "Votre bon de sortie est prêt",
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

function buildFileName(bon: BonDeSortie): string {
  const ref = String(bon.number ?? bon.id ?? "sans-numero").replace(
    /[^a-zA-Z0-9_-]/g,
    "-",
  );
  return `bon_sortie_${ref}_${Date.now()}.pdf`;
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
  bon: BonDeSortie,
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
      title: "Bon de sortie PDF",
      text: "Votre bon de sortie est prêt",
      url: uri,
    });
  } else {
    downloadPDFInBrowser(doc, fileName);
  }
}

export async function printBon(
  bon: BonDeSortie,
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
  bon: BonDeSortie,
  com: CompanyProfile | null | undefined,
  us: UserProfile | null | undefined,
) {
  if (!com) throw new Error("Company profile is required to share the PDF");

  const doc = generateBonPDF(bon, com, us);
  const fileName = buildFileName(bon);

  if (Capacitor.isNativePlatform()) {
    const uri = await writeToDocuments(doc, fileName);

    await Share.share({
      title: "Bon de sortie PDF",
      text: "Votre bon de sortie est prêt",
      url: uri,
    });
  } else {
    await sharePDFInBrowser(doc, fileName);
  }
}
