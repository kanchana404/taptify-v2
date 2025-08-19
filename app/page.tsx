"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { CalendarIcon, Filter, Phone, PhoneOutgoing, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subDays } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Import our chart and data components
import { CallStatsSection } from "@/components/section-cards";
import CallChart from "@/components/CallChart";
import MinutesChart from "@/components/MinutesChart";
import CallStatusCharts from "@/components/CallStatusCharts";
import ReviewCharts from "@/components/ReviewCharts";
import CallHistory from "@/components/CallHistory";
import UserBase from "@/components/UserBase";
import { PastReview } from "@/components/pastReview";


export default function Dashboard() {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('outbound');
  const [filterPreset, setFilterPreset] = useState("");

  // Format dates for API
  const formatDateForApi = (date) => {
    if (!date) return null;
    return date instanceof Date ? format(date, 'yyyy-MM-dd') : null;
  };

  // Apply preset filter
  useEffect(() => {
    if (filterPreset) {
      const today = new Date();
      setEndDate(today);

      if (filterPreset === "3d") {
        setStartDate(subDays(today, 2)); // Last 3 days (today + 2 previous days)
      } else if (filterPreset === "7d") {
        setStartDate(subDays(today, 6)); // Last 7 days (today + 6 previous days)
      } else if (filterPreset === "30d") {
        setStartDate(subDays(today, 29)); // Last 30 days (today + 29 previous days)
      }
    }
  }, [filterPreset]);

  // Handle reset filters
  const handleResetFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setFilterPreset("");
  };

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 purple-fade-in">
              {/* Date filter controls */}
              <div className="px-4 flex flex-wrap items-center justify-between gap-4 lg:px-6">
                <h2 className="text-xl font-semibold text-foreground">Call Dashboard</h2>
                <div className="flex items-center gap-2">
                  <Popover open={isFiltersVisible} onOpenChange={setIsFiltersVisible}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 gap-1.5 purple-button border-purple-500 hover:bg-primary hover:text-primary-foreground">
                        <Filter className="h-4 w-4" />
                        <span>Filters</span>
                        {(startDate || endDate) && (
                          <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                            {(startDate && endDate)
                              ? `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`
                              : startDate
                                ? `From ${format(startDate, 'MMM d')}`
                                : `Until ${format(endDate, 'MMM d')}`}
                          </Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="end">
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <h4 className="font-medium leading-none">Date Range</h4>
                          <p className="text-sm text-muted-foreground">
                            Filter calls by specific date range
                          </p>
                        </div>

                        {/* Date presets */}
                        <div className="grid gap-2">
                          <Label htmlFor="preset">Preset range</Label>
                          <Select id="preset" value={filterPreset} onValueChange={setFilterPreset}>
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Select preset" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="3d">Last 3 Days</SelectItem>
                              <SelectItem value="7d">Last 7 Days</SelectItem>
                              <SelectItem value="30d">Last 30 Days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium leading-none">Custom Range</h4>
                          <p className="text-sm text-muted-foreground">
                            Or select specific start and end dates
                          </p>
                        </div>

                        <div className="grid gap-2">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="startDate" className="col-span-1">Start Date</Label>
                            <div className="col-span-3">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    id="startDate"
                                    variant="outline"
                                    className="w-full justify-start text-left font-normal h-8"
                                  >
                                    {startDate ? format(startDate, 'PPP') : "Select date"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={startDate}
                                    onSelect={(date) => {
                                      setStartDate(date);
                                      setFilterPreset("");
                                    }}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="endDate" className="col-span-1">End Date</Label>
                            <div className="col-span-3">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    id="endDate"
                                    variant="outline"
                                    className="w-full justify-start text-left font-normal h-8"
                                  >
                                    {endDate ? format(endDate, 'PPP') : "Select date"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={endDate}
                                    onSelect={(date) => {
                                      setEndDate(date);
                                      setFilterPreset("");
                                    }}
                                    initialFocus
                                    disabled={(date) => startDate ? date < startDate : false}
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleResetFilters}
                          >
                            Reset
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setIsFiltersVisible(false)}
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Call Stats Section */}
              <div className="px-4 lg:px-6">
                <CallStatsSection
                  startDate={formatDateForApi(startDate)}
                  endDate={formatDateForApi(endDate)}
                />
              </div>

              {/* Call Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-4 lg:px-6">
                <CallChart
                  startDate={formatDateForApi(startDate)}
                  endDate={formatDateForApi(endDate)}
                />
                <MinutesChart
                  startDate={formatDateForApi(startDate)}
                  endDate={formatDateForApi(endDate)}
                />
              </div>

              {/* Call Status Charts */}
              <div className="px-4 lg:px-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Call Status</CardTitle>
                    <CardDescription>Distribution of call statuses and ending reasons</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CallStatusCharts
                      startDate={formatDateForApi(startDate)}
                      endDate={formatDateForApi(endDate)}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Customer Reviews */}
              <div className="px-4 lg:px-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Reviews</CardTitle>
                    <CardDescription>Customer satisfaction and engagement metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ReviewCharts
                      startDate={formatDateForApi(startDate)}
                      endDate={formatDateForApi(endDate)}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Call History Tabs */}
              <div className="px-4 lg:px-6 mt-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-secondary/50 p-1 rounded-lg border border-purple-200 dark:border-purple-800">
                    <TabsTrigger value="outbound" className="flex items-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200">
                      <PhoneOutgoing className="h-3.5 w-3.5" />
                      <span>Outbound</span>
                    </TabsTrigger>
                    <TabsTrigger value="inbound" className="flex items-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200">
                      <Phone className="h-3.5 w-3.5" />
                      <span>Inbound</span>
                    </TabsTrigger>
                    <TabsTrigger value="userbase" className="flex items-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200">
                      <Users className="h-3.5 w-3.5" />
                      <span>Users</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="outbound" className="mt-4 purple-fade-in">
                    <Card className="purple-card">
                      <CardHeader>
                        <CardTitle className="text-foreground">Outbound Call History</CardTitle>
                        <CardDescription>List of outgoing calls</CardDescription>
                      </CardHeader>
                      <CardContent className="p-0 sm:p-6">
                        <CallHistory
                          type="outbound"
                          startDate={formatDateForApi(startDate)}
                          endDate={formatDateForApi(endDate)}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="inbound" className="mt-4 purple-fade-in">
                    <Card className="purple-card">
                      <CardHeader>
                        <CardTitle className="text-foreground">Inbound Call History</CardTitle>
                        <CardDescription>List of incoming calls</CardDescription>
                      </CardHeader>
                      <CardContent className="p-0 sm:p-6">
                        <CallHistory
                          type="inbound"
                          startDate={formatDateForApi(startDate)}
                          endDate={formatDateForApi(endDate)}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="userbase" className="mt-4 purple-fade-in">
                    <Card className="purple-card">
                      <CardHeader>
                        <CardTitle className="text-foreground">User Base Analytics</CardTitle>
                        <CardDescription>User management and information</CardDescription>
                      </CardHeader>
                      <CardContent className="p-0 sm:p-6">
                        <UserBase />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Past Reviews Section - Added to the end of the dashboard */}
              <div className="px-4 lg:px-6 mt-4">
                <div className="purple-fade-in">
                  <PastReview />
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}