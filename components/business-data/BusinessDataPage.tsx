"use client";

import React, { useState, useEffect, ChangeEvent, useRef } from 'react';
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useRouter } from 'next/navigation';

// Import our new components
import BusinessHeader from './BusinessHeader';
import OverviewTab from './tabs/OverviewTab';
import PhotosTab from './tabs/PhotosTab';
import PostsTab from './tabs/PostsTab';
import ReviewsTab from './tabs/ReviewsTab';
import AnalyticsTab from './tabs/AnalyticsTab';
import PhotoUploadDialog from './dialogs/PhotoUploadDialog';
import PostCreateDialog from './dialogs/PostCreateDialog';
import GeneratedPostsDialog from './dialogs/GeneratedPostsDialog';
import EnhancedPostGenerationDialog from './dialogs/EnhancedPostGenerationDialog';
import EnhancedGeneratedPostsDialog from './dialogs/EnhancedGeneratedPostsDialog';


// Import hooks
import { useBusinessData } from './hooks/useBusinessData';
import { useAIGeneration, type PostConfig } from './hooks/useAIGeneration';
import { useUser } from '@clerk/nextjs';

// Import other components
import QnaManagement from '@/components/QnaManagement';

import type { PostFormData } from './types';
import { validPhotoCategories } from './utils';

