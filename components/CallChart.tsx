"use client";

import { useState, useEffect } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartData {
  date: string;
  calls: number;
}

interface FormattedChartData {
  date: string;
  formattedDate: string;
  calls: number;
}

interface CallChartProps {
  startDate?: string;
  endDate?: string;
}

export default function CallChart({ startDate, endDate }: CallChartProps) {
  const [data, setData] = useState<FormattedChartData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trendPercentage, setTrendPercentage] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<string>("All time");

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        let url = '/api/daily-calls';
        const params = new URLSearchParams();
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
        if (params.toString()) url += '?' + params.toString();

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
          throw new Error('Failed to fetch daily call data');
        }
        
        const json: ChartData[] = await res.json();
        
        const formattedData = json.map(item => ({
          ...item,
          formattedDate: formatDateForDisplay(item.date),
        }));
        
        setData(formattedData);
        
        if (formattedData.length > 1) {
          calculateTrend(formattedData);
        }
        
        setError(null);
      } catch (error) {
        console.error('Error fetching daily call data:', error);
        setError('Failed to load call volume data');
        setData([]);
        setTrendPercentage(null);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [startDate, endDate]);

  const formatDateForDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const calculateTrend = (chartData: FormattedChartData[]) => {
    if (chartData.length < 2) return;
    
    const midPoint = Math.floor(chartData.length / 2);
    const firstHalf = chartData.slice(0, midPoint);
    const secondHalf = chartData.slice(midPoint);
    
    const firstHalfAvg = firstHalf.reduce((sum, item) => sum + item.calls, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, item) => sum + item.calls, 0) / secondHalf.length;
    
    if (firstHalfAvg === 0) return;
    
    const percentChange = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    setTrendPercentage(parseFloat(percentChange.toFixed(1)));
  };

  const chartConfig = {
    calls: {
      label: "Calls",
      color: "hsl(270, 70%, 60%)",
    },
  } as ChartConfig;

  const customStyles = {
    "--color-calls": "hsl(270, 70%, 60%)",
    "--chart-1": "270 70% 60%",
  } as React.CSSProperties;

  return (
    <Card className="border-purple-100 dark:border-purple-900/30">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-base sm:text-lg">Call Volume</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          {dateRange}
        </CardDescription>
      </CardHeader>
      <CardContent style={customStyles} className="p-2 sm:p-4">
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
          <div className="flex items-center justify-center h-[250px] text-muted-foreground text-xs sm:text-sm">
            No data available for the selected period
          </div>
        ) : (
          <ChartContainer 
            config={chartConfig} 
            className="h-[250px] w-full"
          >
            <BarChart 
              data={data} 
              accessibilityLayer 
              margin={{
                left: 6,
                right: 6,
                top: 6,
                bottom: 6,
              }}
            >
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
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent
                  indicator="dashed" 
                  formatValue={(value, name) => `${value} calls`}
                  className="text-xs sm:text-sm"
                />}
              />
              <Bar 
                dataKey="calls" 
                fill="var(--color-calls)" 
                radius={3}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
      {!loading && !error && data.length > 0 && trendPercentage !== null && (
        <CardFooter className="p-4 sm:p-6">
          <div className="flex w-full items-start gap-2 text-xs sm:text-sm">
            <div className="grid gap-2">
              <div className="flex items-center gap-2 leading-none text-muted-foreground">
                {dateRange}
              </div>
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}