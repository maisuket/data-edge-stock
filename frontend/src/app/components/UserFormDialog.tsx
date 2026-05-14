"use client";

import { useState, useEffect } from "react";
import {
  User as UserIcon,
  Mail,
  Lock,
  Shield,
  Loader2,
  Save,
  Eye,
  EyeOff,
  UserCircle,
} from "lucide-react";
import { toast } from "sonner";

// Importação relativa para garantir que o build encontre o arquivo no mesmo contexto
import { UserService, type User } from "../../lib/services/users";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  userToEdit?: User | null;
}

export function UserFormDialog({
  open,
  onOpenChange,
  onSuccess,
  userToEdit,
}: UserFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    role: "USER",
  });

  useEffect(() => {
    if (open) {
      if (userToEdit) {
        setFormData({
          name: userToEdit.name,
          email: userToEdit.email,
          username: userToEdit.username,
          password: "",
          role: userToEdit.role,
        });
      } else {
        setFormData({
          name: "",
          email: "",
          username: "",
          password: "",
          role: "USER",
        });
      }
      setShowPassword(false);
    }
  }, [open, userToEdit]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!userToEdit && !formData.password) {
        toast.error("Senha é obrigatória para novos usuários.");
        setLoading(false);
        return;
      }

      const payload = {
        ...formData,
        role: formData.role as "USER" | "ADMIN",
      };

      if (userToEdit && !payload.password) {
        delete (payload as any).password;
      }

      if (userToEdit) {
        await UserService.update(userToEdit.id, payload);
        toast.success("Usuário atualizado!");
      } else {
        await UserService.create(payload);
        toast.success("Usuário criado!");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message;
      if (Array.isArray(msg)) {
        const firstError = msg[0];
        toast.error(
          firstError?.constraints
            ? (Object.values(firstError.constraints)[0] as string)
            : "Erro de validação nos dados.",
        );
      } else if (typeof msg === "string") {
        toast.error(msg);
      } else {
        toast.error("Erro ao salvar usuário.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <UserIcon className="w-5 h-5" />
            </div>
            {userToEdit ? "Editar Usuário" : "Novo Usuário"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className="pl-9 rounded-xl transition-all duration-300 focus-visible:ring-primary/20"
                  placeholder="Ex: João Silva"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="pl-9 rounded-xl transition-all duration-300 focus-visible:ring-primary/20"
                  placeholder="joao@empresa.com"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuário (Login) *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                  placeholder="jsilva"
                  disabled={!!userToEdit}
                  className={`rounded-xl transition-all duration-300 focus-visible:ring-primary/20 ${!!userToEdit ? "bg-muted" : ""}`}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Permissão *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(val) => handleChange("role", val)}
                >
                  <SelectTrigger className="w-full rounded-xl transition-all duration-300 focus-visible:ring-primary/20">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">Usuário Comum</SelectItem>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                {userToEdit ? "Nova Senha (Opcional)" : "Senha *"}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  className="pl-9 pr-10 rounded-xl transition-all duration-300 focus-visible:ring-primary/20"
                  placeholder={
                    userToEdit ? "Deixe em branco para manter" : "******"
                  }
                  required={!userToEdit}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl transition-all duration-300 hover:scale-[1.02]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="min-w-[100px] rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-sm"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
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
