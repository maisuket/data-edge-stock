"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Plus,
  Trash2,
  Upload,
  FileText,
  Image as ImageIcon,
  Loader2,
  Save,
} from "lucide-react";
import { toast } from "sonner";

// Serviços e Tipos
import { ProductService, type Product } from "@/lib/services/products";
import { api } from "@/lib/api";

// Componentes UI (Shadcn)
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

// Interfaces Locais
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

interface Attachment {
  fileName: string;
  filePath: string;
  fileType: string;
}

const UNITS = ["UN", "CX", "KG", "M", "L", "SC", "PAR"];

export function ProductFormDialog({
  open,
  onOpenChange,
  onSuccess,
  productToEdit,
}: ProductFormDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(false);

  // Estados do Formulário
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    internalCode: "",
    barcode: "",
    unit: "UN",
    costPrice: "",
    salePrice: "",
    currentStock: "",
    minStock: "",
    location: "",
  });

  const [specs, setSpecs] = useState<Spec[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // Reset ou Preenchimento ao abrir
  useEffect(() => {
    if (open) {
      setActiveTab("general");
      if (productToEdit) {
        setFormData({
          name: productToEdit.name,
          category: productToEdit.category,
          internalCode: productToEdit.internalCode,
          barcode: productToEdit.barcode,
          unit: productToEdit.unit,
          costPrice: String(productToEdit.costPrice),
          salePrice: productToEdit.salePrice
            ? String(productToEdit.salePrice)
            : "",
          currentStock: String(productToEdit.currentStock),
          minStock: String(productToEdit.minStock),
          location: productToEdit.location || "",
        });
        setSpecs(
          productToEdit.specifications?.map((s) => ({
            name: s.name,
            value: s.value,
          })) || []
        );
        setAttachments(productToEdit.attachments || []);
      } else {
        // Reset para criar novo
        setFormData({
          name: "",
          category: "Geral",
          internalCode: "",
          barcode: "",
          unit: "UN",
          costPrice: "",
          salePrice: "",
          currentStock: "",
          minStock: "",
          location: "",
        });
        setSpecs([]);
        setAttachments([]);
      }
    }
  }, [open, productToEdit]);

  // Handlers de Input
  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handlers de Especificações
  const addSpec = () => setSpecs([...specs, { name: "", value: "" }]);
  const removeSpec = (idx: number) =>
    setSpecs(specs.filter((_, i) => i !== idx));
  const updateSpec = (idx: number, field: "name" | "value", val: string) => {
    const newSpecs = [...specs];
    newSpecs[idx] = { ...newSpecs[idx], [field]: val };
    setSpecs(newSpecs);
  };

  // Handlers de Arquivo
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    const uploadData = new FormData();
    uploadData.append("file", file);

    try {
      setLoading(true);
      // Ajuste a rota se necessário (ex: /files/upload)
      const res = await api.post("/files/upload", uploadData);

      setAttachments([
        ...attachments,
        {
          fileName: file.name,
          filePath: res.data.filePath,
          fileType: res.data.fileType || file.type,
        },
      ]);
      toast.success("Arquivo anexado!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao fazer upload do arquivo.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = async (idx: number) => {
    const fileToDelete = attachments[idx];
    if (fileToDelete.filePath) {
      try {
        await api.delete("/files/delete", {
          data: { filePath: fileToDelete.filePath },
        });
      } catch (err) {
        console.error("Erro ao apagar arquivo físico (ignorado):", err);
      }
    }
    setAttachments(attachments.filter((_, i) => i !== idx));
  };

  // Submit Final
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Limpeza de dados
      const cleanSpecs = specs
        .filter((s) => s.name.trim() && s.value.trim())
        .map((s) => ({ name: s.name, value: s.value }));

      const payload = {
        ...formData,
        costPrice: Number(formData.costPrice) || 0,
        salePrice: formData.salePrice ? Number(formData.salePrice) : undefined,
        currentStock: Number(formData.currentStock) || 0,
        minStock: Number(formData.minStock) || 0,
        specifications: cleanSpecs,
        attachments: attachments,
        // Gera código se vazio na criação
        internalCode:
          formData.internalCode ||
          (productToEdit ? "" : `PROD-${Date.now().toString().slice(-6)}`),
        barcode: formData.barcode || "N/A",
      };

      if (productToEdit) {
        await ProductService.update(productToEdit.id, payload);
        toast.success("Produto atualizado com sucesso!");
      } else {
        await ProductService.create(payload);
        toast.success("Produto criado com sucesso!");
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao salvar produto. Verifique os dados.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] h-[90vh] sm:h-auto overflow-y-auto flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>
            {productToEdit ? "Editar Produto" : "Novo Produto"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col"
          >
            <div className="px-6 border-b">
              <TabsList className="w-full justify-start h-11 bg-transparent p-0">
                <TabsTrigger
                  value="general"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none h-11 px-4 bg-transparent"
                >
                  Dados Gerais
                </TabsTrigger>
                <TabsTrigger
                  value="specs"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none h-11 px-4 bg-transparent"
                >
                  Especificações
                  {specs.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-2 h-5 px-1.5 text-[10px]"
                    >
                      {specs.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="attachments"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none h-11 px-4 bg-transparent"
                >
                  Anexos
                  {attachments.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-2 h-5 px-1.5 text-[10px]"
                    >
                      {attachments.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6 max-h-[60vh]">
              {/* --- ABA GERAL --- */}
              <TabsContent value="general" className="mt-0 space-y-4">
                <div className="grid grid-cols-12 gap-4">
                  {/* Linha 1 */}
                  <div className="col-span-12 sm:col-span-8 space-y-2">
                    <Label htmlFor="name">Nome do Produto *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      placeholder="Ex: Cimento CP II"
                      required
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-4 space-y-2">
                    <Label htmlFor="unit">Unidade</Label>
                    <Select
                      value={formData.unit}
                      onValueChange={(val) => handleChange("unit", val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="UN" />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Linha 2 */}
                  <div className="col-span-6 sm:col-span-4 space-y-2">
                    <Label htmlFor="internalCode">Cód. Interno</Label>
                    <Input
                      id="internalCode"
                      value={formData.internalCode}
                      onChange={(e) =>
                        handleChange("internalCode", e.target.value)
                      }
                      placeholder="Auto"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-4 space-y-2">
                    <Label htmlFor="barcode">EAN/GTIN</Label>
                    <Input
                      id="barcode"
                      value={formData.barcode}
                      onChange={(e) => handleChange("barcode", e.target.value)}
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-4 space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(val) => handleChange("category", val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Geral">Geral</SelectItem>
                        <SelectItem value="Material de Construção">
                          Material de Construção
                        </SelectItem>
                        <SelectItem value="Elétrica">Elétrica</SelectItem>
                        <SelectItem value="Hidráulica">Hidráulica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Linha 3: Preços */}
                  <div className="col-span-6 space-y-2">
                    <Label htmlFor="costPrice">Preço Custo (R$)</Label>
                    <Input
                      id="costPrice"
                      type="number"
                      step="0.01"
                      value={formData.costPrice}
                      onChange={(e) =>
                        handleChange("costPrice", e.target.value)
                      }
                    />
                  </div>
                  <div className="col-span-6 space-y-2">
                    <Label htmlFor="salePrice">Preço Venda (R$)</Label>
                    <Input
                      id="salePrice"
                      type="number"
                      step="0.01"
                      value={formData.salePrice}
                      onChange={(e) =>
                        handleChange("salePrice", e.target.value)
                      }
                    />
                  </div>

                  {/* Linha 4: Estoque */}
                  <div className="col-span-4 space-y-2">
                    <Label htmlFor="currentStock">Estoque Atual</Label>
                    <Input
                      id="currentStock"
                      type="number"
                      value={formData.currentStock}
                      onChange={(e) =>
                        handleChange("currentStock", e.target.value)
                      }
                      disabled={!!productToEdit} // Desabilita edição direta se já existir
                      className={
                        !!productToEdit ? "bg-muted text-muted-foreground" : ""
                      }
                    />
                  </div>
                  <div className="col-span-4 space-y-2">
                    <Label htmlFor="minStock">Estoque Mínimo</Label>
                    <Input
                      id="minStock"
                      type="number"
                      value={formData.minStock}
                      onChange={(e) => handleChange("minStock", e.target.value)}
                    />
                  </div>
                  <div className="col-span-4 space-y-2">
                    <Label htmlFor="location">Localização</Label>
                    <Input
                      id="location"
                      placeholder="Ex: Prateleira A1"
                      value={formData.location}
                      onChange={(e) => handleChange("location", e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* --- ABA ESPECIFICAÇÕES --- */}
              <TabsContent value="specs" className="mt-0 space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <Label>Detalhes Técnicos</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSpec}
                    className="h-8"
                  >
                    <Plus className="w-3 h-3 mr-2" /> Adicionar
                  </Button>
                </div>

                {specs.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
                    Nenhuma especificação adicionada.
                  </div>
                )}

                <div className="space-y-3">
                  {specs.map((spec, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <Input
                        placeholder="Nome (ex: Voltagem)"
                        value={spec.name}
                        onChange={(e) =>
                          updateSpec(idx, "name", e.target.value)
                        }
                        className="flex-1"
                      />
                      <Input
                        placeholder="Valor (ex: 220v)"
                        value={spec.value}
                        onChange={(e) =>
                          updateSpec(idx, "value", e.target.value)
                        }
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSpec(idx)}
                        className="text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* --- ABA ANEXOS --- */}
              <TabsContent value="attachments" className="mt-0 space-y-4">
                <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-3 bg-muted/20 hover:bg-muted/40 transition-colors">
                  <div className="p-3 bg-background rounded-full shadow-sm">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      Clique para selecionar um arquivo
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Imagens ou PDF até 5MB
                    </p>
                  </div>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleFileUpload}
                    id="file-upload"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Selecionar Arquivo
                  </Button>
                </div>

                <div className="space-y-2 mt-4">
                  {attachments.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 border rounded-lg bg-background group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                        {file.fileType.startsWith("image") ? (
                          <ImageIcon className="w-5 h-5" />
                        ) : (
                          <FileText className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {file.fileName}
                        </p>
                        <p className="text-xs text-muted-foreground uppercase">
                          {file.fileType.split("/")[1] || "FILE"}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAttachment(idx)}
                        className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </div>

            <DialogFooter className="px-6 py-4 border-t bg-muted/20">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="min-w-[120px]"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar Produto
              </Button>
            </DialogFooter>
          </Tabs>
        </form>
      </DialogContent>
    </Dialog>
  );
}
