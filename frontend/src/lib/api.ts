import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api",
  headers: {
    "Content-Type": "application/json",
  },
  // Necessário para enviar o cookie HttpOnly nas requisições cross-origin
  withCredentials: true,
});
