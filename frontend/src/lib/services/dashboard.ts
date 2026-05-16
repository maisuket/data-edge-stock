import { api } from "../api";

export interface CriticalItem {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
}

export interface RecentProduction {
  id: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  producedAt: string;
  product: { name: string };
}

export interface DashboardStats {
  // Vendas
  totalSales?: number;
  profitMargin?: number;
  // Produtos
  totalProducts: number;
  lowStockCount: number;
  stockValue: number;
  criticalItems: CriticalItem[];
  // Insumos
  totalIngredients: number;
  ingredientsLowStockCount: number;
  ingredientsValue: number;
  // Produções
  productionsTodayCount: number;
  productionsTodayCost: number;
  recentProductions: RecentProduction[];
  productionsTrend?: { date: string; value: number }[];
}

export interface HealthStatus {
  status: "ok" | "error" | "shutting_down";
  info?: Record<string, { status: string }>;
  error?: Record<string, { status: string; message?: string }>;
}

export const DashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get<DashboardStats>("/products/dashboard-stats");
    return response.data;
  },

  getHealth: async (): Promise<HealthStatus> => {
    const response = await api.get<HealthStatus>("/health");
    return response.data;
  },
};
