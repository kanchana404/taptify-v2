"use client";

import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Sector, Label } from 'recharts';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, CheckCircle, Send, RefreshCw } from "lucide-react";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";

interface ReviewRating {
  name: string;
  value: number;
  color: string;
  range?: string;
}

interface LinkStatusData {
  linksSent: number;
  linksViewed: number;
}

interface RecentLink {
  id: string;
  name: string;
  phone: string;
  clicked: boolean;
  sentTime: string | null;
}

interface ReviewData {
  ratings: ReviewRating[];
  linkStatus: LinkStatusData;
  recentLinks: RecentLink[];
}

interface ReviewChartsProps {
  startDate?: string;
  endDate?: string;
}

// Update the color scheme with the purple palette from CallStatusCharts
const purpleColors = [
  "hsl(280, 80%, 50%)",  // Bright purple
  "hsl(270, 70%, 60%)",  // Mid purple  
  "hsl(260, 60%, 70%)",  // Light purple
  "hsl(250, 50%, 40%)",  // Dark purple
  "hsl(290, 40%, 30%)",  // Deep purple
];

// Active shape for the pie chart
const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const {
    cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent, value
  } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill}>
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">{`${value} reviews`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
        {`(${(percent * 100).toFixed(0)}%)`}
      </text>
    </g>
  );
};

