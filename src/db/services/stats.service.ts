import { db } from "../database";

// Dashboard statistics
export const statsService = {
  async getDashboardStats() {
    const products = await db.products.toArray();
    const bons = await db.bonsDeSortie.toArray();
    const bonsl = await db.bonDeLivraison.toArray();
    const bonsr = await db.bonDeRetour.toArray();

    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.quantity, 0);
    const totalValue = products.reduce(
      (sum, p) => sum + p.price * p.quantity,
      0,
    );
    const lowStockProducts = products.filter((p) => p.quantity < 10).length;
    const totalBons = bons.length;
    const totalSortieValue = bons.reduce(
      (sum, b) => sum + (b.totalTTC ?? 0),
      0,
    );
    const totalBonsl = bonsl.length;
    const totalLivraisonValue = bonsl.reduce(
      (sum, b) => sum + (b.totalTTC ?? 0),
      0,
    );
    const totalBonsr = bonsr.length;
    const totalRetourValue = bonsr.reduce(
      (sum, b) => sum + (b.totalTTC ?? 0),
      0,
    );

    // Recent bons (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentBons = bons.filter(
      (b) => new Date(b.createdAt) >= sevenDaysAgo,
    );
    const recentBonsl = bons.filter(
      (b) => new Date(b.createdAt) >= sevenDaysAgo,
    );
    const recentBonsr = bons.filter(
      (b) => new Date(b.createdAt) >= sevenDaysAgo,
    );

    return {
      totalProducts,
      totalStock,
      totalValue,
      lowStockProducts,
      totalBons,
      totalBonsl,
      totalBonsr,
      totalSortieValue,
      totalLivraisonValue,
      totalRetourValue,
      recentBonsCount: recentBons.length,
      recentBonslCount: recentBonsl.length,
      recentBonsrCount: recentBonsr.length,
    };
  },
};
