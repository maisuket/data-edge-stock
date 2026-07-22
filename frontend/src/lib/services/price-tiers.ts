import { api } from "../api";

export interface PriceTierItem {
  id?: string;
  minQuantity: number;
  unitPrice: number;
}

export interface PriceTiersConfig {
  productId: string;
  enabled: boolean;
  salePrice: number | null;
  tiers: PriceTierItem[];
}

export interface SetPriceTiersDto {
  enabled: boolean;
  tiers: { minQuantity: number; unitPrice: number }[];
}

export const PriceTierService = {
  get: async (productId: string) => {
    const response = await api.get<PriceTiersConfig>(
      `/price-tiers/${productId}`,
    );
    return response.data;
  },

  set: async (productId: string, dto: SetPriceTiersDto) => {
    const response = await api.post<PriceTiersConfig>(
      `/price-tiers/${productId}`,
      dto,
    );
    return response.data;
  },
};
