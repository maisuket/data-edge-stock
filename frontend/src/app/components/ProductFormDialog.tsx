"use client";

import { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  Loader2,
  Save,
  ChefHat,
  Info,
} from "lucide-react";
import { toast } from "sonner";

import { ProductService, type Product } from "@/lib/services/products";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

// ── Constantes do domínio ──────────────────────────────────────────────────

export const PRODUCT_CATEGORIES = [
  { value: "Pudim",    label: "🍮 Pudim" },
  { value: "Picolé",   label: "🍦 Picolé" },
  { value: "Dindin",   label: "🧊 Dindin" },
  { value: "Sorvete",  label: "🍨 Sorvete" },
  { value: "Bolo",     label: "🎂 Bolo" },
  { value: "Torta",    label: "🥧 Torta" },
  { value: "Outros",   label: "📦 Outros" },
];

const UNITS = ["UN", "DZ", "CX", "KG", "G", "L", "ML", "PC"];

// ── Interfaces ────────────────────────────────────────────────────────────

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  productToEdit?: Product;
}

interface Spec {
  name: string;
  value: string;
}

const emptyForm = {
  name: "",
  category: "Pudim",
  internalCode: "",
  unit: "UN",
  costPrice: "",
  salePrice: "",
  currentStock: "",
  minStock: "",
  location: "",
  isManufactured: false,
};

// ── Component ─────────────────────────────────────────────────────────────

