import { api } from "../api";
import type { Page } from "./products";

// ── Interfaces ─────────────────────────────────────────────────────────────

export interface ProductionConsumption {
  ingredient: string;
  unit: string;
  quantityUsed: number;
  unitCost: number;
  totalCost: number;
}

export interface Production {
  id: string;
  productId: string;
  product: { name: string; unit: string };
  batches: number;
  quantity: number;
  unitCost: number;
  totalCost: number;
  notes?: string;
  producedBy?: string;
  producedAt: string;
  createdAt: string;
}

export interface ProductionDetail extends Production {
  profitMarginPercent?: number;
  consumptions: ProductionConsumption[];
}

// ── DTOs ───────────────────────────────────────────────────────────────────

export interface CreateProductionDto {
  productId: string;
  batches: number;
  notes?: string;
}

// ── Service ────────────────────────────────────────────────────────────────

export const ProductionService = {
  getAll: async (page = 1, pageSize = 20, productId?: string) => {
    const response = await api.get<Page<Production>>("/productions", {
      params: { page, take: pageSize, productId: productId || undefined },
    });
    return response.data;
  },

  getOne: async (id: string) => {
    const response = await api.get<ProductionDetail>(`/productions/${id}`);
    return response.data;
  },

  create: async (dto: CreateProductionDto) => {
    const response = await api.post<ProductionDetail>("/productions", dto);
    return response.data;
  },
};
