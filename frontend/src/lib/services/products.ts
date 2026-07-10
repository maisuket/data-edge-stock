import { api } from "../api";

export interface Product {
  id: string;
  name: string;
  category: string;
  internalCode: string;
  barcode: string;
  location: string;
  unit: string;
  costPrice: number;
  salePrice?: number;
  currentStock: number;
  minStock: number;
  imageUrl?: string;
  /** true = produto fabricado internamente (custo calculado pela receita) */
  isManufactured: boolean;

  specifications?: { name: string; value: string }[];
  attachments?: { fileName: string; filePath: string; fileType: string }[];
}

export interface PublicProduct {
  id: string;
  name: string;
  category: string;
  unit: string;
  salePrice: number | null;
  currentStock: number;
  imageUrl?: string | null;
  specifications?: { name: string; value: string }[];
}

export interface DashboardStats {
  totalProducts: number;
  lowStockCount: number;
  stockValue: number;
  criticalItems: Array<{
    id: string;
    name: string;
    currentStock: number;
    minStock: number;
  }>;
}

// Interface para a resposta paginada do NestJS
export interface Page<T> {
  data: T[];
  meta: {
    page: number;
    take: number;
    itemCount: number;
    pageCount: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
    specifications?: Array<{ name: string; value: string }>;
    attachments?: Array<{
      fileName: string;
      filePath: string;
      fileType: string;
    }>;
  };
}

export const ProductService = {
  getAll: async (page = 1, pageSize = 10, search = "") => {
    const response = await api.get<Page<Product>>(`/products`, {
      params: {
        page,
        take: pageSize,
        q: search, // Envia para o backend
      },
    });
    return response.data;
  },

  create: async (data: Partial<Product>) => {
    return api.post("/products", data);
  },

  update: async (id: string, data: Partial<Product>) => {
    return api.patch(`/products/${id}`, data);
  },

  delete: async (id: string) => {
    return api.delete(`/products/${id}`);
  },

  getStats: async () => {
    const response = await api.get<DashboardStats>("/products/dashboard-stats");
    return response.data;
  },

  getPublic: async () => {
    const response = await api.get<PublicProduct[]>("/menu/products");
    return response.data;
  },
};
