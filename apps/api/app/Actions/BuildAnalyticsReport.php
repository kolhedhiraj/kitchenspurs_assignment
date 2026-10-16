<?php

namespace App\Actions;

use App\Models\Event;
use Carbon\CarbonImmutable;
use Carbon\CarbonPeriod;
use Illuminate\Support\Facades\DB;

class BuildAnalyticsReport
{
    /** @return array<string, mixed> */
    public function handle(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $base = Event::query()
            ->where('application_id', config('analytics.application_id'))
            ->where('occurred_at', '>=', $from->startOfDay())
            ->where('occurred_at', '<', $to->addDay()->startOfDay());

        $pageViews = (clone $base)->where('event_type', 'page_view');
        $totalPageViews = (clone $pageViews)->count();
        $uniqueVisitors = (clone $pageViews)->whereNotNull('anonymous_id')->distinct()->count('anonymous_id');

        $dateExpression = DB::connection()->getDriverName() === 'pgsql'
            ? 'DATE(occurred_at AT TIME ZONE \'UTC\')'
            : 'DATE(occurred_at)';
        $dailyCounts = (clone $pageViews)
            ->selectRaw("{$dateExpression} as event_date, COUNT(*) as total")
            ->groupByRaw($dateExpression)
            ->pluck('total', 'event_date');

        $dailyVisitors = (clone $pageViews)
            ->whereNotNull('anonymous_id')
            ->selectRaw("{$dateExpression} as event_date, COUNT(DISTINCT anonymous_id) as total")
            ->groupByRaw($dateExpression)
            ->pluck('total', 'event_date');

        $traffic = [];
        foreach (CarbonPeriod::create($from->toDateString(), $to->toDateString()) as $day) {
            $date = $day->toDateString();
            $traffic[] = ['date' => $date, 'page_views' => (int) ($dailyCounts[$date] ?? 0)];
        }
        $visitorTraffic = array_map(
            fn (array $day): array => [
                'date' => $day['date'],
                'unique_visitors' => (int) ($dailyVisitors[$day['date']] ?? 0),
            ],
            $traffic,
        );

        $popularPages = (clone $pageViews)
            ->whereNotNull('path')
            ->select('path')
            ->selectRaw('COUNT(*) as views')
            ->groupBy('path')
            ->orderByDesc('views')
            ->limit(10)
            ->get()
            ->map(fn (Event $event): array => ['path' => $event->path, 'views' => (int) $event->views])
            ->values();

        $eventCounts = (clone $base)
            ->select('event_name')
            ->selectRaw('COUNT(*) as total, MAX(occurred_at) as latest_occurrence')
            ->groupBy('event_name')
            ->orderByDesc('total')
            ->limit(12)
            ->get()
            ->map(fn (Event $event): array => [
                'event_name' => $event->event_name,
                'count' => (int) $event->total,
                'latest_occurrence' => CarbonImmutable::parse($event->latest_occurrence)->utc()->toIso8601String(),
            ])
            ->values();

        $trendNames = (clone $base)
            ->select('event_name')
            ->selectRaw('COUNT(*) as total')
            ->groupBy('event_name')
            ->orderByDesc('total')
            ->limit(6)
            ->pluck('event_name')
            ->all();
        $trendRows = $trendNames === [] ? collect() : (clone $base)
            ->whereIn('event_name', $trendNames)
            ->selectRaw("{$dateExpression} as event_date")
            ->addSelect('event_name')
            ->selectRaw('COUNT(*) as total')
            ->groupByRaw("{$dateExpression}, event_name")
            ->get();
        $trendTotals = [];
        foreach ($trendRows as $row) {
            $trendTotals[$row->event_name][$row->event_date] = (int) $row->total;
        }
        $dates = array_column($traffic, 'date');
        $eventTrends = array_map(
            fn (string $eventName): array => [
                'event_name' => $eventName,
                'daily_counts' => array_map(
                    fn (string $date): array => ['date' => $date, 'count' => $trendTotals[$eventName][$date] ?? 0],
                    $dates,
                ),
            ],
            $trendNames,
        );

        $recentEvents = (clone $base)
            ->select(['event_id', 'event_name', 'event_type', 'source', 'path', 'occurred_at'])
            ->orderByDesc('occurred_at')
            ->limit(20)
            ->get();

        return [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'timezone' => 'UTC',
            'total_page_views' => $totalPageViews,
            'unique_visitors' => $uniqueVisitors,
            'total_events' => (clone $base)->count(),
            'orders_created' => (clone $base)->where('event_name', 'order_created')->where('source', 'server')->count(),
            'traffic' => $traffic,
            'visitor_trends' => $visitorTraffic,
            'popular_pages' => $popularPages,
            'event_counts' => $eventCounts,
            'event_trends' => $eventTrends,
            'recent_events' => $recentEvents,
        ];
    }
}
