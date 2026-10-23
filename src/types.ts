export type TransactionType = "income" | "expense";
export type OrderStatus = "new" | "design" | "production" | "install" | "completed" | "cancelled";
export type OrderProduct =
  | "Volumetric letters"
  | "Facade sign"
  | "Stela / pylon"
  | "Lightbox"
  | "LED display"
  | "Car branding"
  | "Banner / print"
  | "Interior signage"
  | "Other";
export type OrderPriority = "low" | "normal" | "high";
export type WorkerStatus = "active" | "on_leave" | "inactive";

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  date: string;
  category: string;
  description: string;
  clientId: number | null;
  orderId: number | null;
  workerId: number | null;
  productId: number | null;
  toolId: number | null;
  method: string;
  reference: string | null;
  notes: string | null;
  clientName: string | null;
  orderName: string | null;
  workerName: string | null;
  productName: string | null;
  productCategory: string | null;
  toolName: string | null;
  toolKind: string | null;
  createdAt: string;
}

export interface CatalogProduct {
  id: number;
  name: string;
  category: string;
  unit: string;
  notes: string | null;
  active: boolean;
  useCount: number;
  saleCount: number;
  revenue: number;
  lastUsed: string | null;
  createdAt: string;
}

export interface CatalogTool {
  id: number;
  name: string;
  kind: string;
  notes: string | null;
  active: boolean;
  useCount: number;
  orderCount: number;
  lastUsed: string | null;
  createdAt: string;
}

export interface CatalogData {
  products: CatalogProduct[];
  tools: CatalogTool[];
  summary: {
    productCount: number;
    activeProducts: number;
    toolCount: number;
    activeTools: number;
    taggedRevenue: number;
    taggedEntries: number;
    topProduct: {
      id: number;
      name: string;
      category: string;
      revenue: number;
      saleCount: number;
    } | null;
  };
}

export interface DashboardStats {
  income: number;
  expense: number;
  profit: number;
  margin: number;
  incomeChange: number | null;
  expenseChange: number | null;
  profitChange: number | null;
  previousIncome: number;
  previousExpense: number;
  openOrders: number;
  inProduction: number;
  awaitingInstall: number;
  orderValue: number;
  outstanding: number;
  totalOrders: number;
  inventoryValue: number;
  lowStockCount: number;
  inventoryItems: number;
  consumedThisMonth: number;
  materialUsageCount: number;
  teamTotal: number;
  teamActive: number;
  teamOnLeave: number;
  monthlyPayroll: number;
}

export interface MonthPoint {
  key: string;
  month: string;
  label: string;
  income: number;
  expense: number;
}

export interface ExpenseSlice {
  name: string;
  value: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  name: string;
  clientId: number | null;
  clientName: string;
  clientIndustry: string | null;
  product: OrderProduct;
  status: OrderStatus;
  quote: number;
  site: string | null;
  orderDate: string | null;
  deadline: string | null;
  priority: OrderPriority;
  managerId: number | null;
  managerName: string | null;
  managerColor: string;
  notes: string | null;
  income: number;
  expense: number;
  profit: number;
  balance: number;
  materialMovements: number;
  crew: Array<{ id: number; name: string; role: string; avatarColor: string; department: string }>;
  createdAt: string;
}

export interface OrderDetail extends Order {
  transactions: Transaction[];
  movements: Movement[];
}

export interface Material {
  id: number;
  name: string;
  category: string;
  unit: string;
  stock: number;
  minStock: number;
  unitCost: number;
  supplier: string | null;
  location: string | null;
  lastMovement: string | null;
  movementCount: number;
  value: number;
  lowStock: boolean;
}

export interface Movement {
  id: number;
  materialId: number;
  materialName: string;
  materialUnit: string;
  type: "in" | "out";
  quantity: number;
  unitCost: number;
  date: string;
  orderId: number | null;
  orderName: string | null;
  workerId: number | null;
  workerName: string | null;
  note: string | null;
  createdAt: string;
}

export interface Worker {
  id: number;
  name: string;
  role: string;
  department: string;
  phone: string | null;
  email: string | null;
  salary: number;
  status: WorkerStatus;
  hireDate: string | null;
  avatarColor: string;
  activeOrders: number;
  orderCount: number;
  paidTotal: number;
  lastPaid: string | null;
  createdAt: string;
}

export interface WorkerDetail extends Worker {
  orders: Array<{
    id: number;
    orderNumber: string;
    name: string;
    status: OrderStatus;
    orderDate: string | null;
    deadline: string | null;
    quote: number;
    clientName: string | null;
    income: number;
  }>;
  payments: Transaction[];
  materialUsage: Movement[];
  usageValue: number;
  usageCount: number;
}

export interface Client {
  id: number;
  name: string;
  industry: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  orderCount: number;
  activeOrders: number;
  revenue: number;
  lastPayment: string | null;
  createdAt: string;
}

export interface DashboardData {
  month: string;
  monthLabel: string;
  stats: DashboardStats;
  chart: MonthPoint[];
  expenseMix: ExpenseSlice[];
  recentTransactions: Transaction[];
  openOrders: Order[];
  lowStock: Material[];
  crew: Worker[];
}

export interface Bootstrap {
  clients: Array<{ id: number; name: string; industry: string }>;
  orders: Array<{
    id: number;
    orderNumber: string;
    name: string;
    clientId: number | null;
    status: OrderStatus;
    product: OrderProduct;
    quote: number;
  }>;
  workers: Array<{ id: number; name: string; role: string; department: string; status: WorkerStatus; avatarColor: string }>;
  products: Array<{ id: number; name: string; category: string; unit: string; active: boolean }>;
  tools: Array<{ id: number; name: string; kind: string; active: boolean }>;
  categories: { income: string[]; expense: string[] };
  methods: string[];
  company: {
    name: string;
    legalName: string;
    address: string;
    phone: string;
    email: string;
  };
}

export interface TransactionsResponse {
  transactions: Transaction[];
  summary: { income: number; expense: number; net: number; count: number };
  months: string[];
}

export interface MaterialsResponse {
  materials: Material[];
  movements: Movement[];
  summary: {
    totalValue: number;
    lowCount: number;
    itemCount: number;
    consumedThisMonth: number;
    usageCount: number;
    receivedThisMonth: number;
    receivedCount: number;
  };
}

export type AgentRole = "user" | "assistant";

export interface AgentMessage {
  role: AgentRole;
  content: string;
}

export interface AgentConfig {
  configured: boolean;
  model: string;
  source: "local" | "environment" | null;
}

export interface AgentReply {
  reply: string;
  model: string;
}

export interface SearchResult {
  type: "transaction" | "order" | "material" | "worker" | "client" | "product" | "tool";
  id: number;
  title: string;
  subtitle: string;
  meta?: number;
  path: string;
  txType?: "income" | "expense";
  category?: string;
  kind?: string;
  archived?: boolean;
  orderNumber?: string;
  clientName?: string | null;
  status?: string;
  stock?: number;
  unit?: string;
  low?: boolean;
  role?: string;
  department?: string;
  industry?: string;
  contactName?: string | null;
}
