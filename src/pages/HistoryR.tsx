import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { bonDeRetourService } from "@/db/services/bonRetour.service";
import {
  companyProfileService,
  userProfileService,
} from "@/db/services/profile.service";
import type { BonDeRetour, CompanyProfile } from "@/db/types";

import { downloadBonPDF } from "@/lib/bonRetourPdf";
import {
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function History() {
  const { t } = useTranslation();
  const [bons, setBons] = useState<BonDeRetour[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deleteBon, setDeleteBon] = useState<BonDeRetour | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(
    null,
  );
  const [userProfile, setUserProfile] = useState(null); // Add this state

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load both bons and company profile in parallel
      const [bonsData, companyData] = await Promise.all([
        bonDeRetourService.getAll(),
        companyProfileService.get(),
        userProfileService.get(),
      ]);

      setBons(bonsData);
      setCompanyProfile(companyData ?? null); // convert undefined to null
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  // const formatCurrency = (value: number) => {
  //   return new Intl.NumberFormat("fr-FR", {
  //     style: "currency",
  //     currency: "TND",
  //   }).format(value);
  // };
  const formatCurrency = (value: number) => {
    return `${value.toFixed(2)} ${t("TND")}`;
  };

  const handleDownload = async (bon: BonDeRetour) => {
    try {
      const profile =
        companyProfile ?? (await companyProfileService.get()) ?? null;
      const user = userProfile ?? (await userProfileService.get()) ?? null;

      await downloadBonPDF(bon, profile || undefined, user || undefined);
      toast.success("PDF téléchargé");
    } catch (error) {
      console.error("Failed to download PDF:", error);
      toast.error("Erreur lors du téléchargement du PDF");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteBon?.id) return;

    try {
      await bonDeRetourService.delete(deleteBon.id);
      toast.success("Bon de retour supprimé");
      loadData();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeleteBon(null);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">{t("history")}</h1>
        <p className="page-subtitle">
          {bons.length} {t("bons_retour")}
        </p>
      </header>

      {bons.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">
            {t("no_history")}
          </h3>
          <p className="text-muted-foreground">{t("return_history_empty")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bons.map((bon) => (
            <div
              key={bon.id}
              className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in"
            >
              <div
                onClick={() => toggleExpand(bon.id!)}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{bon.lieu}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(bon.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-primary">
                    {formatCurrency(bon.totalTTC ?? bon.totalAmount ?? 0)}
                  </span>
                  {expandedId === bon.id ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </div>

              {expandedId === bon.id && (
                <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                  {bon.description && (
                    <div className="space-y-2">
                      <p className="font-semibold text-foreground text-sm">
                        {t("description")}:
                      </p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                        {bon.description}
                      </p>
                    </div>
                  )}

                  <div className="bg-muted/50 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-muted-foreground border-b border-border">
                          <th className="text-left p-3">{t("product")}</th>
                          <th className="text-center p-3">
                            {t("quantity_short")}
                          </th>
                          <th className="text-right p-3">{t("price_ht")}</th>
                          <th className="text-right p-3">{t("total_ht")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bon.items.map((item, index) => (
                          <tr key={index} className="text-sm">
                            <td className="p-3 font-medium">
                              {item.productName}
                            </td>
                            <td className="p-3 text-center">{item.quantity}</td>
                            <td className="p-3 text-right">
                              {formatCurrency(
                                item.unitPrice ?? item.unitPriceHT ?? 0,
                              )}
                            </td>
                            <td className="p-3 text-right font-medium">
                              {formatCurrency(
                                item.totalPrice ?? item.totalHT ?? 0,
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(bon)}
                      className="gap-2"
                    >
                      <Download className="w-4 h-4 text-blue-500" />
                      {t("download_pdf")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteBon(bon)}
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteBon} onOpenChange={() => setDeleteBon(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete_retour_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("delete_retour_confirm_message")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
