"use client";

import { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import {
  Plus,
  Factory,
  Loader2,
  AlertTriangle,
  TrendingUp,
  MoreHorizontal,
  Eye,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  ProductionService,
  type ProductionDetail,
} from "../../../lib/services/productions";
import { ProductService } from "../../../lib/services/products";
import { RecipeService } from "../../../lib/services/recipes";
import { UNIT_SHORT } from "../../../lib/services/ingredients";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// ── Formatters ─────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// ── Production form schema ────────────────────────────────────────────────

const schema = z.object({
  productId: z.string().min(1, "Selecione um produto"),
  quantity: z.coerce.number().min(0.001, "Quantidade deve ser > 0"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

// ── Production Dialog ─────────────────────────────────────────────────────

function ProductionFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { productId: "", quantity: 0, notes: "" },
  });

  const productId = form.watch("productId");
  const quantity = form.watch("quantity");

  // Load manufactured products
  const { data: productsData } = useQuery({
    queryKey: ["manufactured-products"],
    queryFn: () => ProductService.getAll(1, 100),
    select: (d) => ({ ...d, data: d.data.filter((p) => p.isManufactured) }),
    enabled: open,
  });

  // Load recipe for selected product (for preview)
  const { data: recipe, isLoading: loadingRecipe } = useQuery({
    queryKey: ["recipe-preview", productId],
    queryFn: () => RecipeService.getRecipe(productId),
    enabled: !!productId && open,
  });

  // Live cost estimate
  const estimatedTotalCost = recipe
    ? recipe.productionCostPerUnit * quantity
    : 0;

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      ProductionService.create({
        productId: data.productId,
        quantity: data.quantity,
        notes: data.notes || undefined,
      }),
    onSuccess: (result) => {
      toast.success(
        `Produção registrada! ${result.quantity} un — Custo total: ${fmt.format(result.totalCost)}`,
      );
      qc.invalidateQueries({ queryKey: ["productions"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["ingredients"] });
      qc.invalidateQueries({ queryKey: ["ingredients-low-stock"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message ?? "Erro ao registrar produção."),
  });

  const products = productsData?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Factory className="w-5 h-5 text-accent" />
            Nova Produção
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((d) => mutation.mutate(d))}
            className="space-y-4 py-2"
          >
            {/* Product selector */}
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Produto a produzir</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar produto com receita..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground text-center">
                          Nenhum produto com receita cadastrada.
                        </div>
                      ) : (
                        products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                            <span className="ml-2 text-xs text-muted-foreground">
                              CMP: {fmt.format(p.costPrice)}/un
                            </span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quantity */}
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantidade a produzir (unidades)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Recipe preview + cost estimate */}
            {productId && (
              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                  Previsão de consumo
                </p>
                {loadingRecipe ? (
                  <Skeleton className="h-16 w-full rounded-md" />
                ) : recipe?.items.length === 0 ? (
                  <div className="flex items-center gap-2 text-[#FFB300] text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    Este produto não possui receita cadastrada.
                  </div>
                ) : (
                  <>
                    {recipe?.items.map((item) => (
                      <div
                        key={item.ingredientId}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-muted-foreground">
                          {item.ingredientName}
                        </span>
                        <span className="font-medium tabular-nums text-foreground">
                          {(item.quantity * quantity).toLocaleString("pt-BR", {
                            maximumFractionDigits: 3,
                          })}{" "}
                          {UNIT_SHORT[item.unit] ?? item.unit}
                        </span>
                      </div>
                    ))}
                    <div className="border-t border-border pt-2 flex justify-between items-baseline">
                      <span className="text-sm font-semibold text-foreground">
                        Custo total estimado
                      </span>
                      <span className="text-lg font-bold tabular-nums text-foreground">
                        {fmt.format(estimatedTotalCost)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Lote para evento de sábado..."
                      className="resize-none"
                      rows={2}
                      {...field}
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
                onClick={() => {
                  onOpenChange(false);
                  form.reset();
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-[#A65E2E]"
              >
                {mutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                )}
                Confirmar produção
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Production Detail Row ─────────────────────────────────────────────────

function ProductionDetailRow({ productionId }: { productionId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["production-detail", productionId],
    queryFn: () => ProductionService.getOne(productionId),
  });

  if (isLoading)
    return (
      <TableRow>
        <TableCell colSpan={7} className="py-3 px-6 bg-muted/10">
          <Skeleton className="h-16 w-full rounded-md" />
        </TableCell>
      </TableRow>
    );

  if (!data) return null;

  return (
    <TableRow className="bg-muted/10 border-border">
      <TableCell colSpan={7} className="px-6 py-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {data.consumptions.map((c, i) => (
            <div
              key={i}
              className="text-xs flex justify-between bg-card rounded p-2 border border-border"
            >
              <span className="text-muted-foreground">{c.ingredient}</span>
              <span className="font-medium tabular-nums">
                {c.quantityUsed.toLocaleString("pt-BR", {
                  maximumFractionDigits: 3,
                })}{" "}
                {UNIT_SHORT[c.unit] ?? c.unit}
                <span className="text-muted-foreground ml-1">
                  ({fmt.format(c.totalCost)})
                </span>
              </span>
            </div>
          ))}
          {data.notes && (
            <div className="col-span-full text-xs text-muted-foreground italic mt-1">
              📝 {data.notes}
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ProductionsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["productions", page],
    queryFn: () => ProductionService.getAll(page, 15),
    placeholderData: keepPreviousData,
  });

  const productions = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Factory className="w-8 h-8 text-accent" />
            Produção
          </h1>
          <p className="text-muted-foreground mt-1">
            Registre lotes de produção e acompanhe custos reais.
          </p>
        </div>
        <Button
          onClick={() => setFormOpen(true)}
          className="gap-2 bg-primary text-primary-foreground hover:bg-[#A65E2E] shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nova Produção
        </Button>
      </div>

      {/* Table */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold">
            Histórico de Produções
          </CardTitle>
          <CardDescription>
            {meta
              ? `${meta.itemCount} lote${meta.itemCount !== 1 ? "s" : ""} registrado${meta.itemCount !== 1 ? "s" : ""}`
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="pl-6 w-8" />
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Custo/un</TableHead>
                <TableHead className="text-right">Custo Total</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="pr-6">Operador</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full rounded-md" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : productions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-40 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Factory className="w-8 h-8 opacity-30" />
                      <p>Nenhuma produção registrada.</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setFormOpen(true)}
                        className="mt-1"
                      >
                        Registrar primeira produção
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                productions.flatMap((prod) => {
                  const isExpanded = expandedId === prod.id;
                  return [
                    <TableRow
                      key={prod.id}
                      className="border-border hover:bg-muted/40 cursor-pointer transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : prod.id)}
                    >
                      <TableCell className="pl-6 w-8">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {prod.product.name}
                        <span className="text-xs text-muted-foreground ml-2">
                          {prod.product.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {prod.quantity.toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmt.format(prod.unitCost)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-foreground">
                        {fmt.format(prod.totalCost)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(prod.producedAt), "dd/MM/yy HH:mm", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell className="pr-6 text-sm text-muted-foreground">
                        {prod.producedBy ?? "—"}
                      </TableCell>
                    </TableRow>,
                    isExpanded ? (
                      <ProductionDetailRow
                        key={`${prod.id}-detail`}
                        productionId={prod.id}
                      />
                    ) : null,
                  ].filter(Boolean);
                })
              )}
            </TableBody>
          </Table>
        </CardContent>

        {meta && meta.pageCount > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Página {meta.page} de {meta.pageCount}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!meta.hasPreviousPage}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!meta.hasNextPage}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </Card>

      <ProductionFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
