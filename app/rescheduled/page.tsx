"use client";

import React, { useEffect, useState } from 'react';
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  CalendarIcon,
  PhoneIcon,
  PhoneOffIcon,
  ClockIcon,
  UserIcon,
  CalendarRangeIcon,
  Bell,
  AlertTriangle,
  XIcon
} from "lucide-react";
import { format } from 'date-fns';

interface RescheduledCall {
  id: number;
  aaname: string;
  phone: string;
  recalldate: string;
  lastvisitdate: string | null;
  callattempts: number | null;
  recallstatus: string;
}

export default function RescheduledCallsPage() {
  const [loading, setLoading] = useState(true);
  const [activeCalls, setActiveCalls] = useState<RescheduledCall[]>([]);
  const [triggeredCalls, setTriggeredCalls] = useState<RescheduledCall[]>([]);
  const [canceledCalls, setCanceledCalls] = useState<RescheduledCall[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch rescheduled calls
  const fetchCalls = async (status = "all") => {
    try {
      setLoading(true);
      const response = await fetch(`/api/rescheduled?status=${status}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch rescheduled calls');
      }
      
      const data = await response.json();
      return data;
    } catch (err: any) {
      console.error('Error fetching rescheduled calls:', err);
      setError(err.message || 'An error occurred');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Load all call data on component mount
  useEffect(() => {
    const loadAllCalls = async () => {
      const allCalls = await fetchCalls();
      
      // Split calls between active, triggered and canceled
      setActiveCalls(allCalls.filter(call => call.recallstatus === 'active' || !call.recallstatus));
      setTriggeredCalls(allCalls.filter(call => call.recallstatus === 'triggered'));
      setCanceledCalls(allCalls.filter(call => call.recallstatus === 'canceled'));
    };
    
    loadAllCalls();
  }, []);

  // Handle cancelling a rescheduled call
  const handleCancelCall = async (id: number) => {
    try {
      const response = await fetch(`/api/rescheduled/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recallstatus: 'canceled' }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel call');
      }

      // Move the call from active/triggered to canceled list
      const callToCancel = [...activeCalls, ...triggeredCalls].find(call => call.id === id);
      if (callToCancel) {
        const updatedCall = { ...callToCancel, recallstatus: 'canceled' };
        setActiveCalls(activeCalls.filter(call => call.id !== id));
        setTriggeredCalls(triggeredCalls.filter(call => call.id !== id));
        setCanceledCalls([...canceledCalls, updatedCall]);
      }
    } catch (err: any) {
      console.error('Error cancelling call:', err);
      alert(`Error cancelling call: ${err.message}`);
    }
  };

  // Format date from string to readable format
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), 'PPP p'); // Example: "April 8, 2025 at 2:30 PM"
    } catch (err) {
      return dateString; // Return original if parsing fails
    }
  };

  // Calculate time until scheduled call
  const getTimeUntil = (dateString: string) => {
    try {
      const now = new Date();
      const callTime = new Date(dateString);
      const diffMs = callTime.getTime() - now.getTime();

      if (diffMs < 0) return "Overdue";

      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (diffDays > 0) {
        return `In ${diffDays} day${diffDays > 1 ? 's' : ''}`;
      } else if (diffHours > 0) {
        return `In ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
      } else if (diffMinutes === 0) {
        return "Less than a minute";
      } else {
        return `In ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
      }
    } catch (err) {
      return "Unknown";
    }
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Define custom styles for purple theme
  const customStyles = {
    "--primary": "270 70% 50%",    // Primary purple
    "--ring": "270 70% 50%",       // Purple focus ring
  } as React.CSSProperties;

  // Loading skeleton component
  const CallSkeleton = () => (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <Card key={i} className="overflow-hidden border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
                <Skeleton className="h-3 w-2/3 mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Empty state component
  const EmptyState = ({ type }: { type: 'active' | 'triggered' | 'canceled' }) => {
    const icons = {
      active: <CalendarIcon className="h-10 w-10 text-purple-400 mb-2" />,
      triggered: <Bell className="h-10 w-10 text-purple-400 mb-2" />,
      canceled: <PhoneOffIcon className="h-10 w-10 text-purple-400 mb-2" />
    };
    
    const titles = {
      active: "No scheduled calls",
      triggered: "No triggered calls",
      canceled: "No canceled calls"
    };
    
    const descriptions = {
      active: "When you schedule calls with clients, they'll appear here.",
      triggered: "Calls that need immediate attention will appear here.",
      canceled: "Canceled calls will be stored here for your reference."
    };
    
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        {icons[type]}
        <h3 className="text-lg font-medium text-purple-800 dark:text-purple-300">{titles[type]}</h3>
        <p className="text-muted-foreground text-sm mt-1 max-w-xs">
          {descriptions[type]}
        </p>
      </div>
    );
  };

  // Call card component
  const CallCard = ({ call, showActionButton }: { call: RescheduledCall, showActionButton: boolean }) => {
    const timeUntil = getTimeUntil(call.recalldate);
    const isOverdue = timeUntil === "Overdue";
    const isTriggered = call.recallstatus === 'triggered';
    
    return (
      <Card key={call.id} className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <Avatar className={`h-10 w-10 ${isTriggered ? 'bg-amber-500' : 'bg-purple-600 dark:bg-purple-700'}`}>
              <div className="text-sm font-medium">{getInitials(call.aaname)}</div>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-md font-medium truncate">{call.aaname}</h3>
                  <div className="flex items-center text-muted-foreground text-sm mt-0.5 gap-1.5">
                    <PhoneIcon className="h-3 w-3 text-purple-500 dark:text-purple-400" />
                    <span className="truncate">{call.phone}</span>
                  </div>
                </div>
                
                {call.recallstatus === 'canceled' ? (
                  <Badge variant="outline" className="rounded-full px-2 border-gray-200 text-gray-500">
                    Canceled
                  </Badge>
                ) : isTriggered ? (
                  <Badge variant="outline" className="rounded-full px-2 border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Triggered
                  </Badge>
                ) : (
                  <Badge variant={isOverdue ? "destructive" : "outline"} className={`rounded-full px-2 ${!isOverdue ? "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-300" : ""}`}>
                    <ClockIcon className="h-3 w-3 mr-1" />
                    {timeUntil}
                  </Badge>
                )}
              </div>
              
              <div className="flex flex-col mt-3 gap-1.5 text-xs text-muted-foreground">
                <div className="flex items-center">
                  <CalendarRangeIcon className="h-3 w-3 mr-2 text-purple-500 dark:text-purple-400" />
                  <span>Scheduled: {formatDate(call.recalldate)}</span>
                </div>
                
                {call.lastvisitdate && (
                  <div className="flex items-center">
                    <UserIcon className="h-3 w-3 mr-2 text-purple-500 dark:text-purple-400" />
                    <span>Last visit: {formatDate(call.lastvisitdate)}</span>
                  </div>
                )}
                
                {call.callattempts !== null && (
                  <div className="flex items-center">
                    <PhoneIcon className="h-3 w-3 mr-2 text-purple-500 dark:text-purple-400" />
                    <span>Call attempts: {call.callattempts}</span>
                  </div>
                )}
              </div>
              
              {showActionButton && !isTriggered && (
                <div className="mt-3 flex justify-end">
                  <Button 
                    onClick={() => handleCancelCall(call.id)}
                    variant="outline" 
                    size="sm"
                    className="h-8 px-3 text-xs rounded-full border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                  >
                    <XIcon className="h-3 w-3 mr-1.5" />
                    Cancel Call
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render call list with components
  const renderCallList = (calls: RescheduledCall[], type: 'active' | 'triggered' | 'canceled') => {
    if (loading) return <CallSkeleton />;
    
    if (calls.length === 0) {
      return <EmptyState type={type} />;
    }
    
    return (
      <div className="space-y-4">
        {calls.map((call) => (
          <CallCard 
            key={call.id} 
            call={call} 
            showActionButton={type === 'active'} 
          />
        ))}
      </div>
    );
  };

  if (error) {
    return (
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
            ...customStyles
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
                <Card className="border-0 shadow overflow-hidden">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <PhoneOffIcon className="h-5 w-5 mr-2 inline-block text-red-500" />
                      Error Loading Calls
                    </CardTitle>
                    <CardDescription>
                      There was a problem retrieving your scheduled calls.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>{error}</p>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      onClick={() => window.location.reload()}
                      variant="outline"
                      className="rounded-full"
                    >
                      Retry
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }
  
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
          ...customStyles
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {/* Header */}
              <div className="px-4 lg:px-6">
                <h1 className="text-2xl font-semibold text-purple-800 dark:text-purple-300">Call Schedule</h1>
                <p className="text-muted-foreground">Manage your scheduled call-backs</p>
              </div>
              
              {/* Tabs */}
              <div className="px-4 lg:px-6">
                <Tabs defaultValue="active" className="w-full">
                  <TabsList className="w-full mb-6 bg-purple-100 dark:bg-purple-900/20 p-1 rounded-full">
                    <TabsTrigger 
                      value="active" 
                      className="flex-1 relative data-[state=active]:bg-white dark:data-[state=active]:bg-background data-[state=active]:text-purple-800 dark:data-[state=active]:text-purple-300 data-[state=active]:shadow-sm rounded-full px-6"
                    >
                      Active
                      {activeCalls.length > 0 && (
                        <span className="ml-1.5 bg-purple-200 text-purple-700 dark:bg-purple-800 dark:text-purple-300 text-xs px-1.5 py-0.5 rounded-full">
                          {activeCalls.length}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="triggered" 
                      className="flex-1 relative data-[state=active]:bg-white dark:data-[state=active]:bg-background data-[state=active]:text-purple-800 dark:data-[state=active]:text-purple-300 data-[state=active]:shadow-sm rounded-full px-6"
                    >
                      Triggered
                      {triggeredCalls.length > 0 && (
                        <span className="ml-1.5 bg-amber-200 text-amber-700 dark:bg-amber-800 dark:text-amber-300 text-xs px-1.5 py-0.5 rounded-full">
                          {triggeredCalls.length}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="canceled" 
                      className="flex-1 relative data-[state=active]:bg-white dark:data-[state=active]:bg-background data-[state=active]:text-purple-800 dark:data-[state=active]:text-purple-300 data-[state=active]:shadow-sm rounded-full px-6"
                    >
                      Canceled
                      {canceledCalls.length > 0 && (
                        <span className="ml-1.5 bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 text-xs px-1.5 py-0.5 rounded-full">
                          {canceledCalls.length}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="active" className="mt-0">
                    <Card className="border-0 shadow overflow-hidden">
                      <CardHeader className="pb-2 border-b border-gray-100 dark:border-gray-800">
                        <CardTitle className="text-purple-800 dark:text-purple-300">Active Callbacks</CardTitle>
                        <CardDescription>
                          Upcoming scheduled callbacks with clients
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4">
                        {renderCallList(activeCalls, 'active')}
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="triggered" className="mt-0">
                    <Card className="border-0 shadow overflow-hidden">
                      <CardHeader className="pb-2 border-b border-gray-100 dark:border-gray-800">
                        <CardTitle className="flex items-center text-purple-800 dark:text-purple-300">
                          <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                          Triggered Callbacks
                        </CardTitle>
                        <CardDescription>
                          Calls that require immediate attention
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4">
                        {renderCallList(triggeredCalls, 'triggered')}
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="canceled" className="mt-0">
                    <Card className="border-0 shadow overflow-hidden">
                      <CardHeader className="pb-2 border-b border-gray-100 dark:border-gray-800">
                        <CardTitle className="text-purple-800 dark:text-purple-300">Canceled Callbacks</CardTitle>
                        <CardDescription>
                          Previously canceled callbacks
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4">
                        {renderCallList(canceledCalls, 'canceled')}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}