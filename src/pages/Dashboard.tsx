import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  FolderKanban,
  Plus,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { api } from "../api";
import { useQuickTransaction } from "../components/QuickTransaction";
import { Avatar } from "../components/Avatar";
import { EmptyState } from "../components/EmptyState";
import {
  formatCompact,
  formatDate,
  formatDateRange,
  formatMoney,
  formatNumber,
  initials,
  signedPercent,
  statusLabel,
} from "../lib/format";

const mixColors = ["#1e503a", "#e8a326", "#c86242", "#527389", "#8da58f", "#cdbb91", "#9a8b78"];

const stageProgress: Record<string, number> = {
  new: 8,
  design: 32,
  production: 64,
  install: 88,
  completed: 100,
  cancelled: 0,
};

function Sparkline({ values, color = "#8fd0a6" }: { values: number[]; color?: string }) {
  if (!values.length) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * 70 + 1;
      const y = 23 - ((value - min) / range) * 19;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg className="sparkline" viewBox="0 0 72 25" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" opacity="0.88" />
      <circle cx={points.split(" ").at(-1)?.split(",")[0]} cy={points.split(" ").at(-1)?.split(",")[1]} r="2" fill={color} />
    </svg>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      {payload.map((entry) => (
        <div className="chart-tooltip-row" key={entry.dataKey}>
          <span>
            <i
              className="legend-dot"
              style={{ background: entry.dataKey === "income" ? "#79b994" : "#e8a326" }}
            />
            {entry.dataKey === "income" ? "Money in" : "Money out"}
          </span>
          <strong>UZS {formatCompact(entry.value)}</strong>
        </div>
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div className="skeleton" style={{ width: 150, height: 10, marginBottom: 14 }} />
        <div className="skeleton" style={{ width: 390, maxWidth: "80%", height: 42 }} />
        <div className="skeleton" style={{ width: 480, maxWidth: "90%", height: 12, marginTop: 14 }} />
      </div>
      <div className="kpi-grid">
        {[0, 1, 2, 3].map((index) => (
          <div className="kpi-card" key={index}>
            <div className="skeleton" style={{ width: 80, height: 10 }} />
            <div className="skeleton" style={{ width: 130, height: 32, marginTop: 22 }} />
            <div className="skeleton" style={{ width: 100, height: 9, marginTop: 25 }} />
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <div className="card chart-card span-8">
          <div className="card-header">
            <div>
              <div className="skeleton" style={{ width: 90, height: 13 }} />
              <div className="skeleton" style={{ width: 180, height: 9, marginTop: 8 }} />
            </div>
          </div>
          <div className="skeleton" style={{ height: 230, margin: "30px 23px" }} />
        </div>
        <div className="card span-4">
          <div className="skeleton" style={{ height: 300, margin: 22 }} />
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { openTransaction } = useQuickTransaction();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: api.dashboard,
  });

  if (isLoading) return <DashboardSkeleton />;
  if (isError || !data) {
    return (
      <div className="card" style={{ marginTop: 30 }}>
        <EmptyState
          icon={<Wallet size={20} />}
          title="Could not load the dashboard"
          description="The API could not be reached. Check that the server is running, then try again."
          action={
            <button className="btn btn-primary" onClick={() => void refetch()}>
              Try again
            </button>
          }
        />
      </div>
    );
  }

  const { stats, chart, expenseMix, recentTransactions, openOrders, lowStock, crew } = data;
  const averageNet = chart.reduce((sum, month) => sum + month.income - month.expense, 0) / chart.length;
  const totalMix = expenseMix.reduce((sum, item) => sum + item.value, 0);

  const normalizedMix =
    expenseMix.length <= 6
      ? expenseMix
      : [
          ...expenseMix.slice(0, 5),
          {
            name: "Other",
            value: expenseMix.slice(5).reduce((sum, item) => sum + item.value, 0),
          },
        ];

  return (
    <div>
      <header className="page-header animate-up">
        <div>
          <div className="eyebrow">
            Financial overview <span style={{ color: "var(--color-line-strong)" }}>/</span> {data.monthLabel}
          </div>
          <h1 className="page-title">
            The shop floor, <em>in control.</em>
          </h1>
          <p className="page-subtitle">
            Cash, orders, materials and crew — every signage job from design to install, for {data.monthLabel.split(" ")[0]}.
          </p>
        </div>
        <div className="header-actions">
          <Link to="/money" className="btn btn-secondary">
            View ledger <ArrowUpRight size={14} />
          </Link>
          <button type="button" className="btn btn-amber" onClick={() => openTransaction()}>
            <Plus size={15} /> New entry
          </button>
        </div>
      </header>

      <section className="kpi-grid animate-up" style={{ animationDelay: "50ms" }}>
        <article className="kpi-card kpi-dark">
          <div className="kpi-head">
            <span className="kpi-label">Money in</span>
            <span className="kpi-icon">
              <ArrowDownLeft />
            </span>
          </div>
          <div className="kpi-value">
            <strong>{formatCompact(stats.income)}</strong>
            <span>UZS</span>
          </div>
          <div className="kpi-foot">
            <div>
              <div className={`trend ${stats.incomeChange !== null && stats.incomeChange >= 0 ? "trend-up" : "trend-down"}`}>
                {stats.incomeChange !== null && stats.incomeChange >= 0 ? <TrendingUp /> : <TrendingDown />}
                {signedPercent(stats.incomeChange)}
              </div>
              <div className="kpi-note">vs. last month</div>
            </div>
            <Sparkline values={chart.map((month) => month.income)} />
          </div>
        </article>

        <article className="kpi-card">
          <div className="kpi-head">
            <span className="kpi-label">Money out</span>
            <span className="kpi-icon">
              <ArrowUpRight />
            </span>
          </div>
          <div className="kpi-value">
            <strong>{formatCompact(stats.expense)}</strong>
            <span>UZS</span>
          </div>
          <div className="kpi-foot">
            <div>
              <div className={`trend ${stats.expenseChange !== null && stats.expenseChange <= 0 ? "trend-up" : "trend-down"}`}>
                {stats.expenseChange !== null && stats.expenseChange <= 0 ? <TrendingDown /> : <TrendingUp />}
                {signedPercent(stats.expenseChange)}
              </div>
              <div className="kpi-note">vs. last month</div>
            </div>
            <Sparkline values={chart.map((month) => month.expense)} color="#c86242" />
          </div>
        </article>

        <article className="kpi-card kpi-sage">
          <div className="kpi-head">
            <span className="kpi-label">Net profit</span>
            <span className="kpi-icon">
              <CircleDollarSign />
            </span>
          </div>
          <div className="kpi-value">
            <strong>{formatCompact(stats.profit)}</strong>
            <span>UZS</span>
          </div>
          <div className="kpi-foot">
            <span className="trend-chip">{stats.margin.toFixed(1)}% margin</span>
            <div className={`trend ${stats.profitChange !== null && stats.profitChange >= 0 ? "trend-up" : "trend-down"}`}>
              {stats.profitChange !== null && stats.profitChange >= 0 ? <TrendingUp /> : <TrendingDown />}
              {signedPercent(stats.profitChange)}
            </div>
          </div>
        </article>

        <article className="kpi-card kpi-warm">
          <div className="kpi-head">
            <span className="kpi-label">Stock on hand</span>
            <span className="kpi-icon">
              <Boxes />
            </span>
          </div>
          <div className="kpi-value">
            <strong>{formatCompact(stats.inventoryValue)}</strong>
            <span>UZS</span>
          </div>
          <div className="kpi-foot">
            <div>
              <div className="trend trend-down">
                <Boxes />
                {stats.lowStockCount} low of {stats.inventoryItems}
              </div>
              <div className="kpi-note">{formatCompact(stats.consumedThisMonth)} used this month</div>
            </div>
            <div className="stock-mini" aria-hidden="true">
              {[9, 16, 12, 20, 14, 22, 10].map((height, index) => (
                <span key={index} style={{ height }} />
              ))}
            </div>
          </div>
        </article>
      </section>

      <div className="dashboard-grid">
        <section className="card chart-card span-8 animate-up" style={{ animationDelay: "100ms" }}>
          <div className="card-header">
            <div>
              <h2 className="card-title">Cash flow</h2>
              <div className="card-subtitle">Money in and out across the last six months</div>
            </div>
            <div className="chart-legend" style={{ padding: 0, margin: 0 }}>
              <span className="legend-item">
                <span className="legend-dot" style={{ background: "#2f6b4f" }} /> Money in
              </span>
              <span className="legend-item">
                <span className="legend-dot" style={{ background: "#e8a326" }} /> Money out
              </span>
            </div>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={270}>
              <AreaChart data={chart} margin={{ top: 18, right: 17, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2f6b4f" stopOpacity={0.23} />
                    <stop offset="100%" stopColor="#2f6b4f" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e8a326" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#e8a326" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e9e3d6" strokeDasharray="3 5" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#85877d", fontSize: 9, fontFamily: "DM Mono" }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#a1a298", fontSize: 8, fontFamily: "DM Mono" }}
                  tickFormatter={(value: number) => formatCompact(value, 0)}
                  width={54}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#cbc3b2", strokeDasharray: "4 4" }} />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#2f6b4f"
                  strokeWidth={2.1}
                  fill="url(#incomeFill)"
                  activeDot={{ r: 4, fill: "#2f6b4f", stroke: "#fbfaf5", strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="#e8a326"
                  strokeWidth={1.9}
                  fill="url(#expenseFill)"
                  activeDot={{ r: 4, fill: "#e8a326", stroke: "#fbfaf5", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-footer">
            <div className="chart-footer-copy">
              Average monthly net <strong>UZS {formatCompact(averageNet)}</strong>
            </div>
            <Link to="/money" className="card-link">
              Open full ledger <ArrowRight size={12} />
            </Link>
          </div>
        </section>

        <section className="card expense-mix span-4 animate-up" style={{ animationDelay: "150ms" }}>
          <div className="card-header">
            <div>
              <h2 className="card-title">Where it went</h2>
              <div className="card-subtitle">Expense mix · {data.monthLabel.split(" ")[0]}</div>
            </div>
            <Link to="/money" className="card-link">
              <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={normalizedMix}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={76}
                  startAngle={90}
                  endAngle={-270}
                  paddingAngle={2}
                  stroke="#fbfaf5"
                  strokeWidth={2}
                >
                  {normalizedMix.map((item, index) => (
                    <Cell key={item.name} fill={mixColors[index % mixColors.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center">
              <span>Total out</span>
              <strong>{formatCompact(stats.expense)}</strong>
            </div>
          </div>
          <div className="mix-list">
            {normalizedMix.slice(0, 6).map((item, index) => (
              <div className="mix-row" key={item.name}>
                <span className="mix-row-dot" style={{ background: mixColors[index % mixColors.length] }} />
                <span className="mix-row-name">{item.name}</span>
                <span className="mix-row-value">{formatCompact(item.value)}</span>
                <span className="mix-row-pct">{totalMix ? Math.round((item.value / totalMix) * 100) : 0}%</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card span-5 animate-up" style={{ animationDelay: "200ms" }}>
          <div className="card-header">
            <div>
              <h2 className="card-title">Orders in motion</h2>
              <div className="card-subtitle">
                {stats.openOrders} open · {stats.inProduction} in production · {stats.awaitingInstall} ready to install
              </div>
            </div>
            <Link to="/orders" className="card-link">
              All orders <ArrowRight size={12} />
            </Link>
          </div>
          <div className="order-list">
            {openOrders.map((order) => {
              const progress = stageProgress[order.status] ?? 0;
              return (
                <Link className="order-row" key={order.id} to={`/orders?open=${order.id}`}>
                  <span className="client-mark">{initials(order.clientName)}</span>
                  <span className="order-info">
                    <span className="order-name">{order.name}</span>
                    <span className="order-meta">
                      {order.clientName} · {order.product}
                    </span>
                  </span>
                  <span className="order-money">
                    <strong>UZS {formatCompact(order.quote)}</strong>
                    <span>{order.balance > 0 ? `${formatCompact(order.balance)} due` : "Paid in full"}</span>
                  </span>
                  <span className="order-progress">
                    <span className="progress-track">
                      <span className="progress-fill" style={{ width: `${progress}%` }} />
                    </span>
                    <span>{statusLabel(order.status)}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="card span-7 animate-up" style={{ animationDelay: "250ms" }}>
          <div className="card-header">
            <div>
              <h2 className="card-title">Recent entries</h2>
              <div className="card-subtitle">The latest movement across the ledger</div>
            </div>
            <Link to="/money" className="card-link">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="recent-list">
            {recentTransactions.slice(0, 6).map((transaction) => (
              <Link className="recent-row" to={`/money?search=${encodeURIComponent(transaction.description)}`} key={transaction.id}>
                <span className={`tx-icon ${transaction.type === "income" ? "in" : "out"}`}>
                  {transaction.type === "income" ? <ArrowDownLeft /> : <ArrowUpRight />}
                </span>
                <span className="recent-main">
                  <span className="recent-title">{transaction.description}</span>
                  <span className="recent-meta">
                    {transaction.category} · {formatDate(transaction.date, "short")}
                    {transaction.productName ? ` · ${transaction.productName}` : ""}
                  </span>
                </span>
                <span className={`recent-amount ${transaction.type === "income" ? "in" : "out"}`}>
                  {transaction.type === "income" ? "+" : "−"}
                  {formatCompact(transaction.amount)}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="card span-7 animate-up" style={{ animationDelay: "300ms" }}>
          <div className="card-header">
            <div>
              <h2 className="card-title">Stock watch</h2>
              <div className="card-subtitle">Materials below their reorder level</div>
            </div>
            <Link to="/materials" className="card-link">
              Open inventory <ArrowRight size={12} />
            </Link>
          </div>
          {lowStock.length ? (
            <div className="stock-watch-list">
              {lowStock.map((material) => {
                const ratio = material.minStock ? Math.min(100, (material.stock / material.minStock) * 100) : 0;
                return (
                  <Link
                    className="stock-watch-row"
                    key={material.id}
                    to={`/materials?search=${encodeURIComponent(material.name)}`}
                  >
                    <span>
                      <span className="stock-watch-name">{material.name}</span>
                      <span className="stock-watch-sub">{material.category} · {material.supplier || "No supplier set"}</span>
                    </span>
                    <span className="stock-watch-level">
                      <span className="progress-track">
                        <span className={`progress-fill ${ratio < 50 ? "danger" : "warn"}`} style={{ width: `${ratio}%` }} />
                      </span>
                      <span className="stock-watch-qty">
                        {formatNumber(material.stock, 1)} / {formatNumber(material.minStock, 1)} {material.unit}
                      </span>
                    </span>
                    <span className="badge badge-low">Low</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: "22px 23px", fontSize: 11, color: "var(--color-muted)" }}>
              All stock levels are healthy.
            </div>
          )}
        </section>

        <section className="card span-5 animate-up" style={{ animationDelay: "350ms" }}>
          <div className="card-header">
            <div>
              <h2 className="card-title">The crew</h2>
              <div className="card-subtitle">{stats.teamActive} active · {stats.teamOnLeave} on leave</div>
            </div>
            <Link to="/team" className="card-link">
              All people <ArrowRight size={12} />
            </Link>
          </div>
          <div className="crew-list">
            {crew.slice(0, 4).map((worker) => (
              <Link className="crew-row" key={worker.id} to={`/team?open=${worker.id}`}>
                <Avatar name={worker.name} color={worker.avatarColor} size={31} />
                <span className="crew-main">
                  <span className="crew-name">{worker.name}</span>
                  <span className="crew-role">{worker.role}</span>
                </span>
                <span className="crew-orders">
                  <strong>{worker.activeOrders}</strong>
                  <span>orders</span>
                </span>
              </Link>
            ))}
            <Link
              to="/team"
              className="crew-row"
              style={{ paddingTop: 12, paddingBottom: 3, borderBottom: 0, color: "var(--color-forest-mid)", fontSize: 9.5, fontWeight: 750 }}
            >
              <span style={{ display: "grid", width: 31, height: 31, placeItems: "center", border: "1px solid var(--color-line)", borderRadius: "50%" }}>
                <Plus size={13} />
              </span>
              <span className="crew-main">Manage the team</span>
              <ChevronRight size={13} />
            </Link>
          </div>
        </section>
      </div>

      <div
        className="animate-up"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginTop: 22,
          padding: "16px 18px",
          border: "1px dashed var(--color-line-strong)",
          borderRadius: 13,
          color: "var(--color-muted)",
          fontSize: 9.5,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
          <CalendarDays size={13} />
          Reporting period: {formatDateRange(`${data.month}-01`, null).replace("From ", "")} · {stats.materialUsageCount} material movements · payroll of UZS {formatCompact(stats.monthlyPayroll)}
        </span>
        <Link to="/orders" className="card-link">
          <FolderKanban size={12} /> Review the production board <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}
