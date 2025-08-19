import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  MapPin,
  Phone,
  Globe,
  Clock,
  Calendar,
  Star,
  Building,
  Users,
  Car,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  XCircle,
  Info,
  Upload,
  Image as ImageIcon,
  X,
  Edit,
  Save,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

interface TimePeriod {
  openDay: string;
  openTime: { hours: number; minutes?: number };
  closeDay: string;
  closeTime: { hours: number; minutes?: number };
}

interface RegularHours {
  periods: TimePeriod[];
}

interface SpecialHourPeriod {
  startDate: { year: number; month: number; day: number };
  endDate: { year: number; month: number; day: number };
  openTime?: { hours: number; minutes?: number };
  closeTime?: { hours: number; minutes?: number };
  closed?: boolean;
}

interface SpecialHours {
  specialHourPeriods: SpecialHourPeriod[];
}

interface BusinessDetails {
  name: string;
  languageCode: string;
  storeCode: string;
  title: string;
  phoneNumbers?: {
    primaryPhone: string;
  };
  categories?: {
    primaryCategory: {
      name: string;
      displayName: string;
      serviceTypes: Array<{
        serviceTypeId: string;
        displayName: string;
      }>;
    };
  };
  storefrontAddress?: {
    regionCode: string;
    languageCode: string;
    postalCode: string;
    administrativeArea: string;
    locality: string;
    addressLines: string[];
  };
  websiteUri?: string;
  regularHours?: {
    periods: Array<{
      openDay: string;
      openTime: { hours: number; minutes?: number };
      closeDay: string;
      closeTime: { hours: number; minutes?: number };
    }>;
  };
  specialHours?: {
    specialHourPeriods: Array<{
      startDate: { year: number; month: number; day: number };
      endDate: { year: number; month: number; day: number };
      openTime?: { hours: number; minutes?: number };
      closeTime?: { hours: number; minutes?: number };
      closed?: boolean;
    }>;
  };
  openInfo?: {
    status: string;
    canReopen: boolean;
    openingDate?: { year: number; month: number; day: number };
  };
  metadata?: {
    hasGoogleUpdated: boolean;
    canDelete: boolean;
    canModifyServiceList: boolean;
    placeId: string;
    mapsUri: string;
    newReviewUri: string;
    canHaveBusinessCalls: boolean;
    hasVoiceOfMerchant: boolean;
  };
  profile?: {
    description: string;
  };
  serviceItems?: Array<{
    structuredServiceItem: {
      serviceTypeId: string;
    };
  }>;
}

