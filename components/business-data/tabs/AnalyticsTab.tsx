"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { CartesianGrid, Line, LineChart, XAxis, PieChart, Pie, AreaChart, Area } from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarIcon, RefreshCw } from "lucide-react";
import { format, differenceInMonths, parseISO } from "date-fns";
import type { BusinessStats } from "../types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = {
  businessStats: BusinessStats | null;
  loading: boolean;
  onApplyDateRange: (range: { startDate: string; endDate: string }) => void;
  currentRange: { startDate: string; endDate: string };
  selectedLocation?: string;
};

const chartConfig = {
  impressionsMobileMaps: { label: "Mobile Maps", color: "var(--chart-1)" },
  impressionsMobileSearch: { label: "Mobile Search", color: "var(--chart-2)" },
  impressionsDesktopMaps: { label: "Desktop Maps", color: "var(--chart-3)" },
  impressionsDesktopSearch: { label: "Desktop Search", color: "var(--chart-4)" },
  callClicks: { label: "Calls", color: "var(--chart-5)" },
  websiteClicks: { label: "Website Clicks", color: "var(--chart-2)" },
  directions: { label: "Direction Requests", color: "var(--chart-3)" },
  conversations: { label: "Conversations", color: "var(--chart-1)" },
  bookings: { label: "Bookings", color: "var(--chart-4)" },
} as const;

