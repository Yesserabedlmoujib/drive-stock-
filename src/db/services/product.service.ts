import { db } from "../database";
import type { Product } from "../types";

// Product operations
export const productService = {
  async getAll(): Promise<Product[]> {
    return db.products.orderBy("createdAt").reverse().toArray();
  },

  async getById(id: number): Promise<Product | undefined> {
    return db.products.get(id);
  },

  async create(product: Omit<Product, "id" | "createdAt" | "updatedAt">) {
    const now = new Date();
    return await db.products.add({
      ...product,
      createdAt: now,
      updatedAt: now,
    }) as number;
  },

  async update(
    id: number,
    updates: Partial<Omit<Product, "id" | "createdAt">>,
  ): Promise<void> {
    await db.products.update(id, {
      ...updates,
      updatedAt: new Date(),
    });
  },

  async delete(id: number): Promise<void> {
    await db.products.delete(id);
  },

  async updateQuantity(id: number, quantityChange: number): Promise<void> {
    const product = await db.products.get(id);
    if (product) {
      await db.products.update(id, {
        quantity: Math.max(0, product.quantity + quantityChange),
        updatedAt: new Date(),
      });
    }
  },
};
