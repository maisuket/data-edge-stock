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
  Beaker,
  Calculator,
} from "lucide-react";
import { toast } from "sonner";

import {
  IngredientService,
  type Ingredient,
  UNIT_SHORT,
} from "../../../lib/services/ingredients";
import { SupplierService } from "../../../lib/services/suppliers";

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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

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

export default function ComprasPage() {
  const router = useRouter();
  const qc = useQueryClient();

  // ── Estados Gerais ───────────────────────────────────────────────────────
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PurchaseItem[]>([]);

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
        supplier: supplier || undefined,
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
      router.push("/ingredients");
    },
    onError: () => {
      toast.error("Erro ao registrar a compra.");
    },
  });

  return (
    <div className="p-6 md:p-8 max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-500 pb-24">
      {/* Cabeçalho */}
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
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  disabled={isLoadingSuppliers}
                >
                  <option value="">
                    {isLoadingSuppliers ? "Carregando..." : "Nenhum (avulso)"}
                  </option>
                  {suppliers.map((sup: any) => (
                    <option key={sup.id} value={sup.name}>
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
          <Card className="border-border shadow-sm rounded-xl overflow-hidden min-h-[400px] flex flex-col">
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
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead>Insumo</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead className="text-right">Custo Unitário</TableHead>
                      <TableHead className="text-right">Custo Total</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium text-foreground">
                          {item.ingredientName}
                          {item.brand && (
                            <span className="ml-1.5 text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
                              {item.brand}
                            </span>
                          )}
                          {item.expiresAt && (
                            <div className="text-[10px] text-muted-foreground font-normal mt-0.5">
                              Vence:{" "}
                              {new Date(
                                `${item.expiresAt}T12:00:00Z`,
                              ).toLocaleDateString("pt-BR")}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity.toLocaleString("pt-BR")}{" "}
                          <span className="text-xs text-muted-foreground">
                            {UNIT_SHORT[item.unit] ?? item.unit}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {fmt.format(item.totalCost / item.quantity)}
                          <span className="text-[10px] ml-1">
                            /{UNIT_SHORT[item.unit] ?? item.unit}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {fmt.format(item.totalCost)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
    </div>
  );
}
