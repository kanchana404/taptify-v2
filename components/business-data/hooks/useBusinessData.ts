import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { 
  BusinessLocation, 
  BusinessAccount, 
  BusinessPhoto, 
  BusinessPost, 
  AnalyticsData, 
  BusinessStats,
  PostFormData 
} from '../types';

export function useBusinessData(userId?: string) {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Business data state
  const [accounts, setAccounts] = useState<BusinessAccount[]>([]);
  const [locations, setLocations] = useState<BusinessLocation[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [locationDetails, setLocationDetails] = useState<BusinessLocation | null>(null);
  const [detailedBusinessInfo, setDetailedBusinessInfo] = useState<any>(null);
  
  // Content state
  const [reviews, setReviews] = useState<any[]>([]);
  const [photos, setPhotos] = useState<BusinessPhoto[]>([]);
  const [posts, setPosts] = useState<BusinessPost[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [businessStats, setBusinessStats] = useState<BusinessStats | null>(null);
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
  
  // Loading states
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  
  // Stats date range
  const [statsDateRange, setStatsDateRange] = useState({
    startDate: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    endDate: format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), 'yyyy-MM-dd')
  });

  // Add new state for tracking token refresh attempts
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  const [tokenRefreshAttempts, setTokenRefreshAttempts] = useState(0);
  const maxTokenRefreshAttempts = 2;

  // Add state for tracking data loading completion
  const [dataLoadProgress, setDataLoadProgress] = useState({
    accounts: false,
    locations: false,
    reviews: false,
    photos: false,
    posts: false,
    analytics: false,
    businessStats: false,
    detailedBusinessInfo: false,
  });

  // Add state for tracking error toasts to prevent spam
  const [errorToastShown, setErrorToastShown] = useState({
    accounts: false,
    locations: false,
    reviews: false,
    photos: false,
    posts: false,
    analytics: false,
    businessStats: false,
    detailedBusinessInfo: false,
  });

  // Function to check if all data is loaded
  const isAllDataLoaded = () => {
    return Object.values(dataLoadProgress).every(loaded => loaded);
  };

  // Function to reset data load progress
  const resetDataLoadProgress = () => {
    setDataLoadProgress({
      accounts: false,
      locations: false,
      reviews: false,
      photos: false,
      posts: false,
      analytics: false,
      businessStats: false,
      detailedBusinessInfo: false,
    });
    // Also reset error toast tracking
    setErrorToastShown({
      accounts: false,
      locations: false,
      reviews: false,
      photos: false,
      posts: false,
      analytics: false,
      businessStats: false,
      detailedBusinessInfo: false,
    });
  };

  // Function to show success message only when all data is loaded
  const showSuccessMessageIfComplete = () => {
    if (isAllDataLoaded()) {
      // Only show success message if we're not in the middle of a refresh
      if (!refreshing && !isRefreshingToken) {
        toast.success('Business data loaded successfully');
      }
      // Reset progress after showing success message
      resetDataLoadProgress();
    }
  };

  // Check connection and load initial data
  const checkConnectionAndLoadData = async () => {
    try {
      setLoading(true);
      
      // Reset data load progress for new load cycle
      resetDataLoadProgress();
      
      const statusResponse = await fetch('/api/business?type=connection-status');
      const statusData = await statusResponse.json();
      
      if (statusData.connected) {
        setIsConnected(true);
        await loadBusinessData();
      } else {
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
      setIsConnected(false);
      toast.error('Failed to check connection status');
    } finally {
      setLoading(false);
    }
  };

  // New function to handle automatic token refresh
  const handleTokenExpiration = async (operation: () => Promise<void>) => {
    if (tokenRefreshAttempts >= maxTokenRefreshAttempts) {
      toast.error('Authentication expired. Please reconnect your Google Business account.');
      setIsConnected(false);
      return;
    }

    try {
      setIsRefreshingToken(true);
      setTokenRefreshAttempts(prev => prev + 1);
      
      // Attempt to refresh the token by calling the connection status endpoint
      const refreshResponse = await fetch('/api/business?type=connection-status');
      const refreshData = await refreshResponse.json();
      
      if (refreshData.connected && refreshData.accessToken) {
        // Token was refreshed successfully, retry the original operation
        await operation();
        setTokenRefreshAttempts(0); // Reset attempts on success
      } else {
        // Token refresh failed
        toast.error('Authentication expired. Please reconnect your Google Business account.');
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      toast.error('Authentication expired. Please reconnect your Google Business account.');
      setIsConnected(false);
    } finally {
      setIsRefreshingToken(false);
    }
  };

  // Wrapper function for API calls that handles token expiration automatically
  const apiCallWithTokenRefresh = async (
    apiCall: () => Promise<Response>,
    operation: () => Promise<void>
  ) => {
    try {
      const response = await apiCall();
      
      if (response.status === 401) {
        // Token expired, attempt automatic refresh
        await handleTokenExpiration(operation);
      } else if (!response.ok) {
        // Other error, don't attempt token refresh
        const errorData = await response.json();
        throw new Error(errorData.error || 'API request failed');
      }
      
      return response;
    } catch (error) {
      if (error instanceof Error && error.message.includes('401')) {
        // Handle 401 errors that might be caught in the catch block
        await handleTokenExpiration(operation);
      } else {
        throw error;
      }
    }
  };

  // Load business accounts with automatic token refresh
  const loadBusinessData = async () => {
    try {
      const response = await apiCallWithTokenRefresh(
        () => fetch('/api/business?type=accounts'),
        loadBusinessData
      );
      
      if (response) {
        const accountsData = await response.json();
        setAccounts(accountsData.accounts || []);
        
        if (accountsData.accounts?.length > 0) {
          const firstAccount = accountsData.accounts[0].name;
          setSelectedAccount(firstAccount);
          await loadLocations(firstAccount);
        }
        
        // Mark accounts as loaded and reset error toast flag
        setDataLoadProgress(prev => ({ ...prev, accounts: true }));
        setErrorToastShown(prev => ({ ...prev, accounts: false }));
        showSuccessMessageIfComplete();
      }
    } catch (error) {
      console.error('Error loading business data:', error);
      // Only show error toast for genuine failures, not during token refresh or retry attempts
      // And only show once per loading cycle
      if (error instanceof Error && 
          !error.message?.includes('401') && 
          !isRefreshingToken && 
          !error.message?.includes('Failed to fetch') &&
          !error.message?.includes('NetworkError') &&
          !errorToastShown.accounts) {
        toast.error('Failed to load business data');
        setErrorToastShown(prev => ({ ...prev, accounts: true }));
      }
    }
  };

  // Load locations for an account with automatic token refresh
  const loadLocations = async (accountName: string) => {
    try {
      console.log('=== LOADING LOCATIONS ===');
      console.log('Account name:', accountName);
      
      const response = await apiCallWithTokenRefresh(
        () => fetch(`/api/business?type=locations&accountName=${encodeURIComponent(accountName)}`),
        () => loadLocations(accountName)
      );
      
      if (response) {
        const locationsData = await response.json();
        console.log('Raw locations response:', locationsData);
        
        if (locationsData.locations && locationsData.locations.length > 0) {
          console.log('Number of locations:', locationsData.locations.length);
          locationsData.locations.forEach((loc: any, index: number) => {
            console.log(`Location ${index + 1}:`, {
              name: loc.name,
              title: loc.title,
              fullObject: loc
            });
          });
        }
        
        setLocations(locationsData.locations || []);
        
        if (locationsData.locations?.length > 0) {
          const firstLocation = locationsData.locations[0].name;
          console.log('Setting first location as selected:', firstLocation);
          setSelectedLocation(firstLocation);
          setLocationDetails(locationsData.locations[0]);
          
          // Load all data in parallel and track progress
          const loadPromises = [
            loadReviews(accountName, firstLocation),
            loadPhotos(accountName, firstLocation),
            loadPosts(accountName, firstLocation),
            loadAnalytics(accountName, firstLocation),
            loadBusinessStats(),
            loadDetailedBusinessInfo(firstLocation)
          ];
          
          await Promise.all(loadPromises);
        }
        
        // Mark locations as loaded and reset error toast flag
        setDataLoadProgress(prev => ({ ...prev, locations: true }));
        setErrorToastShown(prev => ({ ...prev, locations: false }));
        showSuccessMessageIfComplete();
      }
      console.log('=== END LOADING LOCATIONS ===');
    } catch (error) {
      console.error('Error loading locations:', error);
      // Only show error toast for genuine failures, not during token refresh or retry attempts
      // And only show once per loading cycle
      if (error instanceof Error && 
          !error.message?.includes('401') && 
          !isRefreshingToken && 
          !error.message?.includes('Failed to fetch') &&
          !error.message?.includes('NetworkError') &&
          !errorToastShown.locations) {
        toast.error('Failed to load locations');
        setErrorToastShown(prev => ({ ...prev, locations: true }));
      }
    }
  };

  // Load reviews with automatic token refresh
  const loadReviews = async (accountName: string, locationName: string) => {
    try {
      const response = await apiCallWithTokenRefresh(
        () => fetch(`/api/business?type=reviews&accountName=${encodeURIComponent(accountName)}&locationName=${encodeURIComponent(locationName)}`),
        () => loadReviews(accountName, locationName)
      );
      
      if (response) {
        const reviewsData = await response.json();
        setReviews(reviewsData.reviews || []);
        
        // Mark reviews as loaded and reset error toast flag
        setDataLoadProgress(prev => ({ ...prev, reviews: true }));
        setErrorToastShown(prev => ({ ...prev, reviews: false }));
        showSuccessMessageIfComplete();
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
      // Only show error toast for genuine failures, not during token refresh or retry attempts
      // And only show once per loading cycle
      if (error instanceof Error && 
          !error.message?.includes('401') && 
          !isRefreshingToken && 
          !error.message?.includes('Failed to fetch') &&
          !error.message?.includes('NetworkError') &&
          !errorToastShown.reviews) {
        toast.error('Failed to load reviews');
        setErrorToastShown(prev => ({ ...prev, reviews: true }));
      }
    }
  };

  // Load photos with automatic token refresh
  const loadPhotos = async (accountName: string, locationName: string) => {
    try {
      setLoadingPhotos(true);
      const response = await apiCallWithTokenRefresh(
        () => fetch(`/api/business?type=photos&accountName=${encodeURIComponent(accountName)}&locationName=${encodeURIComponent(locationName)}`),
        () => loadPhotos(accountName, locationName)
      );
      
      if (response) {
        const photosData = await response.json();
        console.log('Photos API response:', photosData);
        console.log('Photos data structure:', {
          hasPhotos: !!photosData.photos,
          photosLength: photosData.photos?.length || 0,
          photosType: typeof photosData.photos,
          isArray: Array.isArray(photosData.photos),
          total: photosData.total,
          parentPath: photosData.parentPath
        });
        
        const photosArray = photosData.photos || [];
        console.log('Setting photos in state:', {
          photosArrayLength: photosArray.length,
          photosArrayType: typeof photosArray,
          isArray: Array.isArray(photosArray),
          firstPhoto: photosArray[0] || 'no photos'
        });
        
        setPhotos(photosArray);
        
        // Mark photos as loaded and reset error toast flag
        setDataLoadProgress(prev => ({ ...prev, photos: true }));
        setErrorToastShown(prev => ({ ...prev, photos: false }));
        showSuccessMessageIfComplete();
      }
    } catch (error) {
      console.error('Error loading photos:', error);
      // Only show error toast for genuine failures, not during token refresh or retry attempts
      // And only show once per loading cycle
      if (error instanceof Error && 
          !error.message?.includes('401') && 
          !isRefreshingToken && 
          !error.message?.includes('Failed to fetch') &&
          !error.message?.includes('NetworkError') &&
          !errorToastShown.photos) {
       
        setErrorToastShown(prev => ({ ...prev, photos: true }));
      }
    } finally {
      setLoadingPhotos(false);
    }
  };

  // Load posts with automatic token refresh
  const loadPosts = async (accountName: string, locationName: string) => {
    try {
      const response = await apiCallWithTokenRefresh(
        () => fetch(`/api/business?type=posts&accountName=${encodeURIComponent(accountName)}&locationName=${encodeURIComponent(locationName)}`),
        () => loadPosts(accountName, locationName)
      );
      
      if (response) {
        const postsData = await response.json();
        setPosts(postsData.posts || []);
        
        // Mark posts as loaded and reset error toast flag
        setDataLoadProgress(prev => ({ ...prev, posts: true }));
        setErrorToastShown(prev => ({ ...prev, posts: false }));
        showSuccessMessageIfComplete();
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      // Only show error toast for genuine failures, not during token refresh or retry attempts
      // And only show once per loading cycle
      if (error instanceof Error && 
          !error.message?.includes('401') && 
          !isRefreshingToken && 
          !error.message?.includes('Failed to fetch') &&
          !error.message?.includes('NetworkError') &&
          !errorToastShown.posts) {
      
        setErrorToastShown(prev => ({ ...prev, posts: true }));
      }
    }
  };

  // Load analytics with automatic token refresh
  const loadAnalytics = async (accountName: string, locationName: string) => {
    try {
      const response = await apiCallWithTokenRefresh(
        () => fetch(`/api/business?type=analytics&accountName=${encodeURIComponent(accountName)}&locationName=${encodeURIComponent(locationName)}`),
        () => loadAnalytics(accountName, locationName)
      );
      
      if (response) {
        const analyticsData = await response.json();
        setAnalytics(analyticsData);
        
        // Mark analytics as loaded and reset error toast flag
        setDataLoadProgress(prev => ({ ...prev, analytics: true }));
        setErrorToastShown(prev => ({ ...prev, analytics: false }));
        showSuccessMessageIfComplete();
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      // Only show error toast for genuine failures, not during token refresh or retry attempts
      // And only show once per loading cycle
      if (error instanceof Error && 
          !error.message?.includes('401') && 
          !isRefreshingToken && 
          !error.message?.includes('Failed to fetch') &&
          !error.message?.includes('NetworkError') &&
          !errorToastShown.analytics) {
      
        setErrorToastShown(prev => ({ ...prev, analytics: true }));
      }
    }
  };

  // Load detailed business info with automatic token refresh
  const loadDetailedBusinessInfo = async (locationName: string) => {
    try {
      const locationId = locationName.split('/').pop();

      const response = await apiCallWithTokenRefresh(
        () => fetch(`/api/business/details?locationId=${locationId}`),
        () => loadDetailedBusinessInfo(locationName)
      );
      
      if (response) {
        const result = await response.json();
        if (result.success && result.data) {
          setDetailedBusinessInfo(result.data);
        }
        
        // Mark detailed business info as loaded and reset error toast flag
        setDataLoadProgress(prev => ({ ...prev, detailedBusinessInfo: true }));
        setErrorToastShown(prev => ({ ...prev, detailedBusinessInfo: false }));
        showSuccessMessageIfComplete();
      }
    } catch (error) {
      console.error('Error loading detailed business info:', error);
      // Only show error toast for genuine failures, not during token refresh or retry attempts
      // And only show once per loading cycle
      if (error instanceof Error && 
          !error.message?.includes('401') && 
          !isRefreshingToken && 
          !error.message?.includes('Failed to fetch') &&
          !error.message?.includes('NetworkError') &&
          !errorToastShown.detailedBusinessInfo) {
        toast.error('Failed to load detailed business info');
        setErrorToastShown(prev => ({ ...prev, detailedBusinessInfo: true }));
      }
    }
  };

  // Load business stats with automatic token refresh
  const loadBusinessStats = async (locationId?: string, customDateRange?: { startDate: string; endDate: string }) => {
    try {
      setLoadingStats(true);
      
      const locId = locationId || selectedLocation?.split('/').pop() || '3225894654666374777';
      
      const dateRange = customDateRange || statsDateRange;
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      
      if (startDate > endDate) {
        toast.error('Start date cannot be after end date');
        return;
      }
      
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 365) {
        toast.error('Date range cannot exceed 1 year');
        return;
      }
      
      const params = new URLSearchParams({
        locationId: locId,
        startYear: startDate.getFullYear().toString(),
        startMonth: (startDate.getMonth() + 1).toString(),
        startDay: startDate.getDate().toString(),
        endYear: endDate.getFullYear().toString(),
        endMonth: (endDate.getMonth() + 1).toString(),
        endDay: endDate.getDate().toString(),
      });

      const response = await apiCallWithTokenRefresh(
        () => fetch(`/api/business/stats?${params}`),
        () => loadBusinessStats(locationId, customDateRange)
      );
      
      if (response) {
        const data = await response.json();
        setBusinessStats(data);
        
        // Mark business stats as loaded and reset error toast flag
        setDataLoadProgress(prev => ({ ...prev, businessStats: true }));
        setErrorToastShown(prev => ({ ...prev, businessStats: false }));
        showSuccessMessageIfComplete();
      }
    } catch (error) {
      console.error('Error loading business stats:', error);
      // Only show error toast for genuine failures, not during token refresh or retry attempts
      // And only show once per loading cycle
      if (error instanceof Error && 
          !error.message?.includes('401') && 
          !isRefreshingToken && 
          !error.message?.includes('Failed to fetch') &&
          !error.message?.includes('NetworkError') &&
          !errorToastShown.businessStats) {
        toast.error('Error loading business stats');
        setErrorToastShown(prev => ({ ...prev, businessStats: true }));
      }
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch scheduled posts for the user
  const loadScheduledPosts = async () => {
    if (!userId) return;
    try {
      // Get location_id from storage
      let locationId = localStorage.getItem('selectedLocationId') || sessionStorage.getItem('selectedLocationId');
      
      console.log('loadScheduledPosts - userId:', userId);
      console.log('loadScheduledPosts - locationId from storage:', locationId);
      
      // If no location ID in storage, try to extract from selectedLocation
      if (!locationId && selectedLocation) {
        const parts = selectedLocation.split('/');
        locationId = parts[parts.length - 1];
        console.log('loadScheduledPosts - extracted locationId from selectedLocation:', locationId);
      }
      
      const url = locationId 
        ? `/api/business/scheduled-posts?location_id=${locationId}`
        : '/api/business/scheduled-posts';
      
      console.log('loadScheduledPosts - fetching from URL:', url);
      
      const res = await fetch(url);
      const data = await res.json();
      console.log('loadScheduledPosts - response:', data);
      
      if (data.posts) setScheduledPosts(data.posts);
      else setScheduledPosts([]);
    } catch (error) {
      console.error('loadScheduledPosts - error:', error);
      setScheduledPosts([]);
    }
  };



  // Handle account change
  const handleAccountChange = async (accountName: string) => {
    setSelectedAccount(accountName);
    setSelectedLocation('');
    setLocationDetails(null);
    setReviews([]);
    setPhotos([]);
    setPosts([]);
    setAnalytics(null);
    setBusinessStats(null);
    await loadLocations(accountName);
  };

  // Handle location change
  const handleLocationChange = async (locationName: string) => {
    console.log('=== LOCATION CHANGE DEBUG ===');
    console.log('locationName received:', locationName);
    console.log('locationName type:', typeof locationName);
    console.log('locationName length:', locationName?.length);
    
    setSelectedLocation(locationName);
    const location = locations.find(loc => loc.name === locationName);
    setLocationDetails(location || null);
    
    console.log('Found location object:', location);
    
    // Extract location ID
    let locationId = null;
    
    if (locationName && typeof locationName === 'string') {
      console.log('Extracting location ID from:', locationName);
      
      // Check if it's already just a numeric ID
      if (/^\d+$/.test(locationName)) {
        locationId = locationName;
        console.log('Method 1 - Already numeric ID:', locationId);
      }
      // Check if it contains the pattern accounts/X/locations/Y
      else if (locationName.includes('accounts/') && locationName.includes('locations/')) {
        const match = locationName.match(/locations\/(\d+)/);
        if (match && match[1]) {
          locationId = match[1];
          console.log('Method 2 - Extracted from accounts/X/locations/Y pattern:', locationId);
        }
      }
      // Check if it starts with locations/
      else if (locationName.startsWith('locations/')) {
        const parts = locationName.split('/');
        if (parts.length >= 2) {
          locationId = parts[1];
          console.log('Method 3 - Extracted from locations/X pattern:', locationId);
        }
      }
      // Generic split by / and take last part
      else if (locationName.includes('/')) {
        const parts = locationName.split('/');
        const lastPart = parts[parts.length - 1];
        if (lastPart && lastPart !== '') {
          locationId = lastPart;
          console.log('Method 4 - Last part after splitting by /:', locationId);
        }
      }
      // Use the whole string as fallback
      else {
        locationId = locationName;
        console.log('Method 5 - Using whole string as fallback:', locationId);
      }
    }
    
    console.log('Final extracted locationId:', locationId);
    
    // Store in both localStorage and sessionStorage
    if (locationId && locationId !== 'null' && locationId !== '') {
      localStorage.setItem('selectedLocationId', locationId);
      sessionStorage.setItem('selectedLocationId', locationId);
      console.log('✅ Location ID stored successfully:', locationId);
      
      // Verify storage
      const storedLocal = localStorage.getItem('selectedLocationId');
      const storedSession = sessionStorage.getItem('selectedLocationId');
      console.log('Verification - localStorage:', storedLocal);
      console.log('Verification - sessionStorage:', storedSession);
    } else {
      console.error('❌ Failed to extract valid location ID from:', locationName);
      // Clear any existing invalid data
      localStorage.removeItem('selectedLocationId');
      sessionStorage.removeItem('selectedLocationId');
    }
    
    console.log('=== END LOCATION CHANGE DEBUG ===');
    
    if (location && selectedAccount) {
      await Promise.all([
        loadReviews(selectedAccount, locationName),
        loadPhotos(selectedAccount, locationName),
        loadPosts(selectedAccount, locationName),
        loadAnalytics(selectedAccount, locationName),
        loadBusinessStats(),
        loadDetailedBusinessInfo(locationName)
      ]);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await checkConnectionAndLoadData();
    if (selectedLocation) {
      await loadBusinessStats();
    }
    setRefreshing(false);
    toast.success('Business data refreshed');
  };

  // Utility function
  const calculateAverageRating = (reviews: any[]) => {
    if (!reviews.length) return 0;
    
    const ratings = reviews.map(review => {
      const rating = review.starRating;
      switch (rating) {
        case 'ONE': return 1;
        case 'TWO': return 2;
        case 'THREE': return 3;
        case 'FOUR': return 4;
        case 'FIVE': return 5;
        default: return 0;
      }
    }).filter(r => r > 0);
    
    return ratings.length > 0 ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 0;
  };

  return {
    // State
    isConnected,
    loading,
    refreshing,
    accounts,
    locations,
    selectedAccount,
    selectedLocation,
    locationDetails,
    detailedBusinessInfo,
    reviews,
    photos,
    posts,
    analytics,
    businessStats,
    loadingPhotos,
    loadingStats,
    statsDateRange,
    scheduledPosts,
    isRefreshingToken,
    tokenRefreshAttempts,
    
    // Actions
    checkConnectionAndLoadData,
    handleAccountChange,
    handleLocationChange,
    handleRefresh,
    loadPhotos,
    loadPosts,
    loadBusinessStats,
    setStatsDateRange,
    setPhotos,
    setPosts,
    loadScheduledPosts,
  };
}
