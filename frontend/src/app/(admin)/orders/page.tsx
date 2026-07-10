"use client";

import { useState, useEffect } from "react";
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
  Link2,
  Copy,
  DollarSign,
  MessageCircle,
  Pencil,
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  Store,
  Bike,
  QrCode,
  CreditCard,
  Banknote,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { toast } from "sonner";

import {
  OrderService,
  type OrderStatus,
  type OrderDetail,
  type DeliveryType,
  type PaymentMethod,
} from "../../../lib/services/orders";
import { ProductService } from "../../../lib/services/products";
import { DeliveryZoneService } from "../../../lib/services/delivery-zones";
import { normalizeBrazilPhone } from "../../../lib/phone";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
  icon: typeof QrCode;
}[] = [
  { value: "PIX", label: "Pix", icon: QrCode },
  { value: "CREDIT_CARD", label: "Crédito", icon: CreditCard },
  { value: "DEBIT_CARD", label: "Débito", icon: CreditCard },
  { value: "CASH", label: "Dinheiro", icon: Banknote },
];

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  PIX: "Pix",
  CREDIT_CARD: "Cartão de Crédito",
  DEBIT_CARD: "Cartão de Débito",
  CASH: "Dinheiro",
};

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
  PAID: {
    label: "Pago",
    className: "bg-[#9C27B0]/10 text-[#9C27B0] border-[#9C27B0]/30 border",
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

// ── Edit Order Dialog ─────────────────────────────────────────────────────────

function EditOrderDialog({
  order,
  open,
  onOpenChange,
}: {
  order: OrderDetail;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("PICKUP");
  const [neighborhood, setNeighborhood] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [items, setItems] = useState<
    { productId: string; name: string; quantity: number }[]
  >([]);
  const [addProductId, setAddProductId] = useState("");

  // Reinicia o formulário sempre que o dialog abre, a partir do pedido atual.
  useEffect(() => {
    if (!open) return;
    setCustomerName(order.customerName ?? "");
    setCustomerPhone(order.customerPhone ?? "");
    setNotes(order.notes ?? "");
    setDeliveryType(order.deliveryType);
    setNeighborhood(order.deliveryNeighborhood ?? "");
    setPaymentMethod(order.paymentMethod ?? "");
    setItems(
      order.items.map((i) => ({
        productId: i.productId,
        name: i.product.name,
        quantity: i.quantity,
      })),
    );
    setAddProductId("");
  }, [open, order]);

  const { data: products = [] } = useQuery({
    queryKey: ["menu-products"],
    queryFn: () => ProductService.getPublic(),
    enabled: open,
  });

  const { data: zones = [] } = useQuery({
    queryKey: ["delivery-zones"],
    queryFn: () => DeliveryZoneService.getPublic(),
    enabled: open,
  });

  const priceFor = (productId: string) =>
    products.find((p) => p.id === productId)?.salePrice ?? 0;

  const subtotal = items.reduce(
    (sum, item) => sum + priceFor(item.productId) * item.quantity,
    0,
  );
  const selectedZone = zones.find((z) => z.neighborhood === neighborhood);
  const deliveryFee =
    deliveryType === "DELIVERY" ? (selectedZone?.fee ?? 0) : 0;
  const total = subtotal + deliveryFee;

  const availableToAdd = products.filter(
    (p) => !items.some((i) => i.productId === p.id),
  );

  const updateQty = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
    );
  };

  const addItem = () => {
    const product = products.find((p) => p.id === addProductId);
    if (!product) return;
    setItems((prev) => [
      ...prev,
      { productId: product.id, name: product.name, quantity: 1 },
    ]);
    setAddProductId("");
  };

  const mutation = useMutation({
    mutationFn: () => {
      const normalizedPhone = normalizeBrazilPhone(customerPhone);
      if (!normalizedPhone) {
        throw new Error(
          "Telefone inválido. Informe um número com DDD (ex: (92) 99999-9999).",
        );
      }
      if (deliveryType === "DELIVERY" && !neighborhood) {
        throw new Error("Escolha o bairro para calcular a taxa de entrega.");
      }
      if (items.length === 0) {
        throw new Error("O pedido precisa ter pelo menos um item.");
      }
      return OrderService.update(order.id, {
        customerName: customerName.trim() || undefined,
        customerPhone: normalizedPhone,
        notes: notes.trim() || undefined,
        deliveryType,
        deliveryNeighborhood:
          deliveryType === "DELIVERY" ? neighborhood : undefined,
        paymentMethod: paymentMethod || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      });
    },
    onSuccess: () => {
      toast.success("Pedido atualizado!");
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order-detail", order.id] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["menu-products"] });
      onOpenChange(false);
    },
    onError: (e: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(
        e?.response?.data?.message ?? e?.message ?? "Erro ao editar pedido.",
      );
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Pedido #{order.orderNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Nome
              </label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Telefone
              </label>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Observações
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Entrega
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={deliveryType === "PICKUP" ? "default" : "outline"}
                onClick={() => setDeliveryType("PICKUP")}
                className="gap-1.5"
              >
                <Store className="w-4 h-4" /> Retirada
              </Button>
              <Button
                type="button"
                variant={deliveryType === "DELIVERY" ? "default" : "outline"}
                onClick={() => setDeliveryType("DELIVERY")}
                className="gap-1.5"
              >
                <Bike className="w-4 h-4" /> Entrega
              </Button>
            </div>
            {deliveryType === "DELIVERY" && (
              <Select value={neighborhood} onValueChange={setNeighborhood}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha o bairro..." />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={z.neighborhood}>
                      {z.neighborhood} — {fmt.format(z.fee)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Forma de pagamento
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                return (
                  <Button
                    key={method.value}
                    type="button"
                    variant={
                      paymentMethod === method.value ? "default" : "outline"
                    }
                    onClick={() => setPaymentMethod(method.value)}
                    className="gap-1.5"
                  >
                    <Icon className="w-4 h-4" /> {method.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Itens do pedido
            </label>
            {items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center gap-2 bg-muted/20 border border-border rounded-lg p-2"
              >
                <span className="flex-1 text-sm truncate">{item.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {fmt.format(priceFor(item.productId))}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      updateQty(item.productId, item.quantity - 1)
                    }
                    className="w-6 h-6 rounded-full border border-border flex items-center justify-center hover:bg-muted"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-5 text-center text-sm tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateQty(item.productId, item.quantity + 1)
                    }
                    className="w-6 h-6 rounded-full border border-border flex items-center justify-center hover:bg-muted"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => updateQty(item.productId, 0)}
                  className="text-destructive hover:bg-destructive/10 rounded-full p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            <div className="flex gap-2">
              <Select value={addProductId} onValueChange={setAddProductId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Adicionar produto..." />
                </SelectTrigger>
                <SelectContent>
                  {availableToAdd.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {fmt.format(p.salePrice ?? 0)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                onClick={addItem}
                disabled={!addProductId}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex justify-between items-baseline pt-2 border-t border-border">
            <span className="text-sm font-medium">Total</span>
            <span className="text-lg font-bold tabular-nums">
              {fmt.format(total)}
            </span>
          </div>

          {order.paymentLinkUrl && (
            <div className="flex items-center gap-2 text-xs text-[#FFB300] bg-[#FFB300]/10 border border-[#FFB300]/30 rounded-lg p-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Salvar vai invalidar o link de pagamento já gerado — você vai
              precisar gerar um novo.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="bg-primary text-primary-foreground hover:bg-[#A65E2E]"
          >
            {mutation.isPending && (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            )}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Order Detail Row ─────────────────────────────────────────────────────────

function OrderDetailRow({ orderId }: { orderId: string }) {
  const qc = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);

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

  const linkMutation = useMutation({
    mutationFn: () => OrderService.generatePaymentLink(orderId),
    onSuccess: () => {
      toast.success("Link de pagamento gerado!");
      qc.invalidateQueries({ queryKey: ["order-detail", orderId] });
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(
        e?.response?.data?.message ??
          "Erro ao gerar link de pagamento.",
      ),
  });

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const handleOpenWhatsApp = (phone: string, orderNumber: string, link: string) => {
    const message = `Olá${data?.customerName ? ` ${data.customerName}` : ""}! Segue o link de pagamento do seu pedido *#${orderNumber}*:\n\n${link}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

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

        {data.customerPhone && (
          <div className="text-xs text-muted-foreground mb-1">
            📱 {data.customerPhone}
          </div>
        )}

        {data.paymentMethod && (
          <div className="text-xs text-muted-foreground mb-1">
            💳 {PAYMENT_METHOD_LABELS[data.paymentMethod]}
          </div>
        )}

        {data.notes && (
          <div className="text-xs text-muted-foreground italic mb-3">
            📝 {data.notes}
          </div>
        )}

        {(data.status === "CONFIRMED" || data.status === "PAID") && (
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {data.paymentLinkUrl && (
              <>
                <span className="text-xs text-muted-foreground truncate max-w-60">
                  {data.paymentLinkUrl}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopyLink(data.paymentLinkUrl!)}
                  className="h-7 text-xs gap-1.5"
                >
                  <Copy className="w-3 h-3" /> Copiar link
                </Button>
                {data.customerPhone && (
                  <Button
                    size="sm"
                    onClick={() =>
                      handleOpenWhatsApp(
                        data.customerPhone!,
                        data.orderNumber,
                        data.paymentLinkUrl!,
                      )
                    }
                    className="h-7 text-xs gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    <MessageCircle className="w-3 h-3" /> Abrir WhatsApp
                  </Button>
                )}
              </>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={linkMutation.isPending}
              onClick={() => linkMutation.mutate()}
              className="h-7 text-xs gap-1.5"
            >
              {linkMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Link2 className="w-3 h-3" />
              )}
              {data.paymentLinkUrl
                ? "Gerar novo link"
                : "Gerar link de pagamento"}
            </Button>
          </div>
        )}

        {(data.status === "PENDING" ||
          data.status === "CONFIRMED" ||
          data.status === "PAID") && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditOpen(true)}
              className="h-8 text-xs gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" /> Editar pedido
            </Button>
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
                onClick={() => statusMutation.mutate("PAID")}
                className="h-8 text-xs gap-1.5"
              >
                <DollarSign className="w-3.5 h-3.5" /> Marcar como pago
              </Button>
            )}
            {(data.status === "CONFIRMED" || data.status === "PAID") && (
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
            {data.status !== "PAID" && (
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
            )}
          </div>
        )}

        {isEditOpen && (
          <EditOrderDialog
            order={data}
            open={isEditOpen}
            onOpenChange={setIsEditOpen}
          />
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
            <SelectItem value="PAID">Pagos</SelectItem>
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
