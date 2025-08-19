import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  MapPin,
  Star,
  Clock,
  Phone,
  Globe,
  ExternalLink,
  RefreshCw,
  Building,
  Wifi,
  Car,
  CreditCard,
  Accessibility,
  Baby,
  Dog,
  ShoppingBag,
  Utensils,
} from 'lucide-react';
import type { BusinessLocation, BusinessAccount } from './types';
import { formatAddress, formatBusinessHours } from './utils';

interface BusinessHeaderProps {
  accounts: any[];
  locations: any[];
  selectedAccount: string;
  selectedLocation: string;
  locationDetails: any;
  detailedBusinessInfo: any;
  refreshing: boolean;
  onAccountChange: (accountName: string) => void;
  onLocationChange: (locationName: string) => void;
  onRefresh: () => void;
  isRefreshingToken?: boolean; // Add this prop
}

export default function BusinessHeader({
  accounts,
  locations,
  selectedAccount,
  selectedLocation,
  locationDetails,
  detailedBusinessInfo,
  refreshing,
  onAccountChange,
  onLocationChange,
  onRefresh,
  isRefreshingToken = false, // Add default value
}: BusinessHeaderProps) {
  const businessHours = locationDetails ? formatBusinessHours(locationDetails.regularHours) : null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Business Profile</h1>
        <p className="text-muted-foreground">
          Manage your Google Business Profile information and QR codes
        </p>
      </div>

      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          
          {isRefreshingToken && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Automatically refreshing...</span>
            </div>
          )}
        </div>
        
        <Button 
          onClick={onRefresh} 
          disabled={refreshing || isRefreshingToken}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing || isRefreshingToken ? 'animate-spin' : ''}`} />
          {isRefreshingToken ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Account & Location Selection */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="flex-1 min-w-0">
            <label className="text-sm font-medium mb-1 block">Business Account</label>
            <Select value={selectedAccount} onValueChange={onAccountChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.name} value={account.name}>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      <span className="truncate">{account.accountName}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1 min-w-0">
            <label className="text-sm font-medium mb-1 block">Location</label>
            <Select value={selectedLocation} onValueChange={onLocationChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.name} value={location.name}>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{location.title}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        

      </div>

      {/* Location Details Card */}
      {locationDetails && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src="/placeholder-business.jpg" alt={locationDetails.title} />
                  <AvatarFallback>
                    <Building className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-xl">{locationDetails.title}</CardTitle>
                    {detailedBusinessInfo?.openInfo?.status && (
                      <Badge className={
                        detailedBusinessInfo.openInfo.status === 'OPEN' 
                          ? 'bg-green-100 text-green-800' 
                          : detailedBusinessInfo.openInfo.status === 'CLOSED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }>
                        
                        {detailedBusinessInfo.openInfo.status}
                      </Badge>
                    )}
                  </div>
                  
                </div>
              </div>  
            </div>
          </CardHeader>      
        </Card>
      )}
    </div>
  );
}
