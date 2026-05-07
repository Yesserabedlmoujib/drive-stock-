import { FileOpener } from "@capacitor-community/file-opener";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { BonDeSortie, CompanyProfile, UserProfile } from "@/db/types";

// Synchronous PDF generator (unchanged)
export function generateBonPDF(
  bon: BonDeSortie,
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
  const drawFooter = (doc: jsPDF, pageNumber: number, totalPages: number) => {
    const pageHeight = doc.internal.pageSize.height;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(128, 128, 128);

    doc.text("Document généré par StockFlow", 105, pageHeight - 10, {
      align: "center",
    });

    doc.text(`Page ${pageNumber} / ${totalPages}`, 190, pageHeight - 10, {
      align: "right",
    });
  };

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("BON DE SORTIE ", 105, 20, { align: "center", charSpace: 0.5 });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`N° ${bon.number || bon.id}`, 20, 35);

  doc.text(`Fait à ${bon.lieu} le ${formatDate(bon.createdAt)}`, 190, 35, {
    align: "right",
  });

  // Line
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 38, 190, 38);

  // Client Information Section
  const lineHeight = 6; // Reduced spacing for compact layout
  let currentY = 50;

  doc.setFontSize(10);

  // Client info lines with proper alignment
  const columnLabelWidth = 10; // Fixed width for labels - RENAMED

  // Check if company profile exists and has address

  ////////////Company Name ///////////////////////////
  doc.setFont("helvetica", "bold");
  (doc.text(com.companyName, 10 + columnLabelWidth, currentY),
    {
      charSpace: 0.3,
    });
  currentY += lineHeight;

  ///////////address//////////////////
  doc.setFont("helvetica", "normal");
  doc.text(com.address, 10 + columnLabelWidth, currentY);
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
    head: [["Code", "Désignation", "Quantité"]],
    body: tableData,
    startY: currentY,
    theme: "grid",
    headStyles: {
      fillColor: [59, 77, 143],
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { halign: "center", cellWidth: 15 },
      1: { halign: "left", cellWidth: 120 },
      2: { halign: "center", cellWidth: 35 },
    },
    margin: { left: 20, right: 20 },
  });

  // Get the final Y position after totals table
  const totalsTableFinalY = (doc as any).lastAutoTable.finalY || 150;
  const signatureY = totalsTableFinalY; // Position for signatures

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  // First, calculate the dimensions for the cadre
  const cadreX = 130; // Start X (a bit left of the text for padding)
  const cadreY = signatureY + 5; // Start Y (above the first text with some padding)
  const cadreWidth = 60; // Width of the cadre
  const cadreHeight = 38; // Height to cover all elements (text + lines)

  // Draw the cadre (border)
  doc.setDrawColor(150, 150, 150); // Grey color for the border
  doc.setLineWidth(0.25); // Thin border
  // doc.rect(cadreX, cadreY, cadreWidth, cadreHeight);
  doc.roundedRect(cadreX, cadreY, cadreWidth, cadreHeight, 3, 3, "D");

  // Right side label
  doc.text("Coordonnées du transporteur", 135, signatureY + 10);

  // Right side line (shorter line for client)
  const rightLineStartX = 140;
  const rightLineEndX = 180;
  const rightLineY = signatureY + 20;
  doc.setDrawColor(200, 200, 200);
  doc.line(rightLineStartX, rightLineY, rightLineEndX, rightLineY);

  // Right side label
  doc.text("N° de plaque d'immatriculation", 135, signatureY + 30);

  // Right side line (shorter line for client)
  const rightLineStartx = 140;
  const rightLineEndx = 180;
  const rightLiney = signatureY + 40;
  doc.setDrawColor(200, 200, 200);
  doc.line(rightLineStartx, rightLiney, rightLineEndx, rightLiney);

  // Left side cadre (same dimensions as right side)
  const leftCadreX = 15; // Adjust to match right side position relative to content
  const leftCadreY = signatureY + 5; // Same Y position
  const leftCadreWidth = 60; // Same width
  const leftCadreHeight = 38; // Same height

  // Draw the left cadre (border only, no fill)
  doc.setDrawColor(150, 150, 150); // Same grey color for the border
  doc.setLineWidth(0.25); // Same thin border
  doc.roundedRect(
    leftCadreX,
    leftCadreY,
    leftCadreWidth,
    leftCadreHeight,
    3,
    3,
    "D",
  );

  // Left side label
  doc.text("Nom et prénom d'expéditeur:", 22, signatureY + 13);

  // Left side line (shorter line for client)
  const leftLineStart = 25;
  const leftLineEnd = 65;
  const leftLineY = signatureY + 25;
  doc.setDrawColor(200, 200, 200);
  doc.line(leftLineStart, leftLineY, leftLineEnd, leftLineY);

  // Footer
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(128, 128, 128);
  // doc.text("Document généré par StockFlow", 105, 285, { align: "center" });

  const pageHeight = doc.internal.pageSize.height;
  doc.text("Document généré par StockFlow", 105, pageHeight - 10, {
    align: "center",
  });

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
          title: "Bon de sortie PDF",
          text: "Votre bon de sortie est prêt",
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
  bon: BonDeSortie,
  com: CompanyProfile | null | undefined,
  us: UserProfile | null | undefined,
) {
  {
    if (!com) {
      throw new Error("Company profile is required to generate the PDF");
    }

    const doc = generateBonPDF(bon, com, us);
    const fileName = `bon_sortie_${bon.id ?? bon.number}_${Date.now()}.pdf`;

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
        title: "Bon de sortie PDF",
        text: "Votre bon de sortie est prêt",
        url: uriResult.uri,
      });
    } else {
      // Browser code
      downloadPDFInBrowser(doc, fileName);
    }
  }
}

// Unified print function that works on both platforms
export async function printBon(
  bon: BonDeSortie,
  com: CompanyProfile | null | undefined,
  us: UserProfile | null | undefined,
) {
  if (!com) throw new Error("Company profile is required to print the PDF");

  const doc = generateBonPDF(bon, com, us);
  const fileName = `bon_sortie_${bon.id ?? bon.number}_${Date.now()}.pdf`;

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
    // await FileOpener.open({
    //   filePath: `file:///storage/emulated/0/Documents/${fileName}`,
    //   contentType: "application/pdf",
    // });

    const uriResult = await Filesystem.getUri({
      directory: Directory.Documents,
      path: fileName,
    });

    await FileOpener.open({
      filePath: uriResult.uri,
      contentType: "application/pdf",
    });
  } else {
    // Browser code
    printPDFInBrowser(doc);
  }
}

// Unified share function that works on both platforms
export async function shareBonPDF(
  bon: BonDeSortie,
  com: CompanyProfile | null | undefined,
  us: UserProfile | null | undefined,
) {
  if (!com) throw new Error("Company profile is required to share the PDF");
  const doc = generateBonPDF(bon, com, us);
  const fileName = `bon_sortie_${bon.id ?? bon.number}_${Date.now()}.pdf`;

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
      title: "Bon de sortie PDF",
      text: "Votre bon de sortie est prêt",
      url: uriResult.uri,
    });
  } else {
    // Browser code
    await sharePDFInBrowser(doc, fileName);
  }
}
