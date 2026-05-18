import axios from "axios";

export const api = axios.create({
  // Se o NEXT_PUBLIC_API_URL não estiver definido, assume '/api' para usar o Proxy do Next.js
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
  // Necessário para enviar o cookie HttpOnly nas requisições cross-origin ou via proxy
  withCredentials: true,
});

// Interceptor de Resposta
api.interceptors.response.use(
  (response) => {
    // Se a requisição deu certo, apenas retorna os dados normalmente
    return response;
  },
  (error) => {
    // Captura erros 401 (Não Autorizado) globalmente
    if (error.response?.status === 401) {
      // Redireciona o usuário para o login se ele já não estiver na página de login
      if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/login"
      ) {
        window.location.href = "/login";
      }
    }

    // Repassa o erro para que o React Query (ou try/catch) também possa tratá-lo
    return Promise.reject(error);
  },
);
