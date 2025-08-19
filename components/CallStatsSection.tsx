"use client";

import { useState, useEffect } from "react";
import { Clock, Phone, PhoneOutgoing, Star, MessageSquare, ArrowRight } from "lucide-react";
import Link from "next/link";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

interface StatsProps {
    startDate?: string;
    endDate?: string;
}

interface StatsData {
    inboundCalls: number;
    outboundCalls: number;
    inboundDuration: number;
    outboundDuration: number;
    smsSent: number;
    callsAnswered: number;
    rescheduledCalls: number;
    avgSatisfactionRate: number | null;
    answerRate: string;
}

export function CallStatsSection({ startDate, endDate }: StatsProps) {
    const [statsData, setStatsData] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
                    outboundCalls: Number(data.outboundCalls || 0),
                    inboundDuration: Number(data.inboundDuration || 0),
                    outboundDuration: Number(data.outboundDuration || 0),
                    smsSent: Number(data.smsSent || 0),
                    callsAnswered: Number(data.callsAnswered || 0),
                    rescheduledCalls: Number(data.rescheduledCalls || 0),
                    avgSatisfactionRate: data.avgSatisfactionRate !== null ?
                        Number(data.avgSatisfactionRate) : null,
                    answerRate: data.answerRate || "0%"
                };

                setStatsData(processedData);
                console.log("Stats data loaded:", processedData);
            } catch (err: any) {
                console.error("Error fetching stats:", err);
                setError(err.message || "An error occurred");
            } finally {
                setLoading(false);
            }
        }

        fetchStats();
    }, [startDate, endDate]); // Re-fetch when date filters change

    // Helper function to format seconds into "X minute(s) Ys"
    const formatDuration = (seconds: number): string => {
        if (!seconds || isNaN(seconds)) return "0 minutes 0s";

        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${mins} minute${mins !== 1 ? "s" : ""} ${secs}s`;
    };

    if (loading) return <p className="text-muted-foreground p-4">Loading stats...</p>;
    if (error) return <p className="text-destructive p-4">Error: {error}</p>;
    if (!statsData) return <p className="text-muted-foreground p-4">No data available.</p>;

    // Calculate total call duration (in seconds)
    const totalDuration = Math.round(
        (statsData.inboundDuration || 0) + (statsData.outboundDuration || 0)
    );

    // Define all stat cards data - First row
    const firstRowStats = [
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
        },
        {
            name: "Inbound Calls",
            value: statsData.inboundCalls,
            icon: Phone,
        },
        {
            name: "Avg. Satisfaction Rate",
            value: statsData.avgSatisfactionRate !== null
                ? parseFloat(statsData.avgSatisfactionRate.toString()).toFixed(2)
                : "N/A",
            icon: Star,
        }
    ];

    // Second row stats
    const secondRowStats = [
        {
            name: "SMS Sent",
            value: statsData.smsSent,
            icon: MessageSquare,
        },
        {
            name: "Calls Answered",
            value: statsData.callsAnswered,
            icon: PhoneOutgoing,
        },
        {
            name: "Answer Rate",
            value: statsData.answerRate,
            icon: Star,
        },
        {
            name: "Rescheduled Calls",
            value: statsData.rescheduledCalls,
            icon: Phone,
            actionLink: "/rescheduled",
            actionText: "See More",
        }
    ];

    return (
        <div className="flex flex-col gap-4">
            {/* First row of stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {firstRowStats.map((stat) => (
                    <Card key={stat.name}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {stat.name}
                            </CardTitle>
                            <stat.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            {stat.details && (
                                <div className="mt-2 space-y-1">
                                    {stat.details.map((detail, index) => (
                                        <p key={index} className="text-xs text-muted-foreground">
                                            {detail}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Second row of stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {secondRowStats.map((stat) => (
                    <Card key={stat.name}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {stat.name}
                            </CardTitle>
                            <stat.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            {stat.actionLink && (
                                <div className="mt-3">
                                    <Link
                                        href={stat.actionLink}
                                        className="text-xs text-primary flex items-center gap-1 hover:underline"
                                    >
                                        {stat.actionText}
                                        <ArrowRight className="h-3 w-3" />
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}