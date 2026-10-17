"use client";

import { useEffect, useMemo, useState } from "react";
import type { AnalyticsReport, EventTrend } from "@/lib/types";
import { debugLoadingDuration, waitForDebugLoading } from "@/lib/debugLoading";
import Loader from "@/components/Loader";
import MenuManagement from "@/components/MenuManagement";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
type Range = "today" | "yesterday" | "7d" | "30d" | "custom";
type View = "overview" | "traffic" | "pages" | "events" | "orders" | "menu";
const navigation: { id: View; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "◫" },
  { id: "traffic", label: "Traffic", icon: "⌁" },
  { id: "pages", label: "Pages", icon: "▤" },
  { id: "events", label: "Events", icon: "◷" },
  { id: "orders", label: "Orders", icon: "▣" },
  { id: "menu", label: "Menu", icon: "▤" },
];

function utcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function rangeDates(range: Exclude<Range, "custom">, now = new Date()): { from: string; to: string } {
  const end = new Date(now);
  const start = new Date(now);
  if (range === "yesterday") {
    start.setUTCDate(start.getUTCDate() - 1);
    end.setUTCDate(end.getUTCDate() - 1);
  }
  if (range === "7d") start.setUTCDate(start.getUTCDate() - 6);
  if (range === "30d") start.setUTCDate(start.getUTCDate() - 29);
  return { from: utcDate(start), to: utcDate(end) };
}

const number = new Intl.NumberFormat("en-IN");
const dateLabel = (value: string) => new Intl.DateTimeFormat("en-IN", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
const titles: Record<View, { title: string; description: string }> = {
  overview: { title: "Analytics", description: "Understand visitor activity and application events." },
  traffic: { title: "Traffic", description: "Explore page visits and returning audience patterns." },
  pages: { title: "Pages", description: "See which parts of the restaurant experience guests visit." },
  events: { title: "Events", description: "Review activity captured across the customer journey." },
  orders: { title: "Orders", description: "Review restaurant orders and update their progress." },
  menu: { title: "Menu Management", description: "Manage your restaurant’s food items, prices and availability." },
};

export default function Dashboard() {
  const [view, setView] = useState<View>("overview");
  const [range, setRange] = useState<Range>("7d");
  const [customFrom, setCustomFrom] = useState(() => rangeDates("7d").from);
  const [customTo, setCustomTo] = useState(() => utcDate(new Date()));
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  const dates = useMemo(() => range === "custom" ? { from: customFrom, to: customTo } : rangeDates(range), [range, customFrom, customTo]);

  useEffect(() => {
    if (dates.from > dates.to) {
      setError("Choose a start date on or before the end date.");
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError(null);
    const query = new URLSearchParams(dates);
    const startedAt = Date.now();
    const debugDuration = debugLoadingDuration();
    async function loadReport() {
      try {
        const response = await fetch(`${API_URL}/api/v1/analytics/overview?${query}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Analytics API returned ${response.status}.`);
        const nextReport = await response.json() as AnalyticsReport;
        await waitForDebugLoading(startedAt, debugDuration, controller.signal);
        if (active) setReport(nextReport);
      } catch (reason: unknown) {
        if (!active || controller.signal.aborted) return;
        try {
          await waitForDebugLoading(startedAt, debugDuration, controller.signal);
        } catch {
          return;
        }
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load analytics.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadReport();
    return () => { active = false; controller.abort(); };
  }, [dates, retry]);

  const heading = titles[view];
  return <div className="dashboard-layout">
    <aside className="sidebar" aria-label="Analytics navigation">
      <a className="dashboard-brand" href="/" aria-label="Olive and Ember analytics home"><span className="brand-mark">O</span><span><strong>Olive &amp; Ember</strong><small>Analytics</small></span></a>
      <p className="sidebar-label">WORKSPACE</p>
      <nav className="side-nav" aria-label="Analytics sections">
        {navigation.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} aria-current={view === item.id ? "page" : undefined} onClick={() => setView(item.id)}><span aria-hidden="true">{item.icon}</span>{item.label}</button>)}
      </nav>
      <div className="sidebar-bottom"><p className="sidebar-label">RESTAURANT</p><a className="restaurant-link" href="http://localhost:3000"><span aria-hidden="true">↗</span> View restaurant</a><p className="sidebar-footnote">Live reporting · UTC</p></div>
    </aside>

    <main className="dashboard-main" aria-busy={loading}>
      <header className="dashboard-header">
        <div><p className="eyebrow">RESTAURANT DEMO · ANALYTICS</p><h1>{heading.title}</h1><p className="muted">{heading.description}</p></div>
        <div className="range-picker">
          <label htmlFor="range">Reporting period</label>
          <select id="range" value={range} onChange={(event) => setRange(event.target.value as Range)}>
            <option value="today">Today</option><option value="yesterday">Yesterday</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="custom">Custom range</option>
          </select>
          {range === "custom" && <div className="custom-dates"><label>From <input aria-label="From date" type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} /></label><label>To <input aria-label="To date" type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} /></label></div>}
        </div>
      </header>

      {view === "orders" ? <Orders /> : view === "menu" ? <MenuManagement /> : <>{report && !loading && !error && <p className="range-caption">Reporting {dateLabel(report.from)} – {dateLabel(report.to)} <span>· All dates in UTC</span></p>}
      {error && <div className="notice error" role="alert"><div><strong>Could not load analytics</strong><span>{error}</span></div><button onClick={() => setRetry((value) => value + 1)}>Retry</button></div>}
      {loading && <DashboardSkeleton view={view} />}
      {!loading && !error && report && <>
        {report.total_events === 0 ? <section className="empty-state"><span className="empty-mark" aria-hidden="true">◌</span><h2>No analytics data for this date range</h2><p>Browse the restaurant demo and interact with the menu to see activity appear here.</p></section> : <>
          {view === "overview" && <Overview report={report} />}
          {view === "traffic" && <Traffic report={report} />}
          {view === "pages" && <Pages report={report} />}
          {view === "events" && <Events report={report} />}
        </>}
      </>}</>}
    </main>
  </div>;
}

