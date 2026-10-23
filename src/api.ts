import type {
  Bootstrap,
  CatalogData,
  CatalogProduct,
  CatalogTool,
  Client,
  DashboardData,
  Material,
  MaterialsResponse,
  Movement,
  Order,
  OrderDetail,
  SearchResult,
  Transaction,
  TransactionsResponse,
  Worker,
  WorkerDetail,
} from "./types";
import { t } from "./i18n";

// The API answers in English; show its messages in the chosen language.
function translateError(message: string): string {
  const direct = t(message);
  if (direct !== message) return direct;
  let m = message.match(/^(.+) is required\.$/);
  if (m) return t("{label} is required.", { label: t(m[1]) });
  m = message.match(/^(.+) not found\.$/);
  if (m) return t("{label} not found.", { label: t(m[1]) });
  m = message.match(/^Only (\S+) (\S+) in stock\.$/);
  if (m) return t("Only {qty} {unit} in stock.", { qty: m[1], unit: t(m[2]) });
  return message;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
  if (response.status === 401) {
    window.location.href = "/login";
    throw new Error(t("Please sign in again."));
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(translateError(data.error || "Request failed. Please try again."));
  }
  return data as T;
}

function qs(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "all") {
      search.set(key, String(value));
    }
  });
  const value = search.toString();
  return value ? `?${value}` : "";
}

export const api = {
  dashboard: () => request<DashboardData>("/api/dashboard"),
  bootstrap: () => request<Bootstrap>("/api/bootstrap"),

  transactions: (params: Record<string, string | number | undefined | null> = {}) =>
    request<TransactionsResponse>(`/api/transactions${qs(params)}`),
  createTransaction: (payload: Partial<Transaction>) =>
    request<{ transaction: Transaction }>("/api/transactions", { method: "POST", body: JSON.stringify(payload) }),
  updateTransaction: (id: number, payload: Partial<Transaction>) =>
    request<{ transaction: Transaction }>(`/api/transactions/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteTransaction: (id: number) => request<{ ok: true }>(`/api/transactions/${id}`, { method: "DELETE" }),

  catalog: () => request<CatalogData>("/api/catalog"),
  createProduct: (payload: Record<string, unknown>) =>
    request<{ product: CatalogProduct }>("/api/products", { method: "POST", body: JSON.stringify(payload) }),
  updateProduct: (id: number, payload: Record<string, unknown>) =>
    request<{ product: CatalogProduct }>(`/api/products/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  createTool: (payload: Record<string, unknown>) =>
    request<{ tool: CatalogTool }>("/api/tools", { method: "POST", body: JSON.stringify(payload) }),
  updateTool: (id: number, payload: Record<string, unknown>) =>
    request<{ tool: CatalogTool }>(`/api/tools/${id}`, { method: "PUT", body: JSON.stringify(payload) }),

  orders: () => request<{ orders: Order[] }>("/api/orders"),
  order: (id: number) => request<{ order: OrderDetail }>(`/api/orders/${id}`),
  createOrder: (payload: Record<string, unknown>) =>
    request<{ order: Order }>("/api/orders", { method: "POST", body: JSON.stringify(payload) }),
  updateOrder: (id: number, payload: Record<string, unknown>) =>
    request<{ order: Order }>(`/api/orders/${id}`, { method: "PUT", body: JSON.stringify(payload) }),

  materials: () => request<MaterialsResponse>("/api/materials"),
  createMaterial: (payload: Record<string, unknown>) =>
    request<{ material: Material }>("/api/materials", { method: "POST", body: JSON.stringify(payload) }),
  updateMaterial: (id: number, payload: Record<string, unknown>) =>
    request<{ material: Material }>(`/api/materials/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  createMovement: (materialId: number, payload: Record<string, unknown>) =>
    request<{ material: Material; movement: Movement; transaction: Transaction | null }>(`/api/materials/${materialId}/movements`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  workers: () => request<{ workers: Worker[]; departments: string[] }>("/api/workers"),
  worker: (id: number) => request<{ worker: WorkerDetail }>(`/api/workers/${id}`),
  createWorker: (payload: Record<string, unknown>) =>
    request<{ worker: Worker }>("/api/workers", { method: "POST", body: JSON.stringify(payload) }),
  updateWorker: (id: number, payload: Record<string, unknown>) =>
    request<{ worker: Worker }>(`/api/workers/${id}`, { method: "PUT", body: JSON.stringify(payload) }),

  clients: () => request<{ clients: Client[] }>("/api/clients"),
  createClient: (payload: Record<string, unknown>) =>
    request<{ client: Client }>("/api/clients", { method: "POST", body: JSON.stringify(payload) }),
  updateClient: (id: number, payload: Record<string, unknown>) =>
    request<{ client: Client }>(`/api/clients/${id}`, { method: "PUT", body: JSON.stringify(payload) }),

  search: (q: string) => request<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(q)}`),
};
