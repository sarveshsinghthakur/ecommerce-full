import "server-only";

import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  orderItems,
  orderStatusHistory,
  orders,
  payments,
  type orderStatusEnum,
  type paymentStatusEnum,
} from "@/db/schema";

type Db = typeof db;

type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];

export interface OrderListItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: string;
  currency: string;
  itemCount: number;
  placedAt: Date;
}

export interface OrderItemView {
  id: string;
  title: string;
  variantName: string | null;
  productSlug: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  markupPercent: string | null;
}

export interface OrderHistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  actor: string;
  createdAt: Date;
}

export interface ShippingAddressView {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  label?: string;
}

export interface OrderDetail extends OrderListItem {
  email: string;
  fullName: string;
  phone: string;
  subtotal: string;
  shippingAmount: string;
  taxAmount: string;
  discountAmount: string;
  notes: string | null;
  paymentProvider: string | null;
  shippingAddress: ShippingAddressView;
  items: OrderItemView[];
  history: OrderHistoryEntry[];
}

export async function listOrdersForUser(userId: string, executor: Db = db): Promise<OrderListItem[]> {
  const rows = await executor
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      total: orders.total,
      currency: orders.currency,
      placedAt: orders.placedAt,
      itemCount: orders.subtotal,
    })
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.placedAt))
    .limit(50);

  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const counts = await countItems(executor, ids);

  return rows.map((row) => ({
    id: row.id,
    orderNumber: row.orderNumber,
    status: row.status,
    paymentStatus: row.paymentStatus,
    total: row.total,
    currency: row.currency,
    placedAt: row.placedAt,
    itemCount: counts.get(row.id) ?? 0,
  }));
}

async function countItems(executor: Db, orderIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (orderIds.length === 0) return map;
  const rows = await executor
    .select({ orderId: orderItems.orderId, quantity: orderItems.quantity })
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds));
  for (const row of rows) {
    map.set(row.orderId, (map.get(row.orderId) ?? 0) + row.quantity);
  }
  return map;
}

export async function getOrderForUser(
  userId: string,
  orderId: string,
  executor: Db = db,
): Promise<OrderDetail | null> {
  const [order] = await executor
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order || order.userId !== userId) return null;

  const [items, history] = await Promise.all([
    executor
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))
      .orderBy(asc(orderItems.createdAt)),
    executor
      .select()
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, orderId))
      .orderBy(asc(orderStatusHistory.createdAt)),
  ]);

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    total: order.total,
    currency: order.currency,
    placedAt: order.placedAt,
    itemCount: items.reduce((acc, item) => acc + item.quantity, 0),
    email: order.email,
    fullName: order.fullName,
    phone: order.phone,
    subtotal: order.subtotal,
    shippingAmount: order.shippingAmount,
    taxAmount: order.taxAmount,
    discountAmount: order.discountAmount,
    notes: order.notes,
    paymentProvider: order.paymentProvider,
    shippingAddress: order.shippingAddress as unknown as ShippingAddressView,
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      variantName: item.variantName,
      productSlug: item.productSlug,
      imageUrl: item.imageUrl,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      markupPercent: item.markupPercent,
    })),
    history: history.map((entry) => ({
      id: entry.id,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      note: entry.note,
      actor: entry.actor,
      createdAt: entry.createdAt,
    })),
  };
}

/** Administrative read used by the payment routes (ownership already checked). */
export async function getOrderRow(orderId: string, executor: Db = db) {
  const [order] = await executor
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  return order ?? null;
}

export async function getPaymentRows(orderId: string, executor: Db = db) {
  return executor
    .select()
    .from(payments)
    .where(eq(payments.orderId, orderId))
    .orderBy(desc(payments.createdAt));
}
