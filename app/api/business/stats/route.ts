import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/oauth-utils';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    // Get the current user from Clerk
    const { userId } = await auth();
    
    if (!userId) {
      console.log('No user ID found in session');
      return NextResponse.json(
        { error: 'User not authenticated. Please login.' },
        { status: 401 }
      );
    }

    // Get valid access token with automatic refresh
    const accessToken = await getValidAccessToken(userId);
    
    if (!accessToken) {
      console.log('No valid access token found for user:', userId);
      return NextResponse.json(
        { error: 'Google account not connected. Please connect your Google Business Profile.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId') || '3225894654666374777';
    const startYear = searchParams.get('startYear') || '2025';
    const startMonth = searchParams.get('startMonth') || '6';
    const startDay = searchParams.get('startDay') || '1';
    const endYear = searchParams.get('endYear') || '2025';
    const endMonth = searchParams.get('endMonth') || '6';
    const endDay = searchParams.get('endDay') || '30';

    // Fetch business performance metrics
    const metricsUrl = `https://businessprofileperformance.googleapis.com/v1/locations/${locationId}:fetchMultiDailyMetricsTimeSeries?dailyMetrics=WEBSITE_CLICKS&dailyMetrics=CALL_CLICKS&dailyRange.start_date.year=${startYear}&dailyRange.start_date.month=${startMonth}&dailyRange.start_date.day=${startDay}&dailyRange.end_date.year=${endYear}&dailyRange.end_date.month=${endMonth}&dailyRange.end_date.day=${endDay}`;
    
    const metricsResponse = await fetch(metricsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!metricsResponse.ok) {
      const errorData = await metricsResponse.text().catch(() => 'Unknown error');
      console.error('Metrics API Error:', {
        status: metricsResponse.status,
        statusText: metricsResponse.statusText,
        error: errorData,
        url: metricsUrl
      });
      
      if (metricsResponse.status === 401) {
        return NextResponse.json(
          { error: 'Access token expired or invalid. Please reconnect your Google account.' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to fetch metrics: ${metricsResponse.statusText}` },
        { status: metricsResponse.status }
      );
    }

    const metricsData = await metricsResponse.json();

    // Fetch business address information
    const addressUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/locations/${locationId}?readMask=storefrontAddress`;
    
    const addressResponse = await fetch(addressUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    let addressData = null;
    if (addressResponse.ok) {
      addressData = await addressResponse.json();
    }

    // Process and format the metrics data
    const processedData = {
      metrics: metricsData,
      address: addressData,
      summary: {
        totalCallClicks: 0,
        totalWebsiteClicks: 0,
        dateRange: {
          start: `${startYear}-${startMonth.padStart(2, '0')}-${startDay.padStart(2, '0')}`,
          end: `${endYear}-${endMonth.padStart(2, '0')}-${endDay.padStart(2, '0')}`
        }
      }
    };

    // Calculate totals from the metrics data
    if (metricsData?.multiDailyMetricTimeSeries?.[0]?.dailyMetricTimeSeries) {
      const timeSeries = metricsData.multiDailyMetricTimeSeries[0].dailyMetricTimeSeries;
      
      timeSeries.forEach((series: any) => {
        if (series.dailyMetric === 'CALL_CLICKS') {
          const callClicks = series.timeSeries?.datedValues
            ?.filter((item: any) => item.value)
            ?.reduce((sum: number, item: any) => sum + parseInt(item.value || '0'), 0) || 0;
          processedData.summary.totalCallClicks = callClicks;
        }
        
        if (series.dailyMetric === 'WEBSITE_CLICKS') {
          const websiteClicks = series.timeSeries?.datedValues
            ?.filter((item: any) => item.value)
            ?.reduce((sum: number, item: any) => sum + parseInt(item.value || '0'), 0) || 0;
          processedData.summary.totalWebsiteClicks = websiteClicks;
        }
      });
    }

    return NextResponse.json(processedData);
  } catch (error) {
    console.error('Error fetching business stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}