import { api } from "./api";

export const SystemService = {
  downloadBackup: async () => {
    const response = await api.get("/system/backup", {
      responseType: "blob",
    });

    // Cria data atual formatada para o nome do arquivo
    const date = new Date().toISOString().split("T")[0];
    const filename = `backup_estoque_${date}.zip`;

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
};
