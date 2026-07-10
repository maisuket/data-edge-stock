import { api } from "../api";
import type { Page } from "./products";

// ── Types ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PAID"
  | "CANCELLED"
  | "COMPLETED";

export type DeliveryType = "PICKUP" | "DELIVERY";

// ── Interfaces ─────────────────────────────────────────────────────────────

export interface OrderItem {
  id: string;
  productId: string;
  product: { name: string; unit: string };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName?: string | null;
  customerPhone?: string | null;
  notes?: string | null;
  status: OrderStatus;
  totalAmount: number;
  paymentLinkUrl?: string | null;
  paymentPreferenceId?: string | null;
  deliveryType: DeliveryType;
  deliveryNeighborhood?: string | null;
  deliveryFee: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderDetail extends Order {
  items: OrderItem[];
}

// ── DTOs ───────────────────────────────────────────────────────────────────

export interface CreateOrderItemDto {
  productId: string;
  quantity: number;
}

export interface CreateOrderDto {
  items: CreateOrderItemDto[];
  customerName?: string;
  customerPhone: string;
  notes?: string;
  deliveryType: DeliveryType;
  deliveryNeighborhood?: string;
}

export interface UpdateOrderDto {
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  deliveryType?: DeliveryType;
  deliveryNeighborhood?: string;
  items?: CreateOrderItemDto[];
}

// ── Service ────────────────────────────────────────────────────────────────

export const OrderService = {
  getAll: async (page = 1, pageSize = 15, status?: OrderStatus) => {
    const response = await api.get<Page<Order>>("/orders", {
      params: { page, take: pageSize, status: status || undefined },
    });
    return response.data;
  },

  getOne: async (id: string) => {
    const response = await api.get<OrderDetail>(`/orders/${id}`);
    return response.data;
  },

  create: async (dto: CreateOrderDto) => {
    const response = await api.post<OrderDetail>("/orders", dto);
    return response.data;
  },

  update: async (id: string, dto: UpdateOrderDto) => {
    const response = await api.patch<OrderDetail>(`/orders/${id}`, dto);
    return response.data;
  },

  updateStatus: async (id: string, status: OrderStatus) => {
    const response = await api.patch<Order>(`/orders/${id}/status`, {
      status,
    });
    return response.data;
  },

  generatePaymentLink: async (id: string) => {
    const response = await api.post<Order>(`/orders/${id}/payment-link`);
    return response.data;
  },
};