export default function ReviewCharts({ startDate, endDate }: ReviewChartsProps) {
  const [data, setData] = useState<ReviewData>({
    ratings: [],
    linkStatus: {
      linksSent: 0,
      linksViewed: 0
    },
    recentLinks: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    console.log("ReviewCharts useEffect - loading data...");
    
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let reviewsUrl = '/api/reviews';
        let linkVisitUrl = '/api/link-visit';
        const params = new URLSearchParams();
        
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
        
        if (params.toString()) {
          reviewsUrl += '?' + params.toString();
          linkVisitUrl += '?' + params.toString();
        }
        
        console.log("Fetching from URLs:", reviewsUrl, linkVisitUrl);
        
        const [ratingsResponse, linkDataResponse] = await Promise.all([
          fetch(reviewsUrl),
          fetch(linkVisitUrl)
        ]);
        
        if (!ratingsResponse.ok) {
          const errorText = await ratingsResponse.text();
          console.error("Error response from reviews endpoint:", errorText);
          throw new Error(`Failed to fetch review data: ${ratingsResponse.status} ${errorText}`);
        }
        
        if (!linkDataResponse.ok) {
          const errorText = await linkDataResponse.text();
          console.error("Error response from link-visit endpoint:", errorText);
          throw new Error(`Failed to fetch link data: ${linkDataResponse.status} ${errorText}`);
        }
        
        const reviewData = await ratingsResponse.json();
        const linkData = await linkDataResponse.json();
        
        console.log("Received review data:", reviewData);
        console.log("Received link data:", linkData);
        
        // Check if reviewData.ratings exists
        if (!reviewData.ratings) {
          console.warn("reviewData.ratings is undefined or null", reviewData);
          reviewData.ratings = []; // Set a default empty array
        }
        
        const roundedLinkStatus = {
          linksSent: Math.round(linkData.linkStatus?.linksSent || 0),
          linksViewed: Math.round(linkData.linkStatus?.linksViewed || 0)
        };
        
        // Transform ratings to new scale: 1-4 Bad, 4-7 Neutral, 7-10 Good
        // Check if we have the original rating data or need to convert it
        let purpleRatings: ReviewRating[] = [];
        
        if (reviewData.ratings && Array.isArray(reviewData.ratings)) {
          // Group existing ratings into the new scale if they exist
          const goodRatings = reviewData.ratings.filter((r: ReviewRating) => 
            r.name === "Very Good" || r.name === "Good" || 
            (r.range && parseFloat(r.range.split('-')[0]) >= 7)
          );
          
          const neutralRatings = reviewData.ratings.filter((r: ReviewRating) => 
            r.name === "Neutral" || 
            (r.range && parseFloat(r.range.split('-')[0]) >= 4 && parseFloat(r.range.split('-')[1]) < 7)
          );
          
          const badRatings = reviewData.ratings.filter((r: ReviewRating) => 
            r.name === "Bad" || r.name === "Very Bad" || 
            (r.range && parseFloat(r.range.split('-')[1]) < 4)
          );
          
          // Calculate total values for each group
          const goodTotal = goodRatings.reduce((sum: number, r: ReviewRating) => sum + r.value, 0);
          const neutralTotal = neutralRatings.reduce((sum: number, r: ReviewRating) => sum + r.value, 0);
          const badTotal = badRatings.reduce((sum: number, r: ReviewRating) => sum + r.value, 0);
          
          // Create new rating objects with our scale
          purpleRatings = [
            { name: "Good", value: goodTotal, color: purpleColors[0], range: "7-10" },
            { name: "Neutral", value: neutralTotal, color: purpleColors[1], range: "4-7" },
            { name: "Bad", value: badTotal, color: purpleColors[2], range: "1-4" }
          ].filter(r => r.value > 0);
        } else {
          purpleRatings = [];
        }
        
        // Set some dummy data if no ratings (for development/testing)
        if (purpleRatings.length === 0 || purpleRatings.every((r: ReviewRating) => r.value === 0)) {
          console.log("No ratings data found, using dummy data for development");
          // Comment this out in production
          /* 
          purpleRatings = [
            { name: "Good", value: 12, color: purpleColors[0], range: "7-10" },
            { name: "Neutral", value: 8, color: purpleColors[1], range: "4-7" },
            { name: "Bad", value: 5, color: purpleColors[2], range: "1-4" }
          ];
          */
        }
        
        setData({
          ratings: purpleRatings,
          linkStatus: roundedLinkStatus,
          recentLinks: linkData.recentLinks || []
        });
        
        console.log("Data processed and state updated:", {
          ratings: purpleRatings,
          linkStatus: roundedLinkStatus,
          recentLinks: linkData.recentLinks || []
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching data:', err);
        
        // Set empty data when there's an error
        setData({
          ratings: [],
          linkStatus: {
            linksSent: 0,
            linksViewed: 0
          },
          recentLinks: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  const handlePieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const handleLinkClick = async (linkId: string) => {
    try {
      setData(prevData => ({
        ...prevData,
        recentLinks: prevData.recentLinks.map(link => 
          link.id === linkId ? { ...link, clicked: true } : link
        )
      }));
      
      const response = await fetch('/api/link-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkId: linkId
        })
      });
      
      const resData = await response.json();
      if (resData.success) {
        setData(prevData => ({
          ...prevData,
          linkStatus: {
            ...prevData.linkStatus,
            linksViewed: Math.round(prevData.linkStatus.linksViewed + 1)
          }
        }));
      } else {
        console.error('Error updating link status:', resData.error);
      }
    } catch (error) {
      console.error('Error calling link-click API:', error);
    }
  };

  const clickRate = data.linkStatus.linksSent > 0 
    ? Math.round((data.linkStatus.linksViewed / data.linkStatus.linksSent) * 100) 
    : 0;

  const linkEngagementChartData = [
    {
      name: 'Links',
      Sent: data.linkStatus.linksSent,
      Clicked: data.linkStatus.linksViewed,
    }
  ];

  const customStyles = {
    "--color-rating-0": purpleColors[0],
    "--color-rating-1": purpleColors[1],
    "--color-rating-2": purpleColors[2],
    "--color-rating-3": purpleColors[3],
    "--color-rating-4": purpleColors[4],
    "--color-link-0": purpleColors[0],
    "--color-link-1": purpleColors[1],
  } as React.CSSProperties;

  // Update the chart config to explicitly set fill colors
  const getReviewChartConfig = () => {
    const config: Record<string, { label: string; color?: string }> = { 
      total: { label: "Total" } 
    };
    
    data.ratings.forEach((item, index) => {
      config[item.name.toLowerCase().replace(/\s+/g, '_')] = {
        label: item.name,
        color: purpleColors[index % purpleColors.length],
      };
    });
    
    return config;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
    </div>
  );
  
  if (error) return (
    <div className="flex items-center justify-center h-64 text-destructive">
      <p>Error: {error}</p>
    </div>
  );

  // Improved check for ratings data
  const hasRatingsData = data.ratings && 
    data.ratings.length > 0 && 
    data.ratings.some(rating => rating.value > 0);
  
  // Log the current state to help with debugging
  console.log("Current state in render:", {
    hasRatingsData,
    ratings: data.ratings,
    filteredRatings: data.ratings?.filter(rating => rating.value > 0)
  });
  
  const hasLinkEngagementData = data.linkStatus && (data.linkStatus.linksSent > 0 || data.linkStatus.linksViewed > 0);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6" style={customStyles}>
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm md:text-base font-medium flex items-center gap-2">
              <span className="bg-purple-100 dark:bg-purple-900/30 p-1.5 rounded-md">
                <ArrowUpRight size={16} className="text-purple-600 dark:text-purple-400" />
              </span>
              Review Rating
            </CardTitle>
            <Badge variant="outline" className="text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800">
              Ratings
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[280px] md:h-[300px]">
            {!hasRatingsData ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No ratings data available for the selected period
              </div>
            ) : (
              <ChartContainer
                config={getReviewChartConfig()}
                className="mx-auto h-full w-full flex items-center justify-center"
              >
                <PieChart width={300} height={300}>
                  <ChartTooltip
                    cursor={false}
                    content={(props: any) => {
                      if (props.payload && props.payload.length > 0) {
                        const { name, value, payload } = props.payload[0];
                        const range = payload.range;
                        const total = data.ratings.reduce((sum, item) => sum + item.value, 0);
                        const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold">{name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {value.toLocaleString()} reviews
                                </span>
                                {range && (
                                  <span className="text-xs text-muted-foreground">
                                    Rating: {range}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-col text-right">
                                <span className="text-sm font-bold">{percentage}%</span>
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
                    data={data.ratings.filter(rating => rating.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    strokeWidth={5}
                  >
                    {data.ratings.filter(rating => rating.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    <Label
                      content={(props) => {
                        const { viewBox } = props;
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          const totalRatings = data.ratings.reduce((sum, item) => sum + item.value, 0);
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
                                {totalRatings.toLocaleString()}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 24}
                                className="fill-muted-foreground"
                              >
                                Reviews
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
      </Card>
      
      <Card>
        <CardHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm md:text-base font-medium flex items-center gap-2">
              <span className="bg-purple-100 dark:bg-purple-900/30 p-1.5 rounded-md">
                <Send size={16} className="text-purple-600 dark:text-purple-400" />
              </span>
              SMS Link Engagement
            </CardTitle>
            <Badge variant="outline" className="text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800">
              {clickRate}% Success Rate
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-6">
            {!hasLinkEngagementData ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                No link engagement data available for the selected period
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 md:gap-4 text-center">
                  <div className="p-3 md:p-4 rounded-lg border">
                    <div className="text-purple-600 dark:text-purple-400 text-lg md:text-2xl font-bold">{data.linkStatus.linksSent}</div>
                    <div className="text-muted-foreground text-xs md:text-sm">Links Sent</div>
                  </div>
                  <div className="p-3 md:p-4 rounded-lg border">
                    <div className="text-purple-500 dark:text-purple-300 text-lg md:text-2xl font-bold">{data.linkStatus.linksViewed}</div>
                    <div className="text-muted-foreground text-xs md:text-sm">Links Clicked</div>
                  </div>
                  <div className="p-3 md:p-4 rounded-lg border">
                    <div className={`text-lg md:text-2xl font-bold ${
                      clickRate > 50 ? 'text-purple-600' : 
                      clickRate > 30 ? 'text-purple-500' : 
                      'text-purple-400'
                    }`}>
                      {clickRate}%
                    </div>
                    <div className="text-muted-foreground text-xs md:text-sm">Click Rate</div>
                  </div>
                </div>
                
                <div className="space-y-2 p-4 rounded-lg border">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="flex items-center gap-1">
                      <RefreshCw size={14} className="text-purple-600 dark:text-purple-400" />
                      Link Click Performance
                    </span>
                    <span className={`text-sm font-medium ${
                      clickRate > 50 ? 'text-purple-600 dark:text-purple-400' : 
                      clickRate > 30 ? 'text-purple-500 dark:text-purple-300' : 
                      'text-purple-400 dark:text-purple-200'
                    }`}>
                      {clickRate}% clicked
                    </span>
                  </div>
                  <Progress value={clickRate} className="h-3 bg-purple-100 dark:bg-purple-900/30">
                    <div 
                      className="h-full rounded-full"
                      style={{ 
                        width: `${clickRate}%`,
                        backgroundColor: clickRate > 50 ? purpleColors[0] : 
                                        clickRate > 30 ? purpleColors[1] : 
                                        purpleColors[2] 
                      }}
                    ></div>
                  </Progress>
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">
                      <CheckCircle size={12} className="text-purple-500 dark:text-purple-300" />
                      {data.linkStatus.linksViewed} clicked
                    </span>
                    <span>{data.linkStatus.linksSent} total sent</span>
                  </div>
                </div>
                
                <div className="h-[140px] p-4 rounded-lg border">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={linkEngagementChartData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis 
                        type="number" 
                        tickFormatter={(value: any) => String(Math.round(value))}
                        allowDecimals={false}
                      />
                      <YAxis type="category" dataKey="name" tick={false} />
                      <Tooltip />
                      <Legend iconType="circle" />
                      <Bar dataKey="Sent" fill={purpleColors[0]} radius={[0, 4, 4, 0]} />
                      <Bar dataKey="Clicked" fill={purpleColors[1]} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}