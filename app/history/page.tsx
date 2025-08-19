"use client";

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Calendar, Clock, Phone, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface CreditEvent {
  id: number;
  date: string;
  aaname: string;
  phone: string;
  duration: number | string;
  creditUsage: number | string;
  description: string;
  type: 'debit' | 'credit';
  calltype: string;
  callstatus: string;
}

export default function CreditHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<CreditEvent[]>([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [isClient, setIsClient] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const itemsPerPage = 10;

  useEffect(() => {
    setIsClient(true);
    fetchCreditHistory();
  }, [page]);

  // Add focus event listener to refresh credits when user returns to the page
  useEffect(() => {
    const handleFocus = () => {
      // Refresh credits when user returns to the page (e.g., after payment)
      fetchCreditHistory(true);
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const fetchCreditHistory = async (forceRefresh = false) => {
    try {
      setLoading(true);
      if (forceRefresh) {
        setRefreshing(true);
      }
      
      const offset = (page - 1) * itemsPerPage;
      
      const url = `/api/credit-history?limit=${itemsPerPage}&offset=${offset}`;
      
      const response = await fetch(url, {
        cache: forceRefresh ? 'no-store' : 'default'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch credit history');
      }
      
      const data = await response.json();
      
      // Filter records to include only those with valid duration
      const filteredHistory = (data.data || []).filter((item: CreditEvent) => {
        const duration = typeof item.duration === 'string' ? parseFloat(item.duration) : item.duration;
        return duration != null && !isNaN(duration) && duration > 0;
      });
      
      setHistory(filteredHistory);
      setCurrentBalance(data.currentBalance || 0);
      // Update totalCount to reflect filtered records (client-side filtering)
      // Ideally, the API should return the filtered count; this is a workaround
      setTotalCount(filteredHistory.length > 0 ? data.totalCount : 0);
      setError(null);
    } catch (err) {
      setError('An error occurred while fetching your credit history.');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Function to manually refresh credits
  const handleRefreshCredits = () => {
    fetchCreditHistory(true);
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Format duration from seconds to minutes and seconds
  const formatDuration = (seconds: number | string) => {
    if (!seconds) return '0s';
    
    const numSeconds = typeof seconds === 'string' ? parseFloat(seconds) : seconds;
    const mins = Math.floor(numSeconds / 60);
    const secs = Math.round(numSeconds % 60);
    
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  // Helper to parse credit value safely
  const parseCreditValue = (value: number | string | null | undefined) => {
    if (value === null || value === undefined) return 0;
    
    if (typeof value === 'string') {
      const parsedValue = parseFloat(value);
      return isNaN(parsedValue) ? 0 : parsedValue;
    }
    
    return value;
  };

  // Define custom styles for purple theme
  const customStyles = {
    "--primary": "270 70% 50%",    // Primary purple
    "--ring": "270 70% 50%",       // Purple focus ring
  } as React.CSSProperties;

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
        <div className="flex flex-1 flex-col purple-fade-in">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 lg:px-6">
                <div>
                  <h1 className="text-2xl font-bold mb-1 text-foreground">Credit History</h1>
                  <p className="text-muted-foreground">Track your credit usage for AI calls and services</p>
                </div>
                
                <Card className="w-full md:w-auto purple-card">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <p className="text-muted-foreground">Current Balance</p>
                        <button
                          onClick={handleRefreshCredits}
                          disabled={refreshing}
                          className="p-1 hover:bg-purple-100 rounded transition-colors"
                          title="Refresh credits"
                        >
                          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                      <p className="text-3xl font-bold purple-accent-text">
                        {parseCreditValue(currentBalance).toFixed(2)} Credits
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {error && (
                <div className="px-4 lg:px-6">
                  <Alert variant="destructive" className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </div>
              )}

              <div className="px-4 lg:px-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-purple-800 dark:text-purple-300">Credit Usage</CardTitle>
                    <CardDescription>Detailed breakdown of your credit usage history</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex items-center space-x-4">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-[250px]" />
                              <Skeleton className="h-4 w-[200px]" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : history.length === 0 ? (
                      <div className="text-center py-10">
                        <Calendar className="mx-auto h-12 w-12 text-purple-400 mb-4" />
                        <h3 className="text-lg font-medium mb-1 text-purple-800 dark:text-purple-300">No credit history found</h3>
                        <p className="text-muted-foreground">Your credit usage history with valid call durations will appear here.</p>
                      </div>
                    ) : (
                      <>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader className="bg-purple-50 dark:bg-purple-900/20">
                              <TableRow>
                                <TableHead className="text-purple-700 dark:text-purple-400">Date</TableHead>
                                <TableHead className="text-purple-700 dark:text-purple-400">Description</TableHead>
                                <TableHead className="text-purple-700 dark:text-purple-400">Duration</TableHead>
                                <TableHead className="text-purple-700 dark:text-purple-400 text-right">Credits</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {history.map((item) => (
                                <TableRow key={item.id} className="hover:bg-purple-50/50 dark:hover:bg-purple-900/10">
                                  <TableCell className="font-medium">
                                    {isClient && item.date ? format(new Date(item.date), 'MMM dd, yyyy h:mm a') : ''}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Phone className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                                      <span>{item.description}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Status: {item.callstatus || 'Unknown'} • Type: {item.calltype || 'Unknown'}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                                      {formatDuration(item.duration)}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-medium text-rose-500">
                                    -{parseCreditValue(item.creditUsage).toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {totalPages > 1 && (
                          <div className="mt-6 flex justify-center">
                            <Pagination>
                              <PaginationContent>
                                <PaginationItem>
                                  <PaginationPrevious 
                                    onClick={() => setPage(Math.max(1, page - 1))}
                                    className={`${page === 1 ? 'pointer-events-none opacity-50' : ''} hover:text-purple-600 dark:hover:text-purple-400`}
                                  />
                                </PaginationItem>
                                
                                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                  let pageNum;
                                  
                                  if (totalPages <= 5) {
                                    pageNum = i + 1;
                                  } else if (page <= 3) {
                                    pageNum = i + 1;
                                  } else if (page >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                  } else {
                                    pageNum = page - 2 + i;
                                  }
                                  
                                  if (pageNum > 0 && pageNum <= totalPages) {
                                    return (
                                      <PaginationItem key={i}>
                                        <PaginationLink
                                          isActive={pageNum === page}
                                          onClick={() => setPage(pageNum)}
                                          className={pageNum === page ? 'bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600' : 'hover:text-purple-600 dark:hover:text-purple-400'}
                                        >
                                          {pageNum}
                                        </PaginationLink>
                                      </PaginationItem>
                                    );
                                  }
                                  return null;
                                })}
                                
                                <PaginationItem>
                                  <PaginationNext 
                                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                                    className={`${page === totalPages ? 'pointer-events-none opacity-50' : ''} hover:text-purple-600 dark:hover:text-purple-400`}
                                  />
                                </PaginationItem>
                              </PaginationContent>
                            </Pagination>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
