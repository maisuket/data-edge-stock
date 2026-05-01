"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Package,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  MoreVertical,
  Database,
  Server,
  Loader2,
  Activity,
} from "lucide-react";
import { toast } from "sonner";

// Serviços (Caminho relativo para evitar erro no build)
import { ProductService } from "../../../lib/services/products";

// Componentes UI (Shadcn)
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// --- Componentes Auxiliares ---

// 1. Card de Estatística (KPI)
const StatCard = ({
  title,
  value,
  icon: Icon,
  chartColor, // "chart-1", "chart-2", etc.
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  chartColor: string;
  subtitle?: string;
}) => (
  <Card className="hover:shadow-md transition-all border-border bg-card">
    <CardContent className="p-6">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <div
          className={`p-2 rounded-lg bg-[var(--color-${chartColor})]/10 text-[var(--color-${chartColor})]`}
        >
          <Icon className="h-6 w-6" />
        </div>
        {/* Indicador visual opcional no canto */}
        <div
          className={`h-2 w-2 rounded-full bg-[var(--color-${chartColor})] opacity-50`}
        />
      </div>
      <div className="mt-4">
        <div className="text-2xl font-bold tracking-tight text-card-foreground">
          {value}
        </div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-1">
          {title}
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground/70 mt-2">{subtitle}</p>
        )}
      </div>
    </CardContent>
  </Card>
);

// 2. Item de Métrica (Barra de Progresso)
const MetricItem = ({
  label,
  value,
  colorVar = "primary", // nome da variavel css (ex: chart-1, primary)
  valueLabel,
}: {
  label: string;
  value: number;
  colorVar?: string;
  valueLabel?: string;
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between text-sm">
      <span className="font-medium text-muted-foreground">{label}</span>
      <span className="font-bold text-foreground">
        {valueLabel || `${value}%`}
      </span>
    </div>
    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 bg-[var(--color-${colorVar})]`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  </div>
);

// --- PÁGINA PRINCIPAL ---

export default function DashboardPage() {
  const {
    data: stats,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: ProductService.getStats,
  });

  const handleRefresh = async () => {
    toast.promise(refetch(), {
      loading: "Atualizando...",
      success: "Dados atualizados!",
      error: "Erro ao atualizar",
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-[1600px] mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-7">
          <Skeleton className="col-span-4 h-64 rounded-xl" />
          <Skeleton className="col-span-3 h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-[80vh] items-center justify-center flex-col gap-4 text-center p-8">
        <div className="p-4 rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">
            Erro ao carregar dados
          </h2>
          <p className="text-muted-foreground mb-4">
            Não foi possível conectar ao servidor.
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  const safeStats = stats || {
    totalProducts: 0,
    stockValue: 0,
    lowStockCount: 0,
    criticalItems: [],
  };

  const formattedValue = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(safeStats.stockValue || 0);

  const criticalPercentage =
    safeStats.totalProducts > 0
      ? (safeStats.lowStockCount / safeStats.totalProducts) * 100
      : 0;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Visão Geral
          </h1>
          <p className="text-muted-foreground mt-1">
            Indicadores de performance do estoque em tempo real.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          className="gap-2 bg-background hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Grid de KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Produtos Cadastrados"
          value={safeStats.totalProducts}
          icon={Package}
          chartColor="chart-1" // Azul/Roxo (depende do tema)
          subtitle="Itens ativos no sistema"
        />
        <StatCard
          title="Valor em Estoque"
          value={formattedValue}
          icon={DollarSign}
          chartColor="chart-2" // Verde/Teal
          subtitle="Custo total acumulado"
        />
        <StatCard
          title="Estoque Baixo"
          value={safeStats.lowStockCount}
          icon={AlertTriangle}
          chartColor="chart-3" // Laranja/Amarelo
          subtitle="Abaixo do estoque mínimo"
        />
        <StatCard
          title="Itens Críticos"
          value={safeStats.criticalItems?.length || 0}
          icon={TrendingUp}
          chartColor={
            safeStats.criticalItems?.length > 0 ? "destructive" : "chart-4"
          }
          subtitle="Exigem reposição imediata"
        />
      </div>

      {/* Seção Inferior */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Painel Esquerdo: Análise */}
        <Card className="col-span-4 shadow-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Saúde do Estoque
              </CardTitle>
              <CardDescription>
                Métricas de eficiência e preenchimento.
              </CardDescription>
            </div>
            <MoreVertical className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
          </CardHeader>
          <CardContent className="space-y-8 pt-6">
            <MetricItem
              label="Capacidade Operacional"
              value={75}
              colorVar="chart-1"
            />
            <MetricItem
              label="Giro de Estoque"
              value={85}
              colorVar="chart-2"
              valueLabel="Alto"
            />
            <MetricItem
              label="Alertas de Reposição"
              value={criticalPercentage > 0 ? 100 : 0}
              colorVar={criticalPercentage > 0 ? "destructive" : "chart-2"}
              valueLabel={`${safeStats.lowStockCount} Produtos`}
            />
          </CardContent>
        </Card>

        {/* Painel Direito: Status do Sistema */}
        <Card className="col-span-3 border-border shadow-sm bg-card h-full flex flex-col">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
              Status do Sistema
            </CardTitle>
            <CardDescription>Monitoramento de serviços.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 flex-1">
            {/* Item 1 */}
            <div className="flex items-center gap-4 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="p-2 rounded-full bg-chart-2/10 text-chart-2">
                <Database className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Banco de Dados
                </p>
                <p className="text-xs text-muted-foreground">
                  Conectado • Latência 12ms
                </p>
              </div>
            </div>

            {/* Item 2 */}
            <div className="flex items-center gap-4 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="p-2 rounded-full bg-chart-1/10 text-chart-1">
                <Server className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  API Backend
                </p>
                <p className="text-xs text-muted-foreground">Online • v1.0.0</p>
              </div>
            </div>

            <div className="pt-4 mt-auto flex justify-center">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-chart-2/10 border border-chart-2/20 text-xs font-medium text-chart-2">
                <div className="w-2 h-2 rounded-full bg-chart-2 animate-pulse" />
                SISTEMA OPERACIONAL
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
