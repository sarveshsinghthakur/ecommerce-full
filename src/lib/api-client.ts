/**
 * Typed client for Python FastAPI backend (/api/v1)
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // send session cookies
  });

  if (!res.ok) {
    let errorDetail = `API error (${res.status})`;
    try {
      const errorJson = await res.json();
      errorDetail = errorJson.detail || errorDetail;
    } catch {
      // not json
    }
    throw new Error(errorDetail);
  }

  return res.json();
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  position: number;
}

export interface ProductImage {
  id: string;
  url: string;
  alt?: string;
  position: number;
}

export interface ProductVariant {
  id: string;
  sku?: string;
  name: string;
  selling_price?: number;
  stock_quantity?: number;
  availability: string;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  brand?: string;
  description?: string;
  category_id?: string;
  currency: string;
  selling_price: number;
  reference_price?: number;
  status: string;
  rating?: number;
  review_count: number;
  stock_quantity?: number;
  availability: string;
  images: ProductImage[];
  variants: ProductVariant[];
  category?: Category;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface CartItem {
  id: string;
  product_id: string;
  variant_id?: string;
  quantity: number;
  product?: Product;
  variant?: ProductVariant;
}

export interface Cart {
  id: string;
  user_id?: string;
  items: CartItem[];
  subtotal: number;
  item_count: number;
}

export interface OrderItem {
  id: string;
  product_slug: string;
  title: string;
  variant_name?: string;
  image_url?: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_provider?: string;
  currency: string;
  subtotal: number;
  shipping_amount: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  shipping_address: Record<string, unknown>;
  placed_at: string;
  items: OrderItem[];
}

export interface User {
  id: string;
  email: string;
  display_name?: string;
  photo_url?: string;
  phone?: string;
  role: string;
}

export const api = {
  // Catalog
  getCategories: () => fetchApi<Category[]>("/catalog/categories"),
  getProducts: (params: {
    category?: string;
    q?: string;
    min_price?: number;
    max_price?: number;
    sort?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    const query = new URLSearchParams();
    if (params.category) query.set("category", params.category);
    if (params.q) query.set("q", params.q);
    if (params.min_price !== undefined) query.set("min_price", String(params.min_price));
    if (params.max_price !== undefined) query.set("max_price", String(params.max_price));
    if (params.sort) query.set("sort", params.sort);
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    return fetchApi<ProductListResponse>(`/catalog/products?${query.toString()}`);
  },
  getProductBySlug: (slug: string) => fetchApi<Product>(`/catalog/products/${slug}`),

  // Cart
  getCart: () => fetchApi<Cart>("/cart"),
  addToCart: (productId: string, variantId?: string, quantity = 1) =>
    fetchApi<Cart>("/cart/items", {
      method: "POST",
      body: JSON.stringify({ product_id: productId, variant_id: variantId, quantity }),
    }),
  updateCartItem: (itemId: string, quantity: number) =>
    fetchApi<Cart>(`/cart/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    }),
  removeCartItem: (itemId: string) =>
    fetchApi<Cart>(`/cart/items/${itemId}`, {
      method: "DELETE",
    }),

  // Checkout
  checkout: (data: {
    shipping_address: {
      full_name: string;
      phone: string;
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postal_code: string;
      country?: string;
    };
    payment_method?: string;
    coupon_code?: string;
    notes?: string;
  }) =>
    fetchApi<Order>("/checkout", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Orders
  getOrders: () => fetchApi<{ items: Order[]; total: number }>("/orders"),
  getOrder: (id: string) => fetchApi<Order>(`/orders/${id}`),

  // Paytm Payment
  initiatePaytmPayment: (orderId: string) =>
    fetchApi<{
      success: boolean;
      order_id: string;
      amount: number;
      currency: string;
      txn_token?: string;
      mid?: string;
      checkout_url?: string;
      callback_url?: string;
    }>("/payments/paytm/initiate", {
      method: "POST",
      body: JSON.stringify({ order_id: orderId }),
    }),
  getPaymentStatus: (orderId: string) =>
    fetchApi<{
      success: boolean;
      order_id: string;
      status: string;
      txn_id?: string;
      amount?: string;
    }>(`/payments/paytm/status/${orderId}`),

  // Auth
  createSession: (idToken: string) =>
    fetchApi<User>("/auth/session", {
      method: "POST",
      body: JSON.stringify({ id_token: idToken }),
    }),
  getMe: () => fetchApi<User>("/auth/me"),
  logout: () =>
    fetchApi<{ success: boolean }>("/auth/logout", {
      method: "POST",
    }),

  // Wishlist
  getWishlist: () => fetchApi<Product[]>("/wishlist"),
  addToWishlist: (productId: string) =>
    fetchApi<{ success: boolean }>(`/wishlist/items/${productId}`, {
      method: "POST",
    }),
  removeFromWishlist: (productId: string) =>
    fetchApi<{ success: boolean }>(`/wishlist/items/${productId}`, {
      method: "DELETE",
    }),
};
