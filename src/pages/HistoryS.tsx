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
import { bonDeSortieService } from "@/db/services/bonSortie.service";
import {
  companyProfileService,
  userProfileService,
} from "@/db/services/profile.service";
import type { BonDeSortie, CompanyProfile, UserProfile } from "@/db/types";

import { downloadBonPDF } from "@/lib/bonSortiePdf";
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

export default function HistoryS() {
  const { t } = useTranslation();
  const [bons, setBons] = useState<BonDeSortie[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deleteBon, setDeleteBon] = useState<BonDeSortie | null>(null);

  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(
    null,
  );
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [bonsData, companyData, userData] = await Promise.all([
        bonDeSortieService.getAll(),
        companyProfileService.get(),
        userProfileService.get(),
      ]);

      setBons(bonsData);
      setCompanyProfile(companyData ?? null); // convert undefined to null
      setUserProfile(userData ?? null); // convert undefined to null
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
  const handleDownload = async (bon: BonDeSortie) => {
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
      await bonDeSortieService.delete(deleteBon.id);
      toast.success("Bon de sortie supprimé");
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
          {bons.length} {t("bons_sortie")}
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
          <p className="text-muted-foreground">{t("sortie_history_empty")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bons.map((bon) => (
            <div
              key={bon.id}
              className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in"
            >
              {/* Header */}
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

              {/* Expanded Content */}
              {expandedId === bon.id && (
                <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                  {bon.lieu && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {t("place")}:
                      </span>
                      {bon.lieu}
                    </p>
                  )}

                  {/* Items */}
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
                                item.unitPriceHT ?? item.unitPrice ?? 0,
                              )}
                            </td>
                            <td className="p-3 text-right font-medium">
                              {formatCurrency(
                                item.totalHT ?? item.totalPrice ?? 0,
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Actions */}
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
            <AlertDialogTitle>{t("delete_sortie_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("delete_sortie_confirm_message")}
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
