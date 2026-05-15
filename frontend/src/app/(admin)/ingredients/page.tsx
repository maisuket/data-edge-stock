"use client";

import { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2,
  MoreHorizontal,
  Beaker,
  TrendingDown,
  Clock,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

import {
  IngredientService,
  type Ingredient,
  UNIT_SHORT,
} from "../../../lib/services/ingredients";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IngredientFormDialog } from "@/app/components/IngredientFormDialog";
import { IngredientDetailDialog } from "@/app/components/IngredientDetailDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// ── Formatters ─────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function StockBadge({ current, min }: { current: number; min: number }) {
  if (current <= 0)
    return (
      <Badge className="bg-[#E53935]/10 text-[#E53935] border-[#E53935]/30 border">
        Sem estoque
      </Badge>
    );
  if (current <= min)
    return (
      <Badge className="bg-[#FFB300]/10 text-[#FFB300] border-[#FFB300]/30 border gap-1">
        <AlertTriangle className="w-3 h-3" /> Estoque baixo
      </Badge>
    );
  return (
    <Badge className="bg-[#4CAF50]/10 text-[#4CAF50] border-[#4CAF50]/30 border">
      Normal
    </Badge>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function IngredientsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Dialogs state
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Ingredient | null>(null);
  const [detailTarget, setDetailTarget] = useState<Ingredient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Ingredient | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ["ingredients", page, search],
    queryFn: () => IngredientService.getAll(page, 15, search),
    placeholderData: keepPreviousData,
  });

  const { data: lowStock } = useQuery({
    queryKey: ["ingredients-low-stock"],
    queryFn: () => IngredientService.getLowStock(),
  });

  const { data: expiringLots } = useQuery({
    queryKey: ["ingredients-expiring"],
    queryFn: () => IngredientService.getExpiringLots(30),
  });

  // ── Mutations ────────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: IngredientService.delete,
    onSuccess: () => {
      toast.success("Insumo removido.");
      qc.invalidateQueries({ queryKey: ["ingredients"] });
    },
    onError: (e: any) => {
      let errMsg = e?.response?.data?.message ?? "Erro ao remover insumo.";
      if (Array.isArray(errMsg)) {
        errMsg = errMsg[0]?.constraints
          ? Object.values(errMsg[0].constraints)[0]
          : errMsg.join(", ");
      } else if (typeof errMsg === "object") {
        errMsg = JSON.stringify(errMsg);
      }

      toast.error(String(errMsg));
    },
  });

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleEdit = (ingredient: Ingredient) => {
    setEditTarget(ingredient);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditTarget(null);
  };

  const ingredients = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Beaker className="w-8 h-8 text-accent" />
            Insumos
          </h1>
          <p className="text-muted-foreground mt-1">
            Matérias-primas usadas na produção.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditTarget(null);
            setFormOpen(true);
          }}
          className="w-full sm:w-auto gap-2 bg-primary text-primary-foreground hover:bg-[#A65E2E] shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Insumo
        </Button>
      </div>

      {/* Alertas */}
      {((lowStock && lowStock.length > 0) ||
        (expiringLots && expiringLots.length > 0)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Estoque Baixo */}
          {lowStock && lowStock.length > 0 && (
            <Card className="border-[#FFB300]/40 bg-[#FFB300]/5">
              <CardContent className="p-4 flex items-center gap-3">
                <TrendingDown className="w-5 h-5 text-[#FFB300] shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {lowStock.length} insumo{lowStock.length > 1 ? "s" : ""} com
                    estoque abaixo do mínimo
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {lowStock.map((i) => i.name).join(", ")}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vencimento Próximo */}
          {expiringLots && expiringLots.length > 0 && (
            <Card className="border-[#E53935]/40 bg-[#E53935]/5">
              <CardContent className="p-4 flex items-center gap-3">
                <Clock className="w-5 h-5 text-[#E53935] shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {expiringLots.length} lote
                    {expiringLots.length > 1 ? "s" : ""} vencido ou próximo do
                    vencimento (30 dias)
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {expiringLots
                      .map(
                        (l) =>
                          `${l.ingredient.name} (Vence: ${new Date(
                            l.expiresAt!,
                          ).toLocaleDateString("pt-BR", { timeZone: "UTC" })})`,
                      )
                      .join(", ")}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tabela */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
            <div>
              <CardTitle className="text-base font-bold">
                Lista de Insumos
              </CardTitle>
              <CardDescription>
                {meta
                  ? `${meta.itemCount} insumo${meta.itemCount !== 1 ? "s" : ""} cadastrado${meta.itemCount !== 1 ? "s" : ""}`
                  : ""}
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar insumo..."
                className="pl-9 bg-background"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="pl-6">Nome</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead className="text-right">Custo Médio</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="pr-6 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full rounded-md" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : ingredients.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-40 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Beaker className="w-8 h-8 opacity-30" />
                        <p>Nenhum insumo encontrado.</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setFormOpen(true)}
                          className="mt-1"
                        >
                          Cadastrar primeiro insumo
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  ingredients.map((ingredient) => (
                    <TableRow
                      key={ingredient.id}
                      className="border-border hover:bg-muted/40 cursor-pointer transition-colors"
                      onClick={() => setDetailTarget(ingredient)}
                    >
                      <TableCell className="pl-6 font-medium text-foreground">
                        {ingredient.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-mono">
                          {UNIT_SHORT[ingredient.unit] ?? ingredient.unit}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {ingredient.currentStock.toLocaleString("pt-BR", {
                          maximumFractionDigits: 3,
                        })}
                        <span className="text-xs text-muted-foreground ml-1">
                          {UNIT_SHORT[ingredient.unit]}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-foreground">
                        {fmt.format(ingredient.averageCost)}
                        <span className="text-xs text-muted-foreground">
                          /{UNIT_SHORT[ingredient.unit]}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <StockBadge
                          current={ingredient.currentStock}
                          min={ingredient.minStock}
                        />
                      </TableCell>
                      <TableCell
                        className="pr-6 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDetailTarget(ingredient)}
                              >
                                <Eye className="w-4 h-4 mr-2" /> Ver detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEdit(ingredient)}
                              >
                                <Pencil className="w-4 h-4 mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteTarget(ingredient)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Remover
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {/* Paginação */}
        {meta && meta.pageCount > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Página {meta.page} de {meta.pageCount}
            </p>
            <div className="flex gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                className="w-1/2 sm:w-auto"
                disabled={!meta.hasPreviousPage}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-1/2 sm:w-auto"
                disabled={!meta.hasNextPage}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Dialogs */}
      <IngredientFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        ingredient={editTarget}
      />
      <IngredientDetailDialog
        open={!!detailTarget}
        onOpenChange={(open) => !open && setDetailTarget(null)}
        ingredient={detailTarget}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remover insumo"
        description={`Tem certeza que deseja remover "${deleteTarget?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Remover"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
}
