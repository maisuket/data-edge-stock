import { api } from "../api";
import type { Page } from "./products";

// ── Interfaces ─────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string | null;
  phone: string;
  orderCount: number;
  createdAt: string;
}

// ── Service ────────────────────────────────────────────────────────────────

export const CustomerService = {
  getAll: async (page = 1, pageSize = 15) => {
    const response = await api.get<Page<Customer>>("/customers", {
      params: { page, take: pageSize },
    });
    return response.data;
  },
};
