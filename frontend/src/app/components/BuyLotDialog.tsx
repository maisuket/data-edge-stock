"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShoppingCart, Calculator, Truck } from "lucide-react";
import { toast } from "sonner";

import {
  IngredientService,
  UNIT_SHORT,
  type Ingredient,
} from "@/lib/services/ingredients";
import { SupplierService } from "@/lib/services/suppliers";

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
  quantity: z.coerce.number().min(0.001, "Quantidade deve ser > 0"),
  totalCost: z.coerce.number().min(0, "Valor deve ser ≥ 0"),
  lotNumber: z.string().optional(),
  supplierId: z.string().optional(),
  expiresAt: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const fmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// ── Component ─────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredient: Ingredient | null;
}

export function BuyLotDialog({ open, onOpenChange, ingredient }: Props) {
  const qc = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      quantity: 0,
      totalCost: 0,
      lotNumber: "",
      supplierId: "",
      expiresAt: "",
    },
  });

  // Cálculo em tempo real do custo unitário
  const quantity = useWatch({ control: form.control, name: "quantity" });
  const totalCost = useWatch({ control: form.control, name: "totalCost" });
  const unitCost = quantity > 0 ? totalCost / quantity : 0;

  useEffect(() => {
    if (open)
      form.reset({
        quantity: 0,
        totalCost: 0,
        lotNumber: "",
        supplierId: "",
        expiresAt: "",
      });
  }, [open, form]);

  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => SupplierService.getAll(1, 100),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      IngredientService.buyLot(ingredient!.id, {
        quantity: data.quantity,
        totalCost: data.totalCost,
        lotNumber: data.lotNumber || undefined,
        supplierId: data.supplierId || undefined,
        expiresAt: data.expiresAt || undefined,
      }),
    onSuccess: (result: {
      ingredient: { newStock: number; newAverageCost: number };
    }) => {
      toast.success(
        `Compra registrada! Novo estoque: ${result.ingredient.newStock.toFixed(3)} — CMP: ${fmt.format(result.ingredient.newAverageCost)}`,
      );
      qc.invalidateQueries({ queryKey: ["ingredients"] });
      qc.invalidateQueries({ queryKey: ["ingredients-low-stock"] });
      onOpenChange(false);
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message ?? "Erro ao registrar compra."),
  });

  const suppliers = suppliersData?.data ?? [];
  const unit = ingredient
    ? (UNIT_SHORT[ingredient.unit] ?? ingredient.unit)
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <div className="p-2 bg-[#4CAF50]/10 text-[#4CAF50] rounded-xl shadow-sm">
              <ShoppingCart className="w-5 h-5" />
            </div>
            Registrar Compra
          </DialogTitle>
          {ingredient && (
            <p className="text-sm text-muted-foreground">
              Insumo:{" "}
              <span className="font-semibold text-foreground">
                {ingredient.name}
              </span>{" "}
              — Estoque atual:{" "}
              <span className="font-semibold">
                {ingredient.currentStock.toLocaleString("pt-BR")} {unit}
              </span>
            </p>
          )}
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((d) => mutation.mutate(d))}
            className="space-y-4 py-2"
          >
            {/* Quantidade + Valor */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade ({unit})</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min={0}
                        {...field}
                        className="rounded-xl transition-all duration-300 focus-visible:ring-primary/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor total (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min={0}
                        {...field}
                        className="rounded-xl transition-all duration-300 focus-visible:ring-primary/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Cálculo em tempo real */}
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 flex items-center gap-3 shadow-sm transition-all duration-300 hover:shadow-md hover:border-accent/50 group">
              <Calculator className="w-5 h-5 text-accent shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  Custo unitário calculado
                </p>
                <p className="text-xl font-bold text-foreground tabular-nums">
                  {fmt.format(unitCost)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    /{unit}
                  </span>
                </p>
              </div>
            </div>

            {/* Número do lote */}
            <FormField
              control={form.control}
              name="lotNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número do lote (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Gerado automaticamente se vazio"
                      {...field}
                      className="rounded-xl transition-all duration-300 focus-visible:ring-primary/20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fornecedor */}
            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fornecedor (opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-xl transition-all duration-300 focus-visible:ring-primary/20">
                        <SelectValue placeholder="Selecionar fornecedor..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="flex items-center gap-2">
                            <Truck className="w-3 h-3" />
                            {s.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Validade */}
            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de vencimento (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      className="rounded-xl transition-all duration-300 focus-visible:ring-primary/20"
                    />
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
                className="rounded-xl transition-all duration-300 hover:scale-[1.02]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="bg-[#4CAF50] text-white hover:bg-[#43A047] rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-sm"
              >
                {mutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                )}
                Confirmar compra
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
