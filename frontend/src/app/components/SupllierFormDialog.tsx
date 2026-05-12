"use client";

import { useState, useEffect } from "react";
import {
  User,
  MapPin,
  Phone,
  Mail,
  FileText,
  Loader2,
  Save,
  Truck,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

// Importações relativas para garantir compatibilidade
import { SupplierService, type Supplier } from "../../lib/services/suppliers";

// Componentes UI
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

// Interfaces
interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  supplierToEdit?: Supplier | null;
}

// Utilitários de Máscara
const maskCpfCnpj = (v: string) => {
  v = v.replace(/\D/g, "");
  if (v.length <= 11) {
    // CPF
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  } else {
    // CNPJ
    v = v.replace(/^(\d{2})(\d)/, "$1.$2");
    v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
    v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
    v = v.replace(/(\d{4})(\d)/, "$1-$2");
  }
  return v;
};

const maskPhone = (v: string) => {
  v = v.replace(/\D/g, "");
  v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
  v = v.replace(/(\d)(\d{4})$/, "$1-$2");
  return v;
};

export function SupplierFormDialog({
  open,
  onOpenChange,
  onSuccess,
  supplierToEdit,
}: SupplierFormDialogProps) {
  const [loading, setLoading] = useState(false);

  // Estado do formulário
  const [formData, setFormData] = useState({
    name: "",
    cnpj: "",
    email: "",
    phone: "",
    address: "",
  });

  // Preenche dados ao abrir para edição
  useEffect(() => {
    if (open) {
      if (supplierToEdit) {
        setFormData({
          name: supplierToEdit.name,
          cnpj: supplierToEdit.cnpj || "",
          email: supplierToEdit.email || "",
          phone: supplierToEdit.phone || "",
          address: supplierToEdit.address || "",
        });
      } else {
        // Reset
        setFormData({
          name: "",
          cnpj: "",
          email: "",
          phone: "",
          address: "",
        });
      }
    }
  }, [open, supplierToEdit]);

  // Handler de input com máscara
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === "cnpj") {
      finalValue = maskCpfCnpj(value);
    } else if (name === "phone") {
      finalValue = maskPhone(value);
    }

    setFormData((prev) => ({ ...prev, [name]: finalValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Prepara os dados convertendo strings vazias para undefined
    // Isso evita erros de validação no backend (ex: IsEmail validando "")
    const payload = {
      name: formData.name,
      cnpj: formData.cnpj || undefined,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      address: formData.address || undefined,
    };

    try {
      if (supplierToEdit) {
        await SupplierService.update(supplierToEdit.id, payload);
        toast.success("Fornecedor atualizado com sucesso!");
      } else {
        await SupplierService.create(payload);
        toast.success("Fornecedor cadastrado com sucesso!");
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);

      const responseMessage = err.response?.data?.message;

      if (Array.isArray(responseMessage)) {
        const firstError = responseMessage[0];
        const validationMessage = firstError?.constraints
          ? Object.values(firstError.constraints)[0]
          : "Erro de validação nos dados.";
        toast.error(validationMessage as string);
      } else if (typeof responseMessage === "string") {
        toast.error(responseMessage);
      } else {
        toast.error("Erro ao salvar fornecedor.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
            <div className="p-2 bg-primary/10 text-primary rounded-xl shadow-sm">
              <Truck className="w-5 h-5" />
            </div>
            {supplierToEdit ? "Editar Fornecedor" : "Novo Fornecedor"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="grid grid-cols-12 gap-4">
            {/* Nome / Razão Social */}
            <div className="col-span-12 sm:col-span-8 space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                Razão Social / Nome *
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ex: Distribuidora Silva LTDA"
                required
                className="bg-background rounded-xl transition-all duration-300 focus-visible:ring-primary/20"
              />
            </div>

            {/* CNPJ / CPF */}
            <div className="col-span-12 sm:col-span-4 space-y-2">
              <Label htmlFor="cnpj" className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                CNPJ / CPF
              </Label>
              <Input
                id="cnpj"
                name="cnpj"
                value={formData.cnpj}
                onChange={handleChange}
                placeholder="00.000.000/0000-00"
                maxLength={18}
                className="bg-background font-mono rounded-xl transition-all duration-300 focus-visible:ring-primary/20"
              />
            </div>

            {/* Email */}
            <div className="col-span-12 sm:col-span-6 space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                E-mail
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="contato@empresa.com"
                className="bg-background rounded-xl transition-all duration-300 focus-visible:ring-primary/20"
              />
            </div>

            {/* Telefone */}
            <div className="col-span-12 sm:col-span-6 space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                Telefone / Celular
              </Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="(00) 00000-0000"
                maxLength={15}
                className="bg-background rounded-xl transition-all duration-300 focus-visible:ring-primary/20"
              />
            </div>

            {/* Endereço */}
            <div className="col-span-12 space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                Endereço Completo
              </Label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Rua, Número, Bairro, Cidade - UF"
                className="bg-background rounded-xl transition-all duration-300 focus-visible:ring-primary/20"
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-background rounded-xl transition-all duration-300 hover:scale-[1.02]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="min-w-[120px] bg-primary text-primary-foreground hover:bg-[#A65E2E] rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" /> Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
