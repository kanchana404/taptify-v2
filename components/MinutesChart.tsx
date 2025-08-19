"use client";

import { useState, useEffect } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartData {
  date: string;
  minutes: number;
}

interface FormattedChartData {
  date: string;
  formattedDate: string;
  minutes: number;
}

interface MinutesChartProps {
  startDate?: string;
  endDate?: string;
}

export default function MinutesChart({ startDate, endDate }: MinutesChartProps) {
  const [data, setData] = useState<FormattedChartData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trendPercentage, setTrendPercentage] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<string>("All time");

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        let url = '/api/Past-call-minites';
        const params = new URLSearchParams();
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
        if (params.toString()) url += '?' + params.toString();

        // Set date range display
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          setDateRange(`${start.toLocaleDateString()} - ${end.toLocaleDateString()}`);
        } else {
          setDateRange("All time");
        }

        const res = await fetch(url, {
          credentials: 'include',
        });
        
        if (!res.ok) {
          throw new Error('Failed to fetch call duration data');
        }
        
        const json: ChartData[] = await res.json();
        
        // Format dates for display
        const formattedData = json.map(item => ({
          ...item,
          formattedDate: formatDateForDisplay(item.date),
        }));
        
        setData(formattedData);
        
        // Calculate trend if we have data
        if (formattedData.length > 1) {
          calculateTrend(formattedData);
        }
        
        setError(null);
      } catch (error) {
        console.error('Error fetching call duration data:', error);
        setError('Failed to load call duration data');
        setData([]);
        setTrendPercentage(null);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [startDate, endDate]);

  // Format date for display
  const formatDateForDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Calculate trend percentage
  const calculateTrend = (chartData: FormattedChartData[]) => {
    if (chartData.length < 2) return;
    
    // Divide the data into two halves to compare
    const midPoint = Math.floor(chartData.length / 2);
    const firstHalf = chartData.slice(0, midPoint);
    const secondHalf = chartData.slice(midPoint);
    
    // Calculate average minutes for each half
    const firstHalfAvg = firstHalf.reduce((sum, item) => sum + item.minutes, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, item) => sum + item.minutes, 0) / secondHalf.length;
    
    // Calculate percentage change
    if (firstHalfAvg === 0) return;
    
    const percentChange = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    setTrendPercentage(parseFloat(percentChange.toFixed(1)));
  };

  // Chart configuration with purple color
  const chartConfig = {
    minutes: {
      label: "Minutes",
      color: "hsl(270, 70%, 60%)", // Purple color
      icon: trendPercentage && trendPercentage > 0 ? TrendingUp : TrendingDown,
    },
  } as ChartConfig;

  return (
    <Card className="border-purple-100 dark:border-purple-900/30">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-base sm:text-lg">Average Call Duration</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          {dateRange}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-2 sm:p-4">
        {loading ? (
          <div className="flex items-center justify-center h-[250px]">
            <div className="space-y-4 w-full">
              <Skeleton className="h-6 w-32 mx-auto" />
              <Skeleton className="h-4 w-48 mx-auto" />
              <Skeleton className="h-[180px] w-full" />
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[250px] text-destructive text-xs sm:text-sm">{error}</div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[250px] text-muted-foreground text-xs sm:text-sm">No data available for the selected period</div>
        ) : (
          <ChartContainer 
            config={chartConfig} 
            className="h-[250px] w-full"
          >
            <AreaChart
              accessibilityLayer
              data={data}
              margin={{
                left: 6,
                right: 6,
                top: 6,
                bottom: 6,
              }}
            >
              <defs>
                <linearGradient id="fillMinutes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(270, 70%, 60%)" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(270, 70%, 60%)" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="formattedDate"
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                fontSize={10}
                interval="preserveStartEnd"
                stroke="hsl(var(--muted-foreground))"
                className="text-xs sm:text-sm"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                fontSize={10}
                stroke="hsl(var(--muted-foreground))"
                className="text-xs sm:text-sm"
                tickFormatter={(value) => value.toFixed(1)}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent 
                  indicator="line"
                  formatValue={(value, name) => `${parseFloat(value.toString()).toFixed(2)} min`}
                  className="text-xs sm:text-sm"
                />}
              />
              <Area
                type="monotone"
                dataKey="minutes"
                stroke="hsl(270, 70%, 60%)"
                strokeWidth={2}
                fill="url(#fillMinutes)"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
      {!loading && !error && data.length > 0 && trendPercentage !== null && (
        <CardFooter className="p-4 sm:p-6">
          <div className="flex w-full items-start gap-2 text-xs sm:text-sm">
            <div className="grid gap-2">
              <div className="flex items-center gap-2 leading-none text-muted-foreground">
                Showing average call duration in minutes
              </div>
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}