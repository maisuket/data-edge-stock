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

// Rotas públicas onde um 401 nunca deve forçar redirecionamento para o login
// do painel administrativo (ex: cardápio acessado por clientes anônimos).
const PUBLIC_PATH_PREFIXES = ["/login", "/cardapio"];

// Interceptor de Resposta
api.interceptors.response.use(
  (response) => {
    // Se a requisição deu certo, apenas retorna os dados normalmente
    return response;
  },
  (error) => {
    // Captura erros 401 (Não Autorizado) globalmente
    if (error.response?.status === 401) {
      // Redireciona o usuário para o login apenas se ele estiver em uma
      // área autenticada — nunca em páginas públicas (ex: cardápio).
      const isPublicPath =
        typeof window !== "undefined" &&
        PUBLIC_PATH_PREFIXES.some((prefix) =>
          window.location.pathname.startsWith(prefix),
        );

      if (typeof window !== "undefined" && !isPublicPath) {
        window.location.href = "/login";
      }
    }

    // Repassa o erro para que o React Query (ou try/catch) também possa tratá-lo
    return Promise.reject(error);
  },
);
