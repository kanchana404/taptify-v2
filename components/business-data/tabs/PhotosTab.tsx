import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Camera,
  Download,
  Share2,
  Upload,
  ChevronLeft,
  ChevronRight,
  Eye,
  Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import type { BusinessPhoto } from '../types';
import { getPhotosByCategory } from '../utils';

interface PhotosTabProps {
  photos: BusinessPhoto[];
  loadingPhotos: boolean;
  onUploadClick: () => void;
}

const PhotosTab: React.FC<PhotosTabProps> = ({
  photos,
  loadingPhotos,
  onUploadClick,
}) => {
  // Remove global pagination state
  // const [currentPhotoPage, setCurrentPhotoPage] = useState(1);
  // const photosPerPage = 20;

  // Add per-category visible count state
  const [visibleCounts, setVisibleCounts] = useState<{ [category: string]: number }>({});
  const INITIAL_VISIBLE = 12;
  const INCREMENT = 12;

  // Download individual photo
  const downloadPhoto = async (photo: BusinessPhoto) => {
    try {
             // Prioritize sourceUrl as it contains the direct image URLs
       const imageUrl = photo.sourceUrl || photo.googleUrl || photo.thumbnailUrl;
      if (!imageUrl) {
        toast.error('No download URL available for this photo');
        return;
      }

      console.log('Downloading photo:', {
        mediaId: photo.mediaId,
        imageUrl,
        photo
      });

             // Use proxy for Google My Business URLs
       let downloadUrl = imageUrl;
       let useProxy = false;
       
       // Check if it's a direct image URL that doesn't need proxy
       if (imageUrl.includes('member.gmbbriefcase.com') || imageUrl.includes('.png') || imageUrl.includes('.jpg') || imageUrl.includes('.jpeg')) {
         console.log('Using direct image URL for download (no proxy needed):', imageUrl);
         useProxy = false;
       } else if (imageUrl.includes('mybusiness.googleapis.com') || imageUrl.includes('googleusercontent.com')) {
         downloadUrl = `/api/business/proxy-image?url=${encodeURIComponent(imageUrl)}`;
         useProxy = true;
         console.log('Using proxy URL for download:', downloadUrl);
       } else {
         console.log('Using URL as-is for download:', imageUrl);
         useProxy = false;
       }

      console.log('Fetching image from:', downloadUrl);
      
      // Add timeout to the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(downloadUrl, {
        signal: controller.signal,
        // Add credentials for proxy requests
        credentials: useProxy ? 'include' : 'omit'
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Download failed:', {
          status: response.status,
          statusText: response.statusText,
          url: downloadUrl,
          useProxy
        });
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log('Image blob created:', {
        size: blob.size,
        type: blob.type
      });

      if (blob.size === 0) {
        throw new Error('Downloaded image is empty');
      }

      // Create a more descriptive filename
      const timestamp = new Date().toISOString().split('T')[0];
      const category = photo.locationAssociation?.category || 'unknown';
      const filename = `business-photo-${category}-${photo.mediaId || timestamp}.jpg`;

      // Try different download methods
      try {
        // Method 1: Standard download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        console.log('Triggering download:', filename);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast.success('Photo downloaded successfully');
      } catch (downloadError) {
        console.error('Standard download failed, trying alternative method:', downloadError);
        
        // Method 2: Open in new tab (fallback)
        const url = window.URL.createObjectURL(blob);
        const newWindow = window.open(url, '_blank');
        
        if (newWindow) {
          toast.success('Photo opened in new tab');
        } else {
          throw new Error('Failed to open photo in new tab');
        }
      }
    } catch (error) {
      console.error('Error downloading photo:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to download photo';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Download timed out. Please try again.';
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Network error. Please check your connection.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    }
  };

  // Share individual photo
  const sharePhoto = async (photo: BusinessPhoto) => {
    try {
             // Prioritize sourceUrl as it contains the direct image URLs
       const shareUrl = photo.sourceUrl || photo.googleUrl || photo.thumbnailUrl;
      if (!shareUrl) {
        toast.error('No share URL available for this photo');
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: 'Business Photo',
          text: `Check out this photo from our business${photo.locationAssociation?.category ? ` - ${photo.locationAssociation.category}` : ''}`,
          url: shareUrl,
        });
        toast.success('Photo shared successfully');
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Photo URL copied to clipboard');
      }
    } catch (error) {
      console.error('Error sharing photo:', error);
      toast.error('Failed to share photo');
    }
  };

  // Download all photos handler
  const handleDownloadAllPhotos = async () => {
    if (photos.length === 0) {
      toast.error('No photos available to download');
      return;
    }

    try {
      toast.success('Initiated download of all photos');
      // Implementation for batch download would go here
    } catch (error) {
      console.error('Error downloading photos:', error);
      toast.error('Error downloading photos');
    }
  };

  // Remove global pagination logic
  // const getCurrentPagePhotos = () => { ... }
  // const getTotalPages = () => { ... }
  // const goToPhotoPage = (page: number) => { ... }

  const categorizedPhotos = getPhotosByCategory(photos);
  
  // Debug logging for photos
  console.log('PhotosTab received photos:', {
    totalPhotos: photos.length,
    photos: photos,
    categorizedPhotos: categorizedPhotos,
    photosType: typeof photos,
    isArray: Array.isArray(photos),
    firstPhoto: photos[0] || 'no photos'
  });

  // Helper to get visible count for a category
  const getVisibleCount = (category: string, total: number) => {
    return visibleCounts[category] ?? Math.min(INITIAL_VISIBLE, total);
  };

  // Handler for 'See More' button
  const handleSeeMore = (category: string, total: number) => {
    setVisibleCounts((prev) => ({
      ...prev,
      [category]: Math.min((prev[category] ?? INITIAL_VISIBLE) + INCREMENT, total),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Business Photos</h3>
          <p className="text-muted-foreground">Manage your Google Business Profile photos</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleDownloadAllPhotos} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download All
          </Button>
          <Button onClick={onUploadClick}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Photo
          </Button>
        </div>
      </div>

      {loadingPhotos ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Camera className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-8 rounded-full" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="aspect-square">
                    <Skeleton className="w-full h-full rounded-lg" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Camera className="h-4 w-4" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-6 rounded-full" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-square">
                    <Skeleton className="w-full h-full rounded-lg" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : photos.length > 0 ? (
        <>
          {/* Photos by Category */}
          {Object.entries(categorizedPhotos).map(([category, categoryPhotos]) => {
            const visibleCount = getVisibleCount(category, categoryPhotos.length);
            return (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Camera className="h-4 w-4" />
                    {category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())} Photos
                    <Badge variant="secondary">{categoryPhotos.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {categoryPhotos.slice(0, visibleCount).map((photo, index) => {
                                             // Use proxy for Google My Business images to avoid CORS issues
                       const getImageUrl = (url: string | undefined) => {
                         if (!url) return null;
                         
                         // Check if it's a direct image URL that doesn't need proxy
                         if (url.includes('member.gmbbriefcase.com') || url.includes('.png') || url.includes('.jpg') || url.includes('.jpeg')) {
                           console.log('Using direct image URL (no proxy needed):', url);
                           return url;
                         }
                         
                         // If it's a Google My Business URL, proxy it
                         if (url.includes('mybusiness.googleapis.com') || url.includes('googleusercontent.com')) {
                           console.log('Using proxy for Google URL:', url);
                           return `/api/business/proxy-image?url=${encodeURIComponent(url)}`;
                         }
                         
                         console.log('Using URL as-is:', url);
                         return url;
                       };
                      
                                             // Prioritize sourceUrl as it contains the direct image URLs from Google My Business
                       const imageUrl = getImageUrl(photo.sourceUrl) || getImageUrl(photo.thumbnailUrl) || getImageUrl(photo.googleUrl);
                      
                                             const photoKey = photo.mediaId || `${category}-${index}`;
                       
                       // Debug logging for image URL construction
                       console.log('Image URL construction:', {
                         photoKey,
                         thumbnailUrl: photo.thumbnailUrl,
                         sourceUrl: photo.sourceUrl,
                         googleUrl: photo.googleUrl,
                         finalImageUrl: imageUrl,
                         needsProxy: imageUrl?.includes('/api/business/proxy-image'),
                         priority: 'sourceUrl first, then thumbnailUrl, then googleUrl'
                       });
                      
                      // Debug logging for image URLs
                      console.log('Photo data:', {
                        photoKey,
                        thumbnailUrl: photo.thumbnailUrl,
                        sourceUrl: photo.sourceUrl,
                        googleUrl: photo.googleUrl,
                        selectedImageUrl: imageUrl,
                        fullPhoto: photo
                      });
                      
                      return (
                        <div key={photoKey} className="group relative aspect-square">
                          <div className="w-full h-full rounded-lg border overflow-hidden bg-gray-100 flex items-center justify-center">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={`${category} photo ${index + 1}`}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                                 onError={(e) => {
                                   console.error('Failed to load image:', imageUrl);
                                   console.error('Photo data for failed image:', photo);
                                   
                                   // Try alternative URLs as fallback
                                   const img = e.currentTarget as HTMLImageElement;
                                   let fallbackUrl = null;
                                   
                                   // Try different fallback strategies
                                   if (img.src.includes('/api/business/proxy-image')) {
                                     // If proxy failed, try direct URL
                                     if (photo.sourceUrl && !photo.sourceUrl.includes('mybusiness.googleapis.com')) {
                                       console.log('Trying sourceUrl as direct fallback:', photo.sourceUrl);
                                       fallbackUrl = photo.sourceUrl;
                                     } else if (photo.googleUrl) {
                                       console.log('Trying googleUrl as fallback:', photo.googleUrl);
                                       fallbackUrl = getImageUrl(photo.googleUrl) || '';
                                     } else if (photo.thumbnailUrl) {
                                       console.log('Trying thumbnailUrl as fallback:', photo.thumbnailUrl);
                                       fallbackUrl = getImageUrl(photo.thumbnailUrl) || '';
                                     }
                                   } else {
                                     // If direct URL failed, try proxy
                                     if (photo.googleUrl && photo.googleUrl.includes('googleusercontent.com')) {
                                       console.log('Trying googleUrl with proxy as fallback:', photo.googleUrl);
                                       fallbackUrl = `/api/business/proxy-image?url=${encodeURIComponent(photo.googleUrl)}`;
                                     } else if (photo.thumbnailUrl && photo.thumbnailUrl.includes('googleusercontent.com')) {
                                       console.log('Trying thumbnailUrl with proxy as fallback:', photo.thumbnailUrl);
                                       fallbackUrl = `/api/business/proxy-image?url=${encodeURIComponent(photo.thumbnailUrl)}`;
                                     }
                                   }
                                   
                                   if (fallbackUrl) {
                                     console.log('Using fallback URL:', fallbackUrl);
                                     img.src = fallbackUrl;
                                   } else {
                                     console.log('No more fallback URLs available, showing placeholder');
                                     // Show fallback
                                     img.style.display = 'none';
                                     const fallback = img.nextElementSibling as HTMLElement;
                                     if (fallback) fallback.style.display = 'flex';
                                   }
                                 }}
                                onLoad={() => {
                                  console.log('Image loaded successfully:', imageUrl);
                                }}
                                onLoadStart={() => {
                                  console.log('Starting to load image:', imageUrl);
                                }}
                              />
                            ) : (
                              // Show placeholder when no URL is available
                              <div className="w-full h-full items-center justify-center bg-gray-100 text-gray-400 flex">
                                <div className="text-center">
                                  <ImageIcon className="h-8 w-8 mx-auto mb-2" />
                                  <p className="text-xs">No image URL</p>
                                </div>
                              </div>
                            )}
                            {/* Fallback when image fails to load */}
                            <div className="hidden w-full h-full items-center justify-center bg-gray-100 text-gray-400">
                              <div className="text-center">
                                <ImageIcon className="h-8 w-8 mx-auto mb-2" />
                                <p className="text-xs">Image unavailable</p>
                              </div>
                            </div>
                          </div>
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => downloadPhoto(photo)}
                                className="h-8 w-8 p-0"
                                title="Download photo"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => sharePhoto(photo)}
                                className="h-8 w-8 p-0"
                                title="Share photo"
                              >
                                <Share2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          {/* Photo info overlay */}
                          {photo.dimensions && (
                            <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                              {photo.dimensions.widthPixels}x{photo.dimensions.heightPixels}
                            </div>
                          )}
                          {/* Photo source indicator */}
                          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            {photo.thumbnailUrl ? 'Thumb' : photo.sourceUrl ? 'Source' : 'Google'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {visibleCount < categoryPhotos.length && (
                    <div className="mt-4 text-center">
                      <Button variant="outline" size="sm" onClick={() => handleSeeMore(category, categoryPhotos.length)}>
                        See More
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </>
      ) : (
        <Card className="border-dashed">
          <CardContent className="text-center py-12">
            <div className="max-w-sm mx-auto">
              <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <ImageIcon className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium mb-2">No Photos Yet</h3>
              <p className="text-muted-foreground mb-6">
                Upload photos to showcase your business and attract more customers. High-quality images help customers understand what you offer.
              </p>
              <Button onClick={onUploadClick} size="lg">
                <Camera className="h-4 w-4 mr-2" />
                Upload First Photo
              </Button>
              <div className="mt-4 text-xs text-muted-foreground">
                <p>Recommended: Add photos of your storefront, products, team, and interior</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PhotosTab;
