import { api } from "../api";
import type { Page } from "./products";

// ── Enums ──────────────────────────────────────────────────────────────────

export enum IngredientUnit {
  LITRO = "L",
  ML = "ML",
  KG = "KG",
  MILIGRAMA = "MG",
  G = "G",
  UNIT = "UN",
}

export const UNIT_LABELS: Record<IngredientUnit, string> = {
  [IngredientUnit.LITRO]: "Litro (l)",
  [IngredientUnit.ML]: "Mililitro (ml)",
  [IngredientUnit.KG]: "Quilograma (kg)",
  [IngredientUnit.MILIGRAMA]: "Miligrama (mg)",
  [IngredientUnit.G]: "Grama (g)",
  [IngredientUnit.UNIT]: "Unidade (un)",
};

export const UNIT_SHORT: Record<string, string> = {
  LITRO: "L",
  ML: "ML",
  KG: "KG",
  MILIGRAMA: "MG",
  G: "G",
  UN: "UN",
};

// ── Interfaces ─────────────────────────────────────────────────────────────

export interface Ingredient {
  id: string;
  name: string;
  unit: IngredientUnit;
  currentStock: number;
  averageCost: number;
  minStock: number;
  createdAt: string;
  updatedAt: string;
}

export interface IngredientLot {
  id: string;
  lotNumber: string;
  ingredientId: string;
  quantity: number;
  totalCost: number;
  unitCost: number;
  remainingQty: number;
  purchasedAt: string;
  expiresAt?: string;
  supplier?: { name: string };
  brand?: string;
}

export interface IngredientDetail extends Ingredient {
  lots: IngredientLot[];
}

export interface LowStockIngredient {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minStock: number;
}

export interface ExpiringLot extends IngredientLot {
  ingredient: {
    name: string;
    unit: string;
  };
}

// ── DTOs ───────────────────────────────────────────────────────────────────

export interface CreateIngredientDto {
  name: string;
  unit: IngredientUnit;
  minStock?: number;
}

export interface UpdateIngredientDto {
  name?: string;
  minStock?: number;
}

export interface BuyLotDto {
  quantity: number;
  totalCost: number;
  lotNumber?: string;
  supplierId?: string;
  expiresAt?: string;
  brand?: string;
}

export interface BuyBulkItemDto {
  ingredientId: string;
  quantity: number;
  totalCost: number;
  expiresAt?: string;
  brand?: string;
}

export interface BuyBulkDto {
  items: BuyBulkItemDto[];
  supplier?: string;
  notes?: string;
}

// ── Service ────────────────────────────────────────────────────────────────

export const IngredientService = {
  getAll: async (page = 1, pageSize = 20, search = "") => {
    const response = await api.get<Page<Ingredient>>("/ingredients", {
      params: { page, take: pageSize, q: search || undefined },
    });
    return response.data;
  },

  getOne: async (id: string) => {
    const response = await api.get<IngredientDetail>(`/ingredients/${id}`);
    return response.data;
  },

  getLowStock: async () => {
    const response = await api.get<LowStockIngredient[]>(
      "/ingredients/low-stock",
    );
    return response.data;
  },

  getExpiringLots: async (days = 30) => {
    const response = await api.get<ExpiringLot[]>("/ingredients/expiring", {
      params: { days },
    });
    return response.data;
  },

  create: async (dto: CreateIngredientDto) => {
    const response = await api.post<Ingredient>("/ingredients", dto);
    return response.data;
  },

  update: async (id: string, dto: UpdateIngredientDto) => {
    const response = await api.patch<Ingredient>(`/ingredients/${id}`, dto);
    return response.data;
  },

  delete: async (id: string) => {
    await api.delete(`/ingredients/${id}`);
  },

  buyLot: async (ingredientId: string, dto: BuyLotDto) => {
    const response = await api.post(`/ingredients/${ingredientId}/buy`, dto);
    return response.data;
  },

  buyBulk: async (dto: BuyBulkDto) => {
    const response = await api.post("/ingredients/bulk-purchase", dto);
    return response.data;
  },
};
