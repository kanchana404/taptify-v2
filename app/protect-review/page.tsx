"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Pencil, Star, ImageIcon, ExternalLink, X,
  ArrowLeft, ArrowRight, Edit, Save, Settings, AlertCircle, CheckCircle
} from "lucide-react";
import Image from "next/image";
import { debounce } from "lodash";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Filter tabs data
const filterTabs = [
  { id: "filter", number: "1", label: "Filter" },
  { id: "positive", number: "2", label: "Positive Experience" },
  { id: "negative", number: "3", label: "Negative Experience" },
];

export default function ProtectReviewPage() {

  // Review settings state
  const [reviewLink, setReviewLink] = useState("");
  const [originalReviewLink, setOriginalReviewLink] = useState("");
  const [reviewLinkPath, setReviewLinkPath] = useState("");
  const [reviewLinkHost, setReviewLinkHost] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [headerImage, setHeaderImage] = useState<File | null>(null);
  const [headerImageUrl, setHeaderImageUrl] = useState("");
  const [previewIcon, setPreviewIcon] = useState<File | null>(null);
  const [previewIconUrl, setPreviewIconUrl] = useState("");
  const [isCheckingUrl, setIsCheckingUrl] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [urlAvailable, setUrlAvailable] = useState(true);
  const [positiveFeedbackText, setPositiveFeedbackText] = useState("");
  const [negativeFeedbackText, setNegativeFeedbackText] = useState("");
  const [previewRating, setPreviewRating] = useState(3);
  const [activeFilter, setActiveFilter] = useState("filter");
  const [starFilterEnabled, setStarFilterEnabled] = useState(true);
  const [starThreshold, setStarThreshold] = useState(3);
  const [showPoweredBy, setShowPoweredBy] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Title editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [reviewTitle, setReviewTitle] = useState("");
  const [tempReviewTitle, setTempReviewTitle] = useState("");

  // Stars editing
  const [isEditingStars, setIsEditingStars] = useState(false);

  // Refs for file inputs and title input
  const headerFileInputRef = useRef(null);
  const previewIconFileInputRef = useRef(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  // Function to check if URL is available
  const checkUrlAvailability = useCallback(
    debounce(async (url) => {
      if (!url) return;

      setIsCheckingUrl(true);
      setUrlError("");
      setUrlAvailable(true);

      try {
        const response = await fetch(`/api/link-protect?checkUrl=${encodeURIComponent(url)}`);

        if (!response.ok) {
          throw new Error('Failed to check URL availability');
        }

        const data = await response.json();

        if (!data.isAvailable) {
          setUrlError(data.message);
          setUrlAvailable(false);
        } else {
          // URL is available - only show success toast if it's different from original
          if (url !== originalReviewLink) {
            toast.success("This review link URL is available and ready to use!");
          }
        }
      } catch (error) {
        console.error("Error checking URL availability:", error);
        setUrlError("Error checking URL availability. Please try again later.");
      } finally {
        setIsCheckingUrl(false);
      }
    }, 500),
    [originalReviewLink]
  );



  // Navigation functions
  const goToNextTab = () => {
    const currentTabIndex = filterTabs.findIndex(tab => tab.id === activeFilter);
    const filteredTabs = starFilterEnabled
      ? filterTabs
      : filterTabs.filter(tab => tab.id === "positive" || tab.id === "negative");

    if (currentTabIndex < filteredTabs.length - 1) {
      setActiveFilter(filteredTabs[currentTabIndex + 1].id);
    }
  };

  const goToPreviousTab = () => {
    const currentTabIndex = filterTabs.findIndex(tab => tab.id === activeFilter);
    const filteredTabs = starFilterEnabled
      ? filterTabs
      : filterTabs.filter(tab => tab.id === "positive" || tab.id === "negative");

    if (currentTabIndex > 0) {
      setActiveFilter(filteredTabs[currentTabIndex - 1].id);
    }
  };

  // Fetch settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/link-protect');
        if (!response.ok) {
          throw new Error('Failed to fetch settings');
        }

        const data = await response.json();
        
        console.log("API Response Data:", data);
        console.log("Review Link URL from API:", data.review_link_url);
        
        // Set review link and extract host/path
        if (data.review_link_url) {
          try {
            const url = new URL(data.review_link_url);
            const path = url.pathname.substring(1); // Remove leading slash
            
            // Store only the path, not the full URL
            setReviewLink(path);
            setOriginalReviewLink(path);
            setReviewLinkPath(path);
            setReviewLinkHost(url.origin + "/");
            
            console.log("Extracted path:", path, "host:", url.origin + "/");
          } catch (e) {
            console.error("Invalid URL format", e);
            // Set default values if URL parsing fails
            setReviewLink("");
            setOriginalReviewLink("");
            setReviewLinkPath("");
            setReviewLinkHost("https://beta.taptify.com/");
          }
        } else {
          console.log("No review_link_url in API response, setting default host");
          setReviewLink("");
          setOriginalReviewLink("");
          setReviewLinkPath("");
          setReviewLinkHost("https://beta.taptify.com/");
        }
        
        // Set business name
        setBusinessName(data.business_name || "Your Business");
        
        // Set review title with business name from database
        if (data.review_title && data.review_title !== "How was your experience?") {
          setReviewTitle(data.review_title);
        } else if (data.business_name && data.business_name.trim()) {
          setReviewTitle(`How was your experience with ${data.business_name}?`);
        } else {
          setReviewTitle("How was your experience?");
        }
        
        // Set other settings
        setStarFilterEnabled(data.star_filter_enabled !== undefined ? data.star_filter_enabled : true);
        setStarThreshold(data.star_threshold || 3);
        setShowPoweredBy(data.show_powered_by !== undefined ? data.show_powered_by : true);

        // Set images
        if (data.header_image_url) {
          setHeaderImageUrl(data.header_image_url);
        }

        if (data.preview_icon_url) {
          setPreviewIconUrl(data.preview_icon_url);
        }

        // Set feedback texts
        if (data.positive_feedback_text) {
          setPositiveFeedbackText(data.positive_feedback_text);
        } else {
          setPositiveFeedbackText("Leave us a review, it will help us grow and better serve our customers like you.");
        }

        if (data.negative_feedback_text) {
          setNegativeFeedbackText(data.negative_feedback_text);
        } else {
          setNegativeFeedbackText("We want our customers to be 100% satisfied. Please let us know why you had a bad experience, so we can improve our service. Leave your email to be contacted.");
        }

        // Extract host and path from review link URL
        if (data.review_link_url) {
          try {
            const url = new URL(data.review_link_url);
            setReviewLinkHost(url.origin + "/");
            setReviewLinkPath(url.pathname.substring(1));
            console.log("Extracted host:", url.origin + "/", "path:", url.pathname.substring(1));
          } catch (e) {
            console.error("Invalid URL format", e);
            // Set default values if URL parsing fails
            setReviewLinkHost("https://beta.taptify.com/");
            setReviewLinkPath("");
          }
        } else {
          console.log("No review_link_url in API response, setting default host");
          setReviewLinkHost("https://beta.taptify.com/");
          setReviewLinkPath("");
        }
      } catch (error) {
        console.error("Error fetching review link settings:", error);
        toast.error("Failed to load review link settings");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [toast]);

  // useEffect to set the correct initial active filter based on star filter status
  useEffect(() => {
    if (!starFilterEnabled && (activeFilter === "filter" || activeFilter === "negative")) {
      setActiveFilter("positive");
    }
  }, [starFilterEnabled, activeFilter]);

  // Debug useEffect to monitor state changes
  useEffect(() => {
    console.log("reviewLink state changed to:", reviewLink);
    console.log("reviewLinkHost state changed to:", reviewLinkHost);
    console.log("reviewLinkPath state changed to:", reviewLinkPath);
  }, [reviewLink, reviewLinkHost, reviewLinkPath]);

  // Handle header image upload
  const handleHeaderImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setHeaderImageUrl(reader.result);
        }
        setHeaderImage(file);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle preview icon upload
  const handlePreviewIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPreviewIconUrl(reader.result);
        }
        setPreviewIcon(file);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle path change
  const handlePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPath = e.target.value;
    setReviewLinkPath(newPath);
    
    // Only store the path, not the full URL
    setReviewLink(newPath);

    // Only check URL availability if the URL has actually changed
    if (newPath !== originalReviewLink) {
      const fullUrl = reviewLinkHost + newPath;
      checkUrlAvailability(fullUrl);
    } else {
      // If URL is the same as original, clear any errors and set as available
      setUrlError("");
      setUrlAvailable(true);
    }
  };

  // Start editing title
  const startEditingTitle = () => {
    setTempReviewTitle(reviewTitle);
    setIsEditingTitle(true);
  };

  // Save edited title
  const saveEditedTitle = () => {
    setReviewTitle(tempReviewTitle);
    setIsEditingTitle(false);
    toast.success("Review title has been updated successfully!");
  };

  // Cancel title editing
  const cancelTitleEditing = () => {
    setIsEditingTitle(false);
  };

  // Handle star filter change
  const handleStarFilterChange = (value: string) => {
    const isEnabled = value === "enable";
    setStarFilterEnabled(isEnabled);

    if (!isEnabled && (activeFilter === "filter" || activeFilter === "negative")) {
      setActiveFilter("positive");
    }
  };

  // Handle save changes
  const handleSaveChanges = async () => {
    // Only check URL availability if the URL has actually changed
    if (reviewLink !== originalReviewLink && !urlAvailable) {
      toast.error("The review link URL is already in use. Please choose a different one.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/link-protect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          review_link_url: reviewLink, // This is now just the path
          review_title: reviewTitle,
          star_filter_enabled: starFilterEnabled,
          star_threshold: starThreshold,
          show_powered_by: showPoweredBy,
          business_name: businessName,
          header_image_url: headerImageUrl,
          preview_icon_url: previewIconUrl,
          positive_feedback_text: positiveFeedbackText,
          negative_feedback_text: negativeFeedbackText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }

      toast.success("Your review link settings have been saved successfully!");
      // Update the original URL after successful save
      setOriginalReviewLink(reviewLink);
    } catch (error) {
      console.error("Error saving review link settings:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save review link settings";
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Drag-and-Drop Handlers ---
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, name: string) => {
    e.dataTransfer.setData('text/plain', name);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent<HTMLInputElement>) => {
    e.preventDefault();
    const name = e.dataTransfer.getData('text/plain');
    const input = titleInputRef.current;
    if (input) {
      const startPos = input.selectionStart || 0;
      const endPos = input.selectionEnd || 0;
      const textBefore = tempReviewTitle.substring(0, startPos);
      const textAfter = tempReviewTitle.substring(endPos);
      setTempReviewTitle(textBefore + name + textAfter);
      setTimeout(() => {
        input.focus();
        input.selectionStart = input.selectionEnd = startPos + name.length;
      }, 0);
    }
  };

  // Rating stars component with threshold limit
  const RatingStars = ({ value = 3, size = "lg", onClick, isThresholdSelector = false }) => {
    const starSize = size === "lg" ? "w-8 h-8" : "w-5 h-5";

    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${starSize} ${star <= value
              ? "text-yellow-400 fill-yellow-400"
              : "text-gray-300"
              } ${onClick && (!isThresholdSelector || star < 5) ? "cursor-pointer" : ""} ${isThresholdSelector && star === 5 ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={() => {
              if (onClick && (!isThresholdSelector || star < 5)) {
                onClick(star);
              }
            }}
          />
        ))}
      </div>
    );
  };

  // Step Box component for the filter tabs
  const StepBox = ({ 
    number, 
    label, 
    isActive, 
    isCompleted, 
    onClick 
  }: {
    number: string;
    label: string;
    isActive: boolean;
    isCompleted: boolean;
    onClick: () => void;
  }) => (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          "h-12 w-12 rounded-full flex items-center justify-center text-sm font-medium mb-2 cursor-pointer transition-colors",
          isActive
            ? "bg-purple-600 text-white"
            : isCompleted
              ? "bg-purple-200 text-purple-700"
              : "bg-gray-200 text-gray-700"
        )}
        onClick={onClick}
      >
        {number}
      </div>
      <span className="text-xs font-medium text-center">{label}</span>
    </div>
  );

  // Preview content based on selected filter and rating
  const getPreviewContent = () => {
    if (!starFilterEnabled && activeFilter === "filter") {
      setActiveFilter("positive");
    }

    const mobilePreviewStyle = "w-80 mx-auto bg-white shadow-lg rounded-3xl overflow-hidden relative";

    if (activeFilter === "filter") {
      return (
        <div className={mobilePreviewStyle}>
          <div className="pt-12 pb-16 px-6 flex flex-col items-center">
            <div className="mb-8">
              {previewIconUrl ? (
                <div className="w-28 h-28 relative">
                  <img
                    src={previewIconUrl}
                    alt="Preview icon"
                    className="object-cover w-full h-full"
                  />
                </div>
              ) : (
                <div className="w-28 h-28 bg-red-600 flex items-center justify-center text-white text-xl font-cursive">
                  <span>{businessName}</span>
                </div>
              )}
            </div>
            <div className="mb-10 w-full">
              <h2 className="text-xl font-medium text-center text-gray-700">
                {reviewTitle}
              </h2>
            </div>
            <div className="flex justify-center gap-3 mb-8 w-full">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-8 h-8 ${star <= previewRating
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-gray-400"
                    } cursor-pointer`}
                  onClick={() => {
                    setPreviewRating(star);
                    if (starFilterEnabled) {
                      if (star < starThreshold) {
                        setActiveFilter("negative");
                      } else {
                        setActiveFilter("positive");
                      }
                    } else {
                      setActiveFilter("positive");
                    }
                  }}
                />
              ))}
            </div>
          </div>
          {showPoweredBy && (
            <div className="py-4 px-6 border-t flex items-center justify-center">
              <div className="flex items-center text-sm">
                Powered by <span className="font-medium ml-1 text-black">Taptify</span>
              </div>
            </div>
          )}
        </div>
      );
    } else if (activeFilter === "positive") {
      return (
        <div className={mobilePreviewStyle}>
          <div className="pt-12 pb-16 px-6 flex flex-col items-center">
            <div className="mb-8">
              {previewIconUrl ? (
                <div className="w-28 h-28 relative">
                  <img
                    src={previewIconUrl}
                    alt="Preview icon"
                    className="object-cover w-full h-full"
                  />
                </div>
              ) : (
                <div className="w-28 h-28 bg-red-600 flex items-center justify-center text-white text-xl font-cursive">
                  <span>{businessName}</span>
                </div>
              )}
            </div>
            <div className="mb-24 w-full">
              <p className="text-center text-gray-700">
                {positiveFeedbackText}
              </p>
            </div>
            <button className="w-full bg-purple-6
00 hover:bg-purple-700 text-white py-2 rounded-full">
              Leave a Review
            </button>
          </div>
          {showPoweredBy && (
            <div className="py-4 px-6 border-t flex items-center justify-center">
              <div className="flex items-center text-sm">
                Powered by <span className="font-medium ml-1 text-black">Taptify</span>
              </div>
            </div>
          )}
        </div>
      );
    } else if (activeFilter === "negative") {
      return (
        <div className={mobilePreviewStyle}>
          <div className="pt-12 pb-16 px-6 flex flex-col">
            <div className="mb-6 flex justify-center">
              {previewIconUrl ? (
                <div className="w-28 h-28 relative">
                  <img
                    src={previewIconUrl}
                    alt="Preview icon"
                    className="object-cover w-full h-full"
                  />
                </div>
              ) : (
                <div className="w-28 h-28 bg-red-600 flex items-center justify-center text-white text-xl font-cursive">
                  <span>{businessName}</span>
                </div>
              )}
            </div>
            <div className="mb-6 w-full">
              <p className="text-center text-gray-700 text-sm">
                {negativeFeedbackText}
              </p>
            </div>
            <div className="space-y-3 mb-6">
              <input
                type="text"
                placeholder="Your name"
                className="w-full rounded-full border border-gray-200 px-4 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="email"
                  placeholder="Your email"
                  className="w-full rounded-full border border-gray-200 px-4 py-2 text-sm"
                />
                <input
                  type="tel"
                  placeholder="Phone with area code"
                  className="w-full rounded-full border border-gray-200 px-4 py-2 text-sm"
                />
              </div>
              <textarea
                placeholder="Review"
                className="w-full rounded-2xl border border-gray-200 px-4 py-2 text-sm min-h-[100px]"
              />
            </div>
            <button className="w-full bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-full py-2 text-sm">
              Send
            </button>
          </div>
          {showPoweredBy && (
            <div className="py-4 px-6 border-t flex items-center justify-center">
              <div className="flex items-center text-sm">
                Powered by <span className="font-medium ml-1 text-black">Taptify</span>
              </div>
            </div>
          )}
        </div>
      );
    }
  };

  // Get content for the settings panel based on active filter
  const getSettingsContent = () => {
    if (activeFilter === "filter") {
      return (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Review Link Settings</CardTitle>
              <CardDescription>Configure how customers see your review request</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="review-link">Review Link URL</Label>
                <div className="flex">
                  <div className="bg-gray-100 px-3 py-2 border border-r-0 border-gray-300 rounded-l-md text-gray-500 text-sm">
                    {reviewLinkHost}
                  </div>
                  <div className="relative flex-1">
                    <Input
                      id="review-link-path"
                      value={reviewLinkPath}
                      onChange={handlePathChange}
                      className={`rounded-l-none ${!urlAvailable ? 'border-red-500 pr-12' : 'pr-12'}`}
                      placeholder="Enter your review link path"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      {isCheckingUrl ? (
                        <div className="animate-spin h-5 w-5 border-2 border-purple-500 rounded-full border-t-transparent"></div>
                      ) : !urlAvailable ? (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      ) : reviewLinkPath ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : null}
                    </div>
                  </div>
                </div>
                {urlError ? (
                  <p className="text-xs text-red-500 mt-1">
                    {urlError}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Only the path after the domain can be edited
                  </p>
                )}
              </div>

              {/* --- Drag-and-Drop UI for Review Title --- */}
              <div className="space-y-2">
                <Label htmlFor="review-title">Review Title</Label>
                {isEditingTitle ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Input
                        id="review-title-edit"
                        ref={titleInputRef}
                        value={tempReviewTitle}
                        onChange={(e) => setTempReviewTitle(e.target.value)}
                        className="flex-1 input-dropzone"
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        placeholder="Enter review title or drag the company name..."
                      />
                      <Badge
                        variant="secondary"
                        className="draggable-name px-2 py-1 text-xs cursor-move select-none"
                        draggable
                        onDragStart={(e) => handleDragStart(e, businessName)}
                      >
                        {businessName}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={saveEditedTitle}
                        variant="outline"
                        size="sm"
                        className="text-green-600 border-green-300 hover:bg-green-50"
                      >
                        Save
                      </Button>
                      <Button
                        onClick={cancelTitleEditing}
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      id="review-title"
                      value={reviewTitle}
                      className="flex-1 bg-muted/50"
                      readOnly
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={startEditingTitle}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="star-filter">Review Protection</Label>
                <div className="flex justify-between items-center">
                  <Select
                    defaultValue={starFilterEnabled ? "enable" : "disable"}
                    onValueChange={handleStarFilterChange}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enable">Enable</SelectItem>
                      <SelectItem value="disable">Disable</SelectItem>
                    </SelectContent>
                  </Select>

                  {starFilterEnabled && (
                    <div className="flex items-center gap-2">
                      {isEditingStars ? (
                        <div className="flex items-center gap-2">
                          <RatingStars
                            value={starThreshold}
                            size="sm"
                            onClick={(value) => {
                              if (value < 5) {
                                setStarThreshold(value);
                              }
                            }}
                            isThresholdSelector={true}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600"
                            onClick={() => setIsEditingStars(false)}
                          >
                            Done
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingStars(true)}
                        >
                          <span className="mr-2">Threshold: {starThreshold}</span>
                          <Star className="h-4 w-4" fill={starThreshold > 0 ? "currentColor" : "none"} />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  If enabled, customers with ratings below the threshold will be directed to private feedback.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
              <CardDescription>Upload and manage your business images</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Desktop Image</Label>
                <div
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:bg-accent/50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2"
                  onClick={() => headerFileInputRef.current?.click()}
                >
                  {headerImageUrl ? (
                    <>
                      <div className="w-32 h-32 relative mb-2">
                        <img
                          src={headerImageUrl}
                          alt="Business logo"
                          className="object-contain w-full h-full rounded-lg"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Click to change desktop image
                      </p>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-8 w-8 text-muted-foreground/70" />
                      <div>
                        <p className="font-medium mb-1">Click to upload desktop image</p>
                        <p className="text-sm text-muted-foreground">
                          PNG, JPG or SVG (max. 2MB)
                        </p>
                      </div>
                    </>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    ref={headerFileInputRef}
                    accept="image/*"
                    onChange={handleHeaderImageUpload}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Preview Icon</Label>
                <div
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:bg-accent/50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2"
                  onClick={() => previewIconFileInputRef.current?.click()}
                >
                  {previewIconUrl ? (
                    <>
                      <div className="w-16 h-16 rounded-lg overflow-hidden relative mb-2">
                        <img
                          src={previewIconUrl}
                          alt="Preview icon"
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Click to change preview icon
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-lg bg-purple-100 flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium mb-1">Add a preview icon</p>
                        <p className="text-sm text-muted-foreground">
                          Small image used for preview
                        </p>
                      </div>
                    </>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    ref={previewIconFileInputRef}
                    accept="image/*"
                    onChange={handlePreviewIconUpload}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              disabled={true}
              className="opacity-50 cursor-not-allowed"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <div className="flex gap-3">
              <Button
                onClick={handleSaveChanges}
                disabled={isSaving || !urlAvailable}
                className={cn(
                  "bg-purple-600 hover:bg-purple-700",
                  (!urlAvailable) && "opacity-50 cursor-not-allowed"
                )}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  const fullUrl = reviewLinkHost + reviewLink;
                  window.open(fullUrl, '_blank');
                }}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Visit Link
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={goToNextTab}
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </>
      );
    } else if (activeFilter === "positive") {
      return (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Positive Experience Settings</CardTitle>
              <CardDescription>Customize the positive experience screen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!starFilterEnabled && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-amber-800 mb-1">Review Protection is Disabled</h4>
                      <p className="text-xs text-amber-700 mb-2">
                        All customers will see the positive experience screen, regardless of rating.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-amber-700 border-amber-300 hover:bg-amber-100 text-xs"
                        onClick={() => handleStarFilterChange("enable")}
                      >
                        Enable Review Protection
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="positive-text">Positive Feedback Message</Label>
                <Textarea
                  id="positive-text"
                  value={positiveFeedbackText}
                  onChange={(e) => setPositiveFeedbackText(e.target.value)}
                  className="min-h-[120px]"
                  placeholder="Enter text shown to customers with positive ratings"
                />
                <p className="text-xs text-muted-foreground">
                  {starFilterEnabled
                    ? `This text will be shown to customers who give a ${starThreshold}+ star rating.`
                    : "This text will be shown to all customers regardless of rating."}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <Label>Show "Powered by Taptify"</Label>
                  <p className="text-xs text-muted-foreground">
                    Show attribution in the footer
                  </p>
                </div>
                <Switch
                  checked={showPoweredBy}
                  onCheckedChange={setShowPoweredBy}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={goToPreviousTab}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <div className="flex gap-3">
              <Button
                onClick={handleSaveChanges}
                disabled={isSaving || !urlAvailable}
                className={cn(
                  "bg-purple-600 hover:bg-purple-700",
                  (!urlAvailable) && "opacity-50 cursor-not-allowed"
                )}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>

                          <Button
              variant="outline"
              onClick={() => {
                const fullUrl = reviewLinkHost + reviewLink;
                window.open(fullUrl, '_blank');
              }}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Visit Link
            </Button>
            </div>

            <Button
              variant="outline"
              onClick={goToNextTab}
              disabled={!starFilterEnabled}
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </>
      );
    } else if (activeFilter === "negative") {
      return (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Negative Experience Settings</CardTitle>
              <CardDescription>Customize the negative experience screen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="negative-text">Negative Feedback Message</Label>
                <Textarea
                  id="negative-text"
                  value={negativeFeedbackText}
                  onChange={(e) => setNegativeFeedbackText(e.target.value)}
                  className="min-h-[120px]"
                  placeholder="Enter text shown to customers with negative ratings"
                />
                <p className="text-xs text-muted-foreground">
                  This text will be shown to customers who give less than {starThreshold} star rating.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <Label>Show "Powered by Taptify"</Label>
                  <p className="text-xs text-muted-foreground">
                    Show attribution in the footer
                  </p>
                </div>
                <Switch
                  checked={showPoweredBy}
                  onCheckedChange={setShowPoweredBy}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={goToPreviousTab}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <div className="flex gap-3">
              <Button
                onClick={handleSaveChanges}
                disabled={isSaving || !urlAvailable}
                className={cn(
                  "bg-purple-600 hover:bg-purple-700",
                  (!urlAvailable) && "opacity-50 cursor-not-allowed"
                )}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  const fullUrl = reviewLinkHost + reviewLink;
                  window.open(fullUrl, '_blank');
                }}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Visit Link
              </Button>
            </div>

            <Button
              variant="outline"
              disabled={true}
              className="opacity-50 cursor-not-allowed"
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </>
      );
    }
  };

  if (isLoading) {
    return (
      <SidebarProvider
        style={{
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties}
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-xl font-medium mb-2">Loading review link settings...</h2>
              <p className="text-muted-foreground">Please wait</p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="container mx-auto py-6">
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-2xl font-semibold mb-2">Review Link</h1>
                <p className="text-sm text-muted-foreground mb-6">
                  Customize the behavior, text, and images of your Review Link. If only one
                  integration is active, customers will be sent directly to the review site, skipping the
                  "Positive Experience" page.
                </p>
              </div>

              <div className="flex items-center justify-between mb-8">
                {(starFilterEnabled ? filterTabs : filterTabs.filter(tab => tab.id === "positive")).map((tab, index, filteredArray) => (
                  <React.Fragment key={tab.id}>
                    <StepBox
                      number={starFilterEnabled ? tab.number : (index + 1).toString()}
                      label={tab.label}
                      isActive={activeFilter === tab.id}
                      isCompleted={filteredArray.findIndex(t => t.id === activeFilter) > index}
                      onClick={() => setActiveFilter(tab.id)}
                    />
                    {index < filteredArray.length - 1 && (
                      <div className="h-1 flex-1 bg-gray-200 rounded-full">
                        <div
                          className="h-full bg-purple-600 rounded-full"
                          style={{
                            width: `${filteredArray.findIndex(t => t.id === activeFilter) > index
                              ? '100%'
                              : '0%'
                              }`
                          }}
                        />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  {getSettingsContent()}
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Preview</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    See how your review link will appear to customers
                  </p>
                  <div className="flex justify-center py-6">
                    {getPreviewContent()}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* --- Drag-and-Drop Styles --- */}
          <style jsx global>{`
            .draggable-name:hover {
              cursor: move;
              opacity: 0.8;
            }
            .input-dropzone {
              transition: background-color 0.2s;
            }
            .input-dropzone.drag-over {
              background-color: #f0f0f0;
            }
          `}</style>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
