import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Camera, Check, Edit3, Eye, X, ChevronLeft, ChevronRight, CheckCircle2, Calendar } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';

interface GeneratedPost {
  id: string;
  summary: string;
  topicType: string;
  actionType: string;
  actionUrl?: string;
  imageUrl?: string;
  accountName?: string; // Add account name field
  isSelected: boolean;
  isUsed: boolean; // Track if post has been used
  isEditing: boolean;
  originalSummary: string;
  originalTopicType: string;
  originalActionType: string;
  originalActionUrl?: string;
  
  // Event types
  event?: {
    title: string;
    description?: string;
    schedule?: {
      startDate: string;
      startTime: string;
      endDate: string;
      endTime: string;
    };
    location?: string;
    organizer?: string;
    category?: string;
    tags?: string[];
    maxAttendees?: number;
    registrationRequired?: boolean;
    registrationUrl?: string;
    price?: number;
    currency?: string;
    featured?: boolean;
    recurring?: boolean;
    recurringPattern?: string;
  };
  
  offer?: {
    title?: string;
    description?: string;
    schedule?: {
      startDate?: string;
      startTime?: string;
      endDate?: string;
      endTime?: string;
    };
    couponCode?: string;
    discountType?: 'percentage' | 'fixed' | 'buy-one-get-one';
    discountValue?: number;
    minimumPurchase?: number;
    maximumDiscount?: number;
    redeemOnlineUrl?: string;
    termsConditions?: string;
    applicableProducts?: string[];
    excludedProducts?: string[];
    usageLimit?: number;
    customerType?: 'new' | 'existing' | 'all';
    featured?: boolean;
  };
  
  alert?: {
    alertType: string;
    severity?: 'info' | 'warning' | 'critical';
    title?: string;
    description?: string;
    schedule?: {
      startDate?: string;
      startTime?: string;
      endDate?: string;
      endTime?: string;
    };
    actionRequired?: boolean;
    actionUrl?: string;
    expiresAt?: string;
  };
  
  // Product types
  product?: {
    title: string;
    description?: string;
    price?: number;
    currency?: string;
    originalPrice?: number;
    category?: string;
    brand?: string;
    sku?: string;
    availability?: 'in-stock' | 'out-of-stock' | 'pre-order';
    inventory?: number;
    features?: string[];
    specifications?: Record<string, any>;
    images?: string[];
    variants?: any[];
    tags?: string[];
    featured?: boolean;
  };
  
  service?: {
    title: string;
    description?: string;
    price?: number;
    currency?: string;
    duration?: string;
    category?: string;
    provider?: string;
    availability?: string;
    bookingRequired?: boolean;
    bookingUrl?: string;
    features?: string[];
    requirements?: string[];
    testimonials?: any[];
    featured?: boolean;
  };
  
  announcement?: {
    title: string;
    description?: string;
    category?: 'news' | 'update' | 'milestone' | 'achievement';
    priority?: 'low' | 'medium' | 'high';
    targetAudience?: string;
    expiresAt?: string;
    actionUrl?: string;
    actionText?: string;
    featured?: boolean;
  };
  
  testimonial?: {
    customerName: string;
    customerAvatar?: string;
    rating?: number;
    review?: string;
    service?: string;
    date?: string;
    verified?: boolean;
    featured?: boolean;
  };
  
  faq?: {
    question: string;
    answer?: string;
    category?: string;
    tags?: string[];
    helpful?: number;
    featured?: boolean;
  };
  
  gallery?: {
    title: string;
    description?: string;
    images?: string[];
    category?: string;
    tags?: string[];
    featured?: boolean;
  };
  
  video?: {
    title: string;
    description?: string;
    videoUrl?: string;
    thumbnail?: string;
    duration?: string;
    category?: string;
    tags?: string[];
    featured?: boolean;
  };
  
  blog?: {
    title: string;
    excerpt?: string;
    content?: string;
    author?: string;
    category?: string;
    tags?: string[];
    readTime?: string;
    featured?: boolean;
  };
  
  podcast?: {
    title: string;
    description?: string;
    audioUrl?: string;
    duration?: string;
    episode?: number;
    season?: number;
    guests?: string[];
    category?: string;
    tags?: string[];
    featured?: boolean;
  };
  
  webinar?: {
    title: string;
    description?: string;
    schedule?: {
      startDate?: string;
      startTime?: string;
      endDate?: string;
      endTime?: string;
    };
    host?: string;
    speakers?: string[];
    registrationUrl?: string;
    maxAttendees?: number;
    price?: number;
    currency?: string;
    category?: string;
    tags?: string[];
    featured?: boolean;
  };
  
  workshop?: {
    title: string;
    description?: string;
    schedule?: {
      startDate?: string;
      startTime?: string;
      endDate?: string;
      endTime?: string;
    };
    instructor?: string;
    location?: string;
    maxParticipants?: number;
    registrationUrl?: string;
    price?: number;
    currency?: string;
    materials?: string[];
    prerequisites?: string[];
    category?: string;
    tags?: string[];
    featured?: boolean;
  };
  
  contest?: {
    title: string;
    description?: string;
    schedule?: {
      startDate?: string;
      startTime?: string;
      endDate?: string;
      endTime?: string;
    };
    prizes?: string[];
    entryRequirements?: string[];
    entryUrl?: string;
    maxEntries?: number;
    eligibility?: string;
    rules?: string[];
    featured?: boolean;
  };
  
