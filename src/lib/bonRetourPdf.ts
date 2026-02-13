import { FileOpener } from "@capacitor-community/file-opener";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { BonDeRetour, CompanyProfile, UserProfile } from "@/db/types";

// Synchronous PDF generator (unchanged)
export function generateBonPDF(
  bon: BonDeRetour,
  com: CompanyProfile,
  us: UserProfile | null | undefined,
): jsPDF {
  const doc = new jsPDF();

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));

  // ✅ DRAW HEADER ONCE (PAGE 1)
  drawHeader(doc, bon, formatDate);

  function drawHeader(
    doc: jsPDF,
    bon: BonDeRetour,
    formatDate: (date: Date) => string,
  ) {
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("BON DE RETOUR PRODUIT", 105, 20, {
      align: "center",
      charSpace: 0.5,
    });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`N° ${bon.number || bon.id}`, 20, 35);

    doc.text(`Fait à ${bon.lieu} le ${formatDate(bon.createdAt)}`, 190, 35, {
      align: "right",
    });

    doc.setDrawColor(200, 200, 200);
    doc.line(20, 38, 190, 38);
  }

  const formatCurrency = (value: number) => {
    // First ensure value is a proper number
    const numValue = typeof value === "string" ? parseFloat(value) : value;

    // For TND: 3 decimal places, space as thousands separator, comma as decimal
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "TND",
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
      useGrouping: true,
    })
      .format(numValue)
      .replace(/\u202F/g, " "); // Replace non-breaking space with regular space if needed
  };

  function drawFooter(doc: jsPDF, page: number, totalPages: number) {
    const pageHeight = doc.internal.pageSize.height;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(128, 128, 128);

    doc.text(
      `Document généré par StockFlow — Page ${page} / ${totalPages}`,
      105,
      pageHeight - 10,
      { align: "center" },
    );
  }

  // Client Information Section
  const lineHeight = 6; // Reduced spacing for compact layout
  let currentY = 50;

  doc.setFontSize(10);

  // Client info lines with proper alignment
  const columnLabelWidth = 10; // Fixed width for labels - RENAMED

  ////////////Company Name ///////////////////////////
  doc.setFont("helvetica", "bold");
  doc.text(com.companyName, 10 + columnLabelWidth, currentY, {
    charSpace: 0.3,
  });
  currentY += lineHeight;

  ///////////address//////////////////
  doc.setFont("helvetica", "bold");
  doc.text(com.address, 10 + columnLabelWidth, currentY, {
    charSpace: 0.3,
  });
  currentY += lineHeight;

  ////////////MF//////////////
  doc.setFont("times", "bold");
  doc.text("MF:", 20, currentY);
  doc.setFont("helvetica", "normal");
  doc.text(com.matriculeFiscale, 18 + columnLabelWidth, currentY);
  currentY += lineHeight;

  //////GSM//////////////
  doc.setFont("times", "bold");
  doc.text("Tél:", 20, currentY);
  doc.setFont("italic", "normal");
  doc.text(com.phone, 17 + columnLabelWidth, currentY);
  currentY += lineHeight;

  // Table (Option A: simple columns, totals below)
  const tableData = bon.items.map((item, index) => [
    (index + 1).toString(),
    item.productName,
    item.quantity.toString(),
    formatCurrency(item.unitPriceHT ?? item.unitPrice ?? 0),
    formatCurrency(item.totalHT ?? item.totalPrice ?? 0),
  ]);

  autoTable(doc, {
    head: [["Code", "Désignation", "Quantité", "Prix Unitaire", "Montant"]],
    body: tableData,
    startY: currentY,
    theme: "grid",
    headStyles: {
      fillColor: [59, 77, 143],
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawHeader(doc, bon, formatDate);
      }
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { halign: "center", cellWidth: 15 },
      1: { halign: "center", cellWidth: 50 },
      2: { halign: "center", cellWidth: 35 },
      3: { halign: "center", cellWidth: 35 },
      4: { halign: "center", cellWidth: 35 },
    },
    margin: { left: 20, right: 20, top: 45 }, // This will center the table by setting equal margins
  });

  // Totals below table - Create a 2-column table for totals
  const finalY = (doc as any).lastAutoTable.finalY || 150;

  // Prepare totals data for the table
  const totalsData = [
    ["Total HT", formatCurrency(bon.totalHT ?? 0)],
    // ["TVA (19%)", formatCurrency(bon.totalTVA ?? 0)],
    // ["Total TTC", formatCurrency(bon.totalTTC ?? bon.totalAmount ?? 0)],
  ];

  autoTable(doc, {
    body: totalsData,
    startY: finalY + 2,
    theme: "grid", // You can use "grid", "striped", or "plain"
    tableWidth: 70,
    margin: { left: 120 }, // Position it to the right side
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    columnStyles: {
      0: {
        fontStyle: "bold",
        cellWidth: 35,
        halign: "left",
      },
      1: {
        cellWidth: 35,
        halign: "right",
        fontStyle: "normal",
      },
    },
  });

  // Get the final Y position after totals table
  const totalsTableFinalY = (doc as any).lastAutoTable.finalY || finalY + 50;
  const signatureY = totalsTableFinalY; // Position for signatures

  // Left side: Cachet et signature (Provider signature)
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");

  // Left side label
  doc.text("Description :", 20, signatureY - 5);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");

  // Right side label
  doc.text("Cachet et Signature", 150, signatureY + 30);

  // Right side line (shorter line for client)
  const rightLineStartX = 145;
  const rightLineEndX = 190;
  const rightLineY = signatureY + 40;
  doc.setDrawColor(200, 200, 200);
  doc.line(rightLineStartX, rightLineY, rightLineEndX, rightLineY);

  // Now handle the description text with proper line wrapping
  if (bon.description && bon.description.trim() !== "") {
    const descriptionText = bon.description;

    // Set font for description
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9); // Slightly smaller font for description

    // Define text area constraints
    const maxWidth = 90; // Maximum width in mm (from left margin to before signature area)
    const lineHeight = 5; // Line height in mm
    const descriptionStartX = 20;
    let descriptionStartY = signatureY + lineHeight - 5;

    // Split text into lines that fit within maxWidth
    const splitText = doc.splitTextToSize(descriptionText, maxWidth);

    // Draw each line
    for (let i = 0; i < splitText.length; i++) {
      // Check if we're going to run into the signature area
      if (descriptionStartX + doc.getTextWidth(splitText[i]) > 140) {
        // If text is too long for one line, it will be split by splitTextToSize
        // But we should also check if we're getting too close to signature
        if (descriptionStartY > rightLineY + 20) {
          // We're getting too low, maybe create a new page or truncate
          break;
        }
      }

      // Draw the line
      doc.text(splitText[i], descriptionStartX, descriptionStartY);

      // Move to next line
      descriptionStartY += lineHeight;

      // Check if we need to go to a new page
      if (descriptionStartY > 280) {
        doc.addPage();
        descriptionStartY = 20;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
      }
    }
  }

  const totalPages = doc.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages);
  }

  return doc;
}

