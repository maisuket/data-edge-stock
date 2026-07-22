"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import {
  Plus,
  Search,
  Download,
  Pencil,
  Trash2,
  ArrowLeftRight,
  Package,
  AlertTriangle,
  CheckCircle2,
  MoreHorizontal,
  ChefHat,
  Factory,
  TrendingUp,
  Tag,
} from "lucide-react";
import { toast } from "sonner";

import { ProductService, type Product } from "../../../lib/services/products";
import {
  StockMovementService,
  MovementType,
} from "../../../lib/services/stock-movements";
import { ReportsService } from "../../../lib/services/reports";

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ProductFormDialog } from "@/app/components/ProductFormDialog";
import { PriceTiersDialog } from "@/app/components/PriceTiersDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// ── Formatters ─────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// ── Category badge colors ──────────────────────────────────────────────────

const CATEGORY_STYLES: Record<string, string> = {
  Pudim: "bg-[#6B3E26]/10 text-[#6B3E26] border-[#6B3E26]/25",
  Picolé: "bg-[#8ED1C6]/20 text-[#2E7D70] border-[#8ED1C6]/40",
  Dindin: "bg-[#FF8A65]/15 text-[#BF360C] border-[#FF8A65]/30",
  Sorvete: "bg-[#D9A441]/15 text-[#7A5C1E] border-[#D9A441]/35",
  Bolo: "bg-[#CE93D8]/20 text-[#6A1B9A] border-[#CE93D8]/40",
  Torta: "bg-[#A5D6A7]/20 text-[#1B5E20] border-[#A5D6A7]/40",
  Outros: "bg-muted text-muted-foreground border-border",
};

function CategoryBadge({ category }: { category: string }) {
  const style = CATEGORY_STYLES[category] ?? CATEGORY_STYLES["Outros"];
  return (
    <Badge variant="outline" className={`font-normal border ${style}`}>
      {category || "Outros"}
    </Badge>
  );
}

// ── Margin badge ───────────────────────────────────────────────────────────

