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
  Download,
  Pencil,
  Trash2,
  ArrowLeftRight,
  Package,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";

// Serviços (Caminhos relativos para compatibilidade)
import { ProductService, type Product } from "../../../lib/services/products";
import {
  StockMovementService,
  MovementType,
} from "../../../lib/services/stock-movements";
import { ReportsService } from "../../../lib/services/reports";

// Componentes Customizados

// Componentes UI (Shadcn)
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

// --- MODAL DE MOVIMENTAÇÃO DE ESTOQUE ---
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
        type: type as any,
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
      <DialogContent className="sm:max-w-[425px]">
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
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                  : "border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
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
                  ? "bg-red-600 hover:bg-red-700 text-white border-transparent"
                  : "border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
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
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Observação</label>
            <Input
              placeholder="Motivo (ex: Venda, Perda, Compra)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !quantity || Number(quantity) <= 0}
          >
            {mutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- PÁGINA PRINCIPAL ---
export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(
    undefined
  );

  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [movingProduct, setMovingProduct] = useState<Product | undefined>(
    undefined
  );

  const queryClient = useQueryClient();

  const { data, isLoading, isError, isPlaceholderData } = useQuery({
    queryKey: ["products", page, search],
    queryFn: () => ProductService.getAll(page, pageSize, search),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: ProductService.delete,
    onSuccess: () => {
      toast.success("Produto excluído!");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: () => toast.error("Erro ao excluir. Verifique movimentações."),
  });

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este produto?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleExport = async () => {
    toast.promise(ReportsService.downloadProductsExcel(), {
      loading: "Gerando relatório...",
      success: "Download iniciado!",
      error: "Erro ao exportar",
    });
  };

  // Handlers
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

  return (
    <div className="p-8 max-w-[1600px] mx-auto pb-20 animate-in fade-in duration-500">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Produtos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie seu catálogo, preços e estoque.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Produto
          </Button>
        </div>
      </div>

      <Card className="border-border shadow-sm bg-card">
        <CardHeader className="pb-4">
          <CardTitle>Listagem de Itens</CardTitle>
          <CardDescription>
            Visualize e gerencie todos os produtos cadastrados.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Barra de Ferramentas */}
          <div className="flex items-center space-x-2 mb-4 bg-background p-1 rounded-md border w-fit">
            <div className="relative w-[300px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou código..."
                className="pl-9 border-0 shadow-none focus-visible:ring-0 h-9 bg-transparent"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          {/* Tabela */}
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
                    Preço Venda
                  </TableHead>
                  <TableHead className="text-right font-semibold text-foreground w-[80px]">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-32 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col justify-center items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="text-sm">Carregando catálogo...</span>
                      </div>
                    </TableCell>
                  </TableRow>
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
                      Nenhum produto encontrado para "{search}".
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.data?.map((product) => {
                    const isLowStock = product.currentStock <= product.minStock;
                    return (
                      <TableRow
                        key={product.id}
                        className="group hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-muted rounded-lg text-muted-foreground border border-border">
                              <Package className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">
                                {product.name}
                              </div>
                              <div className="text-xs text-muted-foreground flex gap-2">
                                <span className="font-mono bg-muted px-1 rounded text-[10px]">
                                  CÓD: {product.internalCode}
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="font-normal text-muted-foreground bg-background"
                          >
                            {product.category || "Geral"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
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
                        <TableCell className="font-medium text-foreground">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(product.salePrice || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
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
                                onClick={() => openMove(product)}
                              >
                                <ArrowLeftRight className="mr-2 h-4 w-4 text-muted-foreground" />
                                Movimentar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(product.id)}
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
                ? `Total de ${data.meta.itemCount} registro(s)`
                : ""}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
                className="h-8 text-xs"
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
                className="h-8 text-xs"
              >
                Próximo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Renderização dos Modais */}
      <ProductFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        productToEdit={editingProduct}
        onSuccess={handleSuccess}
      />

      {/* Modal de Movimentação */}
      {isMoveOpen && movingProduct && (
        <StockMovementDialog
          open={isMoveOpen}
          onOpenChange={setIsMoveOpen}
          product={movingProduct}
        />
      )}
    </div>
  );
}
