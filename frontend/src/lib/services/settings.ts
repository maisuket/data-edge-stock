import { api } from "../api";

export interface Setting {
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export const SettingsService = {
  async getByKey(key: string): Promise<Setting | null> {
    try {
      const { data } = await api.get<Setting>(`/settings/${key}`);
      return data;
    } catch (error: any) {
      if (error.response?.status === 404) return null; // Se não encontrar, retorna null pacificamente
      throw error;
    }
  },

  async update(key: string, value: string): Promise<Setting> {
    const { data } = await api.put<Setting>(`/settings/${key}`, { value });
    return data;
  },
};