// Browser-specific PDF download
function downloadPDFInBrowser(doc: jsPDF, fileName: string) {
  // Create a blob from the PDF
  const pdfBlob = doc.output("blob");

  // Create download link
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;

  // Append to body, click and remove
  document.body.appendChild(link);
  link.click();

  // Clean up
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

// Browser-specific PDF print
function printPDFInBrowser(doc: jsPDF) {
  // Create a blob and open in new window for printing
  const pdfBlob = doc.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);

  const printWindow = window.open(pdfUrl, "_blank");

  if (printWindow) {
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }

  // Clean up URL after a delay
  setTimeout(() => {
    URL.revokeObjectURL(pdfUrl);
  }, 1000);
}

// Browser-specific PDF share
async function sharePDFInBrowser(doc: jsPDF, fileName: string) {
  try {
    if (navigator.share && navigator.canShare) {
      // Convert PDF to blob
      const pdfBlob = doc.output("blob");

      // Create a File object
      const pdfFile = new File([pdfBlob], fileName, {
        type: "application/pdf",
      });

      // Check if we can share files
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: "Bon de retour PDF",
          text: "Votre bon de retour est prêt",
          files: [pdfFile],
        });
      } else {
        // Fallback to download
        downloadPDFInBrowser(doc, fileName);
      }
    } else {
      // Fallback to download if Web Share API is not available
      downloadPDFInBrowser(doc, fileName);
    }
  } catch (error) {
    console.error("Error sharing PDF in browser:", error);
    // Fallback to download
    downloadPDFInBrowser(doc, fileName);
  }
}

