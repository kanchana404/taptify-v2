"use client";

import { useState, useEffect } from "react";
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";
import { Clock, Phone, PhoneOutgoing, Star, MessageSquare, ArrowRight, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function CallStatsSection({ startDate, endDate }) {
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch stats data from the API endpoint with date filters
  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        
        // Build URL with query parameters for date filtering
        let url = "/api/stats";
        const params = new URLSearchParams();
        
        if (startDate) {
          params.append("startDate", startDate);
        }
        
        if (endDate) {
          params.append("endDate", endDate);
        }
        
        // Append params to URL if any exist
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
        
        console.log("Fetching stats with URL:", url);
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch stats");
        }
        const data = await response.json();
        
        // Ensure all numeric values are properly parsed from the API response
        const processedData = {
          inboundCalls: Number(data.inboundCalls || 0),
          inboundCompletedCalls: Number(data.inboundCompletedCalls || 0),
          inboundPendingCalls: Number(data.inboundPendingCalls || 0),
          outboundCalls: Number(data.outboundCalls || 0),
          outboundCompletedCalls: Number(data.outboundCompletedCalls || 0),
          outboundPendingCalls: Number(data.outboundPendingCalls || 0),
          inboundDuration: Number(data.inboundDuration || 0),
          outboundDuration: Number(data.outboundDuration || 0),
          smsSent: Number(data.smsSent || 0),
          smsClicked: Number(data.smsClicked || 0),
          callsAnswered: Number(data.callsAnswered || 0),
          callsPending: Number(data.callsPending || 0),
          rescheduledCalls: Number(data.rescheduledCalls || 0),
          avgSatisfactionRate: data.avgSatisfactionRate !== null ? 
            Number(data.avgSatisfactionRate) : null,
          maxSatisfactionRate: data.maxSatisfactionRate !== null ?
            Number(data.maxSatisfactionRate) : null,
          minSatisfactionRate: data.minSatisfactionRate !== null ?
            Number(data.minSatisfactionRate) : null,
          answerRate: data.answerRate || "0%"
        };
        
        setStatsData(processedData);
        console.log("Stats data loaded:", processedData);
      } catch (err) {
        console.error("Error fetching stats:", err);
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    
    fetchStats();
  }, [startDate, endDate]); // Re-fetch when date filters change

  // Helper function to format seconds into "X minute(s) Ys"
  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0 minutes 0s";
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins} minute${mins !== 1 ? "s" : ""} ${secs}s`;
  };

  // Helper to safely format ratings
  const formatRating = (rating) => {
    if (rating === null || rating === undefined) return "N/A";
    return parseFloat(rating).toFixed(2);
  };

  if (loading) return <p className="text-muted-foreground p-4">Loading stats...</p>;
  if (error) return <p className="text-destructive p-4">Error: {error}</p>;
  if (!statsData) return <p className="text-muted-foreground p-4">No data available.</p>;

  // Calculate total call duration (in seconds)
  const totalDuration = Math.round(
    (statsData.inboundDuration || 0) + (statsData.outboundDuration || 0)
  );

  // Calculate failed rate
  const answerRateValue = statsData.answerRate ? parseInt(statsData.answerRate, 10) : 0;
  const failedRateValue = 100 - answerRateValue;
  const failedRate = `${failedRateValue}%`;

  // Define all stat cards
  const allStats = [
    {
      name: "Total Call Duration",
      value: formatDuration(totalDuration),
      icon: Clock,
      details: [
        `Inbound: ${formatDuration(statsData.inboundDuration)}`,
        `Outbound: ${formatDuration(statsData.outboundDuration)}`,
      ],
    },
    {
      name: "Outbound Calls",
      value: statsData.outboundCalls,
      icon: PhoneOutgoing,
      details: [
        `Success: ${statsData.outboundCompletedCalls}`,
        `Failed: ${statsData.outboundPendingCalls}`,
      ],
    },
    {
      name: "Inbound Calls",
      value: statsData.inboundCalls,
      icon: Phone,
      details: [
        `Success: ${statsData.inboundCompletedCalls}`,
        `Failed: ${statsData.inboundPendingCalls}`,
      ],
    },
    {
      name: "Satisfaction Rate",
      value: formatRating(statsData.avgSatisfactionRate),
      icon: Star,
      details: [
        `Highest: ${formatRating(statsData.maxSatisfactionRate)}`,
        `Lowest: ${formatRating(statsData.minSatisfactionRate)}`,
      ],
    },
    {
      name: "SMS Sent",
      value: statsData.smsSent,
      icon: MessageSquare,
      details: [
        `Sent: ${statsData.smsSent}`,
        `Clicked: ${statsData.smsClicked}`,
      ],
    },
    {
      name: "Calls Answered",
      value: statsData.callsAnswered,
      icon: PhoneOutgoing,
      details: [
        `Completed: ${statsData.callsAnswered}`,
        `Pending: ${statsData.callsPending}`,
      ],
    },
    {
      name: "Answer Rate",
      value: statsData.answerRate,
      icon: Star,
      details: [
        `Answer Rate: ${statsData.answerRate}`,
        `Failed Rate: ${failedRate}`,
      ],
    },
    {
      name: "Rescheduled Calls",
      value: statsData.rescheduledCalls,
      icon: Phone,
      actionLink: "/rescheduled",
      actionText: "See More",
    },
  ];

  // Function to render stat card with original sizing
  const renderStatCard = (stat) => (
    <Card key={stat.name} className="@container/card purple-card hover:shadow-lg transition-all duration-200">
      <CardHeader>
        <CardDescription className="text-muted-foreground">{stat.name}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl text-foreground">
          {stat.value}
        </CardTitle>
        <CardAction>
          <Badge variant="outline" className="text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800">
            <stat.icon className="size-4 mr-1 text-purple-500" />
            {stat.name === "Answer Rate" ? "Rate" : 
             stat.name === "Feedback" ? "Feedback" : ""}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        {stat.details && (
          <div className="space-y-1">
            {stat.details.map((detail, index) => (
              <div key={index} className="text-sm text-muted-foreground">
                {detail}
              </div>
            ))}
          </div>
        )}
        {stat.actionLink && (
          <div className="mt-1.5">
            <Link 
              href={stat.actionLink} 
              className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-500 transition-colors"
            >
              {stat.actionText}
              <ArrowRight className="h-3 w-3 text-purple-600" />
            </Link>
          </div>
        )}
      </CardFooter>
    </Card>
  );

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      {/* First row of stats */}
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @3xl/main:grid-cols-4 *:data-[slot=card]:from-purple-50 *:data-[slot=card]:to-card dark:*:data-[slot=card]:from-purple-900/20 dark:*:data-[slot=card]:to-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs">
        {allStats.slice(0, 4).map(renderStatCard)}
      </div>
      
      {/* Second row of stats */}
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @3xl/main:grid-cols-4 *:data-[slot=card]:from-purple-50 *:data-[slot=card]:to-card dark:*:data-[slot=card]:from-purple-900/20 dark:*:data-[slot=card]:to-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs">
        {allStats.slice(4, 8).map(renderStatCard)}
      </div>
    </div>
  );
}