function Overview({ report }: { report: AnalyticsReport }) {
  const popular = report.popular_pages[0];
  return <>
    <section className="metric-grid" aria-label="Overview metrics">
      <Metric label="Total page views" value={report.total_page_views} detail="Tracked page visits" />
      <Metric label="Unique visitors" value={report.unique_visitors} detail="Distinct page-view visitors" />
      <Metric label="Popular page" value={popular?.path ?? "—"} detail={popular ? `${number.format(popular.views)} views` : "No page paths yet"} compact />
      <Metric label="Total events" value={report.total_events} detail={`${number.format(report.orders_created)} orders created`} accent />
    </section>
    <div className="report-grid overview-grid">
      <section className="panel traffic-panel"><PanelHeading eyebrow="AUDIENCE" title="Daily traffic" detail="Page views by UTC day" /><TrafficChart days={report.traffic} /></section>
      <section className="panel"><PanelHeading eyebrow="CONTENT" title="Popular pages" detail="Ranked by page views" /><PageList report={report} limit={5} /></section>
    </div>
    <div className="report-grid lower-grid">
      <section className="panel"><PanelHeading eyebrow="ENGAGEMENT" title="Event trends" detail="Daily counts for frequent events" /><TrendList report={report} /></section>
      <section className="panel"><PanelHeading eyebrow="LATEST ACTIVITY" title="Recent events" detail="Most recent event summaries" /><RecentEvents report={report} /></section>
    </div>
  </>;
}

type OrderStatus = "pending" | "confirmed" | "preparing" | "out_for_delivery" | "delivered" | "cancelled";
type DashboardOrder = { id: number; status: OrderStatus; status_label: string; amount: number; currency: string; items_count: number; created_at: string; updated_at: string; items: { item_id: string; name: string; quantity: number; line_total: number }[] };
const statusLabels: Record<OrderStatus, string> = { pending: "Pending", confirmed: "Confirmed", preparing: "Preparing", out_for_delivery: "Out for Delivery", delivered: "Delivered", cancelled: "Cancelled" };
const transitions: Record<OrderStatus, OrderStatus[]> = { pending: ["confirmed", "cancelled"], confirmed: ["preparing", "cancelled"], preparing: ["out_for_delivery", "cancelled"], out_for_delivery: ["delivered"], delivered: [], cancelled: [] };

