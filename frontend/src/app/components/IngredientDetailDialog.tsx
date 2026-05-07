"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { Package, Layers, TrendingUp, Calendar } from "lucide-react";

import {
  IngredientService,
  UNIT_SHORT,
  type Ingredient,
} from "@/lib/services/ingredients";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const fmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredient: Ingredient | null;
}

export function IngredientDetailDialog({
  open,
  onOpenChange,
  ingredient,
}: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["ingredient-detail", ingredient?.id],
    queryFn: () => IngredientService.getOne(ingredient!.id),
    enabled: open && !!ingredient,
  });

  const unit = ingredient
    ? (UNIT_SHORT[ingredient.unit] ?? ingredient.unit)
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card max-h-[90vh] overflow-y-auto sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <div className="p-2 bg-accent/10 text-accent rounded-xl shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            {ingredient?.name ?? "Detalhes do Insumo"}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-xl" />
            ))}
          </div>
        ) : data ? (
          <div className="space-y-5 py-2">
            {/* KPI cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-border bg-muted/30 p-3 text-center shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Estoque
                </p>
                <p className="text-lg font-bold text-foreground tabular-nums mt-1">
                  {data.currentStock.toLocaleString("pt-BR", {
                    maximumFractionDigits: 3,
                  })}
                  <span className="text-xs font-normal ml-1">{unit}</span>
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/30 p-3 text-center shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Custo Médio
                </p>
                <p className="text-lg font-bold text-foreground tabular-nums mt-1">
                  {fmt.format(data.averageCost)}
                  <span className="text-xs font-normal ml-0.5">/{unit}</span>
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/30 p-3 text-center shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Valor em Estoque
                </p>
                <p className="text-lg font-bold text-foreground tabular-nums mt-1">
                  {fmt.format(data.currentStock * data.averageCost)}
                </p>
              </div>
            </div>

            {/* Lotes */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                Histórico de lotes ({data.lots.length})
              </h4>
              {data.lots.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhuma compra registrada.
                </p>
              ) : (
                <div className="rounded-2xl border border-border overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Lote</TableHead>
                        <TableHead>Marca</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">
                          Custo Unit.
                        </TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Restante</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Validade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.lots.map((lot) => (
                        <TableRow
                          key={lot.id}
                          className="border-border group hover:bg-muted/40 transition-colors duration-300"
                        >
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="text-xs font-mono rounded-lg shadow-sm transition-transform duration-300 group-hover:scale-105"
                            >
                              {lot.lotNumber}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-medium text-foreground">
                            {lot.brand || "-"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {lot.quantity} {unit}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {fmt.format(lot.unitCost)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {fmt.format(lot.totalCost)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <span
                              className={
                                lot.remainingQty <= 0
                                  ? "text-muted-foreground line-through"
                                  : "text-foreground"
                              }
                            >
                              {lot.remainingQty} {unit}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(lot.purchasedAt), "dd/MM/yy", {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell className="text-xs">
                            {lot.expiresAt ? (
                              <span className={new Date(lot.expiresAt).getTime() < new Date().getTime() ? "text-destructive font-bold" : "text-muted-foreground font-medium"}>
                                {format(new Date(lot.expiresAt), "dd/MM/yy", {
                                  locale: ptBR,
                                })}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