export function ProductFormDialog({
  open,
  onOpenChange,
  onSuccess,
  productToEdit,
}: ProductFormDialogProps) {
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [specs, setSpecs] = useState<Spec[]>([]);

  const isEditing = !!productToEdit;

  // ── Reset ao abrir ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    setActiveTab("general");

    if (productToEdit) {
      setFormData({
        name: productToEdit.name,
        category: productToEdit.category,
        internalCode: productToEdit.internalCode,
        unit: productToEdit.unit,
        costPrice: String(productToEdit.costPrice),
        salePrice: productToEdit.salePrice ? String(productToEdit.salePrice) : "",
        currentStock: String(productToEdit.currentStock),
        minStock: String(productToEdit.minStock),
        location: productToEdit.location ?? "",
        isManufactured: productToEdit.isManufactured ?? false,
      });
      setSpecs(productToEdit.specifications?.map((s) => ({ name: s.name, value: s.value })) ?? []);
    } else {
      setFormData(emptyForm);
      setSpecs([]);
    }
  }, [open, productToEdit]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const set = (field: string, value: string | boolean) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const addSpec = () => setSpecs((p) => [...p, { name: "", value: "" }]);
  const removeSpec = (i: number) => setSpecs((p) => p.filter((_, idx) => idx !== i));
  const updateSpec = (i: number, field: keyof Spec, val: string) =>
    setSpecs((p) => p.map((s, idx) => (idx === i ? { ...s, [field]: val } : s)));

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error("Nome é obrigatório."); return; }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        unit: formData.unit,
        // costPrice: para fabricados, o custo vem da receita.
        // Na criação, enviamos 0 — será atualizado ao salvar receita.
        costPrice: formData.isManufactured ? 0 : (Number(formData.costPrice) || 0),
        salePrice: formData.salePrice ? Number(formData.salePrice) : undefined,
        currentStock: Number(formData.currentStock) || 0,
        minStock: Number(formData.minStock) || 0,
        location: formData.location.trim() || undefined,
        isManufactured: formData.isManufactured,
        specifications: specs.filter((s) => s.name.trim() && s.value.trim()),
        attachments: [] as { fileName: string; filePath: string; fileType: string }[],
        // Geração automática de campos obrigatórios no schema mas sem uso real aqui
        internalCode:
          formData.internalCode.trim() ||
          (isEditing ? productToEdit!.internalCode : `PROD-${Date.now().toString().slice(-6)}`),
        barcode: isEditing ? productToEdit!.barcode : "N/A",
      };

      if (isEditing) {
        await ProductService.update(productToEdit!.id, payload);
        toast.success("Produto atualizado!");
      } else {
        await ProductService.create(payload);
        toast.success("Produto criado!");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar produto. Verifique os dados.");
    } finally {
      setLoading(false);
    }
  };

  // ── Cálculo de margem em tempo real ──────────────────────────────────────

  const costNum = Number(formData.costPrice) || 0;
  const saleNum = Number(formData.salePrice) || 0;
  const margin = saleNum > 0 ? ((saleNum - costNum) / saleNum) * 100 : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] h-[90vh] sm:h-auto overflow-y-auto flex flex-col p-0 gap-0 bg-card">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-foreground">
            {isEditing ? "Editar Produto" : "Novo Produto"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="px-6 border-b border-border mt-4">
              <TabsList className="w-full justify-start h-11 bg-transparent p-0 gap-1">
                {[
                  { value: "general", label: "Dados Gerais" },
                  { value: "specs",   label: "Especificações", count: specs.length },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-11 px-4 bg-transparent text-muted-foreground"
                  >
                    {tab.label}
                    {tab.count ? (
                      <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                        {tab.count}
                      </Badge>
                    ) : null}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6 max-h-[60vh]">

              {/* ── ABA GERAL ───────────────────────────────────────────── */}
              <TabsContent value="general" className="mt-0 space-y-5">

                {/* Toggle: produto fabricado */}
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-center gap-3">
                    <ChefHat className="w-5 h-5 text-accent shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Produto fabricado internamente
                      </p>
                      <p className="text-xs text-muted-foreground">
                        O custo será calculado automaticamente pela receita.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.isManufactured}
                    onCheckedChange={(v) => set("isManufactured", v)}
                  />
                </div>

                <div className="grid grid-cols-12 gap-4">
                  {/* Nome + Unidade */}
                  <div className="col-span-12 sm:col-span-8 space-y-2">
                    <Label htmlFor="name">Nome do produto *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="Ex: Pudim de Leite Condensado"
                      required
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-4 space-y-2">
                    <Label>Unidade</Label>
                    <Select value={formData.unit} onValueChange={(v) => set("unit", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Categoria */}
                  <div className="col-span-12 sm:col-span-6 space-y-2">
                    <Label>Categoria</Label>
                    <Select value={formData.category} onValueChange={(v) => set("category", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Código interno */}
                  <div className="col-span-12 sm:col-span-6 space-y-2">
                    <Label htmlFor="internalCode">
                      Código interno
                      <span className="text-muted-foreground text-xs ml-1">(opcional)</span>
                    </Label>
                    <Input
                      id="internalCode"
                      value={formData.internalCode}
                      onChange={(e) => set("internalCode", e.target.value)}
                      placeholder="Gerado automaticamente"
                    />
                  </div>

                  {/* Preços */}
                  <div className="col-span-6 space-y-2">
                    <Label htmlFor="costPrice">
                      Custo de produção (R$)
                    </Label>
                    {formData.isManufactured ? (
                      <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-muted text-muted-foreground text-sm">
                        <Info className="w-4 h-4 shrink-0" />
                        Calculado pela receita
                      </div>
                    ) : (
                      <Input
                        id="costPrice"
                        type="number"
                        step="0.01"
                        min={0}
                        value={formData.costPrice}
                        onChange={(e) => set("costPrice", e.target.value)}
                        placeholder="0,00"
                      />
                    )}
                  </div>

                  <div className="col-span-6 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="salePrice">Preço de venda (R$)</Label>
                      {margin !== null && (
                        <Badge
                          className={`text-xs ${
                            margin >= 30
                              ? "bg-[#4CAF50]/10 text-[#4CAF50] border-[#4CAF50]/30 border"
                              : margin >= 0
                              ? "bg-[#FFB300]/10 text-[#FFB300] border-[#FFB300]/30 border"
                              : "bg-[#E53935]/10 text-[#E53935] border-[#E53935]/30 border"
                          }`}
                        >
                          Margem: {margin.toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                    <Input
                      id="salePrice"
                      type="number"
                      step="0.01"
                      min={0}
                      value={formData.salePrice}
                      onChange={(e) => set("salePrice", e.target.value)}
                      placeholder="0,00"
                    />
                  </div>

                  {/* Estoque */}
                  <div className="col-span-4 space-y-2">
                    <Label htmlFor="currentStock">Estoque atual</Label>
                    <Input
                      id="currentStock"
                      type="number"
                      min={0}
                      value={formData.currentStock}
                      onChange={(e) => set("currentStock", e.target.value)}
                      disabled={isEditing}
                      className={isEditing ? "bg-muted text-muted-foreground" : ""}
                    />
                    {isEditing && (
                      <p className="text-xs text-muted-foreground">
                        Ajuste via Produção ou Movimentação.
                      </p>
                    )}
                  </div>

                  <div className="col-span-4 space-y-2">
                    <Label htmlFor="minStock">Estoque mínimo</Label>
                    <Input
                      id="minStock"
                      type="number"
                      min={0}
                      value={formData.minStock}
                      onChange={(e) => set("minStock", e.target.value)}
                    />
                  </div>

                  <div className="col-span-4 space-y-2">
                    <Label htmlFor="location">
                      Localização
                      <span className="text-muted-foreground text-xs ml-1">(opcional)</span>
                    </Label>
                    <Input
                      id="location"
                      placeholder="Ex: Câmara fria"
                      value={formData.location}
                      onChange={(e) => set("location", e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* ── ABA ESPECIFICAÇÕES ───────────────────────────────────── */}
              <TabsContent value="specs" className="mt-0 space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Detalhes adicionais</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addSpec}>
                    <Plus className="w-3 h-3 mr-1" /> Adicionar
                  </Button>
                </div>

                {specs.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-border rounded-lg text-muted-foreground text-sm">
                    Nenhuma especificação. Clique em "Adicionar" para incluir.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {specs.map((spec, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <Input
                          placeholder="Nome (ex: Sabor)"
                          value={spec.name}
                          onChange={(e) => updateSpec(idx, "name", e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          placeholder="Valor (ex: Caramelo)"
                          value={spec.value}
                          onChange={(e) => updateSpec(idx, "value", e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSpec(idx)}
                          className="text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </div>

            <DialogFooter className="px-6 py-4 border-t border-border bg-muted/20">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="min-w-[120px] bg-primary text-primary-foreground hover:bg-[#A65E2E]"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar
              </Button>
            </DialogFooter>
          </Tabs>
        </form>
      </DialogContent>
    </Dialog>
  );
}
