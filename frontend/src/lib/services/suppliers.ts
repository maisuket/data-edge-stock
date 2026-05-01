import { api } from "../api";
import type { Page } from "./products";

export interface Supplier {
  id: string;
  name: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export const SupplierService = {
  getAll: async (page = 1, pageSize = 100, search = "") => {
    const response = await api.get<Page<Supplier>>("/suppliers", {
      params: { page, take: pageSize, q: search },
    });
    return response.data;
  },
  create: async (data: Partial<Supplier>) => api.post("/suppliers", data),
  update: async (id: string, data: Partial<Supplier>) =>
    api.patch(`/suppliers/${id}`, data),
  delete: async (id: string) => api.delete(`/suppliers/${id}`),
};