  giveaway?: {
    title: string;
    description?: string;
    schedule?: {
      startDate?: string;
      startTime?: string;
      endDate?: string;
      endTime?: string;
    };
    prize?: string;
    entryMethods?: string[];
    entryUrl?: string;
    maxEntries?: number;
    eligibility?: string;
    rules?: string[];
    featured?: boolean;
  };
  
  // Standard post metadata
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  featured?: boolean;
  author?: string;
  readTime?: string;
  targetAudience?: string;
  callToAction?: string;
  actionText?: string;
  
  alertType?: string; // Legacy support
  raw?: string; // Added for debugging
  fullText?: string; // Added for debugging
}

interface EnhancedGeneratedPostsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  generatedPosts: any[];
  generatedPostImages: {[key: number]: string};
  onUsePost: (post: any, imageUrl?: string) => void;
  onClearAll: () => void;
  onScheduleAll: () => void;
  onDeleteScheduledPost: () => void;
  // Add scheduling options from generation dialog
  schedulingOptions?: {
    scheduleType: 'all' | 'separately';
    allDate?: string;
    separateCount?: number;
    separateInterval?: number;
    separateStartDate?: string;
  };
  // Add location and account info
  locationId?: string | null;
  accountName?: string | null;
}

// Update POSTS_PER_PAGE to show only 3 posts
const POSTS_PER_PAGE = 3;