function Orders() {
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(`${API_URL}/api/v1/orders`, { cache: "no-store" });
        if (!response.ok) throw new Error(`Orders API returned ${response.status}.`);
        const body = await response.json() as { orders: DashboardOrder[] };
        if (active) { setOrders(body.orders); setError(null); }
      } catch (reason) { if (active) setError(reason instanceof Error ? reason.message : "Unable to load orders."); }
      finally { if (active) setLoading(false); }
    }
    void load();
    const timer = window.setInterval(() => { void load(); }, 10000);
    return () => { active = false; window.clearInterval(timer); };
  }, [retry]);
  async function update(order: DashboardOrder, status: OrderStatus) {
    setBusy(order.id); setError(null);
    try {
      const response = await fetch(`${API_URL}/api/v1/orders/${order.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ status }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? "Could not update order status.");
      setOrders((current) => current.map((item) => item.id === order.id ? body.order as DashboardOrder : item));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update order status."); }
    finally { setBusy(null); }
  }
  if (loading) return <div className="dashboard-skeleton" role="status" aria-label="Loading orders"><section className="panel"><PanelHeading eyebrow="ORDERS" title="Loading orders" detail="Fetching the latest restaurant orders"/><Loader size="sm"/></section></div>;
  return <section className="panel order-report"><PanelHeading eyebrow="RESTAURANT" title="Orders" detail="Latest 100 orders · refreshes every 10 seconds" />
    {error && <div className="notice error" role="alert"><div><strong>Order request failed</strong><span>{error}</span></div><button onClick={() => setRetry((value) => value + 1)}>Retry</button></div>}
    {!orders.length && !error ? <InlineEmpty>No orders yet. Place an order in the restaurant demo to see it here.</InlineEmpty> : <div className="order-list">{orders.map((order) => <article className="admin-order" key={order.id}><div className="admin-order-heading"><div><strong>Order #{order.id}</strong><span>Created {new Date(order.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span><span>Updated {new Date(order.updated_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span></div><span className={`order-status-badge ${order.status}`}>{order.status_label}</span></div><p className="admin-order-items">{order.items.map((item) => `${item.name} × ${item.quantity}`).join(" · ")}</p><div className="admin-order-footer"><strong>{formatMoney(order.amount, order.currency)}</strong><label>Status <select aria-label={`Status for order ${order.id}`} value={order.status} disabled={busy === order.id || transitions[order.status].length === 0} onChange={(event) => void update(order, event.target.value as OrderStatus)}><option value={order.status}>{statusLabels[order.status]}</option>{transitions[order.status].map((status) => <option value={status} key={status}>{statusLabels[status]}</option>)}</select></label></div></article>)}</div>}
  </section>;
}

function formatMoney(amount: number, currency: string) { return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount); }

function Traffic({ report }: { report: AnalyticsReport }) {
  return <>
    <section className="metric-grid traffic-metrics" aria-label="Traffic metrics"><Metric label="Page views" value={report.total_page_views} detail="In selected period" /><Metric label="Unique visitors" value={report.unique_visitors} detail="Distinct anonymous IDs" /><Metric label="Total events" value={report.total_events} detail="All captured activity" /></section>
    <section className="panel"><PanelHeading eyebrow="AUDIENCE" title="Daily traffic" detail="Page views by UTC day" /><TrafficChart days={report.traffic} /></section>
    <section className="panel visitor-panel"><PanelHeading eyebrow="AUDIENCE" title="Daily unique visitors" detail="Distinct anonymous IDs with a page view each day" /><VisitorChart days={report.visitor_trends} /></section>
  </>;
}

function Pages({ report }: { report: AnalyticsReport }) {
  return <section className="panel page-report"><PanelHeading eyebrow="CONTENT" title="Popular pages" detail="Page views and share of traffic for the selected period" />
    {report.popular_pages.length ? <div className="data-table-wrap"><table><thead><tr><th scope="col">Page path</th><th scope="col">Page views</th><th scope="col">Share of traffic</th></tr></thead><tbody>{report.popular_pages.map((page) => <tr key={page.path}><td><code className="path-cell" title={page.path}>{page.path}</code></td><td>{number.format(page.views)}</td><td>{report.total_page_views ? `${((page.views / report.total_page_views) * 100).toFixed(1)}%` : "—"}</td></tr>)}</tbody></table></div> : <InlineEmpty>No page views have been recorded in this period.</InlineEmpty>}
  </section>;
}

function Events({ report }: { report: AnalyticsReport }) {
  return <>
    <section className="panel event-report"><PanelHeading eyebrow="ACTIVITY" title="Event activity" detail="Counts include browser and server events" />
      {report.event_counts.length ? <div className="data-table-wrap"><table><thead><tr><th scope="col">Event</th><th scope="col">Count</th><th scope="col">Latest occurrence</th></tr></thead><tbody>{report.event_counts.map((event) => <tr key={event.event_name}><td><code className="event-name" title={event.event_name}>{event.event_name}</code></td><td>{number.format(event.count)}</td><td>{dateTimeLabel(event.latest_occurrence)}</td></tr>)}</tbody></table></div> : <InlineEmpty>No events have been recorded in this period.</InlineEmpty>}
    </section>
    <section className="panel"><PanelHeading eyebrow="ENGAGEMENT" title="Event trends" detail="Daily counts for the most frequent event names" /><TrendList report={report} /></section>
  </>;
}

function Metric({ label, value, detail, accent = false, compact = false }: { label: string; value: number | string; detail: string; accent?: boolean; compact?: boolean }) {
  return <article className={`metric-card${accent ? " metric-accent" : ""}`}><p>{label}</p><strong className={compact ? "metric-path" : ""} title={typeof value === "string" ? value : undefined}>{typeof value === "number" ? number.format(value) : value}</strong><span>{detail}</span></article>;
}

function PanelHeading({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) {
  return <div className="panel-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p className="panel-detail">{detail}</p></div></div>;
}

function TrafficChart({ days }: { days: AnalyticsReport["traffic"] }) {
  const maxViews = Math.max(1, ...days.map((day) => day.page_views));
  if (!days.some((day) => day.page_views > 0)) return <InlineEmpty>No page views in this period.</InlineEmpty>;
  return <div className="traffic-chart" role="img" aria-label={`Daily page views chart with ${days.reduce((sum, day) => sum + day.page_views, 0)} total views`}>
    {days.map((day) => <div className="bar-column" key={day.date} title={`${dateLabel(day.date)}: ${number.format(day.page_views)} views`}><span className="bar-value">{day.page_views || ""}</span><div className="bar-track"><div className="bar-fill" style={{ height: `${Math.max(3, (day.page_views / maxViews) * 100)}%` }} /></div><span className="bar-date">{dateLabel(day.date)}</span></div>)}
  </div>;
}

function VisitorChart({ days }: { days: AnalyticsReport["visitor_trends"] }) {
  const maxVisitors = Math.max(1, ...days.map((day) => day.unique_visitors));
  if (!days.some((day) => day.unique_visitors > 0)) return <InlineEmpty>No identified page-view visitors in this period.</InlineEmpty>;
  return <div className="traffic-chart" role="img" aria-label="Daily unique visitor chart">{days.map((day) => <div className="bar-column" key={day.date} title={`${dateLabel(day.date)}: ${number.format(day.unique_visitors)} unique visitors`}><span className="bar-value">{day.unique_visitors || ""}</span><div className="bar-track"><div className="bar-fill visitor-fill" style={{ height: `${Math.max(3, (day.unique_visitors / maxVisitors) * 100)}%` }} /></div><span className="bar-date">{dateLabel(day.date)}</span></div>)}</div>;
}

function PageList({ report, limit }: { report: AnalyticsReport; limit: number }) {
  if (!report.popular_pages.length) return <InlineEmpty>No page paths recorded yet.</InlineEmpty>;
  return <ol className="rank-list">{report.popular_pages.slice(0, limit).map((page) => <li key={page.path}><span title={page.path}>{page.path}</span><strong>{number.format(page.views)}</strong></li>)}</ol>;
}

function TrendList({ report }: { report: AnalyticsReport }) {
  if (!report.event_trends.length) return <InlineEmpty>No event trends in this period.</InlineEmpty>;
  return <div className="event-trend-list">{report.event_trends.map((event) => <TrendRow key={event.event_name} event={event} report={report} />)}</div>;
}

function TrendRow({ event, report }: { event: EventTrend; report: AnalyticsReport }) {
  const total = event.daily_counts.reduce((sum, day) => sum + day.count, 0);
  const maxCount = Math.max(1, ...event.daily_counts.map((day) => day.count));
  return <div className="event-trend-row"><div className="event-trend-heading"><code title={event.event_name}>{event.event_name}</code><strong>{number.format(total)}</strong></div><div className="event-trend-chart" role="img" aria-label={`${event.event_name}: ${number.format(total)} events from ${dateLabel(report.from)} to ${dateLabel(report.to)}`}>{event.daily_counts.map((day) => <span key={day.date} title={`${dateLabel(day.date)}: ${number.format(day.count)} ${event.event_name}`} style={{ height: day.count ? `${Math.max(5, (day.count / maxCount) * 100)}%` : "2px" }} />)}</div><div className="event-trend-dates"><span>{dateLabel(report.from)}</span><span>{dateLabel(report.to)}</span></div></div>;
}

function RecentEvents({ report }: { report: AnalyticsReport }) {
  if (!report.recent_events.length) return <InlineEmpty>No recent events.</InlineEmpty>;
  return <div className="data-table-wrap recent-table"><table><thead><tr><th scope="col">Event</th><th scope="col">Source</th><th scope="col">Page</th><th scope="col">Time (UTC)</th></tr></thead><tbody>{report.recent_events.map((event) => <tr key={event.event_id}><td><code>{event.event_name}</code></td><td><span className={`source-pill ${event.source}`}>{event.source}</span></td><td title={event.path ?? undefined}>{event.path ?? "—"}</td><td>{dateTimeLabel(event.occurred_at, true)}</td></tr>)}</tbody></table></div>;
}

function InlineEmpty({ children }: { children: string }) { return <p className="inline-empty">{children}</p>; }

function dateTimeLabel(value: string, timeOnly = false): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-IN", timeOnly ? { hour: "2-digit", minute: "2-digit", timeZone: "UTC" } : { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(date);
}

function DashboardSkeleton({ view }: { view: View }) {
  const metricCount = view === "traffic" ? 3 : 4;
  return <div className="dashboard-skeleton" role="status" aria-label="Loading analytics report" aria-live="polite" aria-busy="true">
    <span className="sr-only">Loading analytics…</span>
    {(view === "overview" || view === "traffic") && <section className={`metric-grid${view === "traffic" ? " traffic-metrics" : ""}`} aria-hidden="true">{Array.from({ length: metricCount }, (_, index) => <div className="metric-card skeleton-card" key={index}><span className="skeleton-line skeleton-label" /><span className="skeleton-line skeleton-number" /><span className="skeleton-line skeleton-detail" /></div>)}</section>}
    {view === "overview" && <>
      <div className="report-grid overview-grid"><SkeletonPanel kind="chart" /><SkeletonPanel kind="list" /></div>
      <div className="report-grid lower-grid"><SkeletonPanel kind="trends" /><SkeletonPanel kind="table" /></div>
    </>}
    {view === "traffic" && <><SkeletonPanel kind="chart" /><SkeletonPanel kind="chart" /></>}
    {view === "pages" && <SkeletonPanel kind="table" rows={6} />}
    {view === "events" && <><SkeletonPanel kind="table" rows={6} /><SkeletonPanel kind="trends" /></>}
  </div>;
}

function SkeletonPanel({ kind, rows = 4 }: { kind: "chart" | "list" | "trends" | "table"; rows?: number }) {
  return <section className="panel skeleton-panel" aria-hidden="true">
    <div className="panel-heading"><div><span className="skeleton-line skeleton-eyebrow" /><span className="skeleton-line skeleton-title" /><span className="skeleton-line skeleton-detail" /></div></div>
    {kind === "chart" && <div className="skeleton-chart">{Array.from({ length: 12 }, (_, index) => <span className="skeleton-chart-bar" key={index} style={{ height: `${28 + ((index * 29) % 65)}%` }} />)}</div>}
    {kind === "list" && <div className="skeleton-list">{Array.from({ length: rows }, (_, index) => <div className="skeleton-list-row" key={index}><span className="skeleton-line" /><span className="skeleton-line" /></div>)}</div>}
    {kind === "trends" && <div className="skeleton-trends">{Array.from({ length: 3 }, (_, index) => <div className="skeleton-trend-row" key={index}><span className="skeleton-line" /><span className="skeleton-line" /><div>{Array.from({ length: 14 }, (_, bar) => <i key={bar} style={{ height: `${20 + ((bar * 17 + index * 13) % 70)}%` }} />)}</div></div>)}</div>}
    {kind === "table" && <div className="skeleton-table"><div className="skeleton-table-head"><span className="skeleton-line" /><span className="skeleton-line" /><span className="skeleton-line" /></div>{Array.from({ length: rows }, (_, index) => <div className="skeleton-table-row" key={index}><span className="skeleton-line" /><span className="skeleton-line" /><span className="skeleton-line" /></div>)}</div>}
    {kind === "chart" && <Loader size="sm" />}
  </section>;
}
