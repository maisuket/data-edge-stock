import { api } from "@/lib/api";

export interface LoginDto {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
}

export const authService = {
  login: async (credentials: LoginDto): Promise<LoginResponse> => {
    try {
      const { data } = await api.post<LoginResponse>(
        "/auth/login",
        credentials
      );

      // SALVA O TOKEN NO COOKIE (Para o Middleware funcionar)
      // max-age=86400 (1 dia), path=/ (disponível em todo site)
      document.cookie = `access_token=${data.access_token}; path=/; max-age=86400; SameSite=Lax`;

      // Mantém no localStorage se preferir usar no axios interceptor
      localStorage.setItem("access_token", data.access_token);

      return data;
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        throw new Error("E-mail ou senha incorretos.");
      }
      throw new Error("Erro ao conectar com o servidor.");
    }
  },

  logout: () => {
    if (typeof window !== "undefined") {
      // Remove o Cookie definindo uma data expirada
      document.cookie =
        "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
  },

  getToken: () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("access_token");
    }
    return null;
  },
};
