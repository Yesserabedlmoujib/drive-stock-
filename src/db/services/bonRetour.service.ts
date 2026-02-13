import { db } from "../database";
import type { BonDeRetour, BonDeRetourItem } from "../types";

/////////////////////////////////////////////////////////// Bon de retour operations/////////////////////////////////////////
export const bonDeRetourService = {
  async getAll(): Promise<BonDeRetour[]> {
    return db.bonDeRetour.orderBy("createdAt").reverse().toArray();
  },

  async getById(id: number): Promise<BonDeRetour | undefined> {
    return db.bonDeRetour.get(id);
  },

  async create(
    bonDeRetour: Omit<BonDeRetour, "id" | "createdAt">,
  ): Promise<number> {
    // Ensure compatibility fields exist on items and totalAmount
    const itemsWithAliases: BonDeRetourItem[] = bonDeRetour.items.map((i) => ({
      ...i,
      unitPrice: i.unitPriceHT,
      totalPrice: i.totalTTC,
    }));

    const bonToSave: Omit<BonDeRetour, "id" | "createdAt"> = {
      ...bonDeRetour,
      items: itemsWithAliases,
      totalAmount: bonDeRetour.totalTTC, // compatibility
    };

    const id = await db.bonDeRetour.add({
      ...bonToSave,
      createdAt: new Date(),
    });
    return id as number;
  },

  async delete(id: number): Promise<void> {
    await db.bonDeRetour.delete(id);
  },
};
