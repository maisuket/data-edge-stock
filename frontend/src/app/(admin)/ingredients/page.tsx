"use client";

import { useState, useEffect } from "react";
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
  CheckCircle2,
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

const fmtAvgCost = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

// ── Table skeleton ─────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
              <Skeleton className="h-4 w-32" />
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-12 rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-24 rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-20" />
          </TableCell>
          <TableCell className="text-right">
            <Skeleton className="h-8 w-8 rounded ml-auto" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function IngredientsPage() {
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Dialogs state
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Ingredient | null>(null);
  const [detailTarget, setDetailTarget] = useState<Ingredient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Ingredient | null>(null);

  // Debounce da busca: atualiza a query de busca 500ms após o usuário parar de digitar
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data, isLoading, isError, isPlaceholderData } = useQuery({
    queryKey: ["ingredients", page, searchQuery],
    queryFn: () => IngredientService.getAll(page, pageSize, searchQuery),
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
      setDeleteTarget(null);
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

  const openNew = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  const handleEdit = (ingredient: Ingredient) => {
    setEditTarget(ingredient);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditTarget(null);
  };

  const ingredients = data?.data ?? [];

  return (
    <div className="p-8 max-w-400 mx-auto pb-20 animate-in fade-in duration-500">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Beaker className="w-7 h-7 text-accent" />
            Insumos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Matérias-primas usadas na produção — estoque e custo médio.
          </p>
        </div>
        <Button
          onClick={openNew}
          className="gap-2 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Novo Insumo
        </Button>
      </div>

      {/* Alertas */}
      {((lowStock && lowStock.length > 0) ||
        (expiringLots && expiringLots.length > 0)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
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

      <Card className="border-border shadow-md bg-card rounded-2xl overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle>Lista de Insumos</CardTitle>
          <CardDescription>
            Controle de estoque e custo médio ponderado das matérias-primas.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Search */}
          <div className="flex items-center space-x-2 mb-4 bg-background p-1 rounded-xl border w-fit shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary/20">
            <div className="relative w-75">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar insumo..."
                className="pl-9 border-0 shadow-none focus-visible:ring-0 h-9 bg-transparent rounded-xl"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold text-foreground">
                    Insumo
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    Unidade
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    Estoque
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    Custo Médio
                  </TableHead>
                  <TableHead className="text-right font-semibold text-foreground w-20">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeleton />
                ) : isError ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-32 text-center text-destructive"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <AlertTriangle className="h-6 w-6" />
                        <span>
                          Erro ao carregar dados. Verifique a conexão.
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : ingredients.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-32 text-center text-muted-foreground"
                    >
                      Nenhum insumo encontrado
                      {searchQuery ? ` para "${searchQuery}"` : ""}.
                    </TableCell>
                  </TableRow>
                ) : (
                  ingredients.map((ingredient) => {
                    const unit = UNIT_SHORT[ingredient.unit] ?? ingredient.unit;
                    const isOutOfStock = ingredient.currentStock <= 0;
                    const isLowStock =
                      !isOutOfStock &&
                      ingredient.currentStock <= ingredient.minStock;

                    return (
                      <TableRow
                        key={ingredient.id}
                        className="group hover:bg-muted/40 transition-colors duration-300 cursor-pointer"
                        onClick={() => setDetailTarget(ingredient)}
                      >
                        {/* Nome */}
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl border shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 bg-accent/10 text-accent border-accent/25">
                              <Beaker className="h-5 w-5" />
                            </div>
                            <span className="font-semibold text-foreground">
                              {ingredient.name}
                            </span>
                          </div>
                        </TableCell>

                        {/* Unidade */}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="font-mono font-normal"
                          >
                            {unit}
                          </Badge>
                        </TableCell>

                        {/* Estoque */}
                        <TableCell>
                          <div
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-sm transition-colors duration-300 ${
                              isOutOfStock
                                ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                                : isLowStock
                                  ? "bg-[#FFB300]/10 text-[#FFB300] border-[#FFB300]/30"
                                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            }`}
                          >
                            {isOutOfStock || isLowStock ? (
                              <AlertTriangle className="h-3 w-3" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3" />
                            )}
                            {ingredient.currentStock.toLocaleString("pt-BR", {
                              maximumFractionDigits: 3,
                            })}{" "}
                            {unit}
                          </div>
                        </TableCell>

                        {/* Custo Médio */}
                        <TableCell>
                          <span className="text-sm font-medium text-foreground tabular-nums">
                            {fmtAvgCost.format(ingredient.averageCost)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            /{unit}
                          </span>
                        </TableCell>

                        {/* Ações */}
                        <TableCell
                          className="text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-8 w-8 p-0 rounded-xl transition-all duration-300 hover:scale-105"
                              >
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>

                              <DropdownMenuItem
                                onClick={() => setDetailTarget(ingredient)}
                              >
                                <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
                                Ver detalhes
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handleEdit(ingredient)}
                              >
                                <Pencil className="mr-2 h-4 w-4 text-muted-foreground" />
                                Editar
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(ingredient)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remover
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginação */}
          <div className="flex items-center justify-between pt-4">
            <div className="text-xs text-muted-foreground">
              {data?.meta?.itemCount
                ? `Total de ${data.meta.itemCount} insumo(s)`
                : ""}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
                className="h-8 text-xs rounded-xl transition-all duration-300 hover:scale-[1.05]"
              >
                Anterior
              </Button>
              <div className="text-xs font-medium px-2 text-muted-foreground">
                Página {page}{" "}
                {data?.meta?.pageCount ? `de ${data.meta.pageCount}` : ""}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={
                  !data?.meta?.hasNextPage || isLoading || isPlaceholderData
                }
                className="h-8 text-xs rounded-xl transition-all duration-300 hover:scale-[1.05]"
              >
                Próximo
              </Button>
            </div>
          </div>
        </CardContent>
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
