import { db } from "../database";
import type { Customer } from "../types";

/////////////////////////////////////////////////////////////// Customer operations//////////////////////////////////////////////////////
export const customerService = {
  async getAll(): Promise<Customer[]> {
    return db.customers.orderBy("createdAt").reverse().toArray();
  },

  async getById(id: number): Promise<Customer | undefined> {
    return db.customers.get(id);
  },

  //   async create(
  //     customer: Omit<Customer, "id" | "createdAt" | "updatedAt">,
  //   ): Promise<number> {
  //     const now = new Date();
  //     const id = await db.customers.add({
  //       ...customer,
  //       createdAt: now,
  //       updatedAt: now,
  //     });
  //     return id as number;
  //   },

  async create(customer: Omit<Customer, "id" | "createdAt" | "updatedAt">) {
    const now = new Date();
    return (await db.customers.add({
      ...customer,
      createdAt: now,
      updatedAt: now,
    })) as number;
  },

  async update(
    id: number,
    updates: Partial<Omit<Customer, "id" | "createdAt">>,
  ): Promise<void> {
    await db.customers.update(id, {
      ...updates,
      updatedAt: new Date(),
    });
  },

  async delete(id: number): Promise<void> {
    await db.customers.delete(id);
  },
};
