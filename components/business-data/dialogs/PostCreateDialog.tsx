import React, { ChangeEvent, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, Gift, AlertTriangle, Zap, RefreshCw, Upload, X } from 'lucide-react';
import { TextShimmerWave } from '@/components/motion-primitives/text-shimmer-wave';
import type { PostFormData, LocalPostTopicType, ActionType, AlertType } from '../types';

interface PostCreateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  postForm: PostFormData;
  onPostFormChange: (updates: Partial<PostFormData>) => void;
  creatingPost: boolean;
  onCreate: () => void;
  
  // AI Generation props
  generateImage: boolean;
  onGenerateImageChange: (generate: boolean) => void;
  onAIGenerate: (type: 'post' | 'image', prompt?: string, count?: number) => void;
  isGeneratingAI: boolean;
  aiGenerationType: 'qna' | 'post' | 'image' | null;
  
  // Image props
  generatedImageUrl: string | null;
  localImagePreview: string | null;
  onMediaChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

const PostCreateDialog: React.FC<PostCreateDialogProps> = ({
  isOpen,
  onOpenChange,
  postForm,
  onPostFormChange,
  creatingPost,
  onCreate,
  generateImage,
  onGenerateImageChange,
  onAIGenerate,
  isGeneratingAI,
  aiGenerationType,
  generatedImageUrl,
  localImagePreview,
  onMediaChange,
}) => {
  const postMediaInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [useBusinessData, setUseBusinessData] = useState(true);
  const [aiPrompt, setAiPrompt] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [showImagePreview, setShowImagePreview] = useState(false);

  // Check if URL is required for the selected action type
  const isUrlRequired = (actionType: string) => {
    return ['BOOK', 'ORDER', 'SHOP', 'LEARN_MORE', 'SIGN_UP'].includes(actionType);
  };

  // Check if current post type requires event details
  const requiresEvent = () => {
    return postForm.topicType === 'EVENT' || postForm.topicType === 'OFFER';
  };

  // Check if current post type requires offer details
  const requiresOffer = () => {
    return postForm.topicType === 'OFFER';
  };

  // Check if current post type requires alert details
  const requiresAlert = () => {
    return postForm.topicType === 'ALERT';
  };

  // Format datetime for input fields
  const formatDateTimeForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`
    };
  };

  // Handle post type change
  const handleTopicTypeChange = (value: LocalPostTopicType) => {
    const updates: Partial<PostFormData> = { topicType: value };
    
    // Initialize required fields based on type
    if (value === 'EVENT' || value === 'OFFER') {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      const { date: startDate, time: startTime } = formatDateTimeForInput(now);
      const { date: endDate, time: endTime } = formatDateTimeForInput(oneHourLater);
      
      updates.event = {
        title: '',
        schedule: {
          startDate,
          startTime,
          endDate,
          endTime
        }
      };
    } else {
      // Clear event data for non-event types
      updates.event = undefined;
    }
    
    if (value === 'OFFER') {
      updates.offer = {
        couponCode: '',
        redeemOnlineUrl: '',
        termsConditions: ''
      };
    } else {
      // Clear offer data for non-offer types
      updates.offer = undefined;
    }
    
    if (value === 'ALERT') {
      updates.alertType = 'ALERT_TYPE_UNSPECIFIED';
    } else {
      // Clear alert data for non-alert types
      updates.alertType = undefined;
    }
    
    onPostFormChange(updates);
  };

  // Handle event field changes
  const handleEventChange = (field: string, value: string) => {
    const currentEvent = postForm.event || {
      title: '',
      schedule: { startDate: '', startTime: '', endDate: '', endTime: '' }
    };
    
    if (field === 'title') {
      onPostFormChange({
        event: {
          ...currentEvent,
          title: value
        }
      });
    } else {
      onPostFormChange({
        event: {
          ...currentEvent,
          schedule: {
            ...currentEvent.schedule,
            [field]: value
          }
        }
      });
    }
  };

  // Handle offer field changes
  const handleOfferChange = (field: string, value: string) => {
    const currentOffer = postForm.offer || {};
    onPostFormChange({
      offer: {
        ...currentOffer,
        [field]: value
      }
    });
  };

  const handleClose = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      // Clear generated image when dialog is closed
      if (postMediaInputRef.current) {
        postMediaInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        // Create a synthetic event to reuse existing logic
        const syntheticEvent = {
          target: { files }
        } as ChangeEvent<HTMLInputElement>;
        onMediaChange(syntheticEvent);
      }
    }
  };

  const handleUploadClick = () => {
    postMediaInputRef.current?.click();
  };

  const handleRemoveMedia = () => {
    if (postMediaInputRef.current) {
      postMediaInputRef.current.value = '';
    }
    // Create synthetic event to clear media
    const syntheticEvent = {
      target: { files: null }
    } as ChangeEvent<HTMLInputElement>;
    onMediaChange(syntheticEvent);
  };

  // Handle AI generation with prompts
  const handleAIGeneration = async () => {
    if (!isGeneratingAI && aiPrompt.trim()) {
      let finalPrompt = aiPrompt.trim();
      
      // Add business context if enabled
      if (useBusinessData) {
        finalPrompt = `Based on our business data and context: ${finalPrompt}`;
      }
      
      await onAIGenerate('post', finalPrompt, 1);
      setShowAIPrompt(false);
      setAiPrompt('');
      setImagePrompt('');
    }
  };

  const hasMedia = localImagePreview || generatedImageUrl || postForm.media;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className={`sm:max-w-[700px] max-w-[95vw] max-h-[90vh] !fixed !top-[50%] !left-[50%] !translate-x-[-50%] !translate-y-[-50%] overflow-y-auto`}
      >
        <div className="relative h-full w-full">
          {/* Overlay with blurred background during generation */}
          {(isGeneratingAI || creatingPost) && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
              <div className="text-center space-y-4">
                <TextShimmerWave className="font-mono text-lg" duration={1.5}>
                  {isGeneratingAI && aiGenerationType === 'post' && generateImage 
                    ? 'Generating post content and image...'
                    : isGeneratingAI && aiGenerationType === 'post'
                    ? 'Generating post content...'
                    : isGeneratingAI && aiGenerationType === 'image'
                    ? 'Regenerating image...'
                    : creatingPost
                    ? 'Creating your post...'
                    : 'Processing...'}
                </TextShimmerWave>
                <p className="text-sm text-muted-foreground">
                  {isGeneratingAI && aiGenerationType === 'image'
                    ? 'AI is creating a new image for your post'
                    : isGeneratingAI 
                    ? 'AI is crafting the perfect content for your business'
                    : 'Publishing to your Google Business Profile'}
                </p>
              </div>
            </div>
          )}

          <DialogHeader>
            <DialogTitle>Create New Post</DialogTitle>
            <DialogDescription>
              Create a new post for your Google Business Profile
            </DialogDescription>
          </DialogHeader>
        
        {/* Main form content */}
        <div className="space-y-4">
          <div className="flex flex-col gap-2 mb-4">
            <p className="text-sm text-muted-foreground">Generate a post suggestion with AI</p>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowAIPrompt(!showAIPrompt)}
                disabled={isGeneratingAI}
                variant="outline"
                size="sm"
              >
                {isGeneratingAI && aiGenerationType === 'post' ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Generate Post with AI
              </Button>
              <div className="flex items-center gap-1 ml-2">
                <Switch id="generate-image" checked={generateImage} onCheckedChange={onGenerateImageChange} />
                <Label htmlFor="generate-image">Generate image with post</Label>
              </div>
            </div>
            {generateImage && (
              <p className="text-xs text-blue-600 mt-1">
                AI will generate a unique image for the post suggestion
              </p>
            )}

            {/* AI Prompt Area */}
            {showAIPrompt && (
              <div className="mt-4 p-4 border rounded-lg bg-muted/30 space-y-3">
                <div>
                  <Label htmlFor="ai-prompt">Post Topic/Prompt *</Label>
                  <Textarea
                    id="ai-prompt"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Describe what you want to post about... (e.g., 'new menu items', 'holiday hours', 'special promotion')"
                    className="mt-1"
                    rows={2}
                  />
                </div>

                {generateImage && (
                  <div>
                    <Label htmlFor="image-prompt">Image Description (Optional)</Label>
                    <Input
                      id="image-prompt"
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="Describe the image you want (e.g., 'food photography', 'storefront', 'team photo')"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave empty to auto-generate image based on post content
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch 
                      id="use-business-data" 
                      checked={useBusinessData} 
                      onCheckedChange={setUseBusinessData} 
                    />
                    <Label htmlFor="use-business-data" className="text-sm">
                      Use business data for context
                    </Label>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowAIPrompt(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleAIGeneration}
                      disabled={!aiPrompt.trim() || isGeneratingAI}
                    >
                      {isGeneratingAI ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Generate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="post-type">Post Type *</Label>
            <Select
              value={postForm.topicType}
              onValueChange={handleTopicTypeChange}
            >
              <SelectTrigger id="post-type">
                <SelectValue placeholder="Select post type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STANDARD">
                  <div className="flex items-center gap-2">
                    <span>Standard Post</span>
                  </div>
                </SelectItem>
                <SelectItem value="EVENT">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Event</span>
                  </div>
                </SelectItem>
                <SelectItem value="OFFER">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    <span>Offer</span>
                  </div>
                </SelectItem>
                <SelectItem value="ALERT">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Alert</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {postForm.topicType && (
              <p className="text-xs text-muted-foreground mt-1">
                {postForm.topicType === 'STANDARD' && 'Basic post with summary and optional media'}
                {postForm.topicType === 'EVENT' && 'Post about an upcoming event with date and time'}
                {postForm.topicType === 'OFFER' && 'Promotional post with special offers or deals'}
                {postForm.topicType === 'ALERT' && 'High-priority announcements and timely updates'}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="post-summary">Summary *</Label>
            <Textarea
              id="post-summary"
              value={postForm.summary}
              onChange={(e) => onPostFormChange({ summary: e.target.value })}
              placeholder="What's new with your business?"
              className="mt-1"
            />
          </div>

          {/* Event Details (EVENT and OFFER types) */}
          {requiresEvent() && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-medium">Event Details</h3>
                </div>
                
                <div>
                  <Label htmlFor="event-title">Event Title *</Label>
                  <Input
                    id="event-title"
                    value={postForm.event?.title || ''}
                    onChange={(e) => handleEventChange('title', e.target.value)}
                    placeholder="Enter event name"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-date">Start Date *</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={postForm.event?.schedule.startDate || ''}
                      onChange={(e) => handleEventChange('startDate', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="start-time">Start Time *</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={postForm.event?.schedule.startTime || ''}
                      onChange={(e) => handleEventChange('startTime', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="end-date">End Date *</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={postForm.event?.schedule.endDate || ''}
                      onChange={(e) => handleEventChange('endDate', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-time">End Time *</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={postForm.event?.schedule.endTime || ''}
                      onChange={(e) => handleEventChange('endTime', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Offer Details (OFFER type only) */}
          {requiresOffer() && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-medium">Offer Details</h3>
                </div>
                
                <div>
                  <Label htmlFor="coupon-code">Coupon Code</Label>
                  <Input
                    id="coupon-code"
                    value={postForm.offer?.couponCode || ''}
                    onChange={(e) => handleOfferChange('couponCode', e.target.value)}
                    placeholder="e.g., SAVE20, WELCOME10"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Optional discount code customers can use
                  </p>
                </div>

                <div>
                  <Label htmlFor="redeem-url">Redeem Online URL</Label>
                  <Input
                    id="redeem-url"
                    type="url"
                    value={postForm.offer?.redeemOnlineUrl || ''}
                    onChange={(e) => handleOfferChange('redeemOnlineUrl', e.target.value)}
                    placeholder="https://yourwebsite.com/redeem"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Direct link where customers can redeem the offer online
                  </p>
                </div>

                <div>
                  <Label htmlFor="terms-conditions">Terms & Conditions</Label>
                  <Textarea
                    id="terms-conditions"
                    value={postForm.offer?.termsConditions || ''}
                    onChange={(e) => handleOfferChange('termsConditions', e.target.value)}
                    placeholder="Offer expires 12/31/2024. Valid for new customers only. Cannot be combined with other offers."
                    className="mt-1"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Important terms customers should know about this offer
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Alert Details (ALERT type only) */}
          {requiresAlert() && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-medium">Alert Details</h3>
                </div>
                
                <div>
                  <Label htmlFor="alert-type">Alert Type</Label>
                  <Select
                    value={postForm.alertType || 'ALERT_TYPE_UNSPECIFIED'}
                    onValueChange={(value: AlertType) => onPostFormChange({ alertType: value })}
                  >
                    <SelectTrigger id="alert-type">
                      <SelectValue placeholder="Select alert type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALERT_TYPE_UNSPECIFIED">General Alert</SelectItem>
                      <SelectItem value="COVID_19">COVID-19 Related</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Choose the type of alert for better categorization
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Call to Action */}
          <Separator />
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Call to Action</h3>
          
            <div>
              <Label htmlFor="action-type">Action Type *</Label>
              <Select
                value={postForm.actionType}
                onValueChange={(value: ActionType) => onPostFormChange({ actionType: value })}
              >
                <SelectTrigger id="action-type">
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BOOK">Book Appointment</SelectItem>
                  <SelectItem value="ORDER">Order Now</SelectItem>
                  <SelectItem value="SHOP">Shop Products</SelectItem>
                  <SelectItem value="LEARN_MORE">Learn More</SelectItem>
                  <SelectItem value="SIGN_UP">Sign Up</SelectItem>
                  <SelectItem value="CALL">Call Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {isUrlRequired(postForm.actionType) && (
              <div>
                <Label htmlFor="action-url">Action URL *</Label>
                <Input
                  id="action-url"
                  type="url"
                  value={postForm.actionUrl}
                  onChange={(e) => onPostFormChange({ actionUrl: e.target.value })}
                  placeholder="https://yourwebsite.com"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  URL where customers will be directed when they click the action button
                </p>
              </div>
            )}
            
            {postForm.actionType === 'CALL' && (
              <p className="text-sm text-muted-foreground">
                📞 Customers will be able to call your business directly from this post
              </p>
            )}
          </div>

          {/* Media Upload Section */}
          <Separator />
          <div className="space-y-4">
            <Label>Media (Optional)</Label>
            
            {/* Media Preview Section */}
            {hasMedia && (
              <div className="mt-3 space-y-4">
                <div className="flex flex-wrap gap-4">
                  {/* Local Image Preview */}
                  {localImagePreview && (
                    <div className="relative">
                      <div className="w-40 h-40 border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                        <img 
                          src={localImagePreview} 
                          alt="Local Preview" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('Failed to load local image preview');
                            e.currentTarget.style.display = 'none';
                          }}
                          onLoad={() => console.log('Local image loaded successfully')}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                        onClick={handleRemoveMedia}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1 text-center">Local Image</p>
                    </div>
                  )}
                  
                  {/* AI Generated Image Preview */}
                  {generatedImageUrl && (
                    <div className="relative">
                      <div 
                        className="w-40 h-40 border-2 border-blue-200 rounded-lg overflow-hidden bg-blue-50 cursor-pointer hover:border-blue-300 transition-colors"
                        onClick={() => setShowImagePreview(true)}
                        title="Click to view larger image"
                      >
                        <img 
                          src={generatedImageUrl} 
                          alt="AI Generated Preview" 
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                          onError={(e) => {
                            console.error('Failed to load AI generated image:', generatedImageUrl);
                            e.currentTarget.style.display = 'none';
                          }}
                          onLoad={() => console.log('AI generated image loaded successfully')}
                        />
                      </div>
                      {!localImagePreview && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                          onClick={handleRemoveMedia}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                      <p className="text-xs text-blue-600 mt-1 text-center"> AI Generated (Click to enlarge)</p>
                    </div>
                  )}
                  
                  {/* Media File Info (for video or other files) */}
                  {postForm.media && !localImagePreview && (
                    <div className="w-40 h-40 border-2 border-green-200 rounded-lg bg-green-50 flex flex-col items-center justify-center relative">
                      <Upload className="h-8 w-8 text-green-600 mb-2" />
                      <p className="text-xs text-center text-green-700 font-medium px-2">
                        {postForm.media.name}
                      </p>
                      <p className="text-xs text-center text-green-600 mt-1">
                        {(postForm.media.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                        onClick={handleRemoveMedia}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1 text-center">Media File</p>
                    </div>
                  )}
                </div>
                
                {/* Status Messages */}
                <div className="text-xs text-muted-foreground space-y-1">
                  {localImagePreview && generatedImageUrl && (
                    <p className="text-amber-600">
                      ⚠️ Both local and AI-generated images available. Local image will be used.
                    </p>
                  )}
                  {!localImagePreview && generatedImageUrl && (
                    <p className="text-blue-600">
                       Using AI-generated image. Upload a file to replace it.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Upload Area */}
            <div
              className={`
                mt-3 relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 ease-in-out
                ${isDragOver 
                  ? 'border-primary bg-primary/5 scale-[1.02]' 
                  : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
                ${hasMedia ? 'bg-muted/20' : ''}
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleUploadClick}
            >
              <input
                ref={postMediaInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={onMediaChange}
                className="hidden"
                title="Upload media file"
              />
              
              <div className="flex flex-col items-center gap-3">
                <div className={`
                  p-3 rounded-full transition-all duration-200
                  ${isDragOver 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                  }
                `}>
                  <Upload className="h-6 w-6" />
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {isDragOver 
                      ? 'Drop your media here' 
                      : hasMedia 
                        ? 'Add another media file' 
                        : 'Upload Image or Video'
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Drag & drop or click to browse • PNG, JPG, GIF, MP4 up to 10MB
                  </p>
                </div>
                
                {hasMedia && (
                  <Button type="button" variant="outline" size="sm" className="mt-2">
                    {localImagePreview || generatedImageUrl ? 'Replace Media' : 'Add Media'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
        
          {/* Footer buttons */}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button 
              onClick={onCreate} 
              disabled={!postForm.summary || creatingPost || 
                (requiresEvent() && (!postForm.event?.title || !postForm.event?.schedule.startDate)) ||
                (isUrlRequired(postForm.actionType) && !postForm.actionUrl)}
            >
              {creatingPost ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Instant Post
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
      
      {/* Image Preview Modal */}
      {showImagePreview && generatedImageUrl && (
        <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle>AI Generated Image</DialogTitle>
              <DialogDescription>
                Full size view of your AI-generated image
              </DialogDescription>
            </DialogHeader>
            <div className="p-6 pt-0">
              <div className="relative w-full max-h-[70vh] overflow-hidden rounded-lg bg-muted/20">
                <img 
                  src={generatedImageUrl} 
                  alt="AI Generated Image - Full Size" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    console.error('Failed to load AI generated image in preview:', generatedImageUrl);
                  }}
                />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                   Generated by AI • Click outside to close
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      // Regenerate only the image using the current post summary
                      if (postForm.summary && onAIGenerate) {
                        setShowImagePreview(false); // Close preview modal
                        await onAIGenerate('image', postForm.summary);
                      }
                    }}
                    disabled={!postForm.summary || isGeneratingAI}
                  >
                    {isGeneratingAI ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Download the image
                      const link = document.createElement('a');
                      link.href = generatedImageUrl;
                      link.download = 'ai-generated-image.jpg';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                  >
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowImagePreview(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};

export default PostCreateDialog;