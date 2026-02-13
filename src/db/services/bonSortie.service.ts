import { db } from "../database";
import type { BonDeSortie, BonDeSortieItem } from "../types";

/////////////////////////////////////////////////////////// Bon de Sortie operations/////////////////////////////////////////
export const bonDeSortieService = {
  async getAll(): Promise<BonDeSortie[]> {
    return db.bonsDeSortie.orderBy("createdAt").reverse().toArray();
  },

  async getById(id: number): Promise<BonDeSortie | undefined> {
    return db.bonsDeSortie.get(id);
  },

  /**
   * Accepts a bon where items include canonical fields (unitPriceHT, tvaRate, ...)
   * This function will update product quantities and persist the bon.
   * It stores both canonical fields and legacy/compatible aliases (unitPrice, totalPrice)
   */
  async create(
    bonDeSortie: Omit<BonDeSortie, "id" | "createdAt">,
  ): Promise<number> {
    // Update product quantities
    // for (const item of bonDeSortie.items) {
    //   await productService.updateQuantity(item.productId, -item.quantity);
    // }

    // Ensure compatibility fields exist on items and totalAmount
    const itemsWithAliases: BonDeSortieItem[] = bonDeSortie.items.map((i) => ({
      ...i,
      unitPrice: i.unitPriceHT,
      totalPrice: i.totalTTC,
    }));

    const bonToSave: Omit<BonDeSortie, "id" | "createdAt"> = {
      ...bonDeSortie,
      items: itemsWithAliases,
      totalAmount: bonDeSortie.totalTTC, // compatibility
    };

    return (await db.bonsDeSortie.add({
      ...bonToSave,
      createdAt: new Date(),
    })) as number;
  },

  async delete(id: number): Promise<void> {
    await db.bonsDeSortie.delete(id);
  },
};
