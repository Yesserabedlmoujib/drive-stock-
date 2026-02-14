import { StatCard } from "@/components/stats/StatCard ";
import { statsService } from "@/db/services/stats.service";
import {
  AlertTriangle,
  Boxes,
  DollarSign,
  FileOutput,
  Package,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "TND",
    }).format(value);
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
        <h1 className="page-title">Tableau de bord</h1>
        <p className="page-subtitle">Vue d'ensemble de votre inventaire</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <StatCard
          title="Total Produits"
          value={stats?.totalProducts || 0}
          icon={Package}
          variant="primary"
        />
        <StatCard
          title="Stock Total"
          value={stats?.totalStock || 0}
          icon={Boxes}
          variant="accent"
        />
        <StatCard
          title="Valeur Totale"
          value={formatCurrency(stats?.totalValue || 0)}
          icon={DollarSign}
          variant="success"
        />
        <StatCard
          title="Stock Faible"
          value={stats?.lowStockProducts || 0}
          icon={AlertTriangle}
          variant="warning"
          trend={stats?.lowStockProducts ? "Attention requise" : ""}
        />
        <StatCard
          title="Bons de Sortie"
          value={stats?.totalBons || 0}
          icon={FileOutput}
          variant="default"
        />
        <StatCard
          title="Bons de Livraison"
          value={stats?.totalBonsl || 0}
          icon={FileOutput}
          variant="default"
        />
        <StatCard
          title="Bons de Retour"
          value={stats?.totalBonsr || 0}
          icon={FileOutput}
          variant="default"
        />
        <StatCard
          title="Sorties (7 jours)"
          value={stats?.recentBonsCount || 0}
          icon={TrendingUp}
          variant="default"
          trend={`${formatCurrency(stats?.totalSortieValue || 0)} total`}
        />
      </div>

      {/* Quick Actions */}
      <section className="mt-8 md:mt-12">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Actions rapides
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
                Gérer les produits
              </h3>
              <p className="text-sm text-muted-foreground">
                Ajouter, modifier ou supprimer
              </p>
            </div>
          </a>
          <a
            href="/bon-de-sortie"
            className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-accent/50 hover:shadow-soft transition-all duration-300"
          >
            <div className="p-3 rounded-lg bg-accent/10">
              <FileOutput className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">
                Nouveau bon de sortie
              </h3>
              <p className="text-sm text-muted-foreground">
                Créer une sortie de stock
              </p>
            </div>
          </a>
        </div>
      </section>
    </div>
  );
}
