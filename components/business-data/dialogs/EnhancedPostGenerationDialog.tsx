import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Wand2, Image, FileText, Settings, Palette } from 'lucide-react';

interface PostConfig {
  prompt: string;
  topicType: string;
  actionType: string;
  generateImage: boolean;
  imagePrompt: string;
  imageToggleModified?: boolean; // Track if user manually changed this post's image setting
  useBusinessInfo: boolean; // NEW: per-post business info toggle
}

interface EnhancedPostGenerationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (postConfigs: PostConfig[], options: GenerationOptions) => void;
  isGenerating: boolean;
}

interface GenerationOptions {
  scheduleType: 'all' | 'separately';
  allDate?: string;
  separateCount?: number;
  separateInterval?: number;
  separateStartDate?: string;
}

const EnhancedPostGenerationDialog: React.FC<EnhancedPostGenerationDialogProps> = ({
  isOpen,
  onOpenChange,
  onGenerate,
  isGenerating,
}) => {
  const [step, setStep] = useState<'count' | 'configure'>('count');
  const [postCount, setPostCount] = useState(1);
  const [scheduleType, setScheduleType] = useState<'all' | 'separately'>('all');
  const [allDate, setAllDate] = useState('');
  const [separateCount, setSeparateCount] = useState(1);
  const [separateInterval, setSeparateInterval] = useState(1);
  const [separateStartDate, setSeparateStartDate] = useState('');
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [postConfigs, setPostConfigs] = useState<PostConfig[]>([]);
  const [masterImageToggle, setMasterImageToggle] = useState(false);

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

  const handleCountSubmit = () => {
    const configs: PostConfig[] = Array.from({ length: postCount }, () => ({
      prompt: '',
      topicType: 'STANDARD',
      actionType: 'LEARN_MORE',
      generateImage: masterImageToggle,
      imagePrompt: '',
      imageToggleModified: false, // New posts follow master toggle
      useBusinessInfo: true, // default to true
    }));
    setPostConfigs(configs);
    setStep('configure');
    setCurrentPostIndex(0);
  };

  const handleConfigChange = (field: keyof PostConfig, value: any) => {
    const newConfigs = [...postConfigs];
    newConfigs[currentPostIndex] = {
      ...newConfigs[currentPostIndex],
      [field]: value,
    };
    setPostConfigs(newConfigs);
  };

  const handleMasterImageToggleChange = (enabled: boolean) => {
    setMasterImageToggle(enabled);
    // Only update posts that haven't been manually modified by the user
    if (postConfigs.length > 0) {
      const updatedConfigs = postConfigs.map(config => ({
        ...config,
        // Only update if the user hasn't manually modified this post's image setting
        generateImage: config.imageToggleModified ? config.generateImage : enabled,
        // Clear image prompt if disabling and not manually modified
        imagePrompt: (!config.imageToggleModified && !enabled) ? '' : config.imagePrompt,
      }));
      setPostConfigs(updatedConfigs);
    }
  };

  const handleImageToggleChange = (enabled: boolean) => {
    const newConfigs = [...postConfigs];
    newConfigs[currentPostIndex] = {
      ...newConfigs[currentPostIndex],
      generateImage: enabled,
      imageToggleModified: true, // Mark as manually modified
      imagePrompt: enabled ? newConfigs[currentPostIndex].imagePrompt : '', // Clear prompt if disabling
    };
    setPostConfigs(newConfigs);
  };

  const handleNextPost = () => {
    if (currentPostIndex < postConfigs.length - 1) {
      setCurrentPostIndex(currentPostIndex + 1);
    } else {
      handleGenerate();
    }
  };

  const handlePrevPost = () => {
    if (currentPostIndex > 0) {
      setCurrentPostIndex(currentPostIndex - 1);
    }
  };

  const handleGenerate = () => {
    const validConfigs = postConfigs.filter(config => config.prompt.trim());
    if (validConfigs.length === 0) {
      return;
    }
    const options: GenerationOptions = {
      scheduleType,
      allDate,
      separateCount,
      separateInterval,
      separateStartDate,
    };
    onGenerate(validConfigs, options);
    onOpenChange(false);
    // Reset state
    setStep('count');
    setPostCount(1);
    setCurrentPostIndex(0);
    setPostConfigs([]);
    setMasterImageToggle(false);
    setScheduleType('all');
    setAllDate('');
    setSeparateCount(1);
    setSeparateInterval(1);
    setSeparateStartDate('');
  };

  const resetDialog = () => {
    setStep('count');
    setPostCount(1);
    setCurrentPostIndex(0);
    setPostConfigs([]);
    setMasterImageToggle(false);
  };

  const currentConfig = postConfigs[currentPostIndex];
  const canProceed = currentConfig?.prompt.trim() && (!currentConfig?.generateImage || currentConfig?.imagePrompt.trim());

  // Remove auto-generate effect. Instead, show a Generate button when all posts are configured.

  // Compute today's date in yyyy-mm-dd format
  const today = React.useMemo(() => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  }, []);

  // Set default publish date to today when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setAllDate(today);
    }
  }, [isOpen, today]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetDialog();
    }}>
      <DialogContent className="sm:max-w-[600px] max-w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Generate AI Posts
          </DialogTitle>
          <DialogDescription>
            {step === 'count' && 'Configure how many posts you want to generate and set global preferences'}
            {step === 'configure' && `Configure post ${currentPostIndex + 1} of ${postConfigs.length}`}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Count Selection & Master Settings */}
        {step === 'count' && (
          <div className="space-y-6">
            <div>
              <Label htmlFor="post-count">Number of Posts</Label>
              <Input
                id="post-count"
                type="number"
                min={1}
                max={50}
                value={postCount}
                onChange={e => setPostCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                className="w-32"
              />
            </div>
            <div className="space-y-2">
              <Label>Scheduling</Label>
              <div className="flex gap-4 items-center">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="scheduleType"
                    checked={scheduleType === 'all'}
                    onChange={() => setScheduleType('all')}
                  />
                  All together
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="scheduleType"
                    checked={scheduleType === 'separately'}
                    onChange={() => setScheduleType('separately')}
                  />
                  Separately
                </label>
              </div>
              {scheduleType === 'all' && (
                <div className="mt-2">
                  <Label htmlFor="all-date">Publish Date</Label>
                  <Input
                    id="all-date"
                    type="date"
                    min={today}
                    value={allDate}
                    onChange={e => setAllDate(e.target.value)}
                    className="w-48"
                  />
                </div>
              )}
              {scheduleType === 'separately' && (
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex gap-2 items-center">
                    <Label htmlFor="separate-count">Publish</Label>
                    <Input
                      id="separate-count"
                      type="number"
                      min={1}
                      max={postCount}
                      value={separateCount}
                      onChange={e => setSeparateCount(Math.max(1, Math.min(postCount, parseInt(e.target.value) || 1)))}
                      className="w-20"
                    />
                    <span>posts, after every</span>
                    <Input
                      id="separate-interval"
                      type="number"
                      min={1}
                      max={30}
                      value={separateInterval}
                      onChange={e => setSeparateInterval(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                      className="w-20"
                    />
                    <span>day(s)</span>
                  </div>
                  <div>
                    <Label htmlFor="separate-start-date">Starting on</Label>
                    <Input
                      id="separate-start-date"
                      type="date"
                      min={today}
                      value={separateStartDate}
                      onChange={e => setSeparateStartDate(e.target.value)}
                      className="w-48"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <Label className="text-sm font-medium">Global Settings</Label>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Image className="h-4 w-4" />
                  <Label htmlFor="master-image-toggle" className="text-sm">
                    Generate AI images for all posts by default
                  </Label>
                </div>
                <Switch
                  id="master-image-toggle"
                  checked={masterImageToggle}
                  onCheckedChange={handleMasterImageToggleChange}
                />
              </div>
              
              <p className="text-xs text-muted-foreground">
                This sets the default for all posts. You can still enable/disable image generation for individual posts.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Configure Each Post */}
        {step === 'configure' && currentConfig && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline">
                Post {currentPostIndex + 1} of {postConfigs.length}
              </Badge>
              <div className="text-sm text-muted-foreground">
                {postConfigs.filter(c => c.prompt.trim() && (!c.generateImage || c.imagePrompt.trim())).length} configured
              </div>
            </div>

            <div>
              <Label htmlFor="prompt">Post Content Prompt *</Label>
              <Textarea
                id="prompt"
                placeholder="Describe what you want this post to be about..."
                value={currentConfig.prompt}
                onChange={(e) => handleConfigChange('prompt', e.target.value)}
                rows={3}
              />
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id={`ignore-business-info-${currentPostIndex}`}
                  checked={!currentConfig.useBusinessInfo}
                  onChange={e => handleConfigChange('useBusinessInfo', !e.target.checked)}
                  aria-label="Ignore business background info"
                />
                <Label htmlFor={`ignore-business-info-${currentPostIndex}`}>Ignore business background info</Label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="topic-type">Post Type</Label>
                <Select value={currentConfig.topicType} onValueChange={(value) => handleConfigChange('topicType', value)}>
                  <SelectTrigger>
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
                <Label htmlFor="action-type">Call to Action</Label>
                <Select value={currentConfig.actionType} onValueChange={(value) => handleConfigChange('actionType', value)}>
                  <SelectTrigger>
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

            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Image className="h-4 w-4" />
                  <Label htmlFor="generate-image" className="text-sm">
                    Generate AI image for this post
                    {currentConfig.imageToggleModified && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Custom
                      </Badge>
                    )}
                  </Label>
                </div>
                <Switch
                  id="generate-image"
                  checked={currentConfig.generateImage}
                  onCheckedChange={handleImageToggleChange}
                />
              </div>
              
              {currentConfig.generateImage && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    <Label htmlFor="image-prompt" className="text-sm font-medium">
                      Image Generation Prompt *
                    </Label>
                  </div>
                  <Textarea
                    id="image-prompt"
                    placeholder="Describe the image you want to generate for this post..."
                    value={currentConfig.imagePrompt}
                    onChange={(e) => handleConfigChange('imagePrompt', e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Be specific about style, colors, objects, and mood you want in the image.
                  </p>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                {currentConfig.imageToggleModified ? (
                  <span className="text-orange-600">
                  
                  </span>
                ) : masterImageToggle ? (
                  ""
                ) : (
                  "Following global setting: Images disabled by default"
                )}
              </p>
            </div>
          </div>
        )}

        {/* In the configure step, after the last post, show a Generate button if all posts are configured */}
        {step === 'configure' && (
          <DialogFooter className="flex justify-end">
            {currentPostIndex === postConfigs.length - 1 && postConfigs.every(c => c.prompt.trim() && (!c.generateImage || c.imagePrompt.trim())) && !isGenerating && (
              <Button onClick={handleGenerate}>
                Generate
              </Button>
            )}
          </DialogFooter>
        )}

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {step === 'configure' && currentPostIndex > 0 && (
              <Button
                variant="outline"
                onClick={handlePrevPost}
                disabled={currentPostIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {step === 'count' && (
              <Button onClick={handleCountSubmit} disabled={postCount < 1}>
                Continue
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            
            {step === 'configure' && postConfigs.length > 1 && currentPostIndex < postConfigs.length - 1 && (
              <Button onClick={handleNextPost} disabled={!canProceed}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedPostGenerationDialog; 