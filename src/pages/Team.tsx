import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Mail, Phone, Plus, Search, Users } from "lucide-react";
import { api } from "../api";
import type { Worker } from "../types";
import { PageHeader } from "../components/Logo";
import { Avatar } from "../components/Avatar";
import { WorkerSheet } from "../components/WorkerSheet";
import { WorkerDrawer } from "../components/WorkerDrawer";
import { EmptyState } from "../components/EmptyState";
import { formatCompact, formatNumber, statusLabel } from "../lib/format";
import { plural, t } from "../i18n";

const statusColors: Record<string, string> = {
  active: "#4b9569",
  on_leave: "#e8a326",
  inactive: "#a8a79e",
};

export function TeamPage() {
  const [params, setParams] = useSearchParams();
  const detailId = Number(params.get("open")) || null;
  const [department, setDepartment] = useState("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Worker | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["workers"], queryFn: api.workers });
  const workers = data?.workers || [];
  const departments = data?.departments || [];

  const stats = useMemo(() => {
    const active = workers.filter((worker) => worker.status === "active").length;
    const onLeave = workers.filter((worker) => worker.status === "on_leave").length;
    const payroll = workers.filter((worker) => worker.status !== "inactive").reduce((sum, worker) => sum + worker.salary, 0);
    const assignments = workers.reduce((sum, worker) => sum + worker.activeOrders, 0);
    return { active, onLeave, payroll, assignments };
  }, [workers]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return workers.filter((worker) => {
      const matchesDepartment = department === "all" || worker.department === department;
      const matchesSearch =
        !query ||
        worker.name.toLowerCase().includes(query) ||
        worker.role.toLowerCase().includes(query) ||
        worker.department.toLowerCase().includes(query) ||
        (worker.email || "").toLowerCase().includes(query);
      return matchesDepartment && matchesSearch;
    });
  }, [workers, department, search]);

  const openWorker = (id: number) => {
    const next = new URLSearchParams(params);
    next.set("open", String(id));
    setParams(next);
  };

  const closeWorker = () => {
    const next = new URLSearchParams(params);
    next.delete("open");
    setParams(next, { replace: true });
  };

  const openEdit = (worker: Worker) => {
    closeWorker();
    setEditing(worker);
    setFormOpen(true);
  };

  const createNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div>
      <PageHeader
        eyebrow={
          <>
            {t("People")} <span style={{ color: "var(--color-line-strong)" }}>/</span> {t("Crew")}
          </>
        }
        title={
          <>
            {t("The crew behind")} <em>{t("the build.")}</em>
          </>
        }
        subtitle={t("Profiles for the people who design, print, fabricate, install and manage. Every order assignment, material movement and payroll entry rolls up to the person behind it.")}
        actions={
          <button type="button" className="btn btn-amber" onClick={createNew}>
            <Plus size={15} /> {t("Add teammate")}
          </button>
        }
      />

      <section className="summary-strip animate-up" style={{ animationDelay: "50ms" }}>
        <div className="summary-block">
          <span className="micro-label">{t("Team size")}</span>
          <strong>
            {workers.length} <span>{t("PEOPLE")}</span>
          </strong>
          <div className="summary-note">
            {plural(departments.length, {
              en: ["{n} department", "{n} departments"],
              ru: ["{n} отдел", "{n} отдела", "{n} отделов"],
              uz: "{n} ta bo'lim",
            })}
          </div>
        </div>
        <div className="summary-block">
          <span className="micro-label">{t("Active crew")}</span>
          <strong>
            {stats.active} <span>{t("ON DUTY")}</span>
          </strong>
          <div className="summary-note">{t("{n} currently on leave", { n: stats.onLeave })}</div>
        </div>
        <div className="summary-block">
          <span className="micro-label">{t("Monthly payroll")}</span>
          <strong>
            {formatCompact(stats.payroll)} <span>{t("UZS")}</span>
          </strong>
          <div className="summary-note">{t("Gross monthly salaries")}</div>
        </div>
        <div className="summary-block">
          <span className="micro-label">{t("Order assignments")}</span>
          <strong>
            {formatNumber(stats.assignments)} <span>{t("ACTIVE")}</span>
          </strong>
          <div className="summary-note">{t("Across active production orders")}</div>
        </div>
      </section>

      <div className="page-toolbar animate-up" style={{ animationDelay: "80ms" }}>
        <div className="tabs" role="tablist" aria-label={t("Filter by department")}>
          <button
            type="button"
            role="tab"
            aria-selected={department === "all"}
            className={`tab ${department === "all" ? "active" : ""}`}
            onClick={() => setDepartment("all")}
          >
            {t("Everyone")} <span className="tab-count">{workers.length}</span>
          </button>
          {departments.map((item) => {
            const count = workers.filter((worker) => worker.department === item).length;
            return (
              <button
                type="button"
                role="tab"
                aria-selected={department === item}
                className={`tab ${department === item ? "active" : ""}`}
                key={item}
                onClick={() => setDepartment(item)}
              >
                {t(item)} <span className="tab-count">{count}</span>
              </button>
            );
          })}
        </div>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search
            size={14}
            style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }}
          />
          <input
            className="input"
            style={{ height: 38, paddingLeft: 33, fontSize: 11 }}
            placeholder={t("Search name, role or department…")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label={t("Search team")}
          />
        </div>
        <span className="mono" style={{ fontSize: 8.5, color: "var(--color-muted)", marginLeft: "auto" }}>
          {plural(filtered.length, {
            en: ["{n} person", "{n} people"],
            ru: ["{n} человек", "{n} человека", "{n} человек"],
            uz: "{n} kishi",
          })}
        </span>
      </div>

      {isLoading ? (
        <div className="team-grid">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div className="card" key={item} style={{ height: 230, padding: 20 }}>
              <div className="skeleton" style={{ width: 49, height: 49, borderRadius: "50%" }} />
              <div className="skeleton" style={{ width: "55%", height: 15, marginTop: 16 }} />
              <div className="skeleton" style={{ width: "75%", height: 9, marginTop: 8 }} />
              <div className="skeleton" style={{ height: 50, marginTop: 20 }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Users size={21} />}
            title={t("No teammates in this view")}
            description={t("Try another department or search term, or add someone new to the crew.")}
            action={
              <button type="button" className="btn btn-primary" onClick={createNew}>
                <Plus size={14} /> {t("Add teammate")}
              </button>
            }
          />
        </div>
      ) : (
        <div className="team-grid animate-up" style={{ animationDelay: "110ms" }}>
          {filtered.map((worker) => (
            <article
              className="worker-card"
              key={worker.id}
              onClick={() => openWorker(worker.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") openWorker(worker.id);
              }}
            >
              <div className="worker-card-top">
                <div className="worker-avatar-wrap">
                  <Avatar name={worker.name} color={worker.avatarColor} size={49} />
                  <span className="worker-status-dot" style={{ background: statusColors[worker.status] }} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="worker-card-name">{worker.name}</div>
                  <div className="worker-card-role">{t(worker.role)}</div>
                  <span className="worker-dept">
                    {t(worker.department)} · {statusLabel(worker.status)}
                  </span>
                </div>
              </div>

              <div className="worker-contact">
                <div>
                  <Phone /> {worker.phone || t("No phone")}
                </div>
                <div>
                  <Mail /> {worker.email || t("No email")}
                </div>
              </div>

              <div className="worker-stats">
                <div className="worker-stat">
                  <span>{t("Monthly salary")}</span>
                  <strong>{formatCompact(worker.salary)} {t("UZS")}</strong>
                </div>
                <div className="worker-stat" style={{ textAlign: "center" }}>
                  <span>{t("Orders")}</span>
                  <strong>{t("{n} active", { n: worker.activeOrders })}</strong>
                </div>
                <div className="worker-stat" style={{ textAlign: "right" }}>
                  <span>{t("Paid to date")}</span>
                  <strong>{formatCompact(worker.paidTotal)}</strong>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <WorkerDrawer workerId={detailId} onClose={closeWorker} onEdit={openEdit} />
      <WorkerSheet
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        worker={editing}
      />
    </div>
  );
}