// Unified download function that works on both platforms
export async function downloadBonPDF(
  bon: BonDeRetour,
  com: CompanyProfile | null | undefined,
  us: UserProfile | null | undefined,
) {
  if (!com) {
    throw new Error("Company profile is required to generate the PDF");
  }
  const doc = generateBonPDF(bon, com, us);
  const fileName = `bon_Retour_${bon.id ?? bon.number}_${Date.now()}.pdf`;

  // Check if we're in a native mobile app or browser
  if (Capacitor.isNativePlatform()) {
    // Native mobile code (existing code)
    const pdfOutput = doc.output("arraybuffer");
    const bytes = new Uint8Array(pdfOutput);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const pdfBase64 = btoa(binary);

    // Write file
    const result = await Filesystem.writeFile({
      path: fileName,
      data: pdfBase64,
      directory: Directory.Documents,
      recursive: true,
    });

    console.log("File written:", result);

    // Get URI
    const uriResult = await Filesystem.getUri({
      directory: Directory.Documents,
      path: fileName,
    });

    console.log("File URI:", uriResult.uri);

    // Open file
    await FileOpener.open({
      filePath: uriResult.uri,
      contentType: "application/pdf",
    });

    // Share
    await Share.share({
      title: "Bon de retour PDF",
      text: "Votre bon de retour est prêt",
      url: uriResult.uri,
    });
  } else {
    // Browser code
    downloadPDFInBrowser(doc, fileName);
  }
}

// Unified print function that works on both platforms
export async function printBon(
  bon: BonDeRetour,
  com: CompanyProfile | null | undefined,
  us: UserProfile | null | undefined,
) {
  if (!com) {
    throw new Error("Company profile is required to generate the PDF");
  }
  const doc = generateBonPDF(bon, com, us);
  const fileName = `bon_retour_${bon.id ?? bon.number}_${Date.now()}.pdf`;

  if (Capacitor.isNativePlatform()) {
    // Native mobile code (existing code)
    const pdfOutput = doc.output("arraybuffer");
    const bytes = new Uint8Array(pdfOutput);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const pdfBase64 = btoa(binary);

    // Write file
    await Filesystem.writeFile({
      path: fileName,
      data: pdfBase64,
      directory: Directory.Documents,
      recursive: true,
    });

    // Open file for printing
    await FileOpener.open({
      filePath: `file:///storage/emulated/0/Documents/${fileName}`,
      contentType: "application/pdf",
    });
  } else {
    // Browser code
    printPDFInBrowser(doc);
  }
}

// Unified share function that works on both platforms
export async function shareBonPDF(
  bon: BonDeRetour,
  com: CompanyProfile | null | undefined,
  us: UserProfile | null | undefined,
) {
  if (!com) {
    throw new Error("Company profile is required to generate the PDF");
  }
  const doc = generateBonPDF(bon, com, us);
  const fileName = `bon_retour_${bon.id ?? bon.number}_${Date.now()}.pdf`;

  if (Capacitor.isNativePlatform()) {
    // Native mobile code (existing code)
    const pdfOutput = doc.output("arraybuffer");
    const bytes = new Uint8Array(pdfOutput);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const pdfBase64 = btoa(binary);

    // Write file
    await Filesystem.writeFile({
      path: fileName,
      data: pdfBase64,
      directory: Directory.Documents,
      recursive: true,
    });

    // Get URI
    const uriResult = await Filesystem.getUri({
      directory: Directory.Documents,
      path: fileName,
    });

    // Share
    await Share.share({
      title: "Bon de retour PDF",
      text: "Votre bon de retour est prêt",
      url: uriResult.uri,
    });
  } else {
    // Browser code
    await sharePDFInBrowser(doc, fileName);
  }
}
