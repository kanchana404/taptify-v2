"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronDown, 
  MoreHorizontal, 
  CheckCircle2, 
  Phone, 
  XCircle, 
  MessageCircle, 
  Headphones, 
  Download,
  Loader2,
  Calendar,
  ArrowUpDown,
  Check
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Call {
  id: number;
  phone: string;
  calltype: string;
  callstatus: 'Completed' | 'Missed' | 'Pending';
  score: number | null;
  sms: 'yes' | 'no' | null;
  createdtime: string;
  record_url: string | null;
  duration: number | null;
  ended_reason: string | null;
  linkClicked?: string | null;
  clickedTime?: string | null;
}

interface CallHistoryProps {
  type: 'inbound' | 'outbound';
  linkId?: string;
  startDate?: string;
  endDate?: string;
}

// Helper functions
const formatTime = (timeString: string | null) => {
  if (!timeString || timeString === "null") return 'N/A';
  
  const date = new Date(timeString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const formatDuration = (seconds: number | null) => {
  if (seconds === null || seconds === undefined || String(seconds) === "null") return 'N/A';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default function CallHistory({ type, linkId, startDate, endDate }: CallHistoryProps) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);
  
  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [pageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    const fetchCalls = async () => {
      try {
        setLoading(true);
        let url = `/api/call-history?type=${type}&page=${pageIndex + 1}&pageSize=${pageSize}`;
        if (linkId) {
          url += `&linkId=${linkId}`;
        }
        if (startDate) {
          url += `&startDate=${startDate}`;
        }
        if (endDate) {
          url += `&endDate=${endDate}`;
        }
        const res = await fetch(url);
        
        if (!res.ok) {
          throw new Error('Failed to fetch call history');
        }
        
        const data = await res.json();
        setCalls(data.calls);
        setTotalPages(data.pagination.totalPages);
        setTotalItems(data.pagination.total);
      } catch (error) {
        console.error('Error fetching call history:', error);
        setError(error instanceof Error ? error.message : 'Failed to load calls');
      } finally {
        setLoading(false);
      }
    };

    fetchCalls();
  }, [type, linkId, startDate, endDate, pageIndex, pageSize]);

  const handleDownload = async (url: string, id: number) => {
    try {
      setDownloading(id);
      const a = document.createElement('a');
      a.href = url;
      a.download = `call-recording-${id}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading recording:', error);
    } finally {
      setDownloading(null);
    }
  };

  // Define columns
  const columns = useMemo<ColumnDef<Call>[]>(
    () => [
      {
        accessorKey: "phone",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="pl-0 text-purple-700 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300"
          >
            Phone
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div>{row.getValue("phone")}</div>,
      },
      {
        accessorKey: "callstatus",
        header: "Status",
        cell: ({ row }) => {
          const status = row.getValue("callstatus") as string;
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="cursor-default">
                  <div className="flex items-center">
                    {status === "Completed" ? (
                      <CheckCircle2 className="text-purple-600 h-4 w-4" />
                    ) : status === "Missed" ? (
                      <XCircle className="text-rose-500 h-4 w-4" />
                    ) : (
                      <Phone className="text-muted-foreground h-4 w-4" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{status}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
      },
      {
        accessorKey: "createdtime",
        header: ({ column }) => (
          <div
            className="flex cursor-pointer items-center text-purple-700 dark:text-purple-400"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Time
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </div>
        ),
        cell: ({ row }) => formatTime(row.getValue("createdtime")),
      },
      {
        accessorKey: "duration",
        header: ({ column }) => (
          <div
            className="flex cursor-pointer items-center text-purple-700 dark:text-purple-400"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Duration
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </div>
        ),
        cell: ({ row }) => formatDuration(row.getValue("duration")),
      },
      {
        accessorKey: "score",
        header: "Score",
        cell: ({ row }) => {
          const score = row.getValue("score") as number | null;
          if (score !== null && score !== undefined && String(score) !== "null") {
            return (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="cursor-default">
                    <div className="flex items-center gap-1">
                      <div
                        className={`
                          w-8 h-1.5 rounded-full 
                          ${score >= 7 ? 'bg-purple-600' :
                            score >= 5 ? 'bg-purple-400' : 'bg-rose-500'}
                        `}
                      />
                      <span className="text-xs">{score}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Call Score: {score}/10</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }
          return <span className="text-muted-foreground text-sm">N/A</span>;
        },
      },
      {
        accessorKey: "sms",
        header: "SMS",
        cell: ({ row }) => {
          const sms = row.getValue("sms") as string;
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="cursor-default">
                  {sms === "yes" ? (
                    <MessageCircle className="text-purple-600 dark:text-purple-400 h-4 w-4" />
                  ) : (
                    <MessageCircle className="text-muted-foreground h-4 w-4 opacity-40" />
                  )}
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{sms === "yes" ? "SMS Sent" : "No SMS"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
      },
      {
        accessorKey: "ended_reason",
        header: "Ended",
                 cell: ({ row }) => {
           const reason = row.getValue("ended_reason") as string;
           if (reason && reason !== "null") {
             // Debug: log the actual reason value
             console.log("Original ended_reason:", reason);
             
             // Replace specific text - handle all possible variations
             let formattedReason = reason;
             const lowerReason = reason.toLowerCase();
             
             if (lowerReason.includes("assistant said end call phrase") ||
                 lowerReason.includes("assistant-said-end-call-phrase") ||
                 lowerReason.includes("assistant_said_end_call_phrase") ||
                 lowerReason.includes("assistant") && lowerReason.includes("end call phrase") ||
                 lowerReason.includes("assistant") && lowerReason.includes("said") && lowerReason.includes("end")) {
               formattedReason = "Assistant ended the call";
               console.log("Replaced with:", formattedReason);
             } else {
               // Format other reasons by splitting on hyphens and capitalizing
               formattedReason = reason
                 .split('-')
                 .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                 .join(' ');
             }
             return formattedReason;
           }
           return <span className="text-muted-foreground">N/A</span>;
         },
      },
      {
        accessorKey: "linkClicked",
        header: "Link",
        cell: ({ row }) => {
          const linkClicked = row.getValue("linkClicked") as string;
          return linkClicked === 'visit' ? (
            <CheckCircle2 className="text-purple-600 dark:text-purple-400 h-4 w-4" />
          ) : (
            <XCircle className="text-muted-foreground h-4 w-4 opacity-40" />
          );
        },
      },
      {
        accessorKey: "clickedTime",
        header: "Click Time",
        cell: ({ row }) => {
          const clickedTime = row.original.clickedTime;
          return clickedTime && clickedTime !== "null" ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="cursor-default">
                  <Calendar className="text-purple-600 dark:text-purple-400 h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{formatTime(clickedTime)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <span className="text-muted-foreground text-sm">N/A</span>
          );
        },
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const call = row.original;
          return call.record_url && call.record_url !== "null" ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 px-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900/20"
                    onClick={() => handleDownload(call.record_url!, call.id)}
                    disabled={downloading === call.id}
                  >
                    {downloading === call.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Download recording</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Headphones className="h-4 w-4 text-muted-foreground opacity-40 mx-2" />
          );
        },
      },
    ],
    [downloading]
  );

  const table = useReactTable({
    data: calls,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  if (loading) {
    return (
      <div className="space-y-3 py-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-2">
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 my-3">
        <div className="text-sm text-destructive">Error: {error}</div>
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <Phone className="h-10 w-10 text-purple-500/50 mx-auto mb-3 opacity-50" />
        <p className="text-muted-foreground text-sm">No {type} calls found</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter phone numbers..."
          value={(table.getColumn("phone")?.getFilterValue() as string) ?? ""}
          onChange={(event) => table.getColumn("phone")?.setFilterValue(event.target.value)}
          className="max-w-sm border-purple-200 focus-visible:ring-purple-500 dark:border-purple-800"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto border-purple-200 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900/20">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-purple-50 dark:bg-purple-900/20">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-purple-200 dark:border-purple-800 hover:bg-purple-100/50 dark:hover:bg-purple-800/20">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-purple-700 dark:text-purple-400">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="border-purple-200 dark:border-purple-800 hover:bg-purple-50/50 dark:hover:bg-purple-900/10">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {totalItems} calls total
        </div>
        <div className="space-x-2 flex items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageIndex(pageIndex - 1)}
            disabled={pageIndex === 0}
            className="border-purple-200 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900/20 disabled:text-muted-foreground"
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pageIndex + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageIndex(pageIndex + 1)}
            disabled={pageIndex >= totalPages - 1}
            className="border-purple-200 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900/20 disabled:text-muted-foreground"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}