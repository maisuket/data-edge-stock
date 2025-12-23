import axios from "axios";

export const api = axios.create({
  // --- MUDANÇA: URL Relativa ---
  // O navegador vai completar automaticamente com o domínio atual.
  // Ex: se estiver em 192.168.0.15, vai chamar http://192.168.0.15/api
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
