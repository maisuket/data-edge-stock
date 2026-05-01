import { api } from "../api";

// ── Interfaces ─────────────────────────────────────────────────────────────

export interface RecipeItem {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  quantity: number;
  currentStock?: number;
  unitCost: number;
  itemCost: number;
}

export interface Recipe {
  productId: string;
  productName: string;
  isManufactured: boolean;
  productionCostPerUnit: number;
  salePrice?: number;
  profitMargin?: number;
  items: RecipeItem[];
}

export interface SetRecipeItemDto {
  ingredientId: string;
  quantity: number;
}

export interface SetRecipeDto {
  items: SetRecipeItemDto[];
}

// ── Service ────────────────────────────────────────────────────────────────

export const RecipeService = {
  getRecipe: async (productId: string) => {
    const response = await api.get<Recipe>(`/recipes/${productId}`);
    return response.data;
  },

  setRecipe: async (productId: string, dto: SetRecipeDto) => {
    const response = await api.post<Recipe>(`/recipes/${productId}`, dto);
    return response.data;
  },

  refreshCost: async (productId: string) => {
    const response = await api.post<{ productId: string; newCostPrice: number }>(
      `/recipes/${productId}/refresh-cost`
    );
    return response.data;
  },
};
