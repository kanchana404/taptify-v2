import type { BusinessLocation, BusinessPhoto } from './types';

// Format address
export const formatAddress = (address: any) => {
  if (!address) return 'No address available';
  
  const parts = [
    ...(address.addressLines || []),
    address.locality,
    address.administrativeArea,
    address.postalCode
  ].filter(Boolean);
  
  return parts.join(', ');
};

// Format business hours
export const formatBusinessHours = (regularHours: any) => {
  if (!regularHours?.periods) return null;

  const dayNames = {
    'MONDAY': 'Monday',
    'TUESDAY': 'Tuesday', 
    'WEDNESDAY': 'Wednesday',
    'THURSDAY': 'Thursday',
    'FRIDAY': 'Friday',
    'SATURDAY': 'Saturday',
    'SUNDAY': 'Sunday'
  };

  return regularHours.periods.map((period: any) => ({
    day: dayNames[period.openDay as keyof typeof dayNames] || period.openDay,
    hours: `${period.openTime} - ${period.closeTime}`
  }));
};

// Calculate average rating
export const calculateAverageRating = (reviews: any[]) => {
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

// Format number
export const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

// Get photos by category
export const getPhotosByCategory = (photos: BusinessPhoto[]) => {
  console.log('getPhotosByCategory called with:', {
    photosLength: photos.length,
    photosType: typeof photos,
    isArray: Array.isArray(photos),
    firstPhoto: photos[0] || 'no photos'
  });
  
  if (!Array.isArray(photos) || photos.length === 0) {
    console.log('No photos to categorize, returning empty object');
    return {};
  }
  
  const categories = photos.reduce((acc, photo) => {
    const category = photo.locationAssociation?.category || 'PROFILE';
    if (!acc[category]) acc[category] = [];
    acc[category].push(photo);
    return acc;
  }, {} as Record<string, BusinessPhoto[]>);
  
  console.log('Categorized photos result:', {
    categoryCount: Object.keys(categories).length,
    categories: Object.keys(categories),
    totalPhotosInCategories: Object.values(categories).reduce((sum, arr) => sum + arr.length, 0)
  });
  
  return categories;
};

// Valid photo categories for Google My Business
export const validPhotoCategories = [
  'PROFILE', 'COVER', 'LOGO', 'INTERIOR', 'EXTERIOR', 
  'PRODUCT', 'AT_WORK', 'FOOD_AND_DRINK', 'COMMON_AREA', 
  'ROOMS', 'TEAM', 'ADDITIONAL', 'MENU', 'IDENTITY', 
  'PROMOTIONAL', 'EVENT'
];
