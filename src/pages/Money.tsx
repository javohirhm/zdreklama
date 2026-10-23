import { useDeferredValue, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { keepPreviousData } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Filter,
  Package,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { api } from "../api";
import type { Transaction } from "../types";
import { PageHeader } from "../components/Logo";
import { TransactionSheet } from "../components/TransactionSheet";
import { useQuickTransaction } from "../components/QuickTransaction";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { useToast } from "../components/ToastProvider";
import {
  currentMonthKey,
  downloadCsv,
  formatCompact,
  formatDate,
  formatMoney,
  formatNumber,
  monthKey,
  monthShort,
  todayIso,
} from "../lib/format";
import { invalidateData } from "../lib/invalidate";

type TypeFilter = "all" | "income" | "expense";

export function MoneyPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { openTransaction } = useQuickTransaction();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const [type, setType] = useState<TypeFilter>("all");
  const [month, setMonth] = useState(initialSearch ? "all" : currentMonthKey());
  const [orderId, setOrderId] = useState("all");
  const [search, setSearch] = useState(initialSearch);
  const deferredSearch = useDeferredValue(search);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  useEffect(() => {
    const nextSearch = searchParams.get("search") || "";
    if (nextSearch && nextSearch !== search) {
      setSearch(nextSearch);
      setMonth("all");
    }
    // Only react to a new URL-driven search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["transactions", type, month, orderId, deferredSearch],
    queryFn: () =>
      api.transactions({
        type: type === "all" ? undefined : type,
        month: month === "all" ? undefined : month,
        orderId: orderId === "all" ? undefined : orderId,
        search: deferredSearch.trim() || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const { data: bootstrap } = useQuery({
    queryKey: ["bootstrap"],
    queryFn: api.bootstrap,
    staleTime: 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteTransaction(id),
    onSuccess: () => {
      invalidateData(queryClient);
      toast.success("Entry deleted", "The ledger and reports have been updated.");
      setDeleting(null);
    },
    onError: (error: Error) => toast.error("Could not delete entry", error.message),
  });

  const transactions = data?.transactions || [];
  const summary = data?.summary || { income: 0, expense: 0, net: 0, count: 0 };
  const months = data?.months || [];
  const hasFilters = type !== "all" || month !== "all" || orderId !== "all" || search.trim().length > 0;

  const resetFilters = () => {
    setType("all");
    setMonth("all");
    setOrderId("all");
    setSearch("");
  };

  const exportLedger = () => {
    if (!transactions.length) {
      toast.error("Nothing to export", "Adjust the filters so there are entries to download.");
      return;
    }
    downloadCsv(`zdreklama-ledger-${todayIso()}.csv`, transactions.map((transaction) => ({
      Date: transaction.date,
      Type: transaction.type,
      Description: transaction.description,
      Category: transaction.category,
      Product: transaction.productName || "",
      "Product type": transaction.productCategory || "",
      Tool: transaction.toolName || "",
      "Tool type": transaction.toolKind || "",
      Client: transaction.clientName || "",
      Order: transaction.orderName || "",
      "Team member": transaction.workerName || "",
      Method: transaction.method,
      Reference: transaction.reference || "",
      Amount: transaction.type === "income" ? transaction.amount : -transaction.amount,
    })));
    toast.success("Ledger exported", `${transactions.length} entries saved as CSV.`);
  };

  return (
    <div>
      <PageHeader
        eyebrow={
          <>
            Money <span style={{ color: "var(--color-line-strong)" }}>/</span> Ledger
          </>
        }
        title={
          <>
            Every sum, <em>accounted for.</em>
          </>
        }
        subtitle="Record client payments and operating costs. Filter the ledger by month, order or type — the numbers stay connected to the rest of the platform."
        actions={
          <>
            <button type="button" className="btn btn-secondary" onClick={exportLedger}>
              <Download size={14} /> Export CSV
            </button>
            <button type="button" className="btn btn-amber" onClick={() => openTransaction()}>
              <Plus size={15} /> Record entry
            </button>
          </>
        }
      />

      <section className="summary-strip animate-up" style={{ animationDelay: "50ms" }}>
        <div className="summary-block">
          <span className="micro-label">Money in</span>
          <strong>
            {formatCompact(summary.income)} <span>UZS</span>
          </strong>
          <div className="summary-note">Selected period</div>
        </div>
        <div className="summary-block">
          <span className="micro-label">Money out</span>
          <strong>
            {formatCompact(summary.expense)} <span>UZS</span>
          </strong>
          <div className="summary-note">Selected period</div>
        </div>
        <div className="summary-block">
          <span className="micro-label">Net movement</span>
          <strong style={{ color: summary.net >= 0 ? "var(--color-positive)" : "var(--color-negative)" }}>
            {summary.net >= 0 ? "+" : "−"}
            {formatCompact(Math.abs(summary.net))} <span>UZS</span>
          </strong>
          <div className="summary-note">In minus out</div>
        </div>
        <div className="summary-block">
          <span className="micro-label">Entries</span>
          <strong>
            {formatNumber(summary.count)} <span>ROWS</span>
          </strong>
          <div className="summary-note">
            {month === "all" ? "All recorded history" : `${monthKey(month)} ledger`}
          </div>
        </div>
      </section>

      <section className="card animate-up" style={{ animationDelay: "90ms" }}>
        <div className="toolbar">
          <div className="segmented" role="group" aria-label="Filter by transaction type">
            {(
              [
                { value: "all", label: "All entries" },
                { value: "income", label: "Money in" },
                { value: "expense", label: "Money out" },
              ] as Array<{ value: TypeFilter; label: string }>
            ).map((option) => (
              <button
                type="button"
                key={option.value}
                className={`${type === option.value ? "active" : ""} ${option.value === "income" ? "in" : option.value === "expense" ? "out" : ""}`}
                onClick={() => setType(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="search-box">
            <Search />
            <input
              className="input"
              placeholder="Search description, product, tool, client…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search ledger"
            />
          </div>

          <select className="select" value={month} onChange={(event) => setMonth(event.target.value)} aria-label="Filter by month">
            <option value="all">All time</option>
            {!months.includes(currentMonthKey()) && <option value={currentMonthKey()}>{monthShort(currentMonthKey())}</option>}
            {months.map((item) => (
              <option value={item} key={item}>
                {monthShort(item)}
              </option>
            ))}
          </select>

          <select className="select" value={orderId} onChange={(event) => setOrderId(event.target.value)} aria-label="Filter by order">
            <option value="all">All orders</option>
            {(bootstrap?.orders || []).map((order) => (
              <option value={String(order.id)} key={order.id}>
                {order.name}
              </option>
            ))}
          </select>

          {hasFilters && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={resetFilters}>
              <X size={13} /> Clear
            </button>
          )}
        </div>

        <div className="toolbar-summary">
          Showing <strong>{formatNumber(transactions.length)}</strong> entries
          {search.trim() && <> matching “{search.trim()}”</>}
          {" · "}
          <span className="in">+{formatMoney(summary.income)}</span>
          {" · "}
          <span className="out">−{formatMoney(summary.expense)}</span>
        </div>

        {isLoading ? (
          <div style={{ padding: 20 }}>
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="skeleton" style={{ height: 39, marginBottom: 8 }} />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={<Wallet size={20} />}
            title="The ledger could not be loaded"
            description="Check your connection and try refreshing the page."
          />
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={<Filter size={20} />}
            title="No entries match these filters"
            description="Try widening the period, or record a new money movement."
            action={
              <button type="button" className="btn btn-primary" onClick={() => openTransaction()}>
                <Plus size={14} /> Record entry
              </button>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table money-table">
              <thead>
                <tr>
                  <th>Entry</th>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Product / tool</th>
                  <th>Order / client</th>
                  <th>Method</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <span className={`tx-icon ${transaction.type === "income" ? "in" : "out"}`} style={{ width: 28, height: 28 }}>
                          {transaction.type === "income" ? <ArrowDownLeft /> : <ArrowUpRight />}
                        </span>
                        <div className="entry-text">
                          <div className="cell-main" title={transaction.description}>
                            {transaction.description}
                          </div>
                          <div className="cell-sub">{transaction.reference || `Entry #${transaction.id}`}</div>
                        </div>
                      </div>
                    </td>
                    <td className="mono" style={{ fontSize: 9.5, color: "var(--color-muted)" }}>
                      {formatDate(transaction.date)}
                    </td>
                    <td>
                      <span className={`badge ${transaction.type === "income" ? "badge-income" : "badge-expense"}`}>
                        {transaction.category}
                      </span>
                    </td>
                    <td>
                      {transaction.productName || transaction.toolName ? (
                        <div className="ledger-tags">
                          {transaction.productName && (
                            <span className="ledger-tag-line product" title={transaction.productName}>
                              <Package />
                              <span>{transaction.productName}</span>
                            </span>
                          )}
                          {transaction.toolName && (
                            <span className="ledger-tag-line" title={transaction.toolName}>
                              <Printer />
                              <span>{transaction.toolName}</span>
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="cell-sub">—</span>
                      )}
                    </td>
                    <td>
                      <div
                        className="cell-main"
                        style={{ fontWeight: 600 }}
                        title={transaction.orderName || transaction.clientName || "General overhead"}
                      >
                        {transaction.orderName || transaction.clientName || "General overhead"}
                      </div>
                      <div className="cell-sub">
                        {transaction.orderName && transaction.clientName
                          ? transaction.clientName
                          : transaction.workerName || "Company-wide"}
                      </div>
                    </td>
                    <td className="mono" style={{ fontSize: 9, color: "var(--color-muted)" }}>
                      {transaction.method}
                    </td>
                    <td className={transaction.type === "income" ? "amount-in" : "amount-out"}>
                      {transaction.type === "income" ? "+" : "−"}
                      {formatNumber(transaction.amount)}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="mini-icon-btn"
                          onClick={() => setEditing(transaction)}
                          aria-label={`Edit ${transaction.description}`}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          className="mini-icon-btn danger"
                          onClick={() => setDeleting(transaction)}
                          aria-label={`Delete ${transaction.description}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <TransactionSheet open={Boolean(editing)} onClose={() => setEditing(null)} transaction={editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this ledger entry?"
        description={
          deleting
            ? `${deleting.description} · ${formatMoney(deleting.amount)}. This will also update order totals and dashboard figures. This cannot be undone.`
            : ""
        }
        loading={deleteMutation.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </div>
  );
}
