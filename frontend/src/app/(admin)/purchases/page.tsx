"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShoppingCart,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  AlertTriangle,
  Beaker,
  Calculator,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

import {
  IngredientService,
  UNIT_SHORT,
} from "../../../lib/services/ingredients";
import { SupplierService } from "../../../lib/services/suppliers";
import { PurchaseService, type Purchase } from "../../../lib/services/purchases";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

// ── Formatters ─────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

interface PurchaseItem {
  id: string; // ID temporário no front-end
  ingredientId: string;
  ingredientName: string;
  unit: string;
  quantity: number;
  totalCost: number;
  expiresAt?: string;
  brand?: string;
}

// ── Table skeleton ─────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-28" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-20" />
          </TableCell>
          <TableCell className="text-right">
            <Skeleton className="h-4 w-16 ml-auto" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-32" />
          </TableCell>
          <TableCell className="text-right">
            <Skeleton className="h-8 w-8 rounded ml-auto" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export default function ComprasPage() {
  const router = useRouter();
  const qc = useQueryClient();

  // ── Estados Gerais ───────────────────────────────────────────────────────
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(
    null,
  );
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // ── Estados do Formulário de Item ────────────────────────────────────────
  const [selectedIngId, setSelectedIngId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [cost, setCost] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [brand, setBrand] = useState("");
  const [packageQty, setPackageQty] = useState("");
  const [packageSize, setPackageSize] = useState("");

  // ── Queries ──────────────────────────────────────────────────────────────
  // Busca todos os insumos para popular o select (limitado a 1000 para cobrir todos)
  const { data: ingredientsData, isLoading: isLoadingIngredients } = useQuery({
    queryKey: ["ingredients-all"],
    queryFn: () => IngredientService.getAll(1, 100, ""),
  });
  const ingredients = ingredientsData?.data ?? [];

  // Busca todos os fornecedores
  const { data: suppliersData, isLoading: isLoadingSuppliers } = useQuery({
    queryKey: ["suppliers-all"],
    queryFn: () => SupplierService.getAll(1, 100, ""),
  });
  const suppliers = suppliersData?.data ?? [];

  // Total de compras do dia via endpoint dedicado (sem limitação de paginação)
  const { data: todayStats } = useQuery({
    queryKey: ["purchases", "today"],
    queryFn: () => PurchaseService.getTodayStats(),
    refetchInterval: 30_000,
  });
  const todayPurchasesTotal = todayStats?.total ?? 0;

  // Busca as compras recentes
  const {
    data: purchasesData,
    isLoading: isLoadingPurchases,
    isError: isErrorPurchases,
  } = useQuery({
    queryKey: ["purchases"],
    queryFn: () => PurchaseService.getAll(1, 10),
  });
  const recentPurchases = purchasesData?.data ?? [];

  // Variáveis derivadas úteis para a UI
  const selectedIngredient = ingredients.find((i) => i.id === selectedIngId);
  const selectedUnitShort = selectedIngredient
    ? (UNIT_SHORT[selectedIngredient.unit] ?? selectedIngredient.unit)
    : "";

  // ── Funções ──────────────────────────────────────────────────────────────
  const handleCalculatePackage = () => {
    const qty = Number(packageQty);
    const size = Number(packageSize);
    if (qty > 0 && size > 0) {
      setQuantity((qty * size).toString());
    }
  };

  const handleAddItem = () => {
    if (!selectedIngId || !quantity || !cost) {
      toast.error("Preencha todos os campos do item (insumo, qtde e custo).");
      return;
    }

    const ing = ingredients.find((i) => i.id === selectedIngId);
    if (!ing) return;

    const newItem: PurchaseItem = {
      id: Math.random().toString(36).substring(7),
      ingredientId: ing.id,
      ingredientName: ing.name,
      unit: ing.unit,
      quantity: Number(quantity),
      totalCost: Number(cost),
      expiresAt: expiresAt || undefined,
      brand: brand || undefined,
    };

    setItems([...items, newItem]);

    // Limpa o formulário de item
    setSelectedIngId("");
    setQuantity("");
    setCost("");
    setExpiresAt("");
    setBrand("");
    setPackageQty("");
    setPackageSize("");
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const totalPurchaseCost = items.reduce(
    (acc, item) => acc + item.totalCost,
    0,
  );

  // ── Mutations ────────────────────────────────────────────────────────────
  const savePurchaseMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        supplierId: supplierId || undefined,
        notes: notes || undefined,
        items: items.map((item) => ({
          ingredientId: item.ingredientId,
          quantity: item.quantity,
          totalCost: item.totalCost,
          expiresAt: item.expiresAt,
          brand: item.brand,
        })),
      };

      return IngredientService.buyBulk(payload);
    },
    onSuccess: () => {
      toast.success("Compra registrada com sucesso!");
      qc.invalidateQueries({ queryKey: ["ingredients"] });
      qc.invalidateQueries({ queryKey: ["purchases"] });
      router.push("/ingredients");
    },
    onError: () => {
      toast.error("Erro ao registrar a compra.");
    },
  });

  return (
    <div className="p-6 md:p-8 max-w-300 mx-auto space-y-6 animate-in fade-in duration-500 pb-24">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-xl"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ShoppingCart className="w-8 h-8 text-emerald-600" />
              Registrar Compra
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Adicione múltiplos insumos de uma mesma nota ou fornecimento.
            </p>
          </div>
        </div>

        <div className="bg-primary/10 border border-primary/20 px-5 py-3 rounded-lg flex flex-col shrink-0 min-w-40 text-right">
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">
            Compras de Hoje
          </span>
          <span className="text-2xl font-black text-foreground tabular-nums tracking-tight">
            {fmt.format(todayPurchasesTotal)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda: Formulários */}
        <div className="lg:col-span-1 space-y-6">
          {/* Dados da Nota/Fornecedor */}
          <Card className="border-border shadow-sm rounded-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Dados Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Fornecedor (Opcional)
                </label>
                <select
                  className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  disabled={isLoadingSuppliers}
                >
                  <option value="">
                    {isLoadingSuppliers ? "Carregando..." : "Nenhum (avulso)"}
                  </option>
                  {suppliers.map((sup: any) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Observações
                </label>
                <Input
                  placeholder="Nº da nota, lote, etc..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-background rounded-lg"
                />
              </div>
            </CardContent>
          </Card>

          {/* Adicionar Item */}
          <Card className="border-emerald-100 bg-emerald-50/30 dark:border-emerald-900/30 dark:bg-emerald-900/10 shadow-sm rounded-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Beaker className="w-4 h-4 text-emerald-600" />
                Adicionar Insumo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Insumo
                </label>
                {/* Select nativo com estilo do Tailwind (parecido com o Input padrão) */}
                <select
                  className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedIngId}
                  onChange={(e) => setSelectedIngId(e.target.value)}
                  disabled={isLoadingIngredients}
                >
                  <option value="" disabled>
                    {isLoadingIngredients
                      ? "Carregando..."
                      : "Selecione um insumo..."}
                  </option>
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({UNIT_SHORT[ing.unit] ?? ing.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Calculadora (Exibida apenas para G e ML, ocupa a largura total) */}
              {selectedIngredient &&
                ["G", "ML"].includes(selectedIngredient.unit) && (
                  <div className="p-3 bg-emerald-50/50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30 space-y-3">
                    <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase flex items-center gap-1.5">
                      <Calculator className="w-4 h-4" />
                      Calculadora de Embalagem
                    </label>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="Qtd pacotes (ex: 2)"
                        value={packageQty}
                        onChange={(e) => setPackageQty(e.target.value)}
                        className="bg-background shadow-sm"
                      />
                      <span className="text-muted-foreground font-medium hidden sm:block">
                        x
                      </span>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder={`Tamanho (${selectedUnitShort})`}
                        value={packageSize}
                        onChange={(e) => setPackageSize(e.target.value)}
                        className="bg-background shadow-sm"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full sm:w-auto bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-800 dark:text-emerald-100 shadow-sm whitespace-nowrap"
                        onClick={handleCalculatePackage}
                      >
                        Aplicar
                      </Button>
                    </div>
                  </div>
                )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1">
                    Quantidade
                    {selectedUnitShort && (
                      <span className="text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-900/30 px-1.5 rounded">
                        em {selectedUnitShort}
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="bg-background rounded-lg pr-12"
                    />
                    {selectedUnitShort && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground pointer-events-none">
                        {selectedUnitShort}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Custo Total (R$)
                  </label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="bg-background rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Marca (Opcional)
                  </label>
                  <Input
                    placeholder="Ex: Nestlé"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="bg-background rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Validade (Opcional)
                  </label>
                  <Input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="bg-background rounded-lg text-muted-foreground"
                  />
                </div>
              </div>
              <Button
                onClick={handleAddItem}
                className="w-full gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="w-4 h-4" /> Incluir na Nota
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita: Tabela de Itens */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border shadow-sm rounded-xl overflow-hidden min-h-100 flex flex-col">
            <CardHeader className="bg-muted/30 border-b border-border pb-4">
              <CardTitle className="text-base">Resumo da Compra</CardTitle>
              <CardDescription>
                Revise os itens adicionados antes de confirmar.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
                  <ShoppingCart className="w-10 h-10 opacity-20" />
                  <p className="text-sm">Nenhum item adicionado ainda.</p>
                </div>
              ) : (
                <div className="p-4 space-y-3 max-h-[50vh] sm:max-h-full overflow-y-auto">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row justify-between sm:items-center bg-muted/30 p-3 rounded-lg border border-border gap-3 sm:gap-0"
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground">
                            {item.ingredientName}
                          </span>
                          {item.brand && (
                            <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
                              {item.brand}
                            </span>
                          )}
                        </div>
                        {item.expiresAt && (
                          <div className="text-[10px] text-muted-foreground font-normal mt-0.5">
                            Vence:{" "}
                            {new Date(
                              `${item.expiresAt}T12:00:00Z`,
                            ).toLocaleDateString("pt-BR")}
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground mt-1">
                          {item.quantity.toLocaleString("pt-BR")}{" "}
                          {UNIT_SHORT[item.unit] ?? item.unit} x{" "}
                          {fmt.format(item.totalCost / item.quantity)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-border sm:border-t-0 pt-2 sm:pt-0 mt-1 sm:mt-0">
                        <span className="font-semibold text-sm text-foreground tabular-nums">
                          {fmt.format(item.totalCost)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            {/* Rodapé do Carrinho com o Total */}
            <div className="bg-muted/30 border-t border-border p-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-4 mt-auto">
              <div>
                <p className="text-sm text-muted-foreground uppercase font-medium tracking-wider">
                  Total da Nota
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {fmt.format(totalPurchaseCost)}
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => savePurchaseMutation.mutate()}
                disabled={items.length === 0 || savePurchaseMutation.isPending}
                className="w-full sm:w-auto gap-2 rounded-xl transition-all hover:scale-105 shadow-sm"
              >
                {savePurchaseMutation.isPending ? (
                  <span className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
                Confirmar Compra
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Tabela de Últimas Compras */}
      <Card className="border-border shadow-sm rounded-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Últimas Compras Registradas</CardTitle>
          <CardDescription>
            Lista das 10 compras mais recentes registradas no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold text-foreground">
                    Data / Hora
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    Fornecedor
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    Itens
                  </TableHead>
                  <TableHead className="text-right font-semibold text-foreground">
                    Total
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    Observações
                  </TableHead>
                  <TableHead className="text-right font-semibold text-foreground w-16">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingPurchases ? (
                  <TableSkeleton />
                ) : isErrorPurchases ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-destructive"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <AlertTriangle className="h-6 w-6" />
                        <span>
                          Erro ao carregar dados. Verifique a conexão.
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : recentPurchases.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhuma compra registrada recentemente.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentPurchases.map((purchase) => (
                    <TableRow
                      key={purchase.id}
                      className="hover:bg-muted/40 transition-colors duration-300"
                    >
                      <TableCell className="text-muted-foreground tabular-nums text-xs">
                        {new Date(purchase.createdAt).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {purchase.supplier?.name || "Avulso"}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {purchase.lots.length === 1
                          ? purchase.lots[0].ingredient?.name ||
                            "Insumo excluído"
                          : `${purchase.lots.length} itens`}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-foreground">
                        {fmt.format(Number(purchase.totalCost))}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-50 truncate text-xs">
                        {purchase.notes || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Ver detalhes"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => {
                            setSelectedPurchase(purchase);
                            setIsViewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Detalhes da Compra */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-125 w-[95vw] max-h-[90vh] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Compra</DialogTitle>
          </DialogHeader>
          {selectedPurchase && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground bg-muted/10 p-3 rounded-lg border border-border">
                <p>
                  <strong className="text-foreground">Data:</strong>{" "}
                  {new Date(selectedPurchase.createdAt).toLocaleString(
                    "pt-BR",
                  )}
                </p>
                <p className="mt-1">
                  <strong className="text-foreground">Fornecedor:</strong>{" "}
                  {selectedPurchase.supplier?.name || "Avulso"}
                </p>
                <p className="mt-1">
                  <strong className="text-foreground">Observações:</strong>{" "}
                  {selectedPurchase.notes || "-"}
                </p>
              </div>
              <div className="max-h-[45vh] overflow-y-auto pr-2 space-y-2">
                {selectedPurchase.lots.map((lot) => (
                  <div
                    key={lot.id}
                    className="flex justify-between items-center bg-muted/30 p-3 rounded-lg border border-border"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-sm text-foreground">
                        {lot.ingredient?.name || "Insumo excluído"}
                        {lot.brand && (
                          <span className="ml-1.5 text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
                            {lot.brand}
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground mt-0.5">
                        {Number(lot.quantity).toLocaleString("pt-BR")}{" "}
                        {UNIT_SHORT[lot.ingredient?.unit] ??
                          lot.ingredient?.unit}{" "}
                        x {fmt.format(Number(lot.unitCost))}
                      </span>
                    </div>
                    <span className="font-semibold text-sm text-foreground tabular-nums">
                      {fmt.format(Number(lot.totalCost))}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-4 border-t">
                <span className="font-semibold text-muted-foreground">
                  Total:
                </span>
                <span className="font-bold text-xl text-primary tabular-nums">
                  {fmt.format(Number(selectedPurchase.totalCost))}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
