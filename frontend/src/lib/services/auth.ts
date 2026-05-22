import { api } from "@/lib/api";

export interface LoginDto {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: {
    sub: string;
    name: string;
    email: string;
    role: string;
  };
}

export const authService = {
  login: async (credentials: LoginDto): Promise<LoginResponse> => {
    try {
      const { data } = await api.post<LoginResponse>(
        "/auth/login",
        credentials,
      );
      // O servidor define o cookie HttpOnly automaticamente via Set-Cookie.
      // Não armazenamos o token no localStorage (vetor de XSS).
      return data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error("E-mail ou senha incorretos.");
      }
      throw new Error("Erro ao conectar com o servidor.");
    }
  },

  logout: async (): Promise<void> => {
    try {
      // Solicita ao servidor que limpe o cookie HttpOnly (o client-side JS não consegue)
      await api.post("/auth/logout");
    } finally {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  },

  getProfile: async (): Promise<LoginResponse["user"]> => {
    try {
      const { data } = await api.get<LoginResponse["user"]>("/auth/profile");
      return data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error("Usuário não autenticado.");
      }
      throw new Error("Erro ao conectar com o servidor.");
    }
  },
};