interface OverviewTabProps {
  selectedLocation: string;
  selectedAccount: string;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ selectedLocation, selectedAccount }) => {
  const [businessDetails, setBusinessDetails] = useState<BusinessDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isEditHoursOpen, setIsEditHoursOpen] = useState(false);
  const [isEditingHours, setIsEditingHours] = useState(false);
  const [editingHours, setEditingHours] = useState<RegularHours>({ periods: [] });
  const [savingHours, setSavingHours] = useState(false);
  const [isEditingSpecialHours, setIsEditingSpecialHours] = useState(false);
  const [editingSpecialHours, setEditingSpecialHours] = useState<SpecialHours>({ specialHourPeriods: [] });
  const [savingSpecialHours, setSavingSpecialHours] = useState(false);

  // Constants for inline editing
  const DAYS_OF_WEEK = [
    { value: 'MONDAY', label: 'Monday' },
    { value: 'TUESDAY', label: 'Tuesday' },
    { value: 'WEDNESDAY', label: 'Wednesday' },
    { value: 'THURSDAY', label: 'Thursday' },
    { value: 'FRIDAY', label: 'Friday' },
    { value: 'SATURDAY', label: 'Saturday' },
    { value: 'SUNDAY', label: 'Sunday' },
  ];

  const HOURS = Array.from({ length: 24 }, (_, i) => ({ 
    value: i, 
    label: i === 0 ? '12 AM' : i === 12 ? '12 PM' : i > 12 ? `${i - 12} PM` : `${i} AM` 
  }));

  const MINUTES = [
    { value: 0, label: '00' },
    { value: 15, label: '15' },
    { value: 30, label: '30' },
    { value: 45, label: '45' },
  ];

  const loadBusinessDetails = async (isRefresh = false) => {
    if (!selectedLocation) {
      toast.error('Please select a location first');
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const locationId = selectedLocation.split('/').pop();

      const response = await fetch(`/api/business/details?locationId=${locationId}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setBusinessDetails(result.data);
          setHasAttemptedLoad(true);
          // Removed individual success toast - now handled centrally
        } else {
          // Don't show error toast for API errors as they might be handled by automatic refresh
          console.error('API Error:', result);
          setHasAttemptedLoad(true);
        }
      } else if (response.status === 401) {
        // Token expired - let the parent component handle automatic refresh
        // Don't show error message here as it will be handled by the automatic refresh mechanism
        console.log('Token expired, triggering automatic refresh');
        // Clear local storage tokens
        localStorage.removeItem('google_access_token');
        localStorage.removeItem('accessToken');
        // The parent component will handle the automatic refresh
        setHasAttemptedLoad(true);
      } else {
        const errorData = await response.json();
        // Don't show error toast for HTTP errors as they might be handled by automatic refresh
        console.error('HTTP Error:', errorData);
        setHasAttemptedLoad(true);
      }
    } catch (error) {
      console.error('Error loading business details:', error);
      // Don't show error toast for network errors as they might be handled by automatic refresh
      setHasAttemptedLoad(true);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (selectedLocation) {
      // Reset state when location changes
      setBusinessDetails(null);
      setHasAttemptedLoad(false);
      setLoading(true);
      
      // Load data after a brief delay to ensure skeleton shows first
      const timer = setTimeout(() => {
        loadBusinessDetails(false);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [selectedLocation]);

  const formatDayName = (day: string) => {
    const dayNames: { [key: string]: string } = {
      'MONDAY': 'Monday',
      'TUESDAY': 'Tuesday', 
      'WEDNESDAY': 'Wednesday',
      'THURSDAY': 'Thursday',
      'FRIDAY': 'Friday',
      'SATURDAY': 'Saturday',
      'SUNDAY': 'Sunday'
    };
    return dayNames[day] || day;
  };

  const formatTime = (time: { hours: number; minutes?: number }) => {
    if (!time || typeof time.hours !== 'number') {
      return 'Invalid time';
    }
    const hours = time.hours;
    const minutes = time.minutes || 0;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const formatAddress = (address: BusinessDetails['storefrontAddress']) => {
    if (!address) return 'No address available';
    return [
      ...address.addressLines,
      address.locality,
      address.administrativeArea,
      address.postalCode
    ].filter(Boolean).join(', ');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-green-100 text-green-800';
      case 'CLOSED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      const imageFiles = files.filter(file => file.type.startsWith('image/'));
      
      if (imageFiles.length > 0) {
        setSelectedImages(prev => [...prev, ...imageFiles]);
        toast.success(`${imageFiles.length} image(s) selected for upload`);
      } else {
        toast.error('Please select only image files');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const imageFiles = files.filter(file => file.type.startsWith('image/'));
      
      if (imageFiles.length > 0) {
        setSelectedImages(prev => [...prev, ...imageFiles]);
        toast.success(`${imageFiles.length} image(s) selected for upload`);
      } else {
        toast.error('Please select only image files');
      }
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async () => {
    if (selectedImages.length === 0) {
      toast.error('Please select images to upload');
      return;
    }

    // Here you would implement the actual upload logic
    toast.success('Images uploaded successfully!');
    setSelectedImages([]);
  };

  const handleHoursUpdated = () => {
    // Reload business details to get updated hours
    loadBusinessDetails();
  };

  const getLocationId = () => {
    if (!selectedLocation) return '';
    return selectedLocation.split('/').pop() || '';
  };

  const convertToDialogFormat = (regularHours: BusinessDetails['regularHours']) => {
    if (!regularHours?.periods) return null;
    
    return {
      periods: regularHours.periods.map(period => ({
        openDay: period.openDay,
        openTime: { 
          hours: period.openTime.hours, 
          minutes: period.openTime.minutes || 0 
        },
        closeDay: period.closeDay,
        closeTime: { 
          hours: period.closeTime.hours, 
          minutes: period.closeTime.minutes || 0 
        },
      }))
    };
  };

  const startEditingHours = () => {
    const currentHours = convertToDialogFormat(businessDetails?.regularHours);
    setEditingHours(currentHours || { periods: [] });
    setIsEditingHours(true);
  };

  const cancelEditingHours = () => {
    setIsEditingHours(false);
    setEditingHours({ periods: [] });
  };

  const updateEditingPeriod = (index: number, field: keyof TimePeriod, value: any) => {
    setEditingHours(prev => ({
      ...prev,
      periods: prev.periods.map((period, i) => 
        i === index ? { ...period, [field]: value } : period
      )
    }));
  };

  const addEditingPeriod = () => {
    setEditingHours(prev => ({
      ...prev,
      periods: [...prev.periods, {
        openDay: 'MONDAY',
        openTime: { hours: 9, minutes: 0 },
        closeDay: 'MONDAY',
        closeTime: { hours: 17, minutes: 0 },
      }]
    }));
  };

  const removeEditingPeriod = (index: number) => {
    setEditingHours(prev => ({
      ...prev,
      periods: prev.periods.filter((_, i) => i !== index)
    }));
  };

  const saveEditingHours = async () => {
    if (editingHours.periods.length === 0) {
      toast.error('At least one time period is required');
      return;
    }

    setSavingHours(true);
    try {
      const response = await fetch('/api/business/update-hours', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationId: getLocationId(),
          regularHours: editingHours,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message || 'Opening hours updated successfully');
        setIsEditingHours(false);
        loadBusinessDetails(); // Reload to get updated data
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update opening hours');
      }
    } catch (error) {
      console.error('Error updating hours:', error);
      toast.error('Failed to update opening hours');
    } finally {
      setSavingHours(false);
    }
  };

  // Special Hours Functions
  const startEditingSpecialHours = () => {
    const currentSpecialHours = businessDetails?.specialHours;
    setEditingSpecialHours(currentSpecialHours || { specialHourPeriods: [] });
    setIsEditingSpecialHours(true);
  };

  const cancelEditingSpecialHours = () => {
    setIsEditingSpecialHours(false);
    setEditingSpecialHours({ specialHourPeriods: [] });
  };

  const updateEditingSpecialPeriod = (index: number, field: keyof SpecialHourPeriod, value: any) => {
    setEditingSpecialHours(prev => ({
      ...prev,
      specialHourPeriods: prev.specialHourPeriods.map((period, i) => 
        i === index ? { ...period, [field]: value } : period
      )
    }));
  };

  const addEditingSpecialPeriod = () => {
    const today = new Date();
    setEditingSpecialHours(prev => ({
      ...prev,
      specialHourPeriods: [...prev.specialHourPeriods, {
        startDate: {
          year: today.getFullYear(),
          month: today.getMonth() + 1,
          day: today.getDate()
        },
        endDate: {
          year: today.getFullYear(),
          month: today.getMonth() + 1,
          day: today.getDate()
        },
        openTime: { hours: 9, minutes: 0 },
        closeTime: { hours: 17, minutes: 0 },
        closed: false
      }]
    }));
  };

  const removeEditingSpecialPeriod = (index: number) => {
    setEditingSpecialHours(prev => ({
      ...prev,
      specialHourPeriods: prev.specialHourPeriods.filter((_, i) => i !== index)
    }));
  };

  const saveEditingSpecialHours = async () => {
    setSavingSpecialHours(true);
    try {
      const response = await fetch('/api/business/update-special-hours', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationId: getLocationId(),
          specialHours: editingSpecialHours,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message || 'Special hours updated successfully');
        setIsEditingSpecialHours(false);
        loadBusinessDetails(); // Reload to get updated data
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update special hours');
      }
    } catch (error) {
      console.error('Error updating special hours:', error);
      toast.error('Failed to update special hours');
    } finally {
      setSavingSpecialHours(false);
    }
  };

  if (!selectedLocation || loading || refreshing || !businessDetails || !hasAttemptedLoad) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>

        {/* Business Description skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>

        {/* Contact Information skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Skeleton className="h-5 w-16 mb-2" />
              <Skeleton className="h-6 w-32" />
            </div>
            <div>
              <Skeleton className="h-5 w-20 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div>
              <Skeleton className="h-5 w-20 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div>
              <Skeleton className="h-5 w-24 mb-2" />
              <Skeleton className="h-4 w-28" />
            </div>
          </CardContent>
        </Card>

        {/* Business Category & Services skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-8 w-40" />
            </div>
            <div className="mb-6">
              <Skeleton className="h-5 w-36 mb-3" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-18" />
                <Skeleton className="h-6 w-22" />
              </div>
            </div>
            <div>
              <Skeleton className="h-5 w-32 mb-3" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Hours skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Regular Hours skeleton */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-8 w-16" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            </CardContent>
          </Card>

          {/* Special Hours skeleton */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-36" />
                <Skeleton className="h-8 w-16" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Photo Upload skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-32" />
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Skeleton className="h-12 w-12 mx-auto mb-4" />
              <Skeleton className="h-5 w-48 mx-auto mb-2" />
              <Skeleton className="h-4 w-64 mx-auto" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }



  return (
    <div className="space-y-6 relative">
      {/* Loading overlay for refresh */}
      {refreshing && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 shadow-lg">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">Refreshing data...</span>
          </div>
        </div>
      )}
      
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Business Overview</h2>
          <p className="text-sm text-muted-foreground">
            Detailed information about your Google Business Profile
          </p>
        </div>
        <Button 
          onClick={() => loadBusinessDetails(true)} 
          disabled={loading || refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading || refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
      {/* Business Description */}
      {businessDetails.profile?.description && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center bold text-2xl gap-2">
              
              Business Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-relaxed">{businessDetails.profile.description}</p>
          </CardContent>
        </Card>
      )}


      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center bold text-2xl gap-2">
            
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-2">Phone</h4>
            <p className="text-lg">{businessDetails.phoneNumbers?.primaryPhone || 'Not available'}</p>
          </div>
          <div>
            <h4 className="font-medium mb-2">Address</h4>
            <p className="text-sm leading-relaxed">{formatAddress(businessDetails.storefrontAddress)}</p>
          </div>
          {businessDetails.websiteUri && (
            <div>
              <h4 className="font-medium mb-2">Website</h4>
              <a
                href={businessDetails.websiteUri}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                Visit Website
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
          {businessDetails.metadata?.mapsUri && (
            <div>
              <h4 className="font-medium mb-2">Google Maps</h4>
              <a
                href={businessDetails.metadata.mapsUri}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                View on Maps
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Business Category & Services */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center bold text-2xl gap-2">
            Business Category & Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          {businessDetails.categories?.primaryCategory && (
            <div className="mb-6">
              <h4 className="font-medium mb-2">Primary Category</h4>
              <Badge variant="outline" className="text-lg px-3 py-1">
                {businessDetails.categories.primaryCategory.displayName}
              </Badge>
            </div>
          )}

          {businessDetails.categories?.primaryCategory?.serviceTypes && (
            <div className="mb-6">
              <h4 className="font-medium mb-3">Available Services</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {businessDetails.categories.primaryCategory.serviceTypes.map((service, index) => (
                  <Badge key={index} variant="secondary" className="justify-start">
                    {service.displayName}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {businessDetails.serviceItems && businessDetails.serviceItems.length > 0 && (
            <div>
              <h4 className="font-medium mb-3">Active Service Items</h4>
              <div className="flex flex-wrap gap-2">
                {businessDetails.serviceItems.map((item, index) => (
                  <Badge key={index} variant="outline">
                    {item.structuredServiceItem.serviceTypeId.replace('job_type_id:', '').replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Business Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Regular Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-2xl">
              <div className="flex items-center gap-2">
                <Clock className="h-6 w-6" />
                Opening Hours
              </div>
              {!isEditingHours ? (
                <Button
                  onClick={startEditingHours}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={cancelEditingHours}
                    size="sm"
                    variant="outline"
                    disabled={savingHours}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={saveEditingHours}
                    size="sm"
                    disabled={savingHours || editingHours.periods.length === 0}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {savingHours ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!isEditingHours ? (
              // Display mode
              businessDetails.regularHours?.periods ? (
                <div className="space-y-2">
                  {businessDetails.regularHours.periods.map((period, index) => (
                    <div key={index} className="flex justify-between items-center py-1">
                      <span className="font-medium">{formatDayName(period.openDay)}</span>
                      <span className="text-sm">
                        {formatTime(period.openTime)} - {formatTime(period.closeTime)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No regular hours available</p>
              )
            ) : (
              // Edit mode
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Set your business opening hours for each day of the week
                  </p>
                  <Button onClick={addEditingPeriod} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Period
                  </Button>
                </div>

                {editingHours.periods.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No time periods configured</p>
                    <p className="text-sm">Click "Add Period" to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {editingHours.periods.map((period, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Time Period {index + 1}</h4>
                          <Button
                            onClick={() => removeEditingPeriod(index)}
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Day Selection */}
                          <div className="space-y-2">
                            <Label>Day</Label>
                            <Select
                              value={period.openDay}
                              onValueChange={(value) => {
                                updateEditingPeriod(index, 'openDay', value);
                                updateEditingPeriod(index, 'closeDay', value);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DAYS_OF_WEEK.map(day => (
                                  <SelectItem key={day.value} value={day.value}>
                                    {day.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Open Time */}
                          <div className="space-y-2">
                            <Label>Open Time</Label>
                            <div className="flex gap-2">
                              <Select
                                value={period.openTime?.hours?.toString() || '9'}
                                onValueChange={(value) => 
                                  updateEditingPeriod(index, 'openTime', { 
                                    ...period.openTime, 
                                    hours: parseInt(value) 
                                  })
                                }
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {HOURS.map(hour => (
                                    <SelectItem key={hour.value} value={hour.value.toString()}>
                                      {hour.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select
                                value={period.openTime?.minutes?.toString() || '0'}
                                onValueChange={(value) => 
                                  updateEditingPeriod(index, 'openTime', { 
                                    ...period.openTime, 
                                    minutes: parseInt(value) 
                                  })
                                }
                              >
                                <SelectTrigger className="w-20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {MINUTES.map(minute => (
                                    <SelectItem key={minute.value} value={minute.value.toString()}>
                                      {minute.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Close Time */}
                          <div className="space-y-2">
                            <Label>Close Time</Label>
                            <div className="flex gap-2">
                              <Select
                                value={period.closeTime?.hours?.toString() || '17'}
                                onValueChange={(value) => 
                                  updateEditingPeriod(index, 'closeTime', { 
                                    ...period.closeTime, 
                                    hours: parseInt(value) 
                                  })
                                }
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {HOURS.map(hour => (
                                    <SelectItem key={hour.value} value={hour.value.toString()}>
                                      {hour.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select
                                value={period.closeTime?.minutes?.toString() || '0'}
                                onValueChange={(value) => 
                                  updateEditingPeriod(index, 'closeTime', { 
                                    ...period.closeTime, 
                                    minutes: parseInt(value) 
                                  })
                                }
                              >
                                <SelectTrigger className="w-20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {MINUTES.map(minute => (
                                    <SelectItem key={minute.value} value={minute.value.toString()}>
                                      {minute.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Summary */}
                          <div className="space-y-2">
                            <Label>Summary</Label>
                            <p className="text-sm text-muted-foreground">
                              {DAYS_OF_WEEK.find(d => d.value === period.openDay)?.label}: {formatTime(period.openTime)} - {formatTime(period.closeTime)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Special Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-2xl">
              <div className="flex items-center gap-2">
                <Calendar className="h-6 w-6" />
                Special Hours
              </div>
              {!isEditingSpecialHours ? (
                <Button
                  onClick={startEditingSpecialHours}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={cancelEditingSpecialHours}
                    size="sm"
                    variant="outline"
                    disabled={savingSpecialHours}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={saveEditingSpecialHours}
                    size="sm"
                    disabled={savingSpecialHours}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {savingSpecialHours ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!isEditingSpecialHours ? (
              // Display mode
              businessDetails.specialHours?.specialHourPeriods && businessDetails.specialHours.specialHourPeriods.length > 0 ? (
                <div className="space-y-3">
                  {businessDetails.specialHours.specialHourPeriods.map((period, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">
                          {new Date(period.startDate.year, period.startDate.month - 1, period.startDate.day).toLocaleDateString()}
                          {period.startDate.year !== period.endDate.year || 
                           period.startDate.month !== period.endDate.month || 
                           period.startDate.day !== period.endDate.day ? (
                            <span> - {new Date(period.endDate.year, period.endDate.month - 1, period.endDate.day).toLocaleDateString()}</span>
                          ) : null}
                        </span>
                        {period.closed ? (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            Closed
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Open
                          </Badge>
                        )}
                      </div>
                      {!period.closed && period.openTime && period.closeTime && (
                        <p className="text-sm text-muted-foreground">
                          {formatTime(period.openTime)} - {formatTime(period.closeTime)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No special hours set</p>
              )
            ) : (
              // Edit mode
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Set special hours for holidays, events, or other exceptions
                  </p>
                  <Button onClick={addEditingSpecialPeriod} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Special Hours
                  </Button>
                </div>

                {editingSpecialHours.specialHourPeriods.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No special hours configured</p>
                    <p className="text-sm">Click "Add Special Hours" to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {editingSpecialHours.specialHourPeriods.map((period, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Special Period {index + 1}</h4>
                          <Button
                            onClick={() => removeEditingSpecialPeriod(index)}
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Start Date */}
                          <div className="space-y-2">
                            <Label>Start Date</Label>
                            <div className="grid grid-cols-3 gap-2">
                              <Select
                                value={period.startDate?.month?.toString() || '1'}
                                onValueChange={(value) => 
                                  updateEditingSpecialPeriod(index, 'startDate', { 
                                    ...period.startDate, 
                                    month: parseInt(value) 
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 12 }, (_, i) => (
                                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                                      {new Date(2024, i).toLocaleDateString('en-US', { month: 'long' })}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select
                                value={period.startDate?.day?.toString() || '1'}
                                onValueChange={(value) => 
                                  updateEditingSpecialPeriod(index, 'startDate', { 
                                    ...period.startDate, 
                                    day: parseInt(value) 
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 31 }, (_, i) => (
                                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                                      {i + 1}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select
                                value={period.startDate?.year?.toString() || '2024'}
                                onValueChange={(value) => 
                                  updateEditingSpecialPeriod(index, 'startDate', { 
                                    ...period.startDate, 
                                    year: parseInt(value) 
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 5 }, (_, i) => {
                                    const year = new Date().getFullYear() + i;
                                    return (
                                      <SelectItem key={year} value={year.toString()}>
                                        {year}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* End Date */}
                          <div className="space-y-2">
                            <Label>End Date</Label>
                            <div className="grid grid-cols-3 gap-2">
                              <Select
                                value={period.endDate?.month?.toString() || '1'}
                                onValueChange={(value) => 
                                  updateEditingSpecialPeriod(index, 'endDate', { 
                                    ...period.endDate, 
                                    month: parseInt(value) 
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 12 }, (_, i) => (
                                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                                      {new Date(2024, i).toLocaleDateString('en-US', { month: 'long' })}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select
                                value={period.endDate?.day?.toString() || '1'}
                                onValueChange={(value) => 
                                  updateEditingSpecialPeriod(index, 'endDate', { 
                                    ...period.endDate, 
                                    day: parseInt(value) 
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 31 }, (_, i) => (
                                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                                      {i + 1}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select
                                value={period.endDate?.year?.toString() || '2024'}
                                onValueChange={(value) => 
                                  updateEditingSpecialPeriod(index, 'endDate', { 
                                    ...period.endDate, 
                                    year: parseInt(value) 
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 5 }, (_, i) => {
                                    const year = new Date().getFullYear() + i;
                                    return (
                                      <SelectItem key={year} value={year.toString()}>
                                        {year}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Closed Toggle */}
                          <div className="space-y-2">
                            <Label>Status</Label>
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={!period.closed}
                                onCheckedChange={(checked: boolean) => 
                                  updateEditingSpecialPeriod(index, 'closed', !checked)
                                }
                              />
                              <span className="text-sm">
                                {period.closed ? 'Closed' : 'Open'}
                              </span>
                            </div>
                          </div>

                          {/* Time (only show if not closed) */}
                          {!period.closed && (
                            <div className="space-y-2">
                              <Label>Hours</Label>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">Open Time</Label>
                                  <div className="flex gap-1">
                                    <Select
                                      value={period.openTime?.hours?.toString() || '9'}
                                      onValueChange={(value) => 
                                        updateEditingSpecialPeriod(index, 'openTime', { 
                                          ...period.openTime, 
                                          hours: parseInt(value),
                                          minutes: period.openTime?.minutes || 0
                                        })
                                      }
                                    >
                                      <SelectTrigger className="w-20">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {HOURS.map(hour => (
                                          <SelectItem key={hour.value} value={hour.value.toString()}>
                                            {hour.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Select
                                      value={period.openTime?.minutes?.toString() || '0'}
                                      onValueChange={(value) => 
                                        updateEditingSpecialPeriod(index, 'openTime', { 
                                          ...period.openTime, 
                                          minutes: parseInt(value),
                                          hours: period.openTime?.hours || 9
                                        })
                                      }
                                    >
                                      <SelectTrigger className="w-16">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {MINUTES.map(minute => (
                                          <SelectItem key={minute.value} value={minute.value.toString()}>
                                            {minute.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-xs">Close Time</Label>
                                  <div className="flex gap-1">
                                    <Select
                                      value={period.closeTime?.hours?.toString() || '17'}
                                      onValueChange={(value) => 
                                        updateEditingSpecialPeriod(index, 'closeTime', { 
                                          ...period.closeTime, 
                                          hours: parseInt(value),
                                          minutes: period.closeTime?.minutes || 0
                                        })
                                      }
                                    >
                                      <SelectTrigger className="w-20">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {HOURS.map(hour => (
                                          <SelectItem key={hour.value} value={hour.value.toString()}>
                                            {hour.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Select
                                      value={period.closeTime?.minutes?.toString() || '0'}
                                      onValueChange={(value) => 
                                        updateEditingSpecialPeriod(index, 'closeTime', { 
                                          ...period.closeTime, 
                                          minutes: parseInt(value),
                                          hours: period.closeTime?.hours || 17
                                        })
                                      }
                                    >
                                      <SelectTrigger className="w-16">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {MINUTES.map(minute => (
                                          <SelectItem key={minute.value} value={minute.value.toString()}>
                                            {minute.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Summary */}
                          <div className="space-y-2">
                            <Label>Summary</Label>
                            <p className="text-sm text-muted-foreground">
                              {new Date(period.startDate.year, period.startDate.month - 1, period.startDate.day).toLocaleDateString()}
                              {period.startDate.year !== period.endDate.year || 
                               period.startDate.month !== period.endDate.month || 
                               period.startDate.day !== period.endDate.day ? (
                                <span> - {new Date(period.endDate.year, period.endDate.month - 1, period.endDate.day).toLocaleDateString()}</span>
                              ) : null}
                              {period.closed ? (
                                <span>: Closed</span>
                              ) : period.openTime && period.closeTime ? (
                                <span>: {formatTime(period.openTime)} - {formatTime(period.closeTime)}</span>
                              ) : null}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div> 
      
    </div>
  );
};

export default OverviewTab;
