"use client";

import { useState, useEffect, useMemo } from "react";
import { Pie, PieChart, Label, Cell, ResponsiveContainer } from "recharts";
import { TrendingUp, BarChart3, PieChart as PieChartIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface ChartData {
  name: string;
  value: number;
  fill?: string;
  color?: string;
  originalValue?: number;
}

interface CallStatusChartsProps {
  startDate?: string;
  endDate?: string;
}

export default function CallStatusCharts({ startDate, endDate }: CallStatusChartsProps) {
  const [callEndingData, setCallEndingData] = useState<ChartData[]>([]);
  const [callStatusData, setCallStatusData] = useState<ChartData[]>([]);
  const [loadingEndingData, setLoadingEndingData] = useState(true);
  const [loadingStatusData, setLoadingStatusData] = useState(true);
  const [endingError, setEndingError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<string>("All time");

  // Calculate total calls for each chart
  const totalStatusCalls = useMemo(() => {
    return callStatusData.reduce((sum, item) => sum + (item.originalValue || 0), 0);
  }, [callStatusData]);

  const totalEndingCalls = useMemo(() => {
    return callEndingData.reduce((sum, item) => sum + (item.originalValue || 0), 0);
  }, [callEndingData]);

  useEffect(() => {
    // Set date range display
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      setDateRange(`${start.toLocaleDateString()} - ${end.toLocaleDateString()}`);
    } else {
      setDateRange("All time");
    }

    const fetchCallEndingData = async () => {
      try {
        setLoadingEndingData(true);
        setEndingError(null);
        
        let url = '/api/call-ending-types';
        const params = new URLSearchParams();
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
        if (params.toString()) url += '?' + params.toString();
        
        const response = await fetch(url, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch call ending data');
        }
        
        const data = await response.json();
        
        // Check if data is empty or invalid
        if (!data || !Array.isArray(data) || data.length === 0) {
          setCallEndingData([]);
          return;
        }
        
        const total = data.reduce((sum: number, item: any) => sum + item.value, 0);
        const purpleColors = [
          "hsl(280, 80%, 50%)",  // Bright purple
          "hsl(270, 70%, 60%)",  // Mid purple  
          "hsl(260, 60%, 70%)",  // Light purple
          "hsl(250, 50%, 40%)",  // Dark purple
          "hsl(290, 40%, 30%)",  // Deep purple
        ];
        
        const processedData = data.map((item: any, index: number) => ({
          name: item.name,
          value: total > 0 ? Math.round((item.value / total) * 100) : 0,
          originalValue: item.value,
          fill: purpleColors[index % purpleColors.length],
        }));
        
        setCallEndingData(processedData);
      } catch (err: unknown) {
        console.error('Error fetching call ending data:', err);
        setEndingError(err instanceof Error ? err.message : 'Unknown error');
        setCallEndingData([]);
      } finally {
        setLoadingEndingData(false);
      }
    };

    const fetchCallStatusData = async () => {
      try {
        setLoadingStatusData(true);
        setStatusError(null);
        
        let url = '/api/call-status';
        const params = new URLSearchParams();
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
        if (params.toString()) url += '?' + params.toString();
        
        const response = await fetch(url, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch call status data');
        }
        
        const data = await response.json();
        
        // Check if data is empty or invalid
        if (!data || !Array.isArray(data) || data.length === 0) {
          setCallStatusData([]);
          return;
        }
        
        const total = data.reduce((sum: number, item: any) => sum + item.value, 0);
        const purpleColors = [
          "hsl(280, 80%, 50%)",  // Bright purple
          "hsl(270, 70%, 60%)",  // Mid purple  
          "hsl(260, 60%, 70%)",  // Light purple
          "hsl(250, 50%, 40%)",  // Dark purple
          "hsl(290, 40%, 30%)",  // Deep purple
        ];
        
        const processedData = data.map((item: any, index: number) => ({
          name: item.name,
          value: total > 0 ? Math.round((item.value / total) * 100) : 0, 
          originalValue: item.value,
          fill: purpleColors[index % purpleColors.length],
        }));
        
        setCallStatusData(processedData);
      } catch (err: unknown) {
        console.error('Error fetching call status data:', err);
        setStatusError(err instanceof Error ? err.message : 'Unknown error');
        setCallStatusData([]);
      } finally {
        setLoadingStatusData(false);
      }
    };

    fetchCallEndingData();
    fetchCallStatusData();
  }, [startDate, endDate]);

  // Create chart configs with purple variants
  const getStatusChartConfig = () => {
    const config: ChartConfig = { 
      total: { label: "Total" } 
    };
    
    // Define purple color palette with varying shades
    const purpleColors = [
      "hsl(280, 80%, 50%)",  // Bright purple
      "hsl(270, 70%, 60%)",  // Mid purple  
      "hsl(260, 60%, 70%)",  // Light purple
      "hsl(250, 50%, 40%)",  // Dark purple
      "hsl(290, 40%, 30%)",  // Deep purple
    ];
    
    callStatusData.forEach((item, index) => {
      config[item.name.toLowerCase().replace(/\s+/g, '_')] = {
        label: item.name,
        color: purpleColors[index % purpleColors.length],
      };
    });
    
    return config;
  };
  
  const getEndingChartConfig = () => {
    const config: ChartConfig = { 
      total: { label: "Total" } 
    };
    
    // Define purple color palette with varying shades
    const purpleColors = [
      "hsl(280, 80%, 50%)",  // Bright purple
      "hsl(270, 70%, 60%)",  // Mid purple  
      "hsl(260, 60%, 70%)",  // Light purple
      "hsl(250, 50%, 40%)",  // Dark purple
      "hsl(290, 40%, 30%)",  // Deep purple
    ];
    
    callEndingData.forEach((item, index) => {
      config[item.name.toLowerCase().replace(/\s+/g, '_')] = {
        label: item.name,
        color: purpleColors[index % purpleColors.length],
      };
    });
    
    return config;
  };

  // Custom styles for setting purple theme
  const customStyles = {
    "--color-ending-0": "hsl(280, 80%, 50%)",
    "--color-ending-1": "hsl(270, 70%, 60%)",
    "--color-ending-2": "hsl(260, 60%, 70%)",
    "--color-ending-3": "hsl(250, 50%, 40%)",
    "--color-ending-4": "hsl(290, 40%, 30%)",
    "--color-status-0": "hsl(280, 80%, 50%)",
    "--color-status-1": "hsl(270, 70%, 60%)",
    "--color-status-2": "hsl(260, 60%, 70%)",
    "--color-status-3": "hsl(250, 50%, 40%)",
    "--color-status-4": "hsl(290, 40%, 30%)",
  } as React.CSSProperties;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={customStyles}>
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm md:text-base font-medium flex items-center gap-2">
              <span className="bg-purple-100 dark:bg-purple-900/30 p-1.5 rounded-md">
                <PieChartIcon size={16} className="text-purple-600 dark:text-purple-400" />
              </span>
              Call Status
            </CardTitle>
            <Badge variant="outline" className="text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800">
              {totalStatusCalls.toLocaleString()} Calls
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[280px] md:h-[300px]">
            {loadingStatusData ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
              </div>
            ) : statusError ? (
              <div className="flex items-center justify-center h-full text-destructive text-sm">
                Error loading data: {statusError}
              </div>
            ) : callStatusData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No data available for the selected period
              </div>
            ) : (
              <ChartContainer
                config={getStatusChartConfig()}
                className="mx-auto h-full w-full flex items-center justify-center"
              >
                <PieChart width={300} height={300}>
                  <ChartTooltip
                    cursor={false}
                    content={(props: any) => {
                      if (props.payload && props.payload.length > 0) {
                        const { name, value, payload } = props.payload[0];
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold">{name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {payload.originalValue.toLocaleString()} calls
                                </span>
                              </div>
                              <div className="flex flex-col text-right">
                                <span className="text-sm font-bold">{value}%</span>
                                <span className="text-xs text-muted-foreground">
                                  of total
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Pie
                    data={callStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    strokeWidth={5}
                  >
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              <tspan
                                x={viewBox.cx}
                                y={viewBox.cy}
                                className="fill-foreground text-2xl font-bold"
                              >
                                {totalStatusCalls.toLocaleString()}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 24}
                                className="fill-muted-foreground"
                              >
                                Calls
                              </tspan>
                            </text>
                          );
                        }
                        return null;
                      }}
                    />
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 font-medium leading-none">
            Distribution of call statuses <TrendingUp className="h-4 w-4 text-purple-600" />
          </div>
          <div className="leading-none text-muted-foreground">
            Showing percentages by status
          </div>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm md:text-base font-medium flex items-center gap-2">
              <span className="bg-purple-100 dark:bg-purple-900/30 p-1.5 rounded-md">
                <BarChart3 size={16} className="text-purple-600 dark:text-purple-400" />
              </span>
              Call Ending Types
            </CardTitle>
            <Badge variant="outline" className="text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800">
              {totalEndingCalls.toLocaleString()} Calls
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[280px] md:h-[300px]">
            {loadingEndingData ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
              </div>
            ) : endingError ? (
              <div className="flex items-center justify-center h-full text-destructive text-sm">
                Error loading data: {endingError}
              </div>
            ) : callEndingData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No data available for the selected period
              </div>
            ) : (
              <ChartContainer
                config={getEndingChartConfig()}
                className="mx-auto h-full w-full flex items-center justify-center"
              >
                <PieChart width={300} height={300}>
                  <ChartTooltip
                    cursor={false}
                    content={(props: any) => {
                      if (props.payload && props.payload.length > 0) {
                        const { name, value, payload } = props.payload[0];
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold">{name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {payload.originalValue.toLocaleString()} calls
                                </span>
                              </div>
                              <div className="flex flex-col text-right">
                                <span className="text-sm font-bold">{value}%</span>
                                <span className="text-xs text-muted-foreground">
                                  of total
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Pie
                    data={callEndingData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    strokeWidth={5}
                  >
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              <tspan
                                x={viewBox.cx}
                                y={viewBox.cy}
                                className="fill-foreground text-2xl font-bold"
                              >
                                {totalEndingCalls.toLocaleString()}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 24}
                                className="fill-muted-foreground"
                              >
                                Calls
                              </tspan>
                            </text>
                          );
                        }
                        return null;
                      }}
                    />
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 font-medium leading-none">
            Distribution of call ending reasons <TrendingUp className="h-4 w-4 text-purple-600" />
          </div>
          <div className="leading-none text-muted-foreground">
            Showing percentages by ending type
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}