export interface TrafficDay {
  date: string;
  page_views: number;
}

export interface PopularPage {
  path: string;
  views: number;
}

export interface EventCount {
  event_name: string;
  count: number;
  latest_occurrence: string;
}

export interface VisitorDay {
  date: string;
  unique_visitors: number;
}

export interface EventTrend {
  event_name: string;
  daily_counts: { date: string; count: number }[];
}

export interface RecentEvent {
  event_id: string;
  event_name: string;
  event_type: string;
  source: "browser" | "server";
  path: string | null;
  occurred_at: string;
}

export interface AnalyticsReport {
  from: string;
  to: string;
  timezone: "UTC";
  total_page_views: number;
  unique_visitors: number;
  total_events: number;
  orders_created: number;
  traffic: TrafficDay[];
  visitor_trends: VisitorDay[];
  popular_pages: PopularPage[];
  event_counts: EventCount[];
  event_trends: EventTrend[];
  recent_events: RecentEvent[];
}