const EnhancedGeneratedPostsDialog: React.FC<EnhancedGeneratedPostsDialogProps> = ({
  isOpen,
  onOpenChange,
  generatedPosts,
  generatedPostImages,
  onUsePost,
  onClearAll,
  onScheduleAll,
  onDeleteScheduledPost,
  schedulingOptions,
  locationId,
  accountName,
}) => {
  // All hooks must be called before any return
  const { user, isLoaded, isSignedIn } = useUser();
  const [currentPage, setCurrentPage] = useState(1);
  const [posts, setPosts] = useState<GeneratedPost[]>([]);
  const [regeneratingImageId, setRegeneratingImageId] = useState<string | null>(null);
  const [globalAccountName, setGlobalAccountName] = useState<string>(accountName || '');
  
  // Add state for scheduling options that can be modified by user
  const [userSchedulingOptions, setUserSchedulingOptions] = useState<{
    scheduleType: 'all' | 'separately';
    allDate?: string;
    separateCount?: number;
    separateInterval?: number;
    separateStartDate?: string;
  }>(schedulingOptions || {
    scheduleType: 'all',
    allDate: new Date().toISOString().slice(0, 10),
    separateCount: 1,
    separateInterval: 1,
    separateStartDate: new Date().toISOString().slice(0, 10)
  });

  // Initialize posts when generatedPosts changes
  useEffect(() => {
    if (generatedPosts.length > 0) {
      const initialPosts: GeneratedPost[] = generatedPosts.map((post, index) => ({
        id: `post-${index}`,
        summary: post.summary || '',
        topicType: post.topicType || 'STANDARD',
        actionType: post.actionType || 'LEARN_MORE',
        actionUrl: post.actionUrl || '',
        imageUrl: generatedPostImages[index],
        isSelected: false,
        isUsed: false, // Initialize as not used
        isEditing: false,
        originalSummary: post.summary || '',
        originalTopicType: post.topicType || 'STANDARD',
        originalActionType: post.actionType || 'LEARN_MORE',
        originalActionUrl: post.actionUrl || '',
        event: post.event || undefined,
        offer: post.offer || undefined,
        alertType: post.alertType || undefined,
        raw: post.raw || undefined, // Initialize for debugging
        fullText: post.fullText || undefined, // Initialize for debugging
      }));
      setPosts(initialPosts);
      setCurrentPage(1);
    }
  }, [generatedPosts, generatedPostImages]);

  // Update user scheduling options when prop changes
  useEffect(() => {
    if (schedulingOptions) {
      setUserSchedulingOptions(schedulingOptions);
    }
  }, [schedulingOptions]);

  // Debug: Log when dialog opens and scheduling options
  useEffect(() => {
    if (isOpen) {
      console.log('EnhancedGeneratedPostsDialog opened');
      console.log('Scheduling options:', schedulingOptions);
      console.log('Generated posts count:', generatedPosts.length);
      
      // Test the date computation logic
      if (schedulingOptions) {
        const testScheduleType = schedulingOptions.scheduleType || 'all';
        const testStartDate = schedulingOptions.separateStartDate || '2025-07-22';
        const testInterval = schedulingOptions.separateInterval || 2;
        const testCount = 3;
        
        console.log('Testing date computation with:', {
          scheduleType: testScheduleType,
          startDate: testStartDate,
          interval: testInterval,
          count: testCount
        });
        
        // Test the computeScheduledTimes function
        const testTimes = computeScheduledTimes(
          testScheduleType,
          testStartDate,
          testCount,
          testInterval,
          testStartDate,
          testCount // Pass totalCount for separateCount
        );
        
        console.log('Test computed dates:', testTimes.map((date, idx) => `Post ${idx + 1}: ${date.toISOString()}`));
      }
    }
  }, [isOpen, schedulingOptions, generatedPosts.length]);

  // Helper function to compute scheduled times (moved outside handleScheduleAllPosts for testing)
  function computeScheduledTimes(
    scheduleType: string, 
    baseDate: string, 
    totalPosts: number, 
    interval: number,
    startDate?: string,
    separateCount?: number
  ) {
    const times: Date[] = [];
    let date: Date;
    
    if (scheduleType === 'separately' && startDate) {
      date = new Date(startDate);
      console.log('Using separate start date:', startDate);
    } else {
      date = new Date(baseDate);
      console.log('Using base date:', baseDate);
    }
    
    if (isNaN(date.getTime())) {
      date = new Date(); // fallback to now if date is invalid
      console.log('Invalid date, using current date');
    }

    console.log('Initial date for computation:', date.toISOString());
    console.log('Total posts to schedule:', totalPosts);
    console.log('Posts per interval:', separateCount);

    if (scheduleType === 'all') {
      // All posts get the same date
      for (let i = 0; i < totalPosts; i++) {
        const postDate = new Date(date);
        times.push(postDate);
        console.log(`Post ${i + 1}: ${postDate.toISOString()}`);
      }
    } else if (scheduleType === 'separately') {
      // Schedule posts in batches based on separateCount
      let postIndex = 0;
      let currentDate = new Date(date);
      
      while (postIndex < totalPosts) {
        // Schedule 'separateCount' posts on the current date
        const postsOnThisDate = Math.min(separateCount || 1, totalPosts - postIndex);
        
        for (let i = 0; i < postsOnThisDate; i++) {
          const postDate = new Date(currentDate);
          times.push(postDate);
          console.log(`Post ${postIndex + i + 1}: ${postDate.toISOString()} (batch ${Math.floor(postIndex / (separateCount || 1)) + 1})`);
        }
        
        postIndex += postsOnThisDate;
        
        // Move to next interval date if there are more posts to schedule
        if (postIndex < totalPosts) {
          currentDate.setDate(currentDate.getDate() + interval);
          console.log(`Next batch date: ${currentDate.toISOString()}`);
        }
      }
    }
    
    return times;
  }

  // Only after all hooks:
  if (!isLoaded) return null;
  if (!isSignedIn) return <div className="p-8 text-center">Sign in to view this page</div>;

  const availablePosts = posts.filter(post => !post.isUsed);
  const totalPages = Math.ceil(availablePosts.length / POSTS_PER_PAGE);
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const endIndex = startIndex + POSTS_PER_PAGE;
  const currentPosts = availablePosts.slice(startIndex, endIndex);

  const topicTypes = [
    { value: 'STANDARD', label: 'Standard Post' },
    { value: 'EVENT', label: 'Event' },
    { value: 'OFFER', label: 'Offer/Deal' },
    { value: 'ALERT', label: 'Alert/News' },
  ];

  const actionTypes = [
    { value: 'LEARN_MORE', label: 'Learn More' },
    { value: 'BOOK', label: 'Book Now' },
    { value: 'ORDER', label: 'Order Online' },
    { value: 'SHOP', label: 'Shop Now' },
    { value: 'SIGN_UP', label: 'Sign Up' },
    { value: 'CALL', label: 'Call Now' },
  ];

  // Remove selectedPosts state and all selection logic
  // Add delete handler
  const handleDeletePost = (postId: string) => {
    setPosts(prev => prev.filter(post => post.id !== postId));
  };

  // Handler: Schedule all posts
  async function handleScheduleAllPosts() {
    if (!user || !user.id) {
      toast.error('User not logged in');
      return;
    }
    const userId = user.id;
    if (posts.length === 0) {
      toast.error('No posts to schedule');
      return;
    }

    // Debug: Log the scheduling options
    console.log('Scheduling options received:', userSchedulingOptions);
    console.log('Number of posts to schedule:', posts.length);

    // Use the actual scheduling options from user selection
    const scheduleType = userSchedulingOptions?.scheduleType || 'all';
    const allDate = userSchedulingOptions?.allDate || new Date().toISOString().slice(0, 10);
    const separateStartDate = userSchedulingOptions?.separateStartDate || new Date().toISOString().slice(0, 10);
    const separateInterval = userSchedulingOptions?.separateInterval || 1;
    const separateCount = Math.min(userSchedulingOptions?.separateCount || posts.length, posts.length);

    console.log('Using user-selected scheduling parameters:', {
      scheduleType,
      allDate,
      separateStartDate,
      separateInterval,
      separateCount,
      postsLength: posts.length
    });

    const scheduledTimes = computeScheduledTimes(
      scheduleType, 
      allDate, 
      posts.length, // Total number of posts to schedule
      separateInterval,
      separateStartDate,
      separateCount // Number of posts per interval
    );

    console.log('Final scheduled times:', scheduledTimes.map((date, idx) => `Post ${idx + 1}: ${date.toISOString()}`));

    // Get location_id from props first, then from storage
    let finalLocationId = locationId || null;
    
    // If no location ID from props, try to get it from storage
    if (!finalLocationId) {
      if (window.location.pathname.includes('/business-data')) {
        finalLocationId = localStorage.getItem('selectedLocationId');
        console.log('Location ID from localStorage:', finalLocationId);
      }
      
      // If still no location ID, try to get it from sessionStorage
      if (!finalLocationId) {
        finalLocationId = sessionStorage.getItem('selectedLocationId');
        console.log('Location ID from sessionStorage:', finalLocationId);
      }
    } else {
      console.log('Location ID from props:', finalLocationId);
    }
    
    // If still no location ID, show a warning but continue
    if (!finalLocationId) {
      console.warn('No location ID found - posts will be scheduled without location filtering');
    }
    
    console.log('Final Location ID for scheduling:', finalLocationId);
    console.log('Account name from props:', accountName);
    console.log('Global account name:', globalAccountName);
    console.log('Posts before API preparation:', posts.map(p => ({ 
      id: p.id, 
      accountName: p.accountName, 
      summary: p.summary?.substring(0, 30) + '...' 
    })));

    // Prepare posts for API
    const apiPosts = posts.map((post, idx) => {
      const date = scheduledTimes[idx] || scheduledTimes[0]; // fallback to first date
      return {
        summary: post.summary,
        topic_type: post.topicType,
        action_type: post.actionType,
        action_url: post.actionUrl,
        media_url: post.imageUrl,
        account_name: post.accountName || globalAccountName || accountName, // Add account_name to each post (use post-specific, global, or prop)
        language_code: 'en',
        scheduled_publish_time: date.toISOString(), // Convert to ISO string for proper date format
        status: 'scheduled',
        batch_id: `batch-${Date.now()}`,
        location_id: finalLocationId, // Add location_id to each post
        // Add structured data for different post types
        event: post.event,
        offer: post.offer,
        alert: post.alert,
        alertType: post.alertType, // Legacy support
        product: post.product,
        service: post.service,
        announcement: post.announcement,
        testimonial: post.testimonial,
        faq: post.faq,
        gallery: post.gallery,
        video: post.video,
        blog: post.blog,
        podcast: post.podcast,
        webinar: post.webinar,
        workshop: post.workshop,
        contest: post.contest,
        giveaway: post.giveaway,
        // Standard post metadata
        title: post.title,
        description: post.description,
        category: post.category,
        tags: post.tags,
        featured: post.featured,
        author: post.author,
        readTime: post.readTime,
        targetAudience: post.targetAudience,
        callToAction: post.callToAction,
        actionText: post.actionText,
      };
    });

    console.log('API posts with dates:', apiPosts.map((post, idx) => ({
      index: idx,
      summary: post.summary.substring(0, 30) + '...',
      scheduled_publish_time: post.scheduled_publish_time,
      location_id: post.location_id,
      account_name: post.account_name,
      topic_type: post.topic_type,
      event: post.event,
      offer: post.offer,
      alert: post.alert,
      alertType: post.alertType,
      product: post.product,
      service: post.service,
      announcement: post.announcement,
      testimonial: post.testimonial,
      faq: post.faq,
      gallery: post.gallery,
      video: post.video,
      blog: post.blog,
      podcast: post.podcast,
      webinar: post.webinar,
      workshop: post.workshop,
      contest: post.contest,
      giveaway: post.giveaway,
      // Standard post metadata
      title: post.title,
      description: post.description,
      category: post.category,
      tags: post.tags,
      featured: post.featured,
      author: post.author,
      readTime: post.readTime,
      targetAudience: post.targetAudience,
      callToAction: post.callToAction,
      actionText: post.actionText
    })));

    // Prepare the final request body
    const requestBody = { 
      posts: apiPosts,
      location_id: finalLocationId 
    };
    
    console.log('Final request body being sent to API:', {
      postsCount: requestBody.posts.length,
      location_id: requestBody.location_id,
      firstPostSummary: requestBody.posts[0]?.summary?.substring(0, 50) + '...'
    });

    // Call the API
    const res = await fetch('/api/business/scheduled-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    const result = await res.json();
    if (result.success) {
      toast.success('Scheduled posts saved!');
      // Optionally clear posts or close dialog
      setPosts([]);
      onOpenChange(false);
      onScheduleAll();
    } else {
      toast.error('Failed to schedule posts: ' + (result.error || 'Unknown error'));
    }
  }

  const handleEditToggle = (postId: string) => {
    setPosts(prev => prev.map(post => 
      post.id === postId ? { ...post, isEditing: !post.isEditing } : post
    ));
  };

  // Replace the old handlePostUpdate with a version that supports nested object updates for offer/event fields
  const handlePostUpdate = (postId: string, field: string, value: any) => {
    setPosts(prev => prev.map(post => {
      if (post.id !== postId) return post;
      // For nested offer/event updates
      if (field === 'offer') {
        return { ...post, offer: { ...post.offer, ...value } };
      }
      if (field === 'event') {
        return { ...post, event: { ...post.event, ...value } };
      }
      return { ...post, [field]: value };
    }));
  };

  const handleSaveEdit = (postId: string) => {
    setPosts(prev => prev.map(post => 
      post.id === postId ? { 
        ...post, 
        isEditing: false,
        originalSummary: post.summary,
        originalTopicType: post.topicType,
        originalActionType: post.actionType,
        originalActionUrl: post.actionUrl,
      } : post
    ));
  };

  const handleCancelEdit = (postId: string) => {
    setPosts(prev => prev.map(post => 
      post.id === postId ? { 
        ...post, 
        isEditing: false,
        summary: post.originalSummary,
        topicType: post.originalTopicType,
        actionType: post.originalActionType,
        actionUrl: post.originalActionUrl,
      } : post
    ));
  };

  const handleUseSelectedPosts = () => {
    const selectedPostsData = posts.filter(post => !post.isUsed);
    
    selectedPostsData.forEach((post) => {
      // Always synthesize event for OFFER from offer fields
      let event = post.event;
      if (post.topicType === 'OFFER') {
        event = {
          title: post.offer?.title || '',
          schedule: {
            startDate: post.offer?.schedule?.startDate || '',
            startTime: post.offer?.schedule?.startTime || '',
            endDate: post.offer?.schedule?.endDate || '',
            endTime: post.offer?.schedule?.endTime || '',
          }
        };
      }
      const postData = {
        summary: post.summary,
        topicType: post.topicType,
        actionType: post.actionType,
        actionUrl: post.actionUrl,
        // Pass event fields if present (for EVENT and OFFER)
        ...((['EVENT', 'OFFER'].includes(post.topicType)) ? {
          event: {
            title: event?.title || '',
            schedule: {
              startDate: event?.schedule?.startDate || '',
              startTime: event?.schedule?.startTime || '',
              endDate: event?.schedule?.endDate || '',
              endTime: event?.schedule?.endTime || '',
            }
          }
        } : {}),
        // Pass offer fields if present
        ...(post.topicType === 'OFFER' && post.offer ? {
          offer: {
            title: post.offer.title,
            schedule: post.offer.schedule,
            couponCode: post.offer.couponCode,
            redeemOnlineUrl: post.offer.redeemOnlineUrl,
            termsConditions: post.offer.termsConditions,
          }
        } : {}),
        // Pass alertType if present
        ...(post.topicType === 'ALERT' && post.alertType ? { alertType: post.alertType } : {}),
      };
      onUsePost(postData, post.imageUrl);
    });

    // Mark selected posts as used instead of removing them
    setPosts(prev => prev.map(post => 
      !post.isUsed ? { ...post, isUsed: true } : post
    ));
    
    // Clear selections
    // setSelectedPosts(new Set()); // No longer needed
    
    // Adjust pagination if needed
    if (currentPosts.length === selectedPostsData.length && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Remove handleSelectAll and handleDeselectAll
  const handleSelectAll = () => {
    // No longer needed
  };

  const handleDeselectAll = () => {
    // No longer needed
  };

  const handleViewUsedPosts = () => {
    // Could implement a toggle to show used posts if needed
    console.log('Used posts:', posts.filter(p => p.isUsed));
  };

  const usedPostsCount = posts.filter(post => post.isUsed).length;
  const availablePostsCount = posts.filter(post => !post.isUsed).length;

  // Add a function to regenerate image for a post
  async function handleRegenerateImage(post: GeneratedPost) {
    setRegeneratingImageId(post.id);
    try {
      // Call the backend or AI image generation function (assume available as window.generateIdeogramImage or similar)
      if (post.summary) {
        const response = await fetch('/api/ideogram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: post.summary }),
        });
        if (response.ok) {
          const data = await response.json();
          const newImageUrl = data.imageUrl;
          setPosts(prev => prev.map(p => p.id === post.id ? { ...p, imageUrl: newImageUrl } : p));
        }
      }
    } finally {
      setRegeneratingImageId(null);
    }
  }

  const isPromise = (value: any): value is Promise<any> => {
    return value && typeof value.then === 'function';
  };

  const handleDeleteScheduledPost = async (postId: string) => {
    try {
      const res = await fetch(`/api/business/scheduled-posts/${postId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Scheduled post deleted');
        setPosts(prev => prev.filter(post => post.id !== postId));
        if (onDeleteScheduledPost) {
          const result = onDeleteScheduledPost();
          if (isPromise(result)) {
            await result;
          }
        }
      } else {
        toast.error('Failed to delete scheduled post');
      }
    } catch (e) {
      toast.error('Failed to delete scheduled post');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Generated Post Review</span>
            <div className="flex items-center gap-2 text-sm font-normal">
              <Badge variant="outline">
                {posts.length} {posts.length === 1 ? 'Post' : 'Posts'} Generated
              </Badge>
              {usedPostsCount > 0 && (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {usedPostsCount} Used
                </Badge>
              )}
            </div>
          </DialogTitle>
          <DialogDescription>
            Review, edit, and select the posts you want to use. Used posts remain available until you clear all or refresh the page.
          </DialogDescription>
          
          {/* Global Account Name Input */}
          <div className="flex items-center gap-2 py-2 border-t">
            <Label className="text-sm font-medium">Default Account Name:</Label>
            <input
              type="text"
              className="flex-1 text-sm border rounded px-2 py-1"
              value={globalAccountName}
              placeholder="Enter account name (e.g., account/1128)"
              onChange={(e) => {
                const newAccountName = e.target.value;
                setGlobalAccountName(newAccountName);
                // Update all posts with the new account name
                setPosts(prev => prev.map(post => ({
                  ...post,
                  accountName: newAccountName
                })));
              }}
            />
          </div>

          {/* Scheduling Options */}
          <div className="py-2 border-t">
            <Label className="text-sm font-medium">Scheduling Options:</Label>
            <div className="mt-2 space-y-3">
              <div className="flex gap-4 items-center">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="scheduleType"
                    checked={userSchedulingOptions?.scheduleType === 'all'}
                    onChange={() => setUserSchedulingOptions(prev => ({ 
                      scheduleType: 'all',
                      allDate: prev?.allDate || new Date().toISOString().slice(0, 10),
                      separateCount: prev?.separateCount || posts.length,
                      separateInterval: prev?.separateInterval || 1,
                      separateStartDate: prev?.separateStartDate || new Date().toISOString().slice(0, 10)
                    }))}
                  />
                  All together
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="scheduleType"
                    checked={userSchedulingOptions?.scheduleType === 'separately'}
                    onChange={() => setUserSchedulingOptions(prev => ({ 
                      scheduleType: 'separately',
                      allDate: prev?.allDate || new Date().toISOString().slice(0, 10),
                      separateCount: prev?.separateCount || posts.length,
                      separateInterval: prev?.separateInterval || 1,
                      separateStartDate: prev?.separateStartDate || new Date().toISOString().slice(0, 10)
                    }))}
                  />
                  Separately
                </label>
              </div>
              
              {userSchedulingOptions?.scheduleType === 'all' && (
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Publish Date:</Label>
                  <input
                    type="date"
                    className="text-sm border rounded px-2 py-1"
                    min={new Date().toISOString().slice(0, 10)}
                    value={userSchedulingOptions?.allDate || ''}
                    placeholder="Select publish date"
                    onChange={(e) => setUserSchedulingOptions(prev => ({ 
                      ...prev, 
                      allDate: e.target.value 
                    }))}
                  />
                </div>
              )}
              
              {userSchedulingOptions?.scheduleType === 'separately' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Publish</Label>
                    <input
                      type="number"
                      min={1}
                      max={posts.length}
                      className="w-16 text-sm border rounded px-2 py-1"
                      value={userSchedulingOptions?.separateCount || posts.length}
                      placeholder="Count"
                      onChange={(e) => setUserSchedulingOptions(prev => ({ 
                        ...prev, 
                        separateCount: Math.max(1, Math.min(posts.length, parseInt(e.target.value) || 1))
                      }))}
                    />
                    <span className="text-sm">posts per batch, after every</span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      className="w-16 text-sm border rounded px-2 py-1"
                      value={userSchedulingOptions?.separateInterval || 1}
                      placeholder="Days"
                      onChange={(e) => setUserSchedulingOptions(prev => ({ 
                        ...prev, 
                        separateInterval: Math.max(1, Math.min(30, parseInt(e.target.value) || 1))
                      }))}
                    />
                    <span className="text-sm">day(s)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Starting on:</Label>
                    <input
                      type="date"
                      className="text-sm border rounded px-2 py-1"
                      min={new Date().toISOString().slice(0, 10)}
                      value={userSchedulingOptions?.separateStartDate || ''}
                      placeholder="Select start date"
                      onChange={(e) => setUserSchedulingOptions(prev => ({ 
                        ...prev, 
                        separateStartDate: e.target.value 
                      }))}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        {availablePostsCount > 0 ? (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Selection Controls */}
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                {totalPages > 1 && (
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                )}
                {usedPostsCount > 0 && (
                  <div className="text-xs text-green-600">
                    {usedPostsCount} post{usedPostsCount === 1 ? '' : 's'} applied to posting
                  </div>
                )}
              </div>
            </div>

            {/* Posts Grid - Scrollable */}
            <div className="flex-1 overflow-y-auto space-y-4 py-4 min-h-0">
              {currentPosts.map((post) => (
                <Card 
                  key={post.id} 
                  className="transition-all duration-200 border-gray-200 hover:border-gray-300"
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Post {posts.indexOf(post) + 1}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-xs">
                            {topicTypes.find(t => t.value === post.topicType)?.label}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {actionTypes.find(a => a.value === post.actionType)?.label}
                          </Badge>
                          {post.imageUrl && (
                            <Badge variant="default" className="bg-purple-100 text-purple-800 text-xs">
                              <Camera className="h-3 w-3 mr-1" />
                              Image
                            </Badge>
                          )}
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditToggle(post.id)}
                          className="h-8 w-8 p-0"
                        >
                          {post.isEditing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteScheduledPost(post.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:bg-red-100"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="flex gap-4">
                      {/* Image Preview */}
                      {post.imageUrl && (
                        <div className="flex-shrink-0 flex flex-col items-center">
                          <img
                            src={post.imageUrl}
                            alt={`Generated image for post`}
                            className="w-24 h-24 rounded-lg object-cover border"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => handleRegenerateImage(post)}
                            disabled={regeneratingImageId === post.id}
                          >
                            {regeneratingImageId === post.id ? 'Regenerating...' : 'Regenerate Image'}
                          </Button>
                        </div>
                      )}
                      
                      {/* Post Content */}
                      <div className="flex-1 space-y-3">
                        {post.isEditing ? (
                          // Edit Mode
                          <div className="space-y-3">
                            <div>
                              <Label className="text-xs">Post Content</Label>
                              <Textarea
                                value={post.summary}
                                onChange={(e) => handlePostUpdate(post.id, 'summary', e.target.value)}
                                className="text-sm"
                                rows={3}
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Post Type</Label>
                                <Select 
                                  value={post.topicType} 
                                  onValueChange={(value) => handlePostUpdate(post.id, 'topicType', value)}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {topicTypes.map((type) => (
                                      <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div>
                                <Label className="text-xs">Action Type</Label>
                                <Select 
                                  value={post.actionType} 
                                  onValueChange={(value) => handlePostUpdate(post.id, 'actionType', value)}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {actionTypes.map((action) => (
                                      <SelectItem key={action.value} value={action.value}>
                                        {action.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            <div>
                              <Label className="text-xs">Account Name (e.g., account/1128)</Label>
                              <input
                                type="text"
                                className="text-sm w-full border rounded px-2 py-1"
                                value={post.accountName || ''}
                                placeholder="Enter account name with ID (e.g., account/1128)"
                                onChange={(e) => handlePostUpdate(post.id, 'accountName', e.target.value)}
                              />
                            </div>
                            
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCancelEdit(post.id)}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleSaveEdit(post.id)}
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          // View Mode
                          <>
                            <div>
                              <Label className="text-xs">Summary</Label>
                              <p className="text-sm mb-1 text-gray-700">{post.summary}</p>
                            </div>
                            {post.accountName && (
                              <div>
                                <Label className="text-xs">Account Name</Label>
                                <p className="text-sm mb-1 text-gray-700">{post.accountName}</p>
                              </div>
                            )}
                            {/* Show event fields if present */}
                            {post.topicType === 'EVENT' && post.event && (
                              <div className="space-y-1">
                                <Label className="text-xs">Event Title</Label>
                                <p className="text-sm text-gray-700">{post.event.title}</p>
                                <Label className="text-xs">Start Date/Time</Label>
                                <p className="text-sm text-gray-700">{post.event.schedule?.startDate} {post.event.schedule?.startTime}</p>
                                <Label className="text-xs">End Date/Time</Label>
                                <p className="text-sm text-gray-700">{post.event.schedule?.endDate} {post.event.schedule?.endTime}</p>
                              </div>
                            )}
                            {/* Show offer fields if present */}
                            {post.topicType === 'OFFER' && post.offer && (
                              <div className="space-y-1">
                                <Label className="text-xs">Offer Title</Label>
                                <p className="text-sm text-gray-700">{post.offer.title}</p>
                                <Label className="text-xs">Start Date/Time</Label>
                                <p className="text-sm text-gray-700">{post.offer.schedule?.startDate} {post.offer.schedule?.startTime}</p>
                                <Label className="text-xs">End Date/Time</Label>
                                <p className="text-sm text-gray-700">{post.offer.schedule?.endDate} {post.offer.schedule?.endTime}</p>
                                <Label className="text-xs">Coupon Code</Label>
                                <p className="text-sm text-gray-700">{post.offer.couponCode}</p>
                                <Label className="text-xs">Redeem Online URL</Label>
                                <p className="text-sm text-gray-700">{post.offer.redeemOnlineUrl}</p>
                                <Label className="text-xs">Terms & Conditions</Label>
                                <p className="text-sm text-gray-700">{post.offer.termsConditions}</p>
                              </div>
                            )}
                            {/* Show alert fields if present */}
                            {post.topicType === 'ALERT' && (
                              <div className="space-y-1">
                                <Label className="text-xs">Alert Type</Label>
                                <p className="text-sm text-gray-700">{post.alertType}</p>
                              </div>
                            )}
                          </>
                        )}
                        {post.isEditing && post.topicType === 'EVENT' && post.event && (
                          <div className="space-y-3 mt-2">
                            <div>
                              <Label className="text-xs">Event Title</Label>
                              <input
                                className="text-sm w-full border rounded px-2 py-1"
                                value={post.event.title || ''}
                                placeholder="Enter event title"
                                onChange={e => handlePostUpdate(post.id, 'event', { ...(post.event || {}), title: e.target.value })}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">Start Date</Label>
                                <input
                                  type="date"
                                  className="text-sm w-full border rounded px-2 py-1"
                                  value={(post.event.schedule?.startDate || '').split(' ')[0]}
                                  placeholder="Start date"
                                  onChange={e => handlePostUpdate(post.id, 'event', { ...(post.event || {}), schedule: { ...(post.event?.schedule || {}), startDate: e.target.value } })}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Start Time</Label>
                                <input
                                  type="time"
                                  className="text-sm w-full border rounded px-2 py-1"
                                  value={(() => {
                                    const t = post.event.schedule?.startTime || '';
                                    if (/am|pm/i.test(t)) {
                                      const [time, period] = t.split(/\s+/);
                                      let [h, m] = time.split(':');
                                      let hour = parseInt(h, 10);
                                      if (/pm/i.test(period) && hour < 12) hour += 12;
                                      if (/am/i.test(period) && hour === 12) hour = 0;
                                      return `${hour.toString().padStart(2, '0')}:${m || '00'}`;
                                    }
                                    return t;
                                  })()}
                                  placeholder="Start time"
                                  onChange={e => handlePostUpdate(post.id, 'event', { ...(post.event || {}), schedule: { ...(post.event?.schedule || {}), startTime: e.target.value } })}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">End Date</Label>
                                <input
                                  type="date"
                                  className="text-sm w-full border rounded px-2 py-1"
                                  value={(post.event.schedule?.endDate || '').split(' ')[0]}
                                  placeholder="End date"
                                  onChange={e => handlePostUpdate(post.id, 'event', { ...(post.event || {}), schedule: { ...(post.event?.schedule || {}), endDate: e.target.value } })}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">End Time</Label>
                                <input
                                  type="time"
                                  className="text-sm w-full border rounded px-2 py-1"
                                  value={(() => {
                                    const t = post.event.schedule?.endTime || '';
                                    if (/am|pm/i.test(t)) {
                                      const [time, period] = t.split(/\s+/);
                                      let [h, m] = time.split(':');
                                      let hour = parseInt(h, 10);
                                      if (/pm/i.test(period) && hour < 12) hour += 12;
                                      if (/am/i.test(period) && hour === 12) hour = 0;
                                      return `${hour.toString().padStart(2, '0')}:${m || '00'}`;
                                    }
                                    return t;
                                  })()}
                                  placeholder="End time"
                                  onChange={e => handlePostUpdate(post.id, 'event', { ...(post.event || {}), schedule: { ...(post.event?.schedule || {}), endTime: e.target.value } })}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                        {/* OFFER EDIT MODE */}
                        {post.isEditing && post.topicType === 'OFFER' && post.offer && (
                          <div className="space-y-3 mt-2">
                            <div>
                              <Label className="text-xs">Offer Title</Label>
                              <input
                                className="text-sm w-full border rounded px-2 py-1"
                                value={post.offer.title || ''}
                                placeholder="Enter offer title"
                                onChange={e => {
                                  handlePostUpdate(post.id, 'offer', { ...(post.offer || {}), title: e.target.value });
                                  handlePostUpdate(post.id, 'event', { ...(post.event || {}), title: e.target.value });
                                }}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">Start Date</Label>
                                <input
                                  type="date"
                                  className="text-sm w-full border rounded px-2 py-1"
                                  value={(post.offer.schedule?.startDate || '').split(' ')[0]}
                                  placeholder="Start date"
                                  onChange={e => {
                                    handlePostUpdate(post.id, 'offer', { ...(post.offer || {}), schedule: { ...(post.offer?.schedule || {}), startDate: e.target.value } });
                                    handlePostUpdate(post.id, 'event', { ...(post.event || {}), schedule: { ...(post.event?.schedule || {}), startDate: e.target.value } });
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Start Time</Label>
                                <input
                                  type="time"
                                  className="text-sm w-full border rounded px-2 py-1"
                                  value={post.offer.schedule?.startTime || ''}
                                  placeholder="Start time"
                                  onChange={e => {
                                    handlePostUpdate(post.id, 'offer', { ...(post.offer || {}), schedule: { ...(post.offer?.schedule || {}), startTime: e.target.value } });
                                    handlePostUpdate(post.id, 'event', { ...(post.event || {}), schedule: { ...(post.event?.schedule || {}), startTime: e.target.value } });
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">End Date</Label>
                                <input
                                  type="date"
                                  className="text-sm w-full border rounded px-2 py-1"
                                  value={(post.offer.schedule?.endDate || '').split(' ')[0]}
                                  placeholder="End date"
                                  onChange={e => {
                                    handlePostUpdate(post.id, 'offer', { ...(post.offer || {}), schedule: { ...(post.offer?.schedule || {}), endDate: e.target.value } });
                                    handlePostUpdate(post.id, 'event', { ...(post.event || {}), schedule: { ...(post.event?.schedule || {}), endDate: e.target.value } });
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">End Time</Label>
                                <input
                                  type="time"
                                  className="text-sm w-full border rounded px-2 py-1"
                                  value={post.offer.schedule?.endTime || ''}
                                  placeholder="End time"
                                  onChange={e => {
                                    handlePostUpdate(post.id, 'offer', { ...(post.offer || {}), schedule: { ...(post.offer?.schedule || {}), endTime: e.target.value } });
                                    handlePostUpdate(post.id, 'event', { ...(post.event || {}), schedule: { ...(post.event?.schedule || {}), endTime: e.target.value } });
                                  }}
                                />
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">Coupon Code</Label>
                              <input
                                className="text-sm w-full border rounded px-2 py-1"
                                value={post.offer.couponCode || ''}
                                placeholder="Enter coupon code"
                                onChange={e => handlePostUpdate(post.id, 'offer', { ...(post.offer || {}), couponCode: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Redeem Online URL</Label>
                              <input
                                className="text-sm w-full border rounded px-2 py-1"
                                value={post.offer.redeemOnlineUrl || ''}
                                placeholder="Enter redeem online URL"
                                onChange={e => handlePostUpdate(post.id, 'offer', { ...(post.offer || {}), redeemOnlineUrl: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Terms & Conditions</Label>
                              <Textarea
                                className="text-sm w-full border rounded px-2 py-1"
                                value={post.offer.termsConditions || ''}
                                placeholder="Enter terms and conditions"
                                onChange={e => handlePostUpdate(post.id, 'offer', { ...(post.offer || {}), termsConditions: e.target.value })}
                                rows={2}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center py-2 border-t">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => setCurrentPage(pageNum)}
                          isActive={currentPage === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <CheckCircle2 className="inline-block h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">All Posts Used!</h3>
            <p className="text-muted-foreground mb-4">
              You've used all {usedPostsCount} generated posts. Generate more posts or clear all to start fresh.
            </p>
          </div>
        )}

        <DialogFooter>
          <div className="flex gap-2">
           
            {availablePostsCount > 0 && (
              <Button
                variant="default"
                onClick={handleScheduleAllPosts}
                disabled={posts.length === 0}
                className="gap-2"
              >
                <Check className="h-4 w-4" />
                Schedule All {availablePostsCount} Posts
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedGeneratedPostsDialog; 