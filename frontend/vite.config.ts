import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    // Configuração para rodar localmente sem Docker
    proxy: {
      "/api": {
        target: "http://localhost:3000", // Aponta para o Backend local
        changeOrigin: true,
        secure: false,
        // Não precisamos de rewrite pois o backend já espera /api (setGlobalPrefix)
      },
    },
  },
  build: {
    outDir: "dist",
  },
});

// https://vitejs.dev/config/
// export default defineConfig({
//   plugins: [react()],
//   // CORREÇÃO CRÍTICA PARA ELECTRON:
//   // Define a base como './' para que os assets usem caminhos relativos.
//   // Isso permite que o index.html ache os scripts quando carregado via file://
//   base: "./",
//   build: {
//     outDir: "dist",
//   },
// });
