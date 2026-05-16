"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  ChefHat,
  Calculator,
  TrendingUp,
  Search,
  Loader2,
  RefreshCw,
  Info,
} from "lucide-react";
import { toast } from "sonner";

import { ProductService } from "../../../lib/services/products";
import {
  IngredientService,
  UNIT_SHORT,
} from "../../../lib/services/ingredients";
import { RecipeService } from "../../../lib/services/recipes";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Formatters ─────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

// ── Types ─────────────────────────────────────────────────────────────────

interface RecipeRow {
  ingredientId: string;
  quantity: number;
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function RecipesPage() {
  const qc = useQueryClient();

  // Selected product
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [salePrice, setSalePrice] = useState<string>("");

  // Recipe rows being edited
  const [rows, setRows] = useState<RecipeRow[]>([]);
  const [addIngredientId, setAddIngredientId] = useState<string>("");

  // ── Data ──────────────────────────────────────────────────────────────

  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ["products-for-recipe"],
    queryFn: () => ProductService.getAll(1, 100),
  });

  const { data: ingredientsData, isLoading: loadingIngredients } = useQuery({
    queryKey: ["ingredients-for-recipe"],
    queryFn: () => IngredientService.getAll(1, 100),
  });

  const { data: recipe, isLoading: loadingRecipe } = useQuery({
    queryKey: ["recipe", selectedProductId],
    queryFn: () => RecipeService.getRecipe(selectedProductId),
    enabled: !!selectedProductId,
  });

  // ── Sync recipe into rows when product changes ─────────────────────────

  const [prevRecipe, setPrevRecipe] = useState<any>(null);
  const [prevProductId, setPrevProductId] = useState<string>("");
  const [prevProductsData, setPrevProductsData] = useState<any>(null);

  if (
    recipe !== prevRecipe ||
    selectedProductId !== prevProductId ||
    productsData !== prevProductsData
  ) {
    setPrevRecipe(recipe);
    setPrevProductId(selectedProductId);
    setPrevProductsData(productsData);

    if (recipe?.items) {
      setRows(
        recipe.items.map((i) => ({
          ingredientId: i.ingredientId,
          quantity: i.quantity,
        })),
      );
      const product = productsData?.data.find(
        (p) => p.id === selectedProductId,
      );
      if (product?.salePrice) setSalePrice(String(product.salePrice));
    } else {
      setRows([]);
    }
  }

  // ── Live cost calculation ─────────────────────────────────────────────

  const ingredients = ingredientsData?.data ?? [];
  const ingredientMap = new Map(ingredients.map((i) => [i.id, i]));

  const totalCostPerUnit = rows.reduce((sum, row) => {
    const ing = ingredientMap.get(row.ingredientId);
    if (!ing) return sum;
    return sum + ing.averageCost * row.quantity;
  }, 0);

  const salePriceNum = parseFloat(salePrice) || 0;
  const profitMargin =
    salePriceNum > 0
      ? ((salePriceNum - totalCostPerUnit) / salePriceNum) * 100
      : null;
  const profitValue = salePriceNum > 0 ? salePriceNum - totalCostPerUnit : null;

  // ── Mutations ─────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: () =>
      RecipeService.setRecipe(selectedProductId, {
        salePrice: salePriceNum > 0 ? salePriceNum : null,
        items: rows.map((r) => ({
          ingredientId: r.ingredientId,
          quantity: r.quantity,
        })),
      } as any),
    onSuccess: () => {
      toast.success(
        "Receita salva! Custo do produto atualizado automaticamente.",
      );
      qc.invalidateQueries({ queryKey: ["recipe", selectedProductId] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: any) => {
      let errMsg = e?.response?.data?.message ?? "Erro ao salvar receita.";
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

  const refreshMutation = useMutation({
    mutationFn: () => RecipeService.refreshCost(selectedProductId),
    onSuccess: (data) => {
      toast.success(`Custo atualizado: ${fmt.format(data.newCostPrice)}/un`);
      qc.invalidateQueries({ queryKey: ["recipe", selectedProductId] });
    },
  });

  // ── Row actions ───────────────────────────────────────────────────────

  const addRow = () => {
    if (!addIngredientId) return;
    if (rows.find((r) => r.ingredientId === addIngredientId)) {
      toast.error("Insumo já está na receita.");
      return;
    }
    setRows((prev) => [
      ...prev,
      { ingredientId: addIngredientId, quantity: 0 },
    ]);
    setAddIngredientId("");
  };

  const updateQty = (id: string, qty: number) =>
    setRows((prev) =>
      prev.map((r) => (r.ingredientId === id ? { ...r, quantity: qty } : r)),
    );

  const removeRow = (id: string) =>
    setRows((prev) => prev.filter((r) => r.ingredientId !== id));

  const usedIds = new Set(rows.map((r) => r.ingredientId));
  const availableIngredients = ingredients.filter((i) => !usedIds.has(i.id));

  const products = productsData?.data ?? [];

  return (
    <div className="p-6 md:p-8 max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ChefHat className="w-8 h-8 text-accent" />
            Receitas
          </h1>
          <p className="text-muted-foreground mt-1">
            Defina os insumos e quantidades de cada produto fabricado.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: selector + recipe builder */}
        <div className="lg:col-span-2 space-y-5">
          {/* Product selector */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                1. Selecionar Produto
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingProducts ? (
                <Skeleton className="h-10 w-full rounded-lg" />
              ) : (
                <Select
                  onValueChange={setSelectedProductId}
                  value={selectedProductId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Escolha o produto para montar a receita..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-2">
                          {p.isManufactured && (
                            <ChefHat className="w-3 h-3 text-accent" />
                          )}
                          {p.name}
                          <span className="text-xs text-muted-foreground">
                            — {p.category}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          {/* Recipe builder */}
          {selectedProductId && (
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    2. Ingredientes da Receita
                  </CardTitle>
                  <CardDescription>Por unidade produzida</CardDescription>
                </div>
                {recipe && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => refreshMutation.mutate()}
                    disabled={refreshMutation.isPending}
                    className="gap-1.5 text-xs"
                  >
                    <RefreshCw
                      className={`w-3 h-3 ${refreshMutation.isPending ? "animate-spin" : ""}`}
                    />
                    Atualizar custos
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingIngredients ? (
                  <Skeleton className="h-32 w-full rounded-lg" />
                ) : (
                  <>
                    {rows.length === 0 && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-[#2196F3]/5 border border-[#2196F3]/20 text-sm text-[#2196F3]">
                        <Info className="w-4 h-4 shrink-0" />
                        Nenhum ingrediente adicionado. Adicione abaixo.
                      </div>
                    )}

                    {rows.map((row) => {
                      const ing = ingredientMap.get(row.ingredientId);
                      if (!ing) return null;
                      const itemCost = ing.averageCost * row.quantity;
                      return (
                        <div
                          key={row.ingredientId}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">
                              {ing.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              CMP: {fmt.format(ing.averageCost)}/
                              {UNIT_SHORT[ing.unit]}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Input
                              type="number"
                              step="0.1"
                              min={0}
                              value={row.quantity}
                              onChange={(e) =>
                                updateQty(
                                  row.ingredientId,
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="w-24 text-right tabular-nums"
                            />
                            <span className="text-xs text-muted-foreground w-6">
                              {UNIT_SHORT[ing.unit]}
                            </span>
                            <span className="text-sm font-semibold w-20 text-right tabular-nums text-foreground">
                              {fmt.format(itemCost)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => removeRow(row.ingredientId)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Add ingredient */}
                    <div className="flex gap-2 pt-1">
                      <Select
                        onValueChange={setAddIngredientId}
                        value={addIngredientId}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Adicionar insumo..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableIngredients.map((i) => (
                            <SelectItem key={i.id} value={i.id}>
                              {i.name}{" "}
                              <span className="text-xs text-muted-foreground ml-1">
                                ({UNIT_SHORT[i.unit]})
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={addRow}
                        disabled={!addIngredientId}
                        variant="outline"
                        className="gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: cost panel + save */}
        {selectedProductId && (
          <div className="space-y-4">
            {/* Preço de venda */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Preço de Venda
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    R$
                  </span>
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    className="pl-9 tabular-nums"
                    placeholder="0,00"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Cost summary */}
            <Card className="border-accent/30 bg-card shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  Resumo Financeiro
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-muted-foreground">
                    Custo de produção
                  </span>
                  <span className="font-bold text-lg tabular-nums text-foreground">
                    {fmt.format(totalCostPerUnit)}
                  </span>
                </div>

                {salePriceNum > 0 && (
                  <>
                    <div className="border-t border-border pt-3 space-y-2">
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-muted-foreground">
                          Preço de venda
                        </span>
                        <span className="font-semibold tabular-nums">
                          {fmt.format(salePriceNum)}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-muted-foreground">
                          Lucro por unidade
                        </span>
                        <span
                          className={`font-semibold tabular-nums ${
                            (profitValue ?? 0) >= 0
                              ? "text-[#4CAF50]"
                              : "text-[#E53935]"
                          }`}
                        >
                          {fmt.format(profitValue ?? 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Margem
                        </span>
                        <Badge
                          className={`tabular-nums ${
                            (profitMargin ?? 0) >= 30
                              ? "bg-[#4CAF50]/10 text-[#4CAF50] border-[#4CAF50]/30 border"
                              : (profitMargin ?? 0) >= 0
                                ? "bg-[#FFB300]/10 text-[#FFB300] border-[#FFB300]/30 border"
                                : "bg-[#E53935]/10 text-[#E53935] border-[#E53935]/30 border"
                          }`}
                        >
                          <TrendingUp className="w-3 h-3 mr-1" />
                          {fmtPct(profitMargin ?? 0)}
                        </Badge>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Save */}
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-[#A65E2E] shadow-sm"
              disabled={rows.length === 0 || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ChefHat className="w-4 h-4 mr-2" />
              )}
              Salvar Receita
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              O custo do produto é atualizado automaticamente ao salvar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
