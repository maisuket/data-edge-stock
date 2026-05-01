"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  IngredientService,
  IngredientUnit,
  UNIT_LABELS,
  type Ingredient,
} from "@/lib/services/ingredients";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Schema ────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  unit: z.nativeEnum(IngredientUnit),
  minStock: z.coerce.number().min(0, "Deve ser ≥ 0"),
});

type FormData = z.infer<typeof schema>;

// ── Component ─────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredient?: Ingredient | null;
}

export function IngredientFormDialog({ open, onOpenChange, ingredient }: Props) {
  const qc = useQueryClient();
  const isEditing = !!ingredient;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", unit: IngredientUnit.KG, minStock: 0 },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        ingredient
          ? { name: ingredient.name, unit: ingredient.unit, minStock: ingredient.minStock }
          : { name: "", unit: IngredientUnit.KG, minStock: 0 }
      );
    }
  }, [open, ingredient, form]);

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      isEditing
        ? IngredientService.update(ingredient!.id, { name: data.name, minStock: data.minStock })
        : IngredientService.create(data),
    onSuccess: () => {
      toast.success(isEditing ? "Insumo atualizado!" : "Insumo criado!");
      qc.invalidateQueries({ queryKey: ["ingredients"] });
      qc.invalidateQueries({ queryKey: ["ingredients-low-stock"] });
      onOpenChange(false);
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message ?? "Erro ao salvar insumo."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {isEditing ? "Editar Insumo" : "Novo Insumo"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((d) => mutation.mutate(d))}
            className="space-y-4 py-2"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do insumo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Leite Integral" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidade de medida</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isEditing}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(UNIT_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isEditing && (
                    <p className="text-xs text-muted-foreground">
                      A unidade não pode ser alterada após o cadastro.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="minStock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estoque mínimo (alerta)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.001" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                disabled={mutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-[#A65E2E]"
              >
                {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {isEditing ? "Salvar alterações" : "Criar insumo"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
