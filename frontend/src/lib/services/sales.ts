// Ajuste o import do seu Axios/API caso necessário

import { api } from "../api";

export const SalesService = {
  create: async (payload: {
    items: any[];
    discount?: number;
    notes?: string;
  }) => {
    const response = await api.post("/sales", payload);
    return response.data;
  },
  getAll: async (page = 1, take = 100, order = "desc") => {
    const response = await api.get(
      `/sales?page=${page}&take=${take}&order=${order}`,
    );
    return response.data;
  },
  findOne: async (id: string) => {
    const response = await api.get(`/sales/${id}`);
    return response.data;
  },
};
