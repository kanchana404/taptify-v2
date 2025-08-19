import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Zap } from 'lucide-react';

interface GeneratedPostsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  generatedPosts: any[];
  generatedPostImages: {[key: number]: string};
  onUsePost: (post: any, index: number) => void;
  onClearAll: () => void;
}

const GeneratedPostsDialog: React.FC<GeneratedPostsDialogProps> = ({
  isOpen,
  onOpenChange,
  generatedPosts,
  generatedPostImages,
  onUsePost,
  onClearAll,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-w-[95vw] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generated Post Suggestions</DialogTitle>
          <DialogDescription>
            Select the posts you want to use. Generated images are shown where available.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {generatedPosts.map((post, index) => (
            <Card key={index} className="border-2 border-gray-200 hover:border-blue-300 transition-colors">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Generated Image Preview */}
                  {generatedPostImages[index] && (
                    <div className="flex-shrink-0">
                      <img
                        src={generatedPostImages[index]}
                        alt={`Generated image for post ${index + 1}`}
                        className="w-24 h-24 rounded-lg object-cover border"
                      />
                      <p className="text-xs text-center text-muted-foreground mt-1">AI Generated</p>
                    </div>
                  )}
                  
                  {/* Post Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">
                        {post.topicType?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Standard'}
                      </Badge>
                      {post.actionType && (
                        <Badge variant="secondary">
                          {post.actionType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </Badge>
                      )}
                      {generatedPostImages[index] && (
                        <Badge variant="default" className="bg-purple-100 text-purple-800">
                          <Camera className="h-3 w-3 mr-1" />
                          With Image
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm mb-3 text-gray-700">
                      {post.summary}
                    </p>
                    
                    {post.actionUrl && (
                      <p className="text-xs text-blue-600 mb-3">
                        Call-to-action URL: {post.actionUrl}
                      </p>
                    )}
                    
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => onUsePost(post, index)}
                        className="gap-2"
                      >
                        <Zap className="h-3 w-3" />
                        Use This Post
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClearAll}>
            Cancel All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GeneratedPostsDialog;
