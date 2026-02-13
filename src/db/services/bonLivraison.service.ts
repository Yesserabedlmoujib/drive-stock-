import { db } from "../database";
import type { BonDeLivraison, BonDeLivraisonItem } from "../types";
import { productService } from "./product.service";

///////////////////////////////////////////////// Bon de Livraison operations/////////////////////////////////////////////
export const bonDeLivraisonService = {
  async getAll(): Promise<BonDeLivraison[]> {
    return db.bonDeLivraison.orderBy("createdAt").reverse().toArray();
  },

  async getById(id: number): Promise<BonDeLivraison | undefined> {
    return db.bonDeLivraison.get(id);
  },

  async create(
    bonDeLivraison: Omit<BonDeLivraison, "id" | "createdAt">,
  ): Promise<number> {
    // Update product quantities
    for (const item of bonDeLivraison.items) {
      await productService.updateQuantity(item.productId, -item.quantity);
    }

    // Ensure compatibility fields exist on items and totalAmount
    const itemsWithAliases: BonDeLivraisonItem[] = bonDeLivraison.items.map(
      (i) => ({
        ...i,
        unitPrice: i.unitPriceHT,
        totalPrice: i.totalTTC,
      }),
    );

    const bonToSave: Omit<BonDeLivraison, "id" | "createdAt"> = {
      ...bonDeLivraison,
      items: itemsWithAliases,
      totalAmount: bonDeLivraison.totalTTC, // compatibility
      // Ensure all customer fields are properly set
      customerName: bonDeLivraison.customerName || bonDeLivraison.destination,
      customerAddress: bonDeLivraison.customerAddress || "",
      customerVille: bonDeLivraison.customerVille || "",
      customerTelephone: bonDeLivraison.customerTelephone || "",
      customerMF: bonDeLivraison.customerMF || "",
    };

    const id = await db.bonDeLivraison.add({
      ...bonToSave,
      createdAt: new Date(),
    });
    return id as number;
  },

  async delete(id: number): Promise<void> {
    await db.bonDeLivraison.delete(id);
  },
};
