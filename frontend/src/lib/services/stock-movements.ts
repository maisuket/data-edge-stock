import { api } from "../api";
import type { Page } from "./products"; // Reutiliza a interface Page
// Reutiliza a interface Page

export enum MovementType {
  ENTRY = "ENTRADA",
  EXIT = "SAIDA",
  ADJUSTMENT = "AJUSTE",
  TRANSFER = "TRANSFERENCIA",
}

export interface StockMovement {
  id: string;
  type: MovementType;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  unitValue: number;
  batch: string;
  expiryDate: string;
  description?: string;
  createdAt: string;
  product: {
    name: string;
    internalCode: string;
  };
  user: {
    name: string;
  };
}

export const StockMovementService = {
  // Cria uma nova movimentação
  create: async (data: {
    productId: string;
    type: string;
    quantity: number;
    description?: string;
  }) => {
    return api.post("/stock-movements", data);
  },

  getAll: async (page = 1, pageSize = 10, productId?: string) => {
    const response = await api.get<Page<StockMovement>>("/stock-movements", {
      params: { page, take: pageSize, productId: productId || undefined },
    });
    return response.data;
  },
};
