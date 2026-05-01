import axios from "axios";

// Crie um arquivo .env.local na raiz do projeto Next.js com:
// NEXT_PUBLIC_API_URL=http://localhost:3000

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor opcional para adicionar o token automaticamente em futuras requisições
api.interceptors.request.use((config) => {
  // Exemplo: pegar do localStorage ou cookies
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
