import { api } from "../api";

export const ReportsService = {
  downloadProductsExcel: async () => {
    const response = await api.get("/reports/products/excel", {
      responseType: "blob", // Importante para arquivos binários
    });
    // Cria um link temporário para forçar o download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "estoque_produtos.xlsx");
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  downloadProductsPdf: async () => {
    const response = await api.get("/reports/products/pdf", {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "estoque_produtos.pdf");
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
};
