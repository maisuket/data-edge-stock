"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Package,
  DollarSign,
  AlertTriangle,
  Factory,
  Beaker,
  RefreshCw,
  Database,
  Server,
  Cpu,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

import { DashboardService } from "../../../lib/services/dashboard";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// ── Formatters ──────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// ── KPI Card ────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon: Icon,
  colorClass,
  subtitle,
  alert,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  colorClass: string;
  subtitle?: string;
  alert?: boolean;
}) {
  return (
    <Card className={`hover:shadow-md transition-all border-border bg-card ${alert ? "border-destructive/40" : ""}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between pb-2">
          <div className={`p-2 rounded-lg ${colorClass}`}>
            <Icon className="h-5 w-5" />
          </div>
          {alert && (
            <AlertTriangle className="w-4 h-4 text-destructive animate-pulse" />
          )}
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold tracking-tight text-card-foreground">
            {value}
          </div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-1">
            {title}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground/70 mt-1">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Health indicator ────────────────────────────────────────────────────────

function HealthItem({
  label,
  icon: Icon,
  status,
  detail,
}: {
  label: string;
  icon: React.ElementType;
  status: "ok" | "error" | "loading";
  detail?: string;
}) {
  const isOk = status === "ok";
  const isLoading = status === "loading";

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className={`p-2 rounded-full ${isOk ? "bg-[#4CAF50]/10 text-[#4CAF50]" : isLoading ? "bg-muted text-muted-foreground" : "bg-destructive/10 text-destructive"}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground truncate">{detail ?? "—"}</p>
      </div>
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      ) : isOk ? (
        <CheckCircle2 className="w-4 h-4 text-[#4CAF50] shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-destructive shrink-0" />
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const {
    data: stats,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: DashboardService.getStats,
    staleTime: 60_000,
  });

  const {
    data: health,
    isLoading: healthLoading,
  } = useQuery({
    queryKey: ["health"],
    queryFn: DashboardService.getHealth,
    staleTime: 30_000,
    retry: false,
  });

  const handleRefresh = () => {
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
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-7">
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
          <h2 className="text-lg font-bold text-foreground">Erro ao carregar dados</h2>
          <p className="text-muted-foreground mb-4">Não foi possível conectar ao servidor.</p>
          <Button variant="outline" onClick={() => refetch()}>Tentar Novamente</Button>
        </div>
      </div>
    );
  }

  const s = stats!;
  const dbStatus = health?.status === "ok" ? "ok" : healthLoading ? "loading" : "error";
  const memStatus = health?.info?.memory_heap?.status === "up" ? "ok" : healthLoading ? "loading" : "error";
  const apiStatus = health ? "ok" : healthLoading ? "loading" : "error";

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Visão Geral</h1>
          <p className="text-muted-foreground mt-1">
            Indicadores consolidados — produtos, insumos e produções.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isFetching}
          className="gap-2 bg-background hover:bg-muted"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* KPIs — Produtos */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Produtos
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Produtos Cadastrados"
            value={s.totalProducts}
            icon={Package}
            colorClass="bg-blue-500/10 text-blue-500"
            subtitle="Itens no catálogo"
          />
          <StatCard
            title="Valor em Estoque"
            value={fmt.format(s.stockValue)}
            icon={DollarSign}
            colorClass="bg-[#4CAF50]/10 text-[#4CAF50]"
            subtitle="Custo total acumulado (produtos)"
          />
          <StatCard
            title="Produtos c/ Estoque Baixo"
            value={s.lowStockCount}
            icon={AlertTriangle}
            colorClass={s.lowStockCount > 0 ? "bg-[#FFB300]/10 text-[#FFB300]" : "bg-muted text-muted-foreground"}
            subtitle="Abaixo do mínimo definido"
            alert={s.lowStockCount > 0}
          />
          <StatCard
            title="Produções Hoje"
            value={s.productionsTodayCount}
            icon={Factory}
            colorClass="bg-accent/10 text-accent"
            subtitle={`Custo total: ${fmt.format(s.productionsTodayCost)}`}
          />
        </div>
      </div>

      {/* KPIs — Insumos */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Insumos (Matérias-primas)
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Insumos Cadastrados"
            value={s.totalIngredients}
            icon={Beaker}
            colorClass="bg-violet-500/10 text-violet-500"
            subtitle="Matérias-primas no sistema"
          />
          <StatCard
            title="Valor em Insumos"
            value={fmt.format(s.ingredientsValue)}
            icon={DollarSign}
            colorClass="bg-teal-500/10 text-teal-500"
            subtitle="Custo médio × estoque atual"
          />
          <StatCard
            title="Insumos c/ Estoque Baixo"
            value={s.ingredientsLowStockCount}
            icon={TrendingDown}
            colorClass={s.ingredientsLowStockCount > 0 ? "bg-[#E53935]/10 text-[#E53935]" : "bg-muted text-muted-foreground"}
            subtitle="Precisam de reposição"
            alert={s.ingredientsLowStockCount > 0}
          />
        </div>
      </div>

      {/* Painel inferior */}
      <div className="grid gap-4 lg:grid-cols-7">

        {/* Produções recentes */}
        <Card className="col-span-4 border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Factory className="w-4 h-4 text-accent" />
              Produções Recentes
            </CardTitle>
            <CardDescription>Últimos 5 lotes registrados no sistema.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {s.recentProductions.length === 0 ? (
              <div className="px-6 py-8 text-center text-muted-foreground text-sm">
                Nenhuma produção registrada ainda.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {s.recentProductions.map((prod) => (
                  <div key={prod.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{prod.product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(prod.producedAt), "dd/MM/yy HH:mm", { locale: ptBR })}
                        {" · "}
                        {prod.quantity.toLocaleString("pt-BR")} un
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-sm font-bold tabular-nums text-foreground">{fmt.format(prod.totalCost)}</p>
                      <p className="text-xs text-muted-foreground">{fmt.format(prod.unitCost)}/un</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status do sistema */}
        <Card className="col-span-3 border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              Status do Sistema
            </CardTitle>
            <CardDescription>Monitoramento em tempo real via /health.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <HealthItem
              label="Banco de Dados"
              icon={Database}
              status={dbStatus}
              detail={health?.info?.database?.status === "up" ? "Conectado" : health ? "Falha na conexão" : undefined}
            />
            <HealthItem
              label="Memória (Heap)"
              icon={Cpu}
              status={memStatus}
              detail={health?.info?.memory_heap?.status === "up" ? "Dentro do limite (<150 MB)" : health ? "Limite excedido" : undefined}
            />
            <HealthItem
              label="API Backend"
              icon={Server}
              status={apiStatus}
              detail={health ? "Online" : undefined}
            />

            <div className="pt-2 flex justify-center">
              {healthLoading ? (
                <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Verificando...
                </Badge>
              ) : health?.status === "ok" ? (
                <Badge className="gap-1 text-xs bg-[#4CAF50]/10 text-[#4CAF50] border-[#4CAF50]/30">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#4CAF50] animate-pulse" />
                  SISTEMA OPERACIONAL
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1 text-xs">
                  <XCircle className="w-3 h-3" />
                  ATENÇÃO — VERIFICAR
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de produtos críticos */}
      {s.criticalItems.length > 0 && (
        <Card className="border-[#FFB300]/40 bg-[#FFB300]/5 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#FFB300]">
              <AlertTriangle className="w-4 h-4" />
              Produtos com estoque crítico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {s.criticalItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-sm p-2 rounded-md bg-background/60 border border-[#FFB300]/20">
                  <span className="font-medium text-foreground truncate pr-2">{item.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {item.currentStock}/{item.minStock}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
