import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Zap,
  Plus,
  Calendar,
  ExternalLink,
  Trash2,
  MoreHorizontal,
  Camera,
  Eye,
  Check,
  Edit3,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import type { BusinessPost } from '../types';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface PostsTabProps {
  posts: BusinessPost[];
  scheduledPosts: any[];
  onScheduledPostUpdate: (postId: string, updates: any) => void;
  onScheduledPostDelete: (postId: string) => void;
  onScheduledPostRegenerateImage: (postId: string, summary: string) => void;
  onCreateClick: () => void;
  onAIGenerate: (type: 'post', prompt?: string, count?: number) => void;
  onEnhancedAIGenerate: () => void;
  onViewGeneratedPosts?: () => void;
  hasGeneratedPosts?: boolean;
  onDeletePost: (postName: string) => void;
  deletingPost: string | null;
  isGeneratingAI: boolean;
  aiGenerationType: 'qna' | 'post' | 'image' | null;
}

const PostsTab: React.FC<PostsTabProps> = ({
  posts,
  scheduledPosts,
  onScheduledPostUpdate,
  onScheduledPostDelete,
  onScheduledPostRegenerateImage,
  onCreateClick,
  onAIGenerate,
  onEnhancedAIGenerate,
  onViewGeneratedPosts,
  hasGeneratedPosts = false,
  onDeletePost,
  deletingPost,
  isGeneratingAI,
  aiGenerationType,
}) => {
  const [viewImageUrl, setViewImageUrl] = useState<string | null>(null);
  const [promptDialog, setPromptDialog] = useState<{ postId: string, currentPrompt: string } | null>(null);
  const [regeneratingPrompt, setRegeneratingPrompt] = useState(false);
  const [newPrompt, setNewPrompt] = useState('');
  const [pendingDeletePost, setPendingDeletePost] = useState<any | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editSummary, setEditSummary] = useState('');
  const [deletingScheduledPost, setDeletingScheduledPost] = useState<string | null>(null);

  // Replace onScheduledPostUpdate and onScheduledPostDelete with API calls to the new dynamic routes
  const handleScheduledPostUpdate = async (postId: string, updates: any) => {
    try {
      const res = await fetch(`/api/business/scheduled-posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        toast.success('Post updated successfully');
        // Call parent function to reload scheduled posts
        onScheduledPostUpdate(postId, updates);
      } else {
        toast.error('Failed to update post');
      }
    } catch (e) {
      toast.error('Failed to update post');
    }
  };

  const handleScheduledPostDelete = async (postId: string) => {
    if (deletingScheduledPost) {
      return;
    }
    
    console.log('Frontend: Attempting to delete post ID:', postId);
    console.log('Frontend: Current scheduled posts:', scheduledPosts.map(p => ({ id: p.id, summary: p.summary?.substring(0, 50) })));
    setDeletingScheduledPost(postId);
    
    try {
      const res = await fetch(`/api/business/scheduled-posts/${postId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        toast.success('Post deleted successfully');
        // Call parent function to reload scheduled posts
        onScheduledPostDelete(postId);
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(`Failed to delete post: ${errorData.error || 'Unknown error'}`);
      }
    } catch (e) {
      toast.error('Failed to delete post');
    } finally {
      setDeletingScheduledPost(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Business Posts</h3>
          <p className="text-muted-foreground">Share updates and engage with customers</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onEnhancedAIGenerate}
            disabled={isGeneratingAI}
            className="gap-2"
          >
            {isGeneratingAI && aiGenerationType === 'post' ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                Generating...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Post Schedule
              </>
            )}
          </Button>
          {hasGeneratedPosts && onViewGeneratedPosts && (
            <Button
              variant="outline"
              onClick={onViewGeneratedPosts}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              View Generated
            </Button>
          )}
          <Button onClick={onCreateClick}>
            <Plus className="h-4 w-4 mr-2" />
            Instant Post
          </Button>
        </div>
      </div>

      {/* Scheduled Posts Section */}
      {scheduledPosts.length > 0 ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Scheduled Posts
            </h4>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {scheduledPosts.length} {scheduledPosts.length === 1 ? 'post' : 'posts'}
            </div>
          </div>
          
          <div className="grid gap-4">
            {scheduledPosts.map((post) => {
              const isEditing = editingPostId === post.id;
              return (
                <Card key={post.id || post.name} className="group border-0 shadow-sm bg-white dark:bg-gray-900 hover:shadow-md transition-all duration-200">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Media Preview */}
                      <div className="flex-shrink-0 mx-auto sm:mx-0">
                        {post.media_url ? (
                          <div className="relative">
                            <img
                              src={post.media_url}
                              alt="Scheduled post media"
                              className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border-2 border-gray-100 dark:border-gray-700 cursor-pointer"
                              onClick={() => setViewImageUrl(post.media_url)}
                            />
                            <div className="absolute -bottom-2 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 rounded-full bg-white dark:bg-gray-800 shadow-md hover:shadow-lg"
                                    onClick={() => onScheduledPostRegenerateImage(post.id, post.summary)}
                                  >
                                    <Camera className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Regenerate Image</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 rounded-full bg-white dark:bg-gray-800 shadow-md hover:shadow-lg"
                                    onClick={() => {
                                      setPromptDialog({ postId: post.id, currentPrompt: post.summary });
                                      setNewPrompt(post.summary || '');
                                    }}
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit Prompt & Regenerate</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        ) : (
                          <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600">
                            <Camera className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                          </div>
                        )}
                      </div>
                      
                      {/* Post Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                          <Badge variant="secondary" className="w-fit bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                            Scheduled
                          </Badge>
                          {post.scheduled_publish_time && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                              {new Date(post.scheduled_publish_time).toLocaleString()}
                            </span>
                          )}
                          {post.account_name && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                              Account: {post.account_name}
                            </span>
                          )}
                        </div>
                        {isEditing ? (
                          <div className="flex gap-2 items-center">
                            <Input
                              className="text-sm sm:text-base font-medium border bg-white dark:bg-gray-900 p-2 h-auto focus-visible:ring-0 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none"
                              value={editSummary}
                              onChange={e => setEditSummary(e.target.value)}
                              placeholder="Edit post summary..."
                              title="Edit post summary"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                handleScheduledPostUpdate(post.id, { summary: editSummary });
                                setEditingPostId(null);
                              }}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingPostId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm sm:text-base font-medium">
                                {post.summary}
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => {
                                  setEditingPostId(post.id);
                                  setEditSummary(post.summary);
                                }}
                                title="Edit post"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            {/* Display metadata for all post types */}
                            {post.metadata && (() => {
                              try {
                                const metadata = JSON.parse(post.metadata);
                                
                                // Event posts
                                if (metadata.type === 'event' && metadata.title) {
                                  return (
                                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                      <div><strong>Event:</strong> {metadata.title}</div>
                                      {metadata.location && <div><strong>Location:</strong> {metadata.location}</div>}
                                      {metadata.schedule && (
                                        <>
                                          {metadata.schedule.startDate && (
                                            <div><strong>Start:</strong> {metadata.schedule.startDate} {metadata.schedule.startTime}</div>
                                          )}
                                          {metadata.schedule.endDate && (
                                            <div><strong>End:</strong> {metadata.schedule.endDate} {metadata.schedule.endTime}</div>
                                          )}
                                        </>
                                      )}
                                      {metadata.price && <div><strong>Price:</strong> {metadata.currency || '$'}{metadata.price}</div>}
                                      {metadata.maxAttendees && <div><strong>Max Attendees:</strong> {metadata.maxAttendees}</div>}
                                    </div>
                                  );
                                }
                                
                                // Offer posts
                                if (metadata.type === 'offer' && metadata.title) {
                                  return (
                                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                      <div><strong>Offer:</strong> {metadata.title}</div>
                                      {metadata.couponCode && <div><strong>Code:</strong> {metadata.couponCode}</div>}
                                      {metadata.discountValue && (
                                        <div><strong>Discount:</strong> {metadata.discountValue}{metadata.discountType === 'percentage' ? '%' : ''}</div>
                                      )}
                                      {metadata.schedule && (
                                        <>
                                          {metadata.schedule.startDate && (
                                            <div><strong>Valid from:</strong> {metadata.schedule.startDate} {metadata.schedule.startTime}</div>
                                          )}
                                          {metadata.schedule.endDate && (
                                            <div><strong>Valid until:</strong> {metadata.schedule.endDate} {metadata.schedule.endTime}</div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  );
                                }
                                
                                // Product posts
                                if (metadata.type === 'product' && metadata.title) {
                                  return (
                                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                      <div><strong>Product:</strong> {metadata.title}</div>
                                      {metadata.price && <div><strong>Price:</strong> {metadata.currency || '$'}{metadata.price}</div>}
                                      {metadata.brand && <div><strong>Brand:</strong> {metadata.brand}</div>}
                                      {metadata.availability && <div><strong>Status:</strong> {metadata.availability}</div>}
                                    </div>
                                  );
                                }
                                
                                // Service posts
                                if (metadata.type === 'service' && metadata.title) {
                                  return (
                                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                      <div><strong>Service:</strong> {metadata.title}</div>
                                      {metadata.price && <div><strong>Price:</strong> {metadata.currency || '$'}{metadata.price}</div>}
                                      {metadata.duration && <div><strong>Duration:</strong> {metadata.duration}</div>}
                                      {metadata.provider && <div><strong>Provider:</strong> {metadata.provider}</div>}
                                    </div>
                                  );
                                }
                                
                                // Webinar posts
                                if (metadata.type === 'webinar' && metadata.title) {
                                  return (
                                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                      <div><strong>Webinar:</strong> {metadata.title}</div>
                                      {metadata.host && <div><strong>Host:</strong> {metadata.host}</div>}
                                      {metadata.schedule && (
                                        <>
                                          {metadata.schedule.startDate && (
                                            <div><strong>Date:</strong> {metadata.schedule.startDate} {metadata.schedule.startTime}</div>
                                          )}
                                        </>
                                      )}
                                      {metadata.price && <div><strong>Price:</strong> {metadata.currency || '$'}{metadata.price}</div>}
                                    </div>
                                  );
                                }
                                
                                // Workshop posts
                                if (metadata.type === 'workshop' && metadata.title) {
                                  return (
                                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                      <div><strong>Workshop:</strong> {metadata.title}</div>
                                      {metadata.instructor && <div><strong>Instructor:</strong> {metadata.instructor}</div>}
                                      {metadata.location && <div><strong>Location:</strong> {metadata.location}</div>}
                                      {metadata.schedule && (
                                        <>
                                          {metadata.schedule.startDate && (
                                            <div><strong>Date:</strong> {metadata.schedule.startDate} {metadata.schedule.startTime}</div>
                                          )}
                                        </>
                                      )}
                                      {metadata.price && <div><strong>Price:</strong> {metadata.currency || '$'}{metadata.price}</div>}
                                    </div>
                                  );
                                }
                                
                                // Contest posts
                                if (metadata.type === 'contest' && metadata.title) {
                                  return (
                                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                      <div><strong>Contest:</strong> {metadata.title}</div>
                                      {metadata.prizes && metadata.prizes.length > 0 && (
                                        <div><strong>Prizes:</strong> {metadata.prizes.join(', ')}</div>
                                      )}
                                      {metadata.schedule && (
                                        <>
                                          {metadata.schedule.startDate && (
                                            <div><strong>Start:</strong> {metadata.schedule.startDate}</div>
                                          )}
                                          {metadata.schedule.endDate && (
                                            <div><strong>End:</strong> {metadata.schedule.endDate}</div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  );
                                }
                                
                                // Giveaway posts
                                if (metadata.type === 'giveaway' && metadata.title) {
                                  return (
                                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                      <div><strong>Giveaway:</strong> {metadata.title}</div>
                                      {metadata.prize && <div><strong>Prize:</strong> {metadata.prize}</div>}
                                      {metadata.schedule && (
                                        <>
                                          {metadata.schedule.startDate && (
                                            <div><strong>Start:</strong> {metadata.schedule.startDate}</div>
                                          )}
                                          {metadata.schedule.endDate && (
                                            <div><strong>End:</strong> {metadata.schedule.endDate}</div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  );
                                }
                                
                                // Alert posts
                                if (metadata.type === 'alert' && metadata.alertType) {
                                  return (
                                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                      <div><strong>Alert:</strong> {metadata.alertType}</div>
                                      {metadata.severity && <div><strong>Severity:</strong> {metadata.severity}</div>}
                                      {metadata.title && <div><strong>Title:</strong> {metadata.title}</div>}
                                    </div>
                                  );
                                }
                                
                                // Testimonial posts
                                if (metadata.type === 'testimonial' && metadata.customerName) {
                                  return (
                                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                      <div><strong>Testimonial:</strong> {metadata.customerName}</div>
                                      {metadata.rating && <div><strong>Rating:</strong> {metadata.rating}/5</div>}
                                      {metadata.service && <div><strong>Service:</strong> {metadata.service}</div>}
                                    </div>
                                  );
                                }
                                
                                // Blog posts
                                if (metadata.type === 'blog' && metadata.title) {
                                  return (
                                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                      <div><strong>Blog:</strong> {metadata.title}</div>
                                      {metadata.author && <div><strong>Author:</strong> {metadata.author}</div>}
                                      {metadata.readTime && <div><strong>Read Time:</strong> {metadata.readTime}</div>}
                                    </div>
                                  );
                                }
                                
                                // Video posts
                                if (metadata.type === 'video' && metadata.title) {
                                  return (
                                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                      <div><strong>Video:</strong> {metadata.title}</div>
                                      {metadata.duration && <div><strong>Duration:</strong> {metadata.duration}</div>}
                                      {metadata.category && <div><strong>Category:</strong> {metadata.category}</div>}
                                    </div>
                                  );
                                }
                                
                                // Podcast posts
                                if (metadata.type === 'podcast' && metadata.title) {
                                  return (
                                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                      <div><strong>Podcast:</strong> {metadata.title}</div>
                                      {metadata.episode && <div><strong>Episode:</strong> {metadata.episode}</div>}
                                      {metadata.duration && <div><strong>Duration:</strong> {metadata.duration}</div>}
                                    </div>
                                  );
                                }
                                
                                // Announcement posts
                                if (metadata.type === 'announcement' && metadata.title) {
                                  return (
                                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                      <div><strong>Announcement:</strong> {metadata.title}</div>
                                      {metadata.category && <div><strong>Category:</strong> {metadata.category}</div>}
                                      {metadata.priority && <div><strong>Priority:</strong> {metadata.priority}</div>}
                                    </div>
                                  );
                                }
                                
                                // FAQ posts
                                if (metadata.type === 'faq' && metadata.question) {
                                  return (
                                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                      <div><strong>FAQ:</strong> {metadata.question.substring(0, 50)}...</div>
                                      {metadata.category && <div><strong>Category:</strong> {metadata.category}</div>}
                                    </div>
                                  );
                                }
                                
                                                                 // Gallery posts
                                 if (metadata.type === 'gallery' && metadata.title) {
                                   return (
                                     <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                       <div><strong>Gallery:</strong> {metadata.title}</div>
                                       {metadata.images && <div><strong>Images:</strong> {metadata.images.length}</div>}
                                       {metadata.category && <div><strong>Category:</strong> {metadata.category}</div>}
                                     </div>
                                   );
                                 }
                                 
                                 // Standard posts
                                 if (metadata.type === 'standard') {
                                   return (
                                     <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                       {metadata.title && <div><strong>Title:</strong> {metadata.title}</div>}
                                       {metadata.category && <div><strong>Category:</strong> {metadata.category}</div>}
                                       {metadata.author && <div><strong>Author:</strong> {metadata.author}</div>}
                                       {metadata.readTime && <div><strong>Read Time:</strong> {metadata.readTime}</div>}
                                       {metadata.targetAudience && <div><strong>Audience:</strong> {metadata.targetAudience}</div>}
                                       {metadata.callToAction && <div><strong>CTA:</strong> {metadata.callToAction}</div>}
                                       {metadata.tags && metadata.tags.length > 0 && (
                                         <div><strong>Tags:</strong> {metadata.tags.join(', ')}</div>
                                       )}
                                     </div>
                                   );
                                 }
                                 
                               } catch (e) {
                                 // Ignore JSON parsing errors
                               }
                               return null;
                             })()}
                          </div>
                        )}
                      </div>
                      
                      {/* Actions */}
                      <div className="flex sm:flex-col gap-2 justify-center sm:justify-start">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 rounded-full hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors duration-200"
                              onClick={() => setPendingDeletePost(post)}
                            >
                              <span className="sr-only">Delete</span>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {/* Image Viewer Dialog */}
          <Dialog open={!!viewImageUrl} onOpenChange={open => !open && setViewImageUrl(null)}>
            <DialogContent className="max-w-2xl w-full flex flex-col items-center">
              <DialogHeader>
                <DialogTitle>Image Preview</DialogTitle>
              </DialogHeader>
              {viewImageUrl && (
                <img src={viewImageUrl} alt="Large preview" className="max-h-[60vh] w-auto rounded-xl border" />
              )}
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {/* Regenerate Image with Prompt Dialog */}
          <Dialog open={!!promptDialog} onOpenChange={open => !open && setPromptDialog(null)}>
            <DialogContent className="max-w-md w-full">
              <DialogHeader>
                <DialogTitle>Edit Prompt & Regenerate Image</DialogTitle>
              </DialogHeader>
              <Textarea
                value={newPrompt}
                onChange={e => setNewPrompt(e.target.value)}
                placeholder="Enter a new prompt for the image..."
                rows={4}
                className="mb-4"
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={regeneratingPrompt}>Cancel</Button>
                </DialogClose>
                <Button
                  variant="default"
                  disabled={regeneratingPrompt}
                  onClick={async () => {
                    if (!promptDialog) return;
                    setRegeneratingPrompt(true);
                    await onScheduledPostRegenerateImage(promptDialog.postId, newPrompt);
                    setRegeneratingPrompt(false);
                    setPromptDialog(null);
                  }}
                >
                  {regeneratingPrompt ? (
                    <Loader2 className="animate-spin h-4 w-4 mr-2 inline-block" />
                  ) : null}
                  Regenerate
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {/* Delete Confirmation Dialog */}
          <Dialog open={!!pendingDeletePost} onOpenChange={() => setPendingDeletePost(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this scheduled post? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPendingDeletePost(null)}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  disabled={deletingScheduledPost === pendingDeletePost?.id}
                  onClick={() => {
                    if (pendingDeletePost) {
                      handleScheduledPostDelete(pendingDeletePost.id);
                    }
                    setPendingDeletePost(null);
                  }}
                >
                  {deletingScheduledPost === pendingDeletePost?.id ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No scheduled posts yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
            Create your first scheduled post to see it appear here
          </p>
        </div>
      )}

      {posts.length > 0 ? (
        <>
          {/* Posts Summary */}
          

          {/* Posts List */}
          <div className="space-y-4">
            {posts.map((post) => (
              <Card key={post.name} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex">
                    {/* Media Preview */}
                    {post.media && post.media.length > 0 && (
                      <div className="w-24 h-24 flex-shrink-0">
                        {post.media[0].mediaFormat === 'PHOTO' ? (
                          <img
                            src={post.media[0].thumbnailUrl || post.media[0].sourceUrl || post.media[0].googleUrl}
                            alt="Post media"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Camera className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Post Content */}
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {post.topicType?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) || 'Standard'}
                          </Badge>
                          {post.state && (
                            <Badge variant={post.state === 'LIVE' ? 'default' : 'secondary'}>
                              {post.state}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeletePost(post.name)}
                            disabled={deletingPost === post.name}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm leading-relaxed">{post.summary}</p>
                        
                        {post.callToAction && (
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="secondary" className="text-xs">
                              {post.callToAction.actionType?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                            </Badge>
                            {post.callToAction.url && (
                              <a
                                href={post.callToAction.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1"
                              >
                                View Link
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Created: {format(new Date(post.createTime), 'PPp')}</span>
                          {post.updateTime && post.updateTime !== post.createTime && (
                            <span>Updated: {format(new Date(post.updateTime), 'PPp')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <FileText className="inline-block h-12 w-12 opacity-20" />
          <h3 className="text-lg font-medium mb-2">No Posts Yet</h3>
          <p className="text-muted-foreground mb-4">Create your first post to engage with customers</p>
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              onClick={onEnhancedAIGenerate}
              disabled={isGeneratingAI}
              className="gap-2"
            >
              {isGeneratingAI && aiGenerationType === 'post' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Post Schedule
                </>
              )}
            </Button>
            {hasGeneratedPosts && onViewGeneratedPosts && (
              <Button
                variant="outline"
                onClick={onViewGeneratedPosts}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                View Generated
              </Button>
            )}
            <Button onClick={onCreateClick}>
              <Plus className="h-4 w-4 mr-2" />
              Instant Post
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostsTab;