export default function BusinessDataPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const userId = user?.id;
  const router = useRouter();
  
  // Business data hook
  const {
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
    scheduledPosts,
    loadScheduledPosts,
    isRefreshingToken,
    tokenRefreshAttempts,
  } = useBusinessData(userId);

  // AI generation hook
  const {
    isGeneratingAI,
    aiGenerationType,
    generatedPosts,
    showGeneratedPosts,
    generatedPostImages,
    generateImage,
    showEnhancedGeneration,
    handleAIGeneration,
    handleEnhancedAIGeneration,
    handleUseGeneratedPost,
    clearGeneratedPosts,
    showGeneratedPostsDialog,
    setGenerateImage,
    setShowGeneratedPosts,
    setShowEnhancedGeneration,
  } = useAIGeneration();

  // Local state
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Photo upload state
  const [isPhotoUploadOpen, setIsPhotoUploadOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoCategory, setPhotoCategory] = useState<string>('PROFILE');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Post creation state
  const [isPostCreateOpen, setIsPostCreateOpen] = useState(false);
  const [creatingPost, setCreatingPost] = useState(false);
  const [deletingPost, setDeletingPost] = useState<string | null>(null);
  const [postForm, setPostForm] = useState<PostFormData>({
    summary: '',
    topicType: 'STANDARD',
    actionType: 'LEARN_MORE',
    actionUrl: '',
    media: null,
    languageCode: 'en',
  });
  
  // Image state
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [localImagePreview, setLocalImagePreview] = useState<string | null>(null);
  const postMediaInputRef = useRef<HTMLInputElement>(null);

  // Add state for scheduling options
  const [schedulingOptions, setSchedulingOptions] = useState<{
    scheduleType: 'all' | 'separately';
    allDate?: string;
    separateCount?: number;
    separateInterval?: number;
    separateStartDate?: string;
  } | undefined>(undefined);

  // Add state for tracking automatic refresh
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);

  // Function to handle automatic refresh when tokens expire
  const handleAutomaticRefresh = async () => {
    if (isAutoRefreshing) return; // Prevent multiple simultaneous refreshes
    
    try {
      setIsAutoRefreshing(true);
      console.log('Starting automatic refresh due to token expiration...');
      
      // Reset data load progress for the new refresh cycle
      // This ensures we track the new data loading properly
      
      // Attempt to refresh the connection and reload data
      await checkConnectionAndLoadData();
      
      // If we have a selected account and location, reload their data
      if (selectedAccount && selectedLocation) {
        await Promise.all([
          loadPhotos(selectedAccount, selectedLocation),
          loadPosts(selectedAccount, selectedLocation),
          loadBusinessStats(),
        ]);
      }
      
      console.log('Automatic refresh completed successfully');
    } catch (error) {
      console.error('Automatic refresh failed:', error);
      // Don't show error toast here as it might be handled by the hook
    } finally {
      setIsAutoRefreshing(false);
    }
  };

  // Function to clear scheduling options
  const clearSchedulingOptions = () => {
    setSchedulingOptions(undefined);
  };

  // Handle mounting
  useEffect(() => {
    setMounted(true);
    checkConnectionAndLoadData();
    if (userId) {
      loadScheduledPosts();
    }
    
    // Add global debug function
    (window as any).debugLocation = () => {
      console.log('=== LOCATION DEBUG ===');
      console.log('selectedLocation:', selectedLocation);
      console.log('locationDetails:', locationDetails);
      console.log('locations:', locations);
      console.log('localStorage selectedLocationId:', localStorage.getItem('selectedLocationId'));
      console.log('sessionStorage selectedLocationId:', sessionStorage.getItem('selectedLocationId'));
      console.log('=== END DEBUG ===');
    };
  }, [userId]);

  // Effect to handle automatic refresh when token refresh attempts are detected
  useEffect(() => {
    if (tokenRefreshAttempts > 0 && !isRefreshingToken) {
      // Token refresh was attempted, trigger automatic data reload
      handleAutomaticRefresh();
    }
  }, [tokenRefreshAttempts, isRefreshingToken]);

  // Auto-import single generated posts
  useEffect(() => {
    const handleAutoImportPost = (event: CustomEvent) => {
      const { post, imageUrl } = event.detail;
      
      setPostForm({
        ...post,
        media: null,
        languageCode: 'en',
      });
      
      if (imageUrl) {
        setGeneratedImageUrl(imageUrl);
        setLocalImagePreview(null);
      } else {
        setGeneratedImageUrl(null);
      }
      
      // Open the post creation dialog if it's not already open
      if (!isPostCreateOpen) {
        setIsPostCreateOpen(true);
      }
    };

    window.addEventListener('autoImportPost', handleAutoImportPost as EventListener);
    
    return () => {
      window.removeEventListener('autoImportPost', handleAutoImportPost as EventListener);
    };
  }, [isPostCreateOpen]);

  // Handle image regeneration events
  useEffect(() => {
    const handleImageGenerated = (event: CustomEvent) => {
      const { imageUrl } = event.detail;
      if (imageUrl) {
        setGeneratedImageUrl(imageUrl);
        setLocalImagePreview(null);
      }
    };

    window.addEventListener('imageGenerated', handleImageGenerated as EventListener);
    
    return () => {
      window.removeEventListener('imageGenerated', handleImageGenerated as EventListener);
    };
  }, []);

  // Debug photos state changes
  useEffect(() => {
    console.log('BusinessDataPage photos state changed:', {
      photosLength: photos.length,
      photosType: typeof photos,
      isArray: Array.isArray(photos),
      loadingPhotos,
      firstPhoto: photos[0] || 'no photos'
    });
  }, [photos, loadingPhotos]);

  // Photo upload handlers
  const handlePhotoFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowedTypes = ['image/jpeg', 'image/jpg'];
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        toast.error('Unsupported file type. Only JPEG images are supported for photo uploads. PNG images are not supported by Google My Business.');
        e.target.value = '';
        return;
      }
      setPhotoFile(file);
    }
  };

  const handlePhotoUpload = async () => {
    if (!photoFile || !selectedAccount || !selectedLocation) {
      toast.error('Please select a photo and ensure account/location are selected');
      return;
    }

    setUploadingPhoto(true);
    try {
      // 1. Upload to S3
      const s3Form = new FormData();
      s3Form.append('file', photoFile);
      const s3Res = await fetch('/api/business/upload-to-s3', {
        method: 'POST',
        body: s3Form,
      });
      const s3Data = await s3Res.json();
      if (!s3Data.success || !s3Data.url) {
        throw new Error(s3Data.error || 'Failed to upload to S3');
      }

      // 2. Use S3 URL as sourceUrl in Google API
      const formData = new FormData();
      formData.append('sourceUrl', s3Data.url);
      formData.append('category', photoCategory);
      formData.append('accountName', selectedAccount);
      formData.append('locationName', selectedLocation);

      const response = await fetch('/api/business/upload-photo', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.photo) {
          setPhotos([result.photo, ...photos]);
          setIsPhotoUploadOpen(false);
          setPhotoFile(null);
          setPhotoCategory('PROFILE');
          toast.success(result.message || 'Photo uploaded successfully');
          if (selectedAccount && selectedLocation) {
            await loadPhotos(selectedAccount, selectedLocation);
          }
        } else if (result.warning) {
          toast.success(result.warning);
          setIsPhotoUploadOpen(false);
          setPhotoFile(null);
          setPhotoCategory('PROFILE');
          if (selectedAccount && selectedLocation) {
            await loadPhotos(selectedAccount, selectedLocation);
          }
        } else {
          toast.error(result.error || 'Failed to upload photo');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to upload photo');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Error uploading photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Post handlers
  const handlePostMediaChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowedTypes = ['image/jpeg', 'image/jpg', 'video/mp4', 'video/avi'];
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        toast.error('Unsupported file type. Only JPEG images and MP4/AVI videos are supported. PNG images are not supported by Google My Business.');
        e.target.value = '';
        return;
      }
      
      setPostForm({ ...postForm, media: file });
      setGeneratedImageUrl(null);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setLocalImagePreview(null);
    }
  };

  const handlePostCreate = async () => {
    if (!postForm.summary || !selectedAccount || !selectedLocation) {
      toast.error('Please provide a post summary and ensure account/location are selected');
      return;
    }

    if (postForm.media) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'video/mp4', 'video/avi'];
      const fileType = postForm.media.type.toLowerCase();
      if (!allowedTypes.includes(fileType)) {
        toast.error('Unsupported file type. Only JPEG images and MP4/AVI videos are supported. PNG images are not supported by Google My Business.');
        return;
      }
    }

    setCreatingPost(true);
    try {
      const formData = new FormData();
      formData.append('summary', postForm.summary);
      formData.append('topicType', postForm.topicType);
      formData.append('actionType', postForm.actionType);
      if (postForm.actionUrl) formData.append('actionUrl', postForm.actionUrl);
      if (postForm.media) formData.append('media', postForm.media);
      
      if (generatedImageUrl && !postForm.media) {
        formData.append('aiImageUrl', generatedImageUrl);
      }
      
      formData.append('accountName', selectedAccount);
      formData.append('locationName', selectedLocation);

      const response = await fetch('/api/business/create-post', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setPosts([result.post, ...posts]);
          setIsPostCreateOpen(false);
          setPostForm({
            summary: '',
            topicType: 'STANDARD',
            actionType: 'LEARN_MORE',
            actionUrl: '',
            media: null,
            languageCode: 'en',
          });
          setGeneratedImageUrl(null);
          setLocalImagePreview(null);
          if (postMediaInputRef.current) {
            postMediaInputRef.current.value = '';
          }
          toast.success(result.message || 'Post created successfully');
          
          if (selectedAccount && selectedLocation) {
            await loadPosts(selectedAccount, selectedLocation);
          }
        } else {
          toast.error(result.error || 'Failed to create post');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Error creating post');
    } finally {
      setCreatingPost(false);
    }
  };

  const handlePostDelete = async (postName: string) => {
    if (!postName) {
      toast.error('Invalid post identifier');
      return;
    }

    setDeletingPost(postName);
    try {
      const response = await fetch(`/api/business/posts?name=${encodeURIComponent(postName)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setPosts(posts.filter(post => post.name !== postName));
          toast.success(result.message || 'Post deleted successfully');
          
          if (selectedAccount && selectedLocation) {
            await loadPosts(selectedAccount, selectedLocation);
          }
        } else {
          toast.error(result.error || 'Failed to delete post');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Error deleting post');
    } finally {
      setDeletingPost(null);
    }
  };

  // Generated post handlers
  const handleUseGeneratedPostWrapper = (post: any, index: number) => {
    handleUseGeneratedPost(post, index, (selectedPost: any, imageUrl?: string) => {
      setPostForm({
        summary: selectedPost.summary || '',
        topicType: selectedPost.topicType || 'STANDARD',
        actionType: selectedPost.actionType || 'LEARN_MORE',
        actionUrl: selectedPost.actionUrl || '',
        media: null,
        languageCode: 'en',
      });
      
      if (imageUrl) {
        setGeneratedImageUrl(imageUrl);
        setLocalImagePreview(null);
      } else {
        setGeneratedImageUrl(null);
      }
      
      if (!isPostCreateOpen) {
        setIsPostCreateOpen(true);
      }
    });
  };

  const handleUseEnhancedPost = (post: any, imageUrl?: string) => {
    setPostForm({
      summary: post.summary || '',
      topicType: post.topicType || 'STANDARD',
      actionType: post.actionType || 'LEARN_MORE',
      actionUrl: post.actionUrl || '',
      media: null,
      languageCode: 'en',
      // Pass event fields if present (for EVENT and OFFER)
      ...((post.topicType === 'EVENT' || post.topicType === 'OFFER') && post.event ? {
        event: {
          title: post.event.title || '',
          schedule: {
            startDate: post.event.schedule?.startDate || '',
            startTime: post.event.schedule?.startTime || '',
            endDate: post.event.schedule?.endDate || '',
            endTime: post.event.schedule?.endTime || '',
          }
        }
      } : {}),
      // Pass offer fields if present (only allowed fields)
      ...(post.topicType === 'OFFER' && post.offer ? {
        offer: {
          couponCode: post.offer.couponCode || '',
          redeemOnlineUrl: post.offer.redeemOnlineUrl || '',
          termsConditions: post.offer.termsConditions || '',
        }
      } : {}),
      // Pass alertType if present
      ...(post.topicType === 'ALERT' && post.alertType ? { alertType: post.alertType } : {}),
    });
    if (imageUrl) {
      setGeneratedImageUrl(imageUrl);
      setLocalImagePreview(null);
    } else {
      setGeneratedImageUrl(null);
    }
    if (!isPostCreateOpen) {
      setIsPostCreateOpen(true);
    }
  };

  // Add handlers for scheduled post update/delete/regenerate
  const handleScheduledPostUpdate = async (postId: string, updates: any) => {
    // The actual update is handled in PostsTab, this just reloads the data
    if (userId) await loadScheduledPosts();
  };
  const handleScheduledPostDelete = async (postId: string) => {
    // The actual delete is handled in PostsTab, this just reloads the data
    if (userId) await loadScheduledPosts();
  };
  const handleScheduledPostRegenerateImage = async (postId: string, summary: string) => {
    const res = await fetch('/api/ideogram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: summary }),
    });
    const data = await res.json();
    if (data.imageUrl) {
      await handleScheduledPostUpdate(postId, { media_url: data.imageUrl });
    }
  };

  // Enhanced refresh handler that includes automatic token refresh
  const handleEnhancedRefresh = async () => {
    try {
      await handleRefresh();
    } catch (error) {
      console.error('Manual refresh failed, attempting automatic refresh:', error);
      await handleAutomaticRefresh();
    }
  };


  if (!mounted) {
    return null;
  }

  return (
    <div className="business-data-layout">
      <SidebarProvider>
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col purple-fade-in">
            <div className="@container/main flex flex-1 flex-col">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <div className="px-4 lg:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight">Business Data</h1>
                      <p className="text-muted-foreground">
                        Manage your Google Business Profile and track performance
                      </p>
                    </div>
                  </div>
                </div>

                {loading || isAutoRefreshing ? (
                  <div className="px-4 lg:px-6 space-y-6">
                    <div className="space-y-4">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-32 w-full" />
                    </div>
                  </div>
                ) : !isConnected ? (
                  <div className="px-4 lg:px-6">
                    <div className="text-center py-12">
                      <h3 className="text-lg font-medium mb-2">Connect Your Google Business Profile</h3>
                      <p className="text-muted-foreground mb-4">
                        Connect your Google Business Profile to manage your business data and track performance
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 lg:px-6 space-y-6">
                    <BusinessHeader
                      accounts={accounts}
                      locations={locations}
                      selectedAccount={selectedAccount}
                      selectedLocation={selectedLocation}
                      locationDetails={locationDetails}
                      detailedBusinessInfo={detailedBusinessInfo}
                      refreshing={refreshing || isAutoRefreshing}
                      onAccountChange={handleAccountChange}
                      onLocationChange={handleLocationChange}
                      onRefresh={handleEnhancedRefresh}
                      isRefreshingToken={isRefreshingToken}
                    />

                    {locationDetails && (
                      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground w-full">
                          <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
                          <TabsTrigger value="analytics" className="flex-1">Analytics</TabsTrigger>
                          <TabsTrigger value="photos" className="flex-1">Photos</TabsTrigger>
                          <TabsTrigger value="posts" className="flex-1">Posts</TabsTrigger>
                          <TabsTrigger value="reviews" className="flex-1">Reviews</TabsTrigger>
                          <TabsTrigger value="qna" className="flex-1">Q&A</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview">
                          <OverviewTab
                            selectedLocation={selectedLocation || ''}
                            selectedAccount={selectedAccount || ''}
                          />
                        </TabsContent>

                        <TabsContent value="analytics">
                          <AnalyticsTab
                            businessStats={businessStats}
                            loading={loadingStats}
                            currentRange={{ startDate: statsDateRange.startDate, endDate: statsDateRange.endDate }}
                            onApplyDateRange={(range) => {
                              setStatsDateRange(range);
                              loadBusinessStats(undefined, range);
                            }}
                            selectedLocation={selectedLocation || ''}
                          />
                        </TabsContent>

                        <TabsContent value="photos">
                          <PhotosTab
                            photos={photos}
                            loadingPhotos={loadingPhotos}
                            onUploadClick={() => setIsPhotoUploadOpen(true)}
                          />
                        </TabsContent>

                        <TabsContent value="posts">
                          <PostsTab
                            posts={posts}
                            scheduledPosts={scheduledPosts}
                            onScheduledPostUpdate={handleScheduledPostUpdate}
                            onScheduledPostDelete={handleScheduledPostDelete}
                            onScheduledPostRegenerateImage={handleScheduledPostRegenerateImage}
                            onCreateClick={() => setIsPostCreateOpen(true)}
                            onAIGenerate={handleAIGeneration}
                            onEnhancedAIGenerate={() => setShowEnhancedGeneration(true)}
                            onViewGeneratedPosts={showGeneratedPostsDialog}
                            hasGeneratedPosts={generatedPosts.length > 0}
                            onDeletePost={handlePostDelete}
                            deletingPost={deletingPost}
                            isGeneratingAI={isGeneratingAI}
                            aiGenerationType={aiGenerationType}
                          />
                        </TabsContent>

                        <TabsContent value="reviews">
                          <ReviewsTab reviews={reviews} />
                        </TabsContent>

                        <TabsContent value="qna">
                          <QnaManagement 
                            locationName={selectedLocation || ''}
                            locationTitle={locationDetails?.title || 'Loading...'}
                            businessInfo={detailedBusinessInfo}
                            userId={userId}
                            {...(selectedAccount && { accountName: selectedAccount })}
                          />
                        </TabsContent>
                      </Tabs>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </SidebarInset>

        {/* Dialogs */}
        <EnhancedPostGenerationDialog
          isOpen={showEnhancedGeneration}
          onOpenChange={setShowEnhancedGeneration}
          onGenerate={(postConfigs, options) => {
            // Store scheduling options for use in the generated posts dialog
            console.log('Setting scheduling options:', options);
            setSchedulingOptions({
              scheduleType: options.scheduleType,
              allDate: options.allDate,
              separateCount: options.separateCount,
              separateInterval: options.separateInterval,
              separateStartDate: options.separateStartDate,
            });
            handleEnhancedAIGeneration(postConfigs, {
              ...options,
              businessLocation: locationDetails,
              detailedBusinessInfo: detailedBusinessInfo
            });
          }}
          isGenerating={isGeneratingAI}
        />

        <EnhancedGeneratedPostsDialog
          isOpen={showGeneratedPosts}
          onOpenChange={setShowGeneratedPosts}
          generatedPosts={generatedPosts}
          generatedPostImages={generatedPostImages}
          onUsePost={handleUseEnhancedPost}
          onClearAll={() => {
            clearGeneratedPosts();
            clearSchedulingOptions();
          }}
          onScheduleAll={loadScheduledPosts}
          onDeleteScheduledPost={loadScheduledPosts}
          schedulingOptions={schedulingOptions}
          locationId={selectedLocation?.split('/').pop() || null}
          accountName={selectedAccount || null}
        />

        <GeneratedPostsDialog
          isOpen={false}
          onOpenChange={() => {}}
          generatedPosts={[]}
          generatedPostImages={{}}
          onUsePost={handleUseGeneratedPostWrapper}
          onClearAll={clearGeneratedPosts}
        />

        <PhotoUploadDialog
          isOpen={isPhotoUploadOpen}
          onOpenChange={setIsPhotoUploadOpen}
          photoFile={photoFile}
          photoCategory={photoCategory}
          uploadingPhoto={uploadingPhoto}
          onPhotoFileChange={handlePhotoFileChange}
          onPhotoCategoryChange={setPhotoCategory}
          onUpload={handlePhotoUpload}
        />

        <PostCreateDialog
          isOpen={isPostCreateOpen}
          onOpenChange={setIsPostCreateOpen}
          postForm={postForm}
          onPostFormChange={(updates) => setPostForm({ ...postForm, ...updates })}
          creatingPost={creatingPost}
          onCreate={handlePostCreate}
          generateImage={generateImage}
          onGenerateImageChange={setGenerateImage}
          onAIGenerate={handleAIGeneration}
          isGeneratingAI={isGeneratingAI}
          aiGenerationType={aiGenerationType}
          generatedImageUrl={generatedImageUrl}
          localImagePreview={localImagePreview}
          onMediaChange={handlePostMediaChange}
        />
      </SidebarProvider>
    </div>
  );
}
