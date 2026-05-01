import { api } from "@/lib/api";

export interface ProfileData {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  avatar?: string;
}

export const profileService = {
  // Busca os dados do usuário logado
  getMe: async () => {
    // Ajuste a rota conforme seu backend (ex: /auth/profile, /users/me)
    const { data } = await api.get<ProfileData>("/auth/profile");
    return data;
  },

  // Atualiza os dados do usuário
  updateMe: async (data: {
    name?: string;
    email?: string;
    password?: string;
  }) => {
    const { data: result } = await api.patch("/auth/profile", data);
    return result;
  },
};
