// Enhanced types for business data
export interface BusinessLocation {
  name: string;
  title: string;
  storefrontAddress?: {
    addressLines: string[];
    locality: string;
    administrativeArea: string;
    postalCode: string;
    regionCode: string;
  };
  primaryPhone?: string;
  websiteUri?: string;
  regularHours?: {
    periods: Array<{
      openDay: string;
      openTime: string;
      closeDay: string;
      closeTime: string;
    }>;
  };
  specialHours?: any[];
  serviceArea?: any;
  labels?: string[];
  adWordsLocationExtensions?: any;
  latlng?: {
    latitude: number;
    longitude: number;
  };
  openInfo?: {
    status: string;
    canReopen: boolean;
  };
  locationKey?: {
    placeId: string;
    plusPageId: string;
  };
  profile?: {
    description: string;
  };
  relationshipData?: {
    parentChain: any;
  };
  moreHours?: any[];
  metadata?: {
    duplicate?: any;
    mapsUri?: string;
    newReviewUri?: string;
  };
}

export interface BusinessAccount {
  name: string;
  accountName: string;
  type: string;
  role: string;
  state: {
    status: string;
  };
  profilePhotoUrl?: string;
  accountNumber?: string;
  permissionLevel?: string;
}

export interface BusinessPhoto {
  name: string;
  mediaFormat?: string;
  sourceUrl: string;
  googleUrl?: string;
  thumbnailUrl?: string;
  createTime: string;
  updateTime?: string;
  mediaItemDataRef?: {
    resourceName: string;
  };
  locationAssociation?: {
    category: string;
  };
  attribution?: {
    profilePhotoUri?: string;
    profileName?: string;
  };
  description?: string;
  dimensions?: {
    widthPixels: number;
    heightPixels: number;
  };
  createTimeFormatted?: string;
  mediaId?: string;
}

export interface BusinessPost {
  name: string;
  createTime: string;
  updateTime: string;
  state: string;
  summary?: string;
  callToAction?: {
    actionType: string;
    url?: string;
  };
  media?: Array<{
    name: string;
    mediaFormat: string;
    sourceUrl?: string;
    googleUrl?: string;
    thumbnailUrl?: string;
  }>;
  event?: {
    title: string;
    startDate: string;
    endDate: string;
  };
  offer?: {
    couponCode?: string;
    redeemOnlineUrl?: string;
    terms?: string;
  };
  topicType: string;
  languageCode: string;
  alertType?: string;
  searchUrl?: string;
}

export interface AnalyticsData {
  totalViews: number;
  totalClicks: number;
  totalCalls: number;
  totalDirections: number;
  totalWebsiteClicks: number;
  searchAppearances: number;
  photoViews: number;
  averageRating: number;
  totalReviews: number;
  responseRate: number;
  responseTime: string;
  viewsGrowth: number;
  clicksGrowth: number;
  callsGrowth: number;
  ratingTrend: 'up' | 'down' | 'stable';
  popularTimes?: Array<{
    day: string;
    hours: number[];
  }>;
  searchKeywords?: Array<{
    keyword: string;
    impressions: number;
    clicks: number;
  }>;
  deviceBreakdown: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
  customerActions: {
    website: number;
    directions: number;
    phone: number;
    bookings: number;
  };
}

export interface BusinessStats {
  metrics: {
    multiDailyMetricTimeSeries: Array<{
      dailyMetricTimeSeries: Array<{
        dailyMetric: string;
        timeSeries: {
          datedValues: Array<{
            date: {
              year: number;
              month: number;
              day: number;
            };
            value?: string;
          }>;
        };
      }>;
    }>;
  };
  address: {
    storefrontAddress: {
      regionCode: string;
      languageCode: string;
      postalCode: string;
      administrativeArea: string;
      locality: string;
      addressLines: string[];
    };
  };
  summary: {
    totalCallClicks: number;
    totalWebsiteClicks: number;
    dateRange: {
      start: string;
      end: string;
    };
  };
}

// Enhanced PostFormData to match Google Local Post specification
export interface PostFormData {
  summary: string;
  topicType: string;
  actionType: string;
  actionUrl: string;
  media: File | null;
  languageCode?: string;
  
  // Event-specific fields (when topicType === 'EVENT' or 'OFFER')
  event?: {
    title: string;
    schedule: {
      startDate: string;
      startTime: string;
      endDate: string;
      endTime: string;
    };
  };
  
  // Offer-specific fields (when topicType === 'OFFER')
  offer?: {
    couponCode?: string;
    redeemOnlineUrl?: string;
    termsConditions?: string;
  };
  
  // Alert-specific fields (when topicType === 'ALERT')
  alertType?: string;
}

// Supporting types for the enhanced post creation
export interface LocalPostEvent {
  title: string;
  schedule: {
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
  };
}

export interface LocalPostOffer {
  couponCode?: string;
  redeemOnlineUrl?: string;
  termsConditions?: string;
}

export interface CallToAction {
  actionType: 'BOOK' | 'ORDER' | 'SHOP' | 'LEARN_MORE' | 'SIGN_UP' | 'CALL';
  url?: string;
}

export type LocalPostTopicType = 'STANDARD' | 'EVENT' | 'OFFER' | 'ALERT';
export type AlertType = 'COVID_19' | 'ALERT_TYPE_UNSPECIFIED';
export type ActionType = 'BOOK' | 'ORDER' | 'SHOP' | 'LEARN_MORE' | 'SIGN_UP' | 'CALL' | 'ACTION_TYPE_UNSPECIFIED';


