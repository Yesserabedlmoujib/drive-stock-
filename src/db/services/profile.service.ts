import { db } from "../database";
import type { CompanyProfile, UserProfile } from "../types";

//////////////////////////////////////////////////////////////Company///////////////////////////////////////////////////////
export const companyProfileService = {
  async get(): Promise<CompanyProfile | undefined> {
    return db.companyProfile.toCollection().first();
  },

  async save(data: Omit<CompanyProfile, "id" | "createdAt" | "updatedAt">) {
    const existing = await this.get();
    const now = new Date();

    if (existing?.id) {
      await db.companyProfile.update(existing.id, {
        ...data,
        updatedAt: now,
      });
    } else {
      await db.companyProfile.add({
        ...data,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
};

/////////////////////////////////////////////////////////////////////////////Profile//////////////////////////////////////////////////
export const userProfileService = {
  async get(): Promise<UserProfile | undefined> {
    return db.userProfile.toCollection().first();
  },

  async save(data: Omit<UserProfile, "id" | "createdAt" | "updatedAt">) {
    const existing = await this.get();
    const now = new Date();

    if (existing?.id) {
      await db.userProfile.update(existing.id, {
        ...data,
        updatedAt: now,
      });
    } else {
      await db.userProfile.add({
        ...data,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
};
