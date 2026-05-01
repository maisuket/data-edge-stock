"use client";

import { useState, useEffect } from "react";
import {
  ArrowRightLeft,
  ArrowDownToLine,
  ArrowUpFromLine,
  Calculator,
  Loader2,
  Check,
  AlertTriangle,
  Package,
} from "lucide-react";
import { toast } from "sonner";

// Imports relativos para garantir funcionamento
import {
  StockMovementService,
  MovementType,
} from "../../lib/services/stock-movements";
import { SupplierService, type Supplier } from "../../lib/services/suppliers";
import type { Product } from "../../lib/services/products";

// Componentes UI
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface StockMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  product: Product | null;
}

export function StockMovementDialog({
  open,
  onOpenChange,
  onSuccess,
  product,
}: StockMovementDialogProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"ENTRY" | "EXIT">("ENTRY");

  // Estados do Formulário
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [batch, setBatch] = useState("");
  const [supplierId, setSupplierId] = useState("");

  // Dados auxiliares
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Modo Inventário (Balanço)
  const [isInventoryMode, setIsInventoryMode] = useState(false);
  const [finalStockCount, setFinalStockCount] = useState("");
  const [calculatedDiff, setCalculatedDiff] = useState<number | null>(null);

  // Reset ao abrir
  useEffect(() => {
    if (open) {
      setQuantity("");
      setDescription("");
      setBatch("");
      setSupplierId("");
      setIsInventoryMode(false);
      setFinalStockCount("");
      setCalculatedDiff(null);
      setActiveTab("ENTRY");

      // Carregar fornecedores se necessário
      SupplierService.getAll(1, 100)
        .then((res) => setSuppliers(res.data))
        .catch(console.error);
    }
  }, [open]);

  // Lógica de Inventário
  const handleInventoryChange = (value: string) => {
    setFinalStockCount(value);
    if (!product || !value) {
      setCalculatedDiff(null);
      return;
    }

    const realCount = Number(value);
    const systemCount = product.currentStock;
    const diff = realCount - systemCount;

    setCalculatedDiff(diff);

    // Define a quantidade automaticamente baseada na diferença
    setQuantity(String(Math.abs(diff)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    // Validação básica
    if (Number(quantity) <= 0 && !isInventoryMode) {
      toast.error("A quantidade deve ser maior que zero.");
      return;
    }

    if (isInventoryMode && calculatedDiff === 0) {
      toast.info("O estoque já está correto. Nenhuma movimentação necessária.");
      onOpenChange(false);
      return;
    }

    setLoading(true);

    try {
      let type = activeTab === "ENTRY" ? MovementType.ENTRY : MovementType.EXIT;
      let finalDescription = description;

      // Lógica específica do modo inventário
      if (isInventoryMode && calculatedDiff !== null) {
        if (calculatedDiff > 0) {
          type = MovementType.ADJUSTMENT; // Sobra -> Entrada/Ajuste
          finalDescription = description || "Correção de Inventário (Sobra)";
        } else {
          type = MovementType.EXIT; // Falta -> Saída
          finalDescription =
            description || "Correção de Inventário (Perda/Falta)";
        }
      }

      const payload = {
        productId: product.id,
        type,
        quantity: Number(quantity),
        description: finalDescription,
        batch: activeTab === "ENTRY" ? batch : undefined,
        supplierId:
          activeTab === "ENTRY" && supplierId ? supplierId : undefined,
      };

      await StockMovementService.create(payload);

      toast.success("Movimentação registrada com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Erro ao registrar movimentação."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg dark:bg-blue-900/20 dark:text-blue-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            Movimentar Estoque
          </DialogTitle>
        </DialogHeader>

        {/* Info do Produto */}
        <div className="bg-muted/50 p-3 rounded-lg border border-border flex justify-between items-center mb-2">
          <div>
            <span className="text-xs font-medium text-muted-foreground uppercase">
              Produto
            </span>
            <p className="font-semibold text-foreground">{product.name}</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-medium text-muted-foreground uppercase">
              Atual
            </span>
            <p className="font-bold text-foreground">
              {product.currentStock} {product.unit}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Toggle Modo Inventário (Balanço) */}
          <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="inventory-mode" className="cursor-pointer">
                Modo Balanço (Inventário)
              </Label>
            </div>
            <Switch
              id="inventory-mode"
              checked={isInventoryMode}
              onCheckedChange={(checked) => {
                setIsInventoryMode(checked);
                setQuantity("");
                setFinalStockCount("");
                setCalculatedDiff(null);
              }}
            />
          </div>

          {isInventoryMode ? (
            /* --- MODO INVENTÁRIO --- */
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2">
                <Label>Contagem Física (Quantidade Real)</Label>
                <Input
                  type="number"
                  value={finalStockCount}
                  onChange={(e) => handleInventoryChange(e.target.value)}
                  placeholder="Ex: 50"
                  className="text-lg font-medium"
                  autoFocus
                />
              </div>

              {calculatedDiff !== null && (
                <Alert
                  variant={calculatedDiff < 0 ? "destructive" : "default"}
                  className={
                    calculatedDiff > 0
                      ? "border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20"
                      : ""
                  }
                >
                  {calculatedDiff < 0 ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <AlertTitle>Resultado da Contagem</AlertTitle>
                  <AlertDescription>
                    {calculatedDiff === 0
                      ? "Estoque está correto."
                      : `Diferença de ${
                          calculatedDiff > 0 ? "+" : ""
                        }${calculatedDiff} itens. Será gerado um ajuste automático.`}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            /* --- MODO MANUAL (Entrada/Saída) --- */
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as any)}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger
                  value="ENTRY"
                  className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700 dark:data-[state=active]:bg-green-900/30 dark:data-[state=active]:text-green-400"
                >
                  <ArrowDownToLine className="w-4 h-4 mr-2" /> Entrada
                </TabsTrigger>
                <TabsTrigger
                  value="EXIT"
                  className="data-[state=active]:bg-red-100 data-[state=active]:text-red-700 dark:data-[state=active]:bg-red-900/30 dark:data-[state=active]:text-red-400"
                >
                  <ArrowUpFromLine className="w-4 h-4 mr-2" /> Saída
                </TabsTrigger>
              </TabsList>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantidade</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      min="0.1"
                      step="0.1"
                    />
                  </div>

                  {activeTab === "ENTRY" && (
                    <div className="space-y-2">
                      <Label>Lote (Opcional)</Label>
                      <Input
                        placeholder="Lote #123"
                        value={batch}
                        onChange={(e) => setBatch(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {activeTab === "ENTRY" && (
                  <div className="space-y-2">
                    <Label>Fornecedor (Opcional)</Label>
                    <Select value={supplierId} onValueChange={setSupplierId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um fornecedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </Tabs>
          )}

          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea
              placeholder={
                isInventoryMode
                  ? "Justificativa do ajuste..."
                  : "Motivo (Venda, Nota Fiscal, etc)..."
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || (!quantity && !isInventoryMode)}
              className={
                activeTab === "EXIT" && !isInventoryMode
                  ? "bg-red-600 hover:bg-red-700"
                  : ""
              }
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Confirmar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
