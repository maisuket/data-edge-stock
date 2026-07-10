"use client";

import { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import {
  ClipboardList,
  Loader2,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  PackageCheck,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { toast } from "sonner";

import {
  OrderService,
  type OrderStatus,
} from "../../../lib/services/orders";

import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

// ── Status ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pendente",
    className: "bg-[#FFB300]/10 text-[#FFB300] border-[#FFB300]/30 border",
  },
  CONFIRMED: {
    label: "Confirmado",
    className: "bg-[#2196F3]/10 text-[#2196F3] border-[#2196F3]/30 border",
  },
  COMPLETED: {
    label: "Concluído",
    className: "bg-[#4CAF50]/10 text-[#4CAF50] border-[#4CAF50]/30 border",
  },
  CANCELLED: {
    label: "Cancelado",
    className: "bg-[#E53935]/10 text-[#E53935] border-[#E53935]/30 border",
  },
};

function StatusBadge({ status }: { status: OrderStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge className={`tabular-nums ${config.className}`}>
      {config.label}
    </Badge>
  );
}

// ── Order Detail Row ─────────────────────────────────────────────────────────

function OrderDetailRow({ orderId }: { orderId: string }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["order-detail", orderId],
    queryFn: () => OrderService.getOne(orderId),
  });

  const statusMutation = useMutation({
    mutationFn: (status: OrderStatus) =>
      OrderService.updateStatus(orderId, status),
    onSuccess: (_, status) => {
      toast.success(
        status === "CANCELLED"
          ? "Pedido cancelado — estoque devolvido."
          : "Status do pedido atualizado.",
      );
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order-detail", orderId] });
      if (status === "CANCELLED") {
        qc.invalidateQueries({ queryKey: ["products"] });
        qc.invalidateQueries({ queryKey: ["menu-products"] });
      }
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(
        e?.response?.data?.message ?? "Erro ao atualizar status do pedido.",
      ),
  });

  if (isLoading)
    return (
      <TableRow>
        <TableCell colSpan={6} className="py-3 px-6 bg-muted/10">
          <Skeleton className="h-16 w-full rounded-md" />
        </TableCell>
      </TableRow>
    );

  if (!data) return null;

  return (
    <TableRow className="bg-muted/10 border-border">
      <TableCell colSpan={6} className="px-6 py-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          {data.items.map((item) => (
            <div
              key={item.id}
              className="text-xs flex justify-between bg-card rounded p-2 border border-border"
            >
              <span className="text-muted-foreground">
                {item.quantity}x {item.product.name}
              </span>
              <span className="font-medium tabular-nums">
                {fmt.format(item.totalPrice)}
              </span>
            </div>
          ))}
        </div>

        {data.notes && (
          <div className="text-xs text-muted-foreground italic mb-3">
            📝 {data.notes}
          </div>
        )}

        {(data.status === "PENDING" || data.status === "CONFIRMED") && (
          <div className="flex gap-2">
            {data.status === "PENDING" && (
              <Button
                size="sm"
                variant="outline"
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate("CONFIRMED")}
                className="h-8 text-xs gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Confirmar
              </Button>
            )}
            {data.status === "CONFIRMED" && (
              <Button
                size="sm"
                variant="outline"
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate("COMPLETED")}
                className="h-8 text-xs gap-1.5"
              >
                <PackageCheck className="w-3.5 h-3.5" /> Concluir
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate("CANCELLED")}
              className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              {statusMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <X className="w-3.5 h-3.5" />
              )}
              Cancelar
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "TODOS">(
    "TODOS",
  );

  const { data, isLoading } = useQuery({
    queryKey: ["orders", page, statusFilter],
    queryFn: () =>
      OrderService.getAll(
        page,
        15,
        statusFilter === "TODOS" ? undefined : statusFilter,
      ),
    placeholderData: keepPreviousData,
    // Atualiza sozinha para os novos pedidos do cardápio aparecerem sem
    // precisar dar F5; continua mesmo com a aba em segundo plano.
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
  });

  const orders = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="p-6 md:p-8 max-w-350 mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ClipboardList className="w-8 h-8 text-accent" />
            Pedidos
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe os pedidos feitos pelo cardápio online.
          </p>
        </div>

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as OrderStatus | "TODOS");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos os status</SelectItem>
            <SelectItem value="PENDING">Pendentes</SelectItem>
            <SelectItem value="CONFIRMED">Confirmados</SelectItem>
            <SelectItem value="COMPLETED">Concluídos</SelectItem>
            <SelectItem value="CANCELLED">Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold">
            Histórico de Pedidos
          </CardTitle>
          <CardDescription>
            {meta
              ? `${meta.itemCount} pedido${meta.itemCount !== 1 ? "s" : ""} registrado${meta.itemCount !== 1 ? "s" : ""}`
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="pl-6 w-8" />
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-6">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full rounded-md" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-40 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <ClipboardList className="w-8 h-8 opacity-30" />
                      <p>Nenhum pedido registrado ainda.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                orders.flatMap((order) => {
                  const isExpanded = expandedId === order.id;
                  return [
                    <TableRow
                      key={order.id}
                      className="border-border hover:bg-muted/40 cursor-pointer transition-colors"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : order.id)
                      }
                    >
                      <TableCell className="pl-6 w-8">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-foreground tabular-nums">
                        {order.orderNumber}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {order.customerName || "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-foreground">
                        {fmt.format(order.totalAmount)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="pr-6 text-sm text-muted-foreground">
                        {format(new Date(order.createdAt), "dd/MM/yy HH:mm", {
                          locale: ptBR,
                        })}
                      </TableCell>
                    </TableRow>,
                    isExpanded ? (
                      <OrderDetailRow key={`${order.id}-detail`} orderId={order.id} />
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
    </div>
  );
}
