import Dexie, { type EntityTable } from "dexie";
import type {
  Customer,
  Product,
  BonDeSortie,
  BonDeLivraison,
  BonDeRetour,
  UserProfile,
  CompanyProfile,
} from "./types";

class InventoryDatabase extends Dexie {
  customers!: EntityTable<Customer, "id">;
  products!: EntityTable<Product, "id">;
  bonsDeSortie!: EntityTable<BonDeSortie, "id">;
  bonDeLivraison!: EntityTable<BonDeLivraison, "id">;
  bonDeRetour!: EntityTable<BonDeRetour, "id">;
  userProfile!: EntityTable<UserProfile, "id">;
  companyProfile!: EntityTable<CompanyProfile, "id">;

  constructor() {
    super("InventoryDB");

    this.version(1).stores({
      customers: "++id, name, createdAt",
      products: "++id, name, createdAt",
      bonsDeSortie: "++id, number, createdAt",
      bonDeLivraison: "++id, number, destination, createdAt",
      bonDeRetour: "++id, number, createdAt",
      userProfile: "++id, fullName",
      companyProfile: "++id, companyName",
    });
  }
}

export const db = new InventoryDatabase();
