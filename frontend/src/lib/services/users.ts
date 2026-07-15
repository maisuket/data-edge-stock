import { api } from "../api";
import type { Page } from "./products";

export interface User {
  id: string;
  name: string;
  email?: string | null;
  username: string;
  role: "SUPER_ADMIN" | "ADMIN" | "USER";
  createdAt: string;
}

export const UserService = {
  getAll: async (page = 1, pageSize = 10, search = "") => {
    const response = await api.get<Page<User>>("/users", {
      params: { page, take: pageSize, q: search },
    });
    return response.data;
  },

  create: async (data: Partial<User> & { password?: string }) => {
    return api.post("/users", data);
  },

  update: async (id: string, data: Partial<User> & { password?: string }) => {
    return api.patch(`/users/${id}`, data);
  },

  delete: async (id: string) => {
    return api.delete(`/users/${id}`);
  },
};