function MarginBadge({
  costPrice,
  salePrice,
}: {
  costPrice: number;
  salePrice?: number;
}) {
  if (!salePrice || salePrice <= 0)
    return <span className="text-xs text-muted-foreground">—</span>;
  const margin = ((salePrice - costPrice) / salePrice) * 100;
  const cls =
    margin >= 30
      ? "bg-[#4CAF50]/10 text-[#4CAF50] border-[#4CAF50]/30"
      : margin >= 0
        ? "bg-[#FFB300]/10 text-[#FFB300] border-[#FFB300]/30"
        : "bg-[#E53935]/10 text-[#E53935] border-[#E53935]/30";
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-lg shadow-sm border ${cls}`}
    >
      <TrendingUp className="w-3 h-3" />
      {margin.toFixed(1)}%
    </span>
  );
}

// ── Stock movement dialog ──────────────────────────────────────────────────

function StockMovementDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
}) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<MovementType>(MovementType.ENTRY);
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!product) return;
      return StockMovementService.create({
        productId: product.id,
        type,
        quantity: Number(quantity),
        description,
      });
    },
    onSuccess: () => {
      toast.success("Movimentação registrada!");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onOpenChange(false);
      setQuantity("");
      setDescription("");
      setType(MovementType.ENTRY);
    },
    onError: () => toast.error("Erro ao registrar movimentação."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Movimentar Estoque</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-muted rounded-md text-sm border border-border">
            <span className="font-medium block text-muted-foreground text-xs uppercase">
              Produto
            </span>
            <span className="font-semibold text-base text-foreground">
              {product?.name}
            </span>
            <div className="text-xs text-muted-foreground mt-1">
              Saldo Atual: {product?.currentStock} {product?.unit}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={type === MovementType.ENTRY ? "default" : "outline"}
              className={
                type === MovementType.ENTRY
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-sm"
                  : "border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl transition-all duration-300 hover:scale-[1.02]"
              }
              onClick={() => setType(MovementType.ENTRY)}
            >
              Entrada (+)
            </Button>
            <Button
              type="button"
              variant={type === MovementType.EXIT ? "default" : "outline"}
              className={
                type === MovementType.EXIT
                  ? "bg-red-600 hover:bg-red-700 text-white border-transparent rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-sm"
                  : "border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all duration-300 hover:scale-[1.02]"
              }
              onClick={() => setType(MovementType.EXIT)}
            >
              Saída (-)
            </Button>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Quantidade</label>
            <Input
              type="number"
              min="1"
              placeholder="0"
              value={quantity}
              className="rounded-xl transition-all duration-300 focus-visible:ring-primary/20"
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Observação</label>
            <Input
              placeholder="Motivo (ex: Ajuste, Perda, Venda direta)..."
              value={description}
              className="rounded-xl transition-all duration-300 focus-visible:ring-primary/20"
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl transition-all duration-300 hover:scale-[1.02]"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !quantity || Number(quantity) <= 0}
            className="rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-sm"
          >
            {mutation.isPending && (
              <span className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
            )}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Table skeleton ─────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-20 rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-24 rounded-full" />
          </TableCell>
          <TableCell>
            <div className="space-y-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
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

export default function ProductsPage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(
    undefined,
  );

  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [movingProduct, setMovingProduct] = useState<Product | undefined>(
    undefined,
  );
  const [deleteTarget, setDeleteTarget] = useState<Product | undefined>(
    undefined,
  );

  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [promoProduct, setPromoProduct] = useState<Product | null>(null);

  const queryClient = useQueryClient();

  // Debounce da busca: atualiza a query de busca 500ms após o usuário parar de digitar
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isError, isPlaceholderData } = useQuery({
    queryKey: ["products", page, searchQuery],
    queryFn: () => ProductService.getAll(page, pageSize, searchQuery),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: ProductService.delete,
    onSuccess: () => {
      toast.success("Produto excluído!");
      setDeleteTarget(undefined);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: () => toast.error("Erro ao excluir. Verifique movimentações."),
  });

  const handleDelete = (product: Product) => {
    setDeleteTarget(product);
  };

  const handleExport = () => {
    toast.promise(ReportsService.downloadProductsExcel(), {
      loading: "Gerando relatório...",
      success: "Download iniciado!",
      error: "Erro ao exportar",
    });
  };

  const openNew = () => {
    setEditingProduct(undefined);
    setIsFormOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    setIsFormOpen(false);
  };

  const openMove = (product: Product) => {
    setMovingProduct(product);
    setIsMoveOpen(true);
  };

  const openPromo = (product: Product) => {
    setPromoProduct(product);
    setIsPromoOpen(true);
  };

  const newLocal = "relative w-[300px]";
  return (
    <div className="p-8 max-w-400 mx-auto pb-20 animate-in fade-in duration-500">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package className="w-7 h-7 text-accent" />
            Produtos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Catálogo de doces e gelados — preços, custos e estoque.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            className="gap-2 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-sm"
          >
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button
            onClick={openNew}
            className="gap-2 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Novo Produto
          </Button>
        </div>
      </div>

      <Card className="border-border shadow-md bg-card rounded-2xl overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle>Listagem de Produtos</CardTitle>
          <CardDescription>
            Produtos com{" "}
            <span className="inline-flex items-center gap-1 text-accent font-medium">
              <ChefHat className="w-3 h-3" /> ChefHat
            </span>{" "}
            são fabricados internamente — o custo é calculado pela receita.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Search */}
          <div className="flex items-center space-x-2 mb-4 bg-background p-1 rounded-xl border w-fit shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary/20">
            <div className={newLocal}>
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou código..."
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
                    Produto
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    Categoria
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    Estoque
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    Custo / Venda
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
                ) : data?.data?.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-32 text-center text-muted-foreground"
                    >
                      Nenhum produto encontrado
                      {searchQuery ? ` para "${searchQuery}"` : ""}.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.data?.map((product) => {
                    const isLowStock = product.currentStock <= product.minStock;

                    const specsText = Array.isArray(product.specifications)
                      ? product.specifications
                          .map((s: any) =>
                            s.name || s.key
                              ? `${s.name || s.key}: ${s.value}`
                              : s.value || s,
                          )
                          .join(" • ")
                      : product.specifications;

                    return (
                      <TableRow
                        key={product.id}
                        className="group hover:bg-muted/40 transition-colors duration-300"
                      >
                        {/* Nome */}
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-xl border shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 ${
                                product.isManufactured
                                  ? "bg-accent/10 text-accent border-accent/25"
                                  : "bg-muted text-muted-foreground border-border"
                              }`}
                            >
                              {product.isManufactured ? (
                                <ChefHat className="h-5 w-5" />
                              ) : (
                                <Package className="h-5 w-5" />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground flex items-center gap-2">
                                {product.name}
                                {product.isManufactured && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] h-4 px-1.5 bg-accent/10 text-accent border-accent/30 font-normal"
                                  >
                                    Fabricado
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                                <span className="font-mono bg-muted px-1 rounded text-[10px]">
                                  {product.internalCode}
                                </span>
                                {specsText && (
                                  <span
                                    className="truncate max-w-62.5"
                                    title={specsText}
                                  >
                                    • {specsText}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Categoria */}
                        <TableCell>
                          <CategoryBadge category={product.category} />
                        </TableCell>

                        {/* Estoque */}
                        <TableCell>
                          <div
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-sm transition-colors duration-300 ${
                              isLowStock
                                ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            }`}
                          >
                            {isLowStock ? (
                              <AlertTriangle className="h-3 w-3" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3" />
                            )}
                            {product.currentStock} {product.unit}
                          </div>
                        </TableCell>

                        {/* Custo / Venda */}
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-10">
                                Custo
                              </span>
                              <span className="text-sm font-medium text-foreground tabular-nums">
                                {fmt.format(product.costPrice ?? 0)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-10">
                                Venda
                              </span>
                              <span className="text-sm font-semibold tabular-nums">
                                {fmt.format(product.salePrice ?? 0)}
                              </span>
                              <MarginBadge
                                costPrice={product.costPrice ?? 0}
                                salePrice={product.salePrice}
                              />
                            </div>
                          </div>
                        </TableCell>

                        {/* Ações */}
                        <TableCell className="text-right">
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
                                onClick={() => openEdit(product)}
                              >
                                <Pencil className="mr-2 h-4 w-4 text-muted-foreground" />
                                Editar
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => openPromo(product)}
                              >
                                <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
                                Promoção por quantidade
                              </DropdownMenuItem>

                              {product.isManufactured ? (
                                <>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      router.push(
                                        `/recipes?product=${product.id}`,
                                      )
                                    }
                                  >
                                    <ChefHat className="mr-2 h-4 w-4 text-muted-foreground" />
                                    Ver Receita
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      router.push(
                                        `/productions?product=${product.id}`,
                                      )
                                    }
                                  >
                                    <Factory className="mr-2 h-4 w-4 text-muted-foreground" />
                                    Registrar Produção
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => openMove(product)}
                                >
                                  <ArrowLeftRight className="mr-2 h-4 w-4 text-muted-foreground" />
                                  Movimentar
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => handleDelete(product)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
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
                ? `Total de ${data.meta.itemCount} produto(s)`
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
      <ProductFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        productToEdit={editingProduct}
        onSuccess={handleSuccess}
      />

      {isMoveOpen && movingProduct && (
        <StockMovementDialog
          open={isMoveOpen}
          onOpenChange={setIsMoveOpen}
          product={movingProduct}
        />
      )}

      <PriceTiersDialog
        open={isPromoOpen}
        onOpenChange={setIsPromoOpen}
        product={promoProduct}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(undefined)}
        title="Excluir produto"
        description={`Tem certeza que deseja excluir "${deleteTarget?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
}
