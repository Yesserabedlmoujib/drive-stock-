export interface UserProfile {
  id?: number;
  fullName: string;
  phone: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanyProfile {
  id?: number;
  companyName: string;
  address: string;
  city: string;
  phone: string;
  email?: string;
  matriculeFiscale: string;
  logo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id?: number;
  name: string;
  mf: string;
  telephone: number;
  adresse: string;
  ville: string;
  codePostal: number;
  createdAt: Date;
  updatedAt: Date;
  image?: string;
}

export interface Product {
  id?: number;
  name: string;
  description: string;
  price: number;
  quantity: number;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BonDeSortieItem {
  productId?: number;
  productName: string;
  quantity: number;

  // canonical new fields (HT/TVA/TTC)
  unitPriceHT: number;
  tvaRate: number; // ex: 19
  tvaAmount: number;
  totalHT: number;
  totalTTC: number;

  // legacy / compatibility fields used elsewhere in the UI
  unitPrice?: number; // alias for unitPriceHT
  totalPrice?: number; // alias for totalTTC
}

export interface BonDeSortie {
  id?: number;
  number: string; // example: BDS-2025-0001
  // destination: string;
  lieu: string;
  items: BonDeSortieItem[];
  totalHT: number;
  totalTVA: number;
  totalTTC: number;

  // compatibility: some code expects totalAmount -> we'll store totalAmount === totalTTC
  totalAmount?: number;

  createdAt: Date;
}

export interface BonDeLivraisonItem {
  productId: number;
  productName: string;
  quantity: number;

  // canonical new fields (HT/TVA/TTC)
  unitPriceHT: number;
  tvaRate: number; // ex: 19
  tvaAmount: number;
  totalHT: number;
  totalTTC: number;

  // legacy / compatibility fields used elsewhere in the UI
  unitPrice?: number; // alias for unitPriceHT
  totalPrice?: number; // alias for totalTTC
}

export interface BonDeLivraison {
  id?: number;
  number: string;
  destination: string;
  lieu?: string;
  items: BonDeLivraisonItem[];
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  totalAmount?: number;
  customerName?: string; // Add these fields
  customerAddress?: string;
  customerVille?: string;
  customerTelephone?: string;
  customerMF?: string; // Matricule Fiscale
  createdAt: Date;
}

export interface BonDeRetourItem {
  productId: number;
  productName: string;
  quantity: number;

  // canonical new fields (HT/TVA/TTC)
  unitPriceHT: number;
  tvaRate: number; // ex: 19
  tvaAmount: number;
  totalHT: number;
  totalTTC: number;

  // legacy / compatibility fields used elsewhere in the UI
  unitPrice?: number; // alias for unitPriceHT
  totalPrice?: number; // alias for totalTTC
}

export interface BonDeRetour {
  id?: number;
  number: string; // example: BDS-2025-0001
  lieu: string;
  description?: string;
  items: BonDeRetourItem[];
  totalHT: number;
  totalTVA: number;
  totalTTC: number;

  // compatibility: some code expects totalAmount -> we'll store totalAmount === totalTTC
  totalAmount?: number;

  createdAt: Date;
}