function buildDailyMap(stats: BusinessStats | null) {
  if (!stats?.metrics?.multiDailyMetricTimeSeries?.[0]?.dailyMetricTimeSeries) return [] as any[];
  const series = stats.metrics.multiDailyMetricTimeSeries[0].dailyMetricTimeSeries;
  const byDate: Record<string, any> = {};

  const mapKey = (metric: string) => {
    switch (metric) {
      case "BUSINESS_IMPRESSIONS_MOBILE_MAPS":
        return "impressionsMobileMaps";
      case "BUSINESS_IMPRESSIONS_MOBILE_SEARCH":
        return "impressionsMobileSearch";
      case "BUSINESS_IMPRESSIONS_DESKTOP_MAPS":
        return "impressionsDesktopMaps";
      case "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH":
        return "impressionsDesktopSearch";
      case "CALL_CLICKS":
        return "callClicks";
      case "WEBSITE_CLICKS":
        return "websiteClicks";
      case "BUSINESS_DIRECTION_REQUESTS":
        return "directions";
      case "BUSINESS_CONVERSATIONS":
        return "conversations";
      case "BUSINESS_BOOKINGS":
        return "bookings";
      default:
        return metric;
    }
  };

  series.forEach((s) => {
    const key = mapKey(s.dailyMetric);
    s.timeSeries?.datedValues?.forEach((dv) => {
      const d = dv.date;
      if (!d) return;
      const ds = `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
      if (!byDate[ds]) byDate[ds] = { date: ds };
      byDate[ds][key] = dv.value ? Number(dv.value) : 0;
    });
  });

  return Object.keys(byDate)
    .sort((a, b) => (a < b ? -1 : 1))
    .map((k) => byDate[k]);
}

function extractSeries(dailyMap: any[], key: keyof typeof chartConfig) {
  return dailyMap.map((d) => ({ date: d.date, value: Number(d[key] || 0) }));
}

function sumSeries(series: { value: number }[]) {
  return series.reduce((s, p) => s + (Number.isFinite(p.value) ? p.value : 0), 0);
}

export default function AnalyticsTab({ businessStats, loading, onApplyDateRange, currentRange, selectedLocation }: Props) {
  const [open, setOpen] = React.useState(false);
  const [range, setRange] = React.useState<{ from: Date | undefined; to: Date | undefined }>({
    from: parseISO(currentRange.startDate),
    to: parseISO(currentRange.endDate),
  });
  const [subTab, setSubTab] = React.useState("overview");
  const [currentPage, setCurrentPage] = React.useState(1);
  const keywordsPerPage = 5;

  // Reset pagination and sub-tab when business changes
  React.useEffect(() => {
    console.log('=== AnalyticsTab useEffect DEBUG ===');
    console.log('selectedLocation changed to:', selectedLocation);
    console.log('businessStats changed to:', businessStats);
    console.log('Resetting pagination and sub-tab');
    setCurrentPage(1);
    setSubTab("overview");
  }, [selectedLocation]); // Reset when selectedLocation changes (business switch)

  // Monitor businessStats changes for debugging
  React.useEffect(() => {
    console.log('=== businessStats changed DEBUG ===');
    console.log('New businessStats:', businessStats);
    if (businessStats?.metrics?.multiDailyMetricTimeSeries) {
      console.log('Has metrics data:', businessStats.metrics.multiDailyMetricTimeSeries.length > 0);
    }
    if (businessStats?.keywords) {
      console.log('Has keywords data:', businessStats.keywords.length);
    }
  }, [businessStats]);

  const handleApply = () => {
    if (!range.from || !range.to) return;
    const months = Math.abs(differenceInMonths(range.to, range.from));
    if (months > 6) {
      // Enforce max 6 months
      const sixMonthsAgo = new Date(range.to);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      onApplyDateRange({
        startDate: format(sixMonthsAgo, "yyyy-MM-dd"),
        endDate: format(range.to, "yyyy-MM-dd"),
      });
    } else {
      onApplyDateRange({
        startDate: format(range.from, "yyyy-MM-dd"),
        endDate: format(range.to, "yyyy-MM-dd"),
      });
    }
    setCurrentPage(1); // Reset to first page when date range changes
    setOpen(false);
  };

  const dailyMap = React.useMemo(() => buildDailyMap(businessStats), [businessStats]);
  const sMobileMaps = React.useMemo(() => extractSeries(dailyMap, "impressionsMobileMaps"), [dailyMap]);
  const sMobileSearch = React.useMemo(() => extractSeries(dailyMap, "impressionsMobileSearch"), [dailyMap]);
  const sDesktopMaps = React.useMemo(() => extractSeries(dailyMap, "impressionsDesktopMaps"), [dailyMap]);
  const sDesktopSearch = React.useMemo(() => extractSeries(dailyMap, "impressionsDesktopSearch"), [dailyMap]);
  const sCalls = React.useMemo(() => extractSeries(dailyMap, "callClicks"), [dailyMap]);
  const sWebsite = React.useMemo(() => extractSeries(dailyMap, "websiteClicks"), [dailyMap]);
  const sDirections = React.useMemo(() => extractSeries(dailyMap, "directions"), [dailyMap]);
  const sConversations = React.useMemo(() => extractSeries(dailyMap, "conversations"), [dailyMap]);
  const sBookings = React.useMemo(() => extractSeries(dailyMap, "bookings"), [dailyMap]);

  const totalImpressions = sumSeries(sMobileMaps) + sumSeries(sMobileSearch) + sumSeries(sDesktopMaps) + sumSeries(sDesktopSearch);
  const totalCalls = sumSeries(sCalls);
  const totalWebsite = sumSeries(sWebsite);
  const totalDirections = sumSeries(sDirections);
  const totalConversations = sumSeries(sConversations);
  const totalBookings = sumSeries(sBookings);
  const totalInteractions = totalCalls + totalWebsite + totalDirections + totalBookings + totalConversations;

  const paginatedKeywords = React.useMemo(() => {
    if (!businessStats?.keywords) return [];
    const startIndex = (currentPage - 1) * keywordsPerPage;
    return businessStats.keywords.slice(startIndex, startIndex + keywordsPerPage);
  }, [businessStats?.keywords, currentPage]);

  const totalPages = React.useMemo(() => {
    if (!businessStats?.keywords) return 0;
    return Math.ceil(businessStats.keywords.length / keywordsPerPage);
  }, [businessStats?.keywords]);

  const sInteractions = React.useMemo(() => {
    return dailyMap.map((d) => ({
      date: d.date,
      value: Number(d.callClicks || 0) + Number(d.websiteClicks || 0) + Number(d.directions || 0) + Number(d.bookings || 0) + Number(d.conversations || 0),
    }));
  }, [dailyMap]);

  // Monthly aggregation for Business Profile interactions
  const sInteractionsMonthly = React.useMemo(() => {
    const monthMap: Record<string, number> = {};
    sInteractions.forEach((item) => {
      const d = parseISO(item.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; // e.g., 2025-03
      monthMap[key] = (monthMap[key] || 0) + (Number.isFinite(item.value) ? item.value : 0);
    });
    return Object.keys(monthMap)
      .sort()
      .map((key) => {
        const [y, m] = key.split("-");
        const ds = new Date(Number(y), Number(m) - 1, 1);
        return {
          month: format(ds, "MMM yyyy"),
          value: monthMap[key],
        };
      });
  }, [sInteractions]);

  // Helper: aggregate any daily series to monthly
  const toMonthly = React.useCallback((series: { date: string; value: number }[]) => {
    const map: Record<string, number> = {};
    series.forEach((item) => {
      const d = parseISO(item.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = (map[key] || 0) + (Number.isFinite(item.value) ? item.value : 0);
    });
    return Object.keys(map)
      .sort()
      .map((key) => {
        const [y, m] = key.split("-");
        const ds = new Date(Number(y), Number(m) - 1, 1);
        return { month: format(ds, "MMM yyyy"), value: map[key] };
      });
  }, []);

  const sCallsMonthly = React.useMemo(() => toMonthly(sCalls), [sCalls, toMonthly]);
  const sBookingsMonthly = React.useMemo(() => toMonthly(sBookings), [sBookings, toMonthly]);
  const sDirectionsMonthly = React.useMemo(() => toMonthly(sDirections), [sDirections, toMonthly]);
  const sWebsiteMonthly = React.useMemo(() => toMonthly(sWebsite), [sWebsite, toMonthly]);

  // Static Tailwind class mapping for badge backgrounds
  const badgeBgClassByKey: Record<string, string> = {
    mobileMaps: 'bg-[var(--chart-1)]',
    mobileSearch: 'bg-[var(--chart-2)]',
    desktopSearch: 'bg-[var(--chart-4)]',
    desktopMaps: 'bg-[var(--chart-3)]',
  };

  if (loading || !businessStats) {
    return (
      <div className="space-y-6 min-h-screen flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Analytics</h3>
            <p className="text-muted-foreground">Google Business Profile performance</p>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-48" />
          </div>
        </div>

        {/* Sub-tabs skeleton */}
        <div className="space-y-6">
          <Skeleton className="h-10 w-full" />
          
          {/* Overview tab skeleton */}
          <div className="space-y-6">
            {/* Business Profile interactions skeleton */}
            <Card>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-8 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>

            {/* Row 2 skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left: People viewed your Business Profile skeleton */}
              <Card className="flex flex-col">
                <CardHeader className="pb-0">
                  <Skeleton className="h-6 w-64 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent className="flex flex-col lg:flex-row gap-4 items-start">
                  <Skeleton className="h-64 w-64 rounded-full" />
                  <div className="grid gap-2 w-full">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Right: Searches breakdown skeleton */}
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-80 mb-2" />
                  <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Other tabs skeleton (Calls, Bookings, Directions, Website) */}
          <div className="space-y-6">
            {[1, 2, 3, 4].map((tabIndex) => (
              <Card key={tabIndex}>
                <CardHeader className="py-2">
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-8 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-h-screen flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Analytics</h3>
          <p className="text-muted-foreground">Google Business Profile performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(parseISO(currentRange.startDate), "MMM d, yyyy")} - {format(parseISO(currentRange.endDate), "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-3">
                <Calendar
                  mode="range"
                  selected={range}
                  onSelect={(v: any) => setRange(v)}
                  numberOfMonths={2}
                />
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setRange({ from: parseISO(currentRange.startDate), to: parseISO(currentRange.endDate) })}>Reset</Button>
                  <Button onClick={handleApply}>
                    <RefreshCw className="h-4 w-4 mr-1" /> Apply
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Sub-tabs */}
      <Tabs value={subTab} onValueChange={setSubTab} className="gap-0">
        <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground w-full mb-0">
          <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
          <TabsTrigger value="calls" className="flex-1">Calls</TabsTrigger>
          <TabsTrigger value="bookings" className="flex-1">Bookings</TabsTrigger>
          <TabsTrigger value="directions" className="flex-1">Directions</TabsTrigger>
          <TabsTrigger value="website" className="flex-1">Website Clicks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0 space-y-6">
          {/* Row 1: Business Profile interactions with chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Business Profile interactions</CardDescription>
              <CardTitle className="text-2xl">{totalInteractions.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ value: { label: "Interactions", color: "var(--chart-1)" } }} className="aspect-[5/1]">
                <AreaChart data={sInteractionsMonthly}>
                  <defs>
                    <linearGradient id="fillValueInteractions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={6} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Area dataKey="value" type="linear" fill="url(#fillValueInteractions)" stroke="var(--color-value)" />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Row 2: Left donut + Right keywords list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: People viewed your Business Profile (device/platform breakdown) */}
            <Card className="flex flex-col">
              <CardHeader className="pb-0">
                <CardTitle>People viewed your Business Profile</CardTitle>
                <CardDescription>Platform and device breakdown</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col lg:flex-row gap-4 items-start">
                <ChartContainer
                  config={{
                    mobileMaps: { label: "Google Maps – mobile", color: "var(--chart-1)" },
                    mobileSearch: { label: "Google Search – mobile", color: "var(--chart-2)" },
                    desktopSearch: { label: "Google Search – desktop", color: "var(--chart-4)" },
                    desktopMaps: { label: "Google Maps – desktop", color: "var(--chart-3)" },
                    value: { label: "Value" },
                  }}
                  className="mx-auto w-full h-64 aspect-auto"
                >
                  <PieChart>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={[
                        { name: "mobileMaps", value: sumSeries(sMobileMaps), fill: "var(--color-mobileMaps)" },
                        { name: "mobileSearch", value: sumSeries(sMobileSearch), fill: "var(--color-mobileSearch)" },
                        { name: "desktopSearch", value: sumSeries(sDesktopSearch), fill: "var(--color-desktopSearch)" },
                        { name: "desktopMaps", value: sumSeries(sDesktopMaps), fill: "var(--color-desktopMaps)" },
                      ]}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                    />
                  </PieChart>
                </ChartContainer>
                <div className="grid gap-2 w-full">
                  {(() => {
                    const parts = [
                      { key: "mobileMaps", label: "Google Maps – mobile", value: sumSeries(sMobileMaps) },
                      { key: "mobileSearch", label: "Google Search – mobile", value: sumSeries(sMobileSearch) },
                      { key: "desktopSearch", label: "Google Search – desktop", value: sumSeries(sDesktopSearch) },
                      { key: "desktopMaps", label: "Google Maps – desktop", value: sumSeries(sDesktopMaps) },
                    ];
                    const total = parts.reduce((s, p) => s + p.value, 0) || 1;
                    return parts.map((p) => (
                      <Badge
                        key={p.key}
                        className={`w-full justify-between ${badgeBgClassByKey[p.key]} text-white`}
                      >
                        <span>{p.label}</span>
                        <span className="font-mono">{p.value.toLocaleString()}·{Math.round((p.value / total) * 100)}%</span>
                      </Badge>
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Right: Searches breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Searches showed your Business Profile in the search results</CardTitle>
                <CardDescription>Search terms that showed your Business Profile in the search results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {paginatedKeywords.map((k, idx) => (
                    <div key={`${k.searchKeyword}-${idx}`} className="flex items-center justify-between rounded-md border p-2">
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground w-6 text-right">{((currentPage - 1) * keywordsPerPage) + idx + 1}.</span>
                        <span className="truncate">{k.searchKeyword}</span>
                      </div>
                      <span className="text-sm text-muted-foreground font-mono">
                        {k.insightsValue.value ? Number(k.insightsValue.value).toLocaleString() : (k.insightsValue.threshold ? `≤${k.insightsValue.threshold}` : "-")}
                      </span>
                    </div>
                  ))}
                </div>
                
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
                
                {businessStats?.keywords && businessStats.keywords.length > keywordsPerPage && (
                  <div className="pt-3">
                  
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Calls tab */}
        <TabsContent value="calls" className="mt-0 pt-0">
          <Card>
            <CardHeader className="py-2">
              <CardDescription>Total</CardDescription>
              <CardTitle className="text-2xl">{totalCalls.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ value: { label: "Calls", color: "var(--chart-1)" } }} className="aspect-[5/1]">
                <AreaChart data={sCallsMonthly}>
                  <defs>
                    <linearGradient id="fillValueCalls" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={6} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Area dataKey="value" type="linear" fill="url(#fillValueCalls)" stroke="var(--color-value)" />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bookings tab */}
        <TabsContent value="bookings" className="mt-0 pt-0">
          <Card>
            <CardHeader className="py-2">
              <CardDescription>Total</CardDescription>
              <CardTitle className="text-2xl">{totalBookings.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ value: { label: "Bookings", color: "var(--chart-1)" } }} className="aspect-[5/1]">
                <AreaChart data={sBookingsMonthly}>
                  <defs>
                    <linearGradient id="fillValueBookings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={6} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Area dataKey="value" type="linear" fill="url(#fillValueBookings)" stroke="var(--color-value)" />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Directions tab */}
        <TabsContent value="directions" className="mt-0 pt-0">
          <Card>
            <CardHeader className="py-2">
              <CardDescription>Total</CardDescription>
              <CardTitle className="text-2xl">{totalDirections.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ value: { label: "Directions", color: "var(--chart-1)" } }} className="aspect-[5/1]">
                <AreaChart data={sDirectionsMonthly}>
                  <defs>
                    <linearGradient id="fillValueDirections" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={6} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Area dataKey="value" type="linear" fill="url(#fillValueDirections)" stroke="var(--color-value)" />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Website tab */}
        <TabsContent value="website" className="mt-0 pt-0">
          <Card>
            <CardHeader className="py-2">
              <CardDescription>Total</CardDescription>
              <CardTitle className="text-2xl">{totalWebsite.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ value: { label: "Website Clicks", color: "var(--chart-1)" } }} className="aspect-[5/1]">
                <AreaChart data={sWebsiteMonthly}>
                  <defs>
                    <linearGradient id="fillValueWebsite" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={6} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Area dataKey="value" type="linear" fill="url(#fillValueWebsite)" stroke="var(--color-value)" />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* keywords list moved to overview tab */}
    </div>
  );
}


