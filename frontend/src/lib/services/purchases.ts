import { api } from "../api";
import type { Page } from "./products";

// ── Interfaces ─────────────────────────────────────────────────────────────

export interface PurchaseLotItem {
  id: string;
  ingredientId: string;
  ingredient: { name: string; unit: string };
  quantity: number;
  totalCost: number;
  unitCost: number;
  brand?: string | null;
  expiresAt?: string | null;
}

export interface Purchase {
  id: string;
  totalCost: number;
  notes?: string | null;
  supplier: { name: string } | null;
  user: { name: string };
  createdAt: string;
  lots: PurchaseLotItem[];
}

// ── Service ────────────────────────────────────────────────────────────────

export const PurchaseService = {
  getAll: async (page = 1, pageSize = 10) => {
    const response = await api.get<Page<Purchase>>("/purchases", {
      params: { page, take: pageSize, order: "desc" },
    });
    return response.data;
  },

  getOne: async (id: string) => {
    const response = await api.get<Purchase>(`/purchases/${id}`);
    return response.data;
  },

  getTodayStats: async (): Promise<{ count: number; total: number }> => {
    const response = await api.get("/purchases/stats/today");
    return response.data;
  },
};
