"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  MessageCircle,
  X,
  Search,
  Loader2,
  ChevronRight,
  Package,
  Store,
  Bike,
  QrCode,
  CreditCard,
  Banknote,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

import { ProductService, type PublicProduct } from "@/lib/services/products";
import { SettingsService } from "@/lib/services/settings";
import {
  OrderService,
  type DeliveryType,
  type PaymentMethod,
} from "@/lib/services/orders";
import { DeliveryZoneService } from "@/lib/services/delivery-zones";
import { normalizeBrazilPhone, formatBrazilPhoneInput } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Constantes ───────────────────────────────────────────────────────────────

const CART_STORAGE_KEY = "cardapio_cart";

// ── Types ────────────────────────────────────────────────────────────────────

interface CartItem {
  product: PublicProduct;
  quantity: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

/**
 * Espelha a mesma regra do backend (resolveUnitPrice em
 * price-tiers/resolve-unit-price.ts): usa o preço da maior faixa de
 * quantidade que a quantidade pedida atinge, ou o preço normal se a
 * promoção estiver desligada ou nenhuma faixa se aplicar. O backend nunca
 * confia nesse valor — é só para a prévia do carrinho ficar correta.
 */
function getUnitPriceForQuantity(product: PublicProduct, quantity: number) {
  const basePrice = product.salePrice ?? 0;
  if (!product.priceTiers || product.priceTiers.length === 0) return basePrice;

  const applicable = product.priceTiers
    .filter((t) => quantity >= t.minQuantity)
    .sort((a, b) => b.minQuantity - a.minQuantity)[0];

  return applicable ? applicable.unitPrice : basePrice;
}

/** Abaixo desse tanto de unidades restantes, mostra aviso de estoque baixo */
const LOW_STOCK_THRESHOLD = 3;

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: typeof QrCode }[] = [
  { value: "PIX", label: "Pix", icon: QrCode },
  { value: "CREDIT_CARD", label: "Crédito", icon: CreditCard },
  { value: "DEBIT_CARD", label: "Débito", icon: CreditCard },
  { value: "CASH", label: "Dinheiro", icon: Banknote },
];

const CATEGORY_EMOJI: Record<string, string> = {
  Pudim: "🍮",
  Picolé: "🍦",
  Dindin: "🧊",
  Sorvete: "🍨",
  Bolo: "🎂",
  Torta: "🥧",
  Outros: "📦",
};

function getCategoryEmoji(category: string) {
  return CATEGORY_EMOJI[category] ?? "🍽️";
}

// ── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({
  product,
  quantity,
  onAdd,
  onRemove,
}: {
  product: PublicProduct;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const emoji = getCategoryEmoji(product.category);
  const isOutOfStock = product.currentStock <= 0;
  const atStockLimit = !isOutOfStock && quantity >= product.currentStock;
  const remaining = product.currentStock - quantity;
  const isLowStock =
    !isOutOfStock && remaining > 0 && remaining <= LOW_STOCK_THRESHOLD;

  const hasPromo = !!product.priceTiers && product.priceTiers.length > 0;
  const cheapestTier = hasPromo
    ? [...product.priceTiers!].sort((a, b) => a.minQuantity - b.minQuantity)[0]
    : null;
  const effectiveUnitPrice =
    quantity > 0 ? getUnitPriceForQuantity(product, quantity) : null;
  const promoActive =
    effectiveUnitPrice !== null && effectiveUnitPrice !== product.salePrice;

  return (
    <div
      className={`group bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col ${
        isOutOfStock ? "opacity-60" : ""
      }`}
    >
      {/* Image / Placeholder */}
      <div className="relative aspect-[4/3] bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl select-none group-hover:scale-110 transition-transform duration-500">
            {emoji}
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Badge className="bg-zinc-900/90 text-white text-xs px-2.5 py-1 rounded-full">
              Esgotado
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm leading-tight">
            {product.name}
          </h3>
          {product.specifications && product.specifications.length > 0 && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
              {product.specifications
                .map((s) => `${s.name}: ${s.value}`)
                .join(" · ")}
            </p>
          )}
          {isLowStock && (
            <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1">
              Só {remaining === 1 ? "resta 1 unidade" : `restam ${remaining} unidades`}!
            </p>
          )}
          {hasPromo && cheapestTier && (
            <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
              🏷️ A partir de {cheapestTier.minQuantity} un:{" "}
              {formatCurrency(cheapestTier.unitPrice)} cada
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-auto pt-2">
          {promoActive && effectiveUnitPrice !== null ? (
            <span className="flex flex-col leading-tight">
              <span className="text-[11px] text-zinc-400 line-through">
                {product.salePrice !== null
                  ? formatCurrency(product.salePrice)
                  : ""}
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">
                {formatCurrency(effectiveUnitPrice)}
              </span>
            </span>
          ) : (
            <span className="font-bold text-primary text-base">
              {product.salePrice !== null
                ? formatCurrency(product.salePrice)
                : "Consultar"}
            </span>
          )}

          {isOutOfStock ? (
            <span className="text-xs font-medium text-zinc-400 px-3 py-1.5">
              Indisponível
            </span>
          ) : quantity === 0 ? (
            <Button
              aria-label={`Adicionar ${product.name} ao carrinho`}
              size="sm"
              onClick={onAdd}
              className="h-8 px-3 rounded-xl bg-primary hover:bg-[#A65E2E] text-primary-foreground text-xs gap-1"
            >
              <Plus className="w-3 h-3" /> Adicionar
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                aria-label={`Diminuir quantidade de ${product.name}`}
                onClick={onRemove}
                className="w-7 h-7 rounded-full border border-zinc-300 dark:border-zinc-700 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-5 text-center text-sm font-semibold">
                {quantity}
              </span>
              <button
                aria-label={`Aumentar quantidade de ${product.name}`}
                onClick={onAdd}
                disabled={atStockLimit}
                title={atStockLimit ? "Estoque máximo atingido" : undefined}
                className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-[#A65E2E] transition-colors disabled:opacity-40 disabled:hover:bg-primary disabled:cursor-not-allowed"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Cart Drawer ───────────────────────────────────────────────────────────────

function CartDrawer({
  items,
  whatsappNumber,
  onClose,
  onAdd,
  onRemove,
  onClear,
}: {
  items: CartItem[];
  whatsappNumber: string;
  onClose: () => void;
  onAdd: (product: PublicProduct) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("PICKUP");
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [successOrder, setSuccessOrder] = useState<{
    orderNumber: string;
    whatsappUrl: string;
  } | null>(null);
  const qc = useQueryClient();

  const { data: deliveryZones = [] } = useQuery({
    queryKey: ["delivery-zones"],
    queryFn: () => DeliveryZoneService.getPublic(),
    staleTime: 1000 * 60 * 5,
  });

  const selectedZone = deliveryZones.find(
    (z) => z.neighborhood === selectedNeighborhood,
  );
  const deliveryFee =
    deliveryType === "DELIVERY" ? (selectedZone?.fee ?? 0) : 0;

  const subtotal = items.reduce(
    (sum, item) =>
      sum + getUnitPriceForQuantity(item.product, item.quantity) * item.quantity,
    0,
  );
  const total = subtotal + deliveryFee;

  const orderMutation = useMutation({
    mutationFn: () => {
      const normalizedPhone = normalizeBrazilPhone(customerPhone);
      if (!normalizedPhone) {
        throw new Error(
          "Telefone inválido. Informe um número com DDD (ex: (92) 99999-9999).",
        );
      }
      if (deliveryType === "DELIVERY" && !selectedNeighborhood) {
        throw new Error("Escolha o bairro para calcular a taxa de entrega.");
      }
      if (!paymentMethod) {
        throw new Error("Escolha a forma de pagamento.");
      }
      return OrderService.create({
        customerName: customerName.trim() || undefined,
        customerPhone: normalizedPhone,
        notes: notes.trim() || undefined,
        deliveryType,
        deliveryNeighborhood:
          deliveryType === "DELIVERY" ? selectedNeighborhood : undefined,
        paymentMethod,
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      });
    },
    onSuccess: (order) => {
      const intro = customerName.trim()
        ? `Olá! Meu nome é *${customerName.trim()}* e gostaria de fazer um pedido:\n\n`
        : `Olá! Gostaria de fazer um pedido:\n\n`;

      const orderLines = items
        .map(
          (item) =>
            `▫️ ${item.quantity}x *${item.product.name}* — ${formatCurrency(
              getUnitPriceForQuantity(item.product, item.quantity) *
                item.quantity,
            )}`,
        )
        .join("\n");

      const deliveryLine =
        deliveryType === "DELIVERY"
          ? `\n\n🛵 Entrega: ${selectedNeighborhood} — ${formatCurrency(deliveryFee)}`
          : `\n\n🏠 Retirada na loja`;

      const paymentLabel = PAYMENT_METHODS.find(
        (m) => m.value === paymentMethod,
      )?.label;
      const paymentLine = paymentLabel
        ? `\n💳 Pagamento: ${paymentLabel}`
        : "";

      const notesBlock = notes.trim()
        ? `\n\n📝 Observações: ${notes.trim()}`
        : "";

      const message = `${intro}${orderLines}${deliveryLine}${paymentLine}\n\n*Total: ${formatCurrency(total)}*${notesBlock}\n\n*Pedido #${order.orderNumber}*`;

      const phone = whatsappNumber.replace(/\D/g, "");
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank");

      // Pedido enviado — começa um carrinho novo para o próximo cliente/pedido,
      // mas mantém o drawer aberto numa tela de confirmação (cobre o caso de
      // pop-up bloqueado, onde o WhatsApp não abre sozinho).
      setSuccessOrder({ orderNumber: order.orderNumber, whatsappUrl: url });
      onClear();
    },
    onError: (
      e: Error & { response?: { data?: { message?: string } } },
    ) => {
      toast.error(
        e?.response?.data?.message ??
          e?.message ??
          "Não foi possível registrar o pedido. Tente novamente.",
      );
      qc.invalidateQueries({ queryKey: ["menu-products"] });
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-sm bg-white dark:bg-zinc-950 flex flex-col shadow-2xl">
        {successOrder ? (
          <>
            <div className="flex items-center justify-end p-4">
              <button
                aria-label="Fechar carrinho"
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-primary" />
              </div>
              <div>
                <p className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
                  Pedido enviado!
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  Abrimos o WhatsApp com sua mensagem pronta pro pedido{" "}
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    #{successOrder.orderNumber}
                  </span>
                  .
                </p>
              </div>
              <p className="text-xs text-zinc-400">
                Se o WhatsApp não abriu automaticamente, toque no botão
                abaixo.
              </p>
              <a
                href={successOrder.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white gap-2 h-11">
                  <MessageCircle className="w-4 h-4" /> Abrir WhatsApp
                </Button>
              </a>
              <Button
                variant="outline"
                onClick={onClose}
                className="w-full rounded-xl h-11"
              >
                Fechar
              </Button>
            </div>
          </>
        ) : (
          <>
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              Meu Pedido
            </span>
            <Badge className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
              {items.reduce((s, i) => s + i.quantity, 0)}
            </Badge>
          </div>
          <button
            aria-label="Fechar carrinho"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-500">
            <ShoppingCart className="w-12 h-12 mb-4 text-zinc-300 dark:text-zinc-800" />
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              Seu carrinho está vazio
            </p>
            <p className="text-sm mt-1">
              Adicione alguns produtos para fazer seu pedido.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-3"
              >
                <div className="text-2xl w-8 text-center shrink-0">
                  {item.product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                  ) : (
                    getCategoryEmoji(item.product.category)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {item.product.name}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatCurrency(
                      getUnitPriceForQuantity(item.product, item.quantity) *
                        item.quantity,
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    aria-label={`Diminuir quantidade de ${item.product.name}`}
                    onClick={() => onRemove(item.product.id)}
                    className="w-6 h-6 rounded-full border border-zinc-300 dark:border-zinc-700 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-4 text-center text-sm font-semibold">
                    {item.quantity}
                  </span>
                  <button
                    aria-label={`Aumentar quantidade de ${item.product.name}`}
                    onClick={() => onAdd(item.product)}
                    disabled={item.quantity >= item.product.currentStock}
                    title={
                      item.quantity >= item.product.currentStock
                        ? "Estoque máximo atingido"
                        : undefined
                    }
                    className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-[#A65E2E] transition-colors disabled:opacity-40 disabled:hover:bg-primary disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    aria-label={`Remover ${item.product.name} do carrinho`}
                    onClick={() => {
                      for (let i = 0; i < item.quantity; i++) {
                        onRemove(item.product.id);
                      }
                    }}
                    className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-1"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
          {deliveryZones.length > 0 && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setDeliveryType("PICKUP")}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-sm font-medium transition-colors ${
                    deliveryType === "PICKUP"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-zinc-200 dark:border-zinc-700 text-zinc-500"
                  }`}
                >
                  <Store className="w-4 h-4" /> Retirar na loja
                </button>
                <button
                  onClick={() => setDeliveryType("DELIVERY")}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-sm font-medium transition-colors ${
                    deliveryType === "DELIVERY"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-zinc-200 dark:border-zinc-700 text-zinc-500"
                  }`}
                >
                  <Bike className="w-4 h-4" /> Entrega
                </button>
              </div>

              {deliveryType === "DELIVERY" && (
                <Select
                  value={selectedNeighborhood}
                  onValueChange={setSelectedNeighborhood}
                >
                  <SelectTrigger className="rounded-xl text-sm w-full">
                    <SelectValue placeholder="Escolha o bairro..." />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryZones.map((zone) => (
                      <SelectItem key={zone.id} value={zone.neighborhood}>
                        {zone.neighborhood} — {formatCurrency(zone.fee)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Forma de pagamento
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.value}
                    onClick={() => setPaymentMethod(method.value)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-sm font-medium transition-colors ${
                      paymentMethod === method.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-zinc-200 dark:border-zinc-700 text-zinc-500"
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {method.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {deliveryType === "DELIVERY" && (
            <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>Taxa de entrega</span>
              <span>
                {deliveryFee > 0 ? formatCurrency(deliveryFee) : "Grátis"}
              </span>
            </div>
          )}

          <div className="flex justify-between text-sm font-medium text-zinc-900 dark:text-zinc-100">
            <span>Total</span>
            <span className="text-primary font-bold text-base">
              {formatCurrency(total)}
            </span>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="customerName"
              className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
            >
              Nome
            </label>
            <Input
              id="customerName"
              placeholder="Seu nome (opcional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="rounded-xl text-sm"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="customerPhone"
              className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
            >
              WhatsApp *
            </label>
            <Input
              id="customerPhone"
              placeholder="(92) 99999-9999"
              type="tel"
              inputMode="numeric"
              value={customerPhone}
              onChange={(e) =>
                setCustomerPhone(formatBrazilPhoneInput(e.target.value))
              }
              className="rounded-xl text-sm"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="notes"
              className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
            >
              Observações
            </label>
            <Textarea
              id="notes"
              placeholder="Opcional: preferências, ponto de retirada..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="rounded-xl text-sm resize-none"
            />
          </div>

          <Button
            onClick={() => orderMutation.mutate()}
            disabled={
              !whatsappNumber || items.length === 0 || orderMutation.isPending
            }
            className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white gap-2 h-11"
          >
            {orderMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MessageCircle className="w-4 h-4" />
            )}
            {orderMutation.isPending ? "Enviando pedido..." : "Pedir via WhatsApp"}
          </Button>

          {!whatsappNumber && (
            <p className="text-xs text-center text-zinc-400">
              WhatsApp não configurado pelo estabelecimento.
            </p>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function ProductSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm flex flex-col animate-pulse">
      <div className="relative aspect-[4/3] bg-zinc-200 dark:bg-zinc-800" />
      <div className="p-4 flex flex-col flex-1 gap-3">
        <div>
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4 mb-2" />
          <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
        </div>
        <div className="flex items-center justify-between mt-auto pt-2">
          <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3" />
          <div className="h-8 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CardapioPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartHydrated, setIsCartHydrated] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("Todos");

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["menu-products"],
    queryFn: () => ProductService.getPublic(),
    staleTime: 1000 * 60 * 5,
  });

  // Restaura o carrinho salvo assim que o catálogo carrega, descartando
  // itens que não existem mais ou ficaram sem estoque.
  useEffect(() => {
    if (isCartHydrated || products.length === 0) return;

    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (raw) {
        const saved: { productId: string; quantity: number }[] =
          JSON.parse(raw);
        let removedAny = false;
        const restored: CartItem[] = [];

        for (const entry of saved) {
          const product = products.find((p) => p.id === entry.productId);
          if (!product || product.currentStock <= 0) {
            removedAny = true;
            continue;
          }
          const quantity = Math.min(entry.quantity, product.currentStock);
          if (quantity > 0) restored.push({ product, quantity });
        }

        setCart(restored);
        if (removedAny) {
          toast.info(
            "Alguns itens do seu carrinho não estão mais disponíveis e foram removidos.",
          );
        }
      }
    } catch {
      // localStorage indisponível ou conteúdo corrompido — ignora silenciosamente
    }

    setIsCartHydrated(true);
  }, [products, isCartHydrated]);

  // Persiste o carrinho a cada mudança (só depois de restaurar o salvo,
  // para não sobrescrever o localStorage com [] antes de carregar).
  useEffect(() => {
    if (!isCartHydrated) return;
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify(
        cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      ),
    );
  }, [cart, isCartHydrated]);

  const { data: whatsappSetting } = useQuery({
    queryKey: ["setting-whatsapp"],
    queryFn: () => SettingsService.getByKey("WHATSAPP_NUMBER"),
    staleTime: 1000 * 60 * 10,
  });

  const whatsappNumber = whatsappSetting?.value ?? "";

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category)));
    return ["Todos", ...cats];
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        activeCategory === "Todos" || p.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, activeCategory]);

  const grouped = useMemo(() => {
    const map = new Map<string, PublicProduct[]>();
    for (const p of filtered) {
      if (!map.has(p.category)) map.set(p.category, []);
      map.get(p.category)!.push(p);
    }
    // Produtos esgotados aparecem por último dentro de cada categoria
    for (const items of map.values()) {
      items.sort((a, b) => {
        const aOut = a.currentStock <= 0 ? 1 : 0;
        const bOut = b.currentStock <= 0 ? 1 : 0;
        return aOut - bOut;
      });
    }
    return map;
  }, [filtered]);

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce(
    (s, i) => s + getUnitPriceForQuantity(i.product, i.quantity) * i.quantity,
    0,
  );

  const addToCart = (product: PublicProduct) => {
    const currentQty =
      cart.find((i) => i.product.id === product.id)?.quantity ?? 0;

    if (currentQty >= product.currentStock) {
      toast.warning(
        `Só temos ${product.currentStock} ${
          product.currentStock === 1 ? "unidade" : "unidades"
        } de ${product.name} em estoque.`,
      );
      return;
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });

    // Exibe a notificação rápida apenas se o carrinho estiver fechado
    if (!isCartOpen) {
      toast.success(`1x ${product.name} adicionado!`, {
        duration: 1500, // Duração curta de 1.5s para sumir rápido
      });
    }
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === productId);
      if (!existing) return prev;
      if (existing.quantity === 1)
        return prev.filter((i) => i.product.id !== productId);
      return prev.map((i) =>
        i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i,
      );
    });
  };

  const getQuantity = (productId: string) =>
    cart.find((i) => i.product.id === productId)?.quantity ?? 0;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex-1">
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-none">
              🍮 Dr. Pudim
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Cardápio online
            </p>
          </div>

          <div className="relative hidden sm:block w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Buscar produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 rounded-xl text-sm"
            />
          </div>

          <button
            aria-label="Abrir carrinho"
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-2 pl-2 pr-2.5 py-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <span className="relative">
              <ShoppingCart className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {totalItems > 9 ? "9+" : totalItems}
                </span>
              )}
            </span>
            {totalItems > 0 && (
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums">
                {formatCurrency(cartTotal)}
              </span>
            )}
          </button>
        </div>

        {/* Mobile search */}
        <div className="sm:hidden px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Buscar produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 rounded-xl text-sm w-full"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="overflow-x-auto scrollbar-hide border-t border-zinc-100 dark:border-zinc-900">
          <div className="flex gap-1 px-4 py-2 w-max">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {cat === "Todos" ? cat : `${getCategoryEmoji(cat)} ${cat}`}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {isLoading ? (
          <section>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductSkeleton key={i} />
              ))}
            </div>
          </section>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-400">
            <Package className="w-10 h-10" />
            <p className="text-sm">Nenhum produto encontrado.</p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-xs text-primary hover:underline"
              >
                Limpar busca
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {Array.from(grouped.entries()).map(([category, items]) => (
              <section key={category}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">{getCategoryEmoji(category)}</span>
                  <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">
                    {category}
                  </h2>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                  <span className="text-xs text-zinc-400">
                    {items.length} {items.length === 1 ? "item" : "itens"}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {items.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      quantity={getQuantity(product.id)}
                      onAdd={() => addToCart(product)}
                      onRemove={() => removeFromCart(product.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Floating cart button (mobile) */}
      {totalItems > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 sm:hidden animate-in slide-in-from-bottom-4 duration-300">
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-3 bg-primary text-primary-foreground px-5 py-3 rounded-2xl shadow-lg hover:bg-[#A65E2E] transition-all duration-200 hover:scale-105"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="font-semibold text-sm">
              Ver pedido · {totalItems} {totalItems === 1 ? "item" : "itens"} ·{" "}
              {formatCurrency(cartTotal)}
            </span>
          </button>
        </div>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <CartDrawer
          items={cart}
          whatsappNumber={whatsappNumber}
          onClose={() => setIsCartOpen(false)}
          onAdd={addToCart}
          onRemove={removeFromCart}
          onClear={() => setCart([])}
        />
      )}
    </div>
  );
}
