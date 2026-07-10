import { api } from "../api";

// ── Interfaces ─────────────────────────────────────────────────────────────

export interface DeliveryZone {
  id: string;
  neighborhood: string;
  fee: number;
  active: boolean;
}

// ── DTOs ───────────────────────────────────────────────────────────────────

export interface CreateDeliveryZoneDto {
  neighborhood: string;
  fee: number;
}

export interface UpdateDeliveryZoneDto {
  neighborhood?: string;
  fee?: number;
  active?: boolean;
}

// ── Service ────────────────────────────────────────────────────────────────

export const DeliveryZoneService = {
  getPublic: async () => {
    const response = await api.get<DeliveryZone[]>("/delivery-zones");
    return response.data;
  },

  getAll: async () => {
    const response = await api.get<DeliveryZone[]>("/delivery-zones/manage");
    return response.data;
  },

  create: async (dto: CreateDeliveryZoneDto) => {
    const response = await api.post<DeliveryZone>("/delivery-zones", dto);
    return response.data;
  },

  update: async (id: string, dto: UpdateDeliveryZoneDto) => {
    const response = await api.patch<DeliveryZone>(
      `/delivery-zones/${id}`,
      dto,
    );
    return response.data;
  },

  delete: async (id: string) => {
    await api.delete(`/delivery-zones/${id}`);
  },
};
