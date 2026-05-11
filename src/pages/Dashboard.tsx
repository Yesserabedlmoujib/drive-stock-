import { StatCard } from "@/components/stats/StatCard ";
import { statsService } from "@/db/services/stats.service";
import {
  AlertTriangle,
  Boxes,
  DollarSign,
  Package,
  TrendingUp,
  ClipboardMinus,
  Truck,
  RotateCcw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface DashboardStats {
  totalProducts: number;
  totalStock: number;
  totalValue: number;
  lowStockProducts: number;
  totalBonsl: number;
  totalLivraisonValue: number;
  recentBonslCount: number;
  totalBonsr: number;
  totalRetourValue: number;
  recentBonsrCount: number;
  totalBons: number;
  totalSortieValue: number;
  recentBonsCount: number;
}

export default function Dashboard() {
  const { t } = useTranslation();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await statsService.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  };

  // const formatCurrency = (value: number) =>
  //   new Intl.NumberFormat("fr-FR", {
  //     style: "currency",
  //     currency: "TND",
  //   }).format(value);

  const formatCurrency = (value: number) => {
    return `${value.toFixed(2)} ${t("TND")}`;
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
      {/* HEADER */}
      <header className="page-header">
        <h1 className="page-title">{t("dashboard")}</h1>
        <p className="page-subtitle">{t("dashboard_subtitle")}</p>
      </header>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <StatCard
          title={t("total_products")}
          value={stats?.totalProducts || 0}
          icon={Package}
          variant="primary"
        />

        <StatCard
          title={t("total_stock")}
          value={stats?.totalStock || 0}
          icon={Boxes}
          variant="accent"
        />

        <StatCard
          title={t("total_value")}
          value={formatCurrency(stats?.totalValue || 0)}
          icon={DollarSign}
          variant="success"
        />

        <StatCard
          title={t("low_stock")}
          value={stats?.lowStockProducts || 0}
          icon={AlertTriangle}
          variant="warning"
          trend={stats?.lowStockProducts ? t("attention_required") : ""}
        />

        <StatCard
          title={t("bons_sortie")}
          value={stats?.totalBons || 0}
          icon={ClipboardMinus}
          variant="default"
        />

        <StatCard
          title={t("bons_livraison")}
          value={stats?.totalBonsl || 0}
          icon={Truck}
          variant="default"
        />

        <StatCard
          title={t("bons_retour")}
          value={stats?.totalBonsr || 0}
          icon={RotateCcw}
          variant="default"
        />

        <StatCard
          title={t("sorties_7_days")}
          value={stats?.recentBonsCount || 0}
          icon={TrendingUp}
          variant="default"
          trend={`${formatCurrency(stats?.totalSortieValue || 0)} ${t("total")}`}
        />
      </div>

      {/* QUICK ACTIONS */}
      <section className="mt-8 md:mt-12">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {t("quick_actions")}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href="/products"
            className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary/50 hover:shadow-soft transition-all duration-300"
          >
            <div className="p-3 rounded-lg bg-primary/10">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">
                {t("manage_products")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("products_desc")}
              </p>
            </div>
          </a>

          <a
            href="/bon-de-sortie"
            className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-accent/50 hover:shadow-soft transition-all duration-300"
          >
            <div className="p-3 rounded-lg bg-accent/10">
              <ClipboardMinus className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">
                {t("new_bon_sortie")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("products_desc")}
              </p>
            </div>
          </a>
        </div>
      </section>
    </div>
  );
}
