import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuração de Rewrites (Proxy)
  async rewrites() {
    return [
      {
        // Captura todas as rotas que começam com /api
        source: "/api/:path*",
        // Redireciona para o seu backend NestJS (geralmente localhost:3000 ou 3001)
        // Ajuste a porta conforme onde seu NestJS está rodando.
        destination: "http://localhost:3001/:path*",
      },
    ];
  },
};

export default nextConfig;
