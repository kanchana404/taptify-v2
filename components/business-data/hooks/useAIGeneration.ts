import { useState } from 'react';
import { toast } from 'sonner';

export interface PostConfig {
  prompt: string;
  topicType: string;
  actionType: string;
  generateImage: boolean;
  imagePrompt: string;
  imageToggleModified?: boolean; // Optional field for UI tracking
  useBusinessInfo: boolean; // Per-post business info toggle
}

// Add GenerationOptions type
export interface GenerationOptions {
  scheduleType: 'all' | 'separately';
  allDate?: string;
  separateCount?: number;
  separateInterval?: number;
  separateStartDate?: string;
  businessLocation?: any;
  detailedBusinessInfo?: any;
}

// Add a helper to get extra instructions for post type
function getTypeSpecificPrompt(topicType: string, businessName?: string) {
  let base = '\nThe post content must be at least 25 words and must mention the business name';
  if (businessName) base += ` (${businessName})`;
  base += '.';
  if (topicType === 'EVENT') {
    return `${base}\n\nIMPORTANT: Output MUST be in the following format, with every field present and labeled exactly as shown. If you do not know a value, make up a plausible one. Do NOT skip any field. Output ONLY the fields, nothing else.\n\nSummary: [A summary of the event, at least 25 words, mentioning the business name]\nEvent Title: [A catchy event title]\nStart Date: [YYYY-MM-DD]\nStart Time: [HH:MM AM/PM]\nEnd Date: [YYYY-MM-DD]\nEnd Time: [HH:MM AM/PM]\n\nExample:\nSummary: Join Ceylon Auto Spa this Saturday for our Grand Reopening Event! Enjoy free car washes, detailing demos, and special discounts on our services. Don't miss out on the chance to experience premium car care at its finest.\nEvent Title: Grand Reopening Event\nStart Date: 2024-06-15\nStart Time: 10:00 AM\nEnd Date: 2024-06-15\nEnd Time: 4:00 PM`;
  }
  if (topicType === 'OFFER') {
    return `${base}\n\nIMPORTANT: Output MUST be in the following format, with every field present and labeled exactly as shown. If you do not know a value, make up a plausible one. Do NOT skip any field. Output ONLY the fields, nothing else.\n\nSummary: [A summary of the offer, at least 25 words, mentioning the business name]\nOffer Title: [A catchy offer title]\nStart Date: [YYYY-MM-DD]\nStart Time: [HH:MM AM/PM]\nEnd Date: [YYYY-MM-DD]\nEnd Time: [HH:MM AM/PM]\nCoupon Code: [A code for the offer]\nRedeem Online URL: [A URL to redeem the offer]\nTerms & Conditions: [The terms and conditions for the offer]\n\nExample:\nSummary: Celebrate summer at Ceylon Auto Spa! Enjoy 20% off all detailing services for a limited time. Book now and treat your car to the shine it deserves.\nOffer Title: Summer Shine Discount\nStart Date: 2024-07-01\nStart Time: 09:00 AM\nEnd Date: 2024-07-15\nEnd Time: 06:00 PM\nCoupon Code: SUMMER20\nRedeem Online URL: https://ceylonautospa.com/redeem\nTerms & Conditions: Offer valid from July 1 to July 15, 2024. Cannot be combined with other promotions. One use per customer.`;
  }
  if (topicType === 'ALERT') {
    return `${base}\nPlease generate an alert post with the following fields: summary and alert type. Format the response so each field is clearly labeled.`;
  }
  return base;
}

// Add a helper to parse AI response for event/offer/alert fields
function parseStructuredFields(topicType: string, aiText: string) {
  const result: any = {};
  if (topicType === 'EVENT') {
    // Try to extract event fields
    const titleMatch = aiText.match(/event title\s*[:\-]?\s*(.*)/i);
    const startDateMatch = aiText.match(/start date\s*[:\-]?\s*(\d{4}-\d{2}-\d{2})/i);
    const startTimeMatch = aiText.match(/start time\s*[:\-]?\s*([\d:apmAPM ]+)/i);
    const endDateMatch = aiText.match(/end date\s*[:\-]?\s*(\d{4}-\d{2}-\d{2})/i);
    const endTimeMatch = aiText.match(/end time\s*[:\-]?\s*([\d:apmAPM ]+)/i);
    if (titleMatch) result.eventTitle = titleMatch[1].trim();
    if (startDateMatch) result.startDate = startDateMatch[1].trim();
    if (startTimeMatch) result.startTime = startTimeMatch[1].trim();
    if (endDateMatch) result.endDate = endDateMatch[1].trim();
    if (endTimeMatch) result.endTime = endTimeMatch[1].trim();
  } else if (topicType === 'OFFER') {
    const summaryMatch = aiText.match(/summary\s*[:\-]?\s*(.*)/i);
    const offerTitleMatch = aiText.match(/offer title\s*[:\-]?\s*(.*)/i);
    const startDateMatch = aiText.match(/start date\s*[:\-]?\s*(\d{4}-\d{2}-\d{2})/i);
    const startTimeMatch = aiText.match(/start time\s*[:\-]?\s*([\d:apmAPM ]+)/i);
    const endDateMatch = aiText.match(/end date\s*[:\-]?\s*(\d{4}-\d{2}-\d{2})/i);
    const endTimeMatch = aiText.match(/end time\s*[:\-]?\s*([\d:apmAPM ]+)/i);
    const couponMatch = aiText.match(/coupon code\s*[:\-]?\s*(.*)/i);
    const urlMatch = aiText.match(/redeem online url\s*[:\-]?\s*(.*)/i);
    const termsMatch = aiText.match(/terms? & conditions?\s*[:\-]?\s*([\s\S]*)/i);
    if (summaryMatch) result.summary = summaryMatch[1].trim();
    if (offerTitleMatch) result.offerTitle = offerTitleMatch[1].trim();
    if (startDateMatch) result.startDate = startDateMatch[1].trim();
    if (startTimeMatch) result.startTime = startTimeMatch[1].trim();
    if (endDateMatch) result.endDate = endDateMatch[1].trim();
    if (endTimeMatch) result.endTime = endTimeMatch[1].trim();
    if (couponMatch) result.couponCode = couponMatch[1].trim();
    if (urlMatch) result.redeemOnlineUrl = urlMatch[1].trim();
    if (termsMatch) result.termsConditions = termsMatch[1].trim();
  } else if (topicType === 'ALERT') {
    const summaryMatch = aiText.match(/summary\s*[:\-]?\s*(.*)/i);
    const alertTypeMatch = aiText.match(/alert type\s*[:\-]?\s*(.*)/i);
    if (summaryMatch) result.summary = summaryMatch[1].trim();
    if (alertTypeMatch) result.alertType = alertTypeMatch[1].trim();
  }
  return result;
}

export function useAIGeneration() {
  // AI generation state
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiGenerationType, setAiGenerationType] = useState<'qna' | 'post' | 'image' | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  
  // Generated posts state
  const [generatedPosts, setGeneratedPosts] = useState<any[]>([]);
  const [showGeneratedPosts, setShowGeneratedPosts] = useState(false);
  const [generatedPostImages, setGeneratedPostImages] = useState<{[key: number]: string}>({});
  const [generateImage, setGenerateImage] = useState(false);

  // Enhanced generation state
  const [showEnhancedGeneration, setShowEnhancedGeneration] = useState(false);

  // Enhanced AI Generation handler for multiple posts with individual configs
  const handleEnhancedAIGeneration = async (postConfigs: PostConfig[], options?: GenerationOptions) => {
    setIsGeneratingAI(true);
    setAiGenerationType('post');
    
    try {
      const generatedPosts: any[] = [];
      const generatedImages: {[key: number]: string} = {};
      
      // Process each post configuration individually
      for (let i = 0; i < postConfigs.length; i++) {
        const config = postConfigs[i];
        
        // Compose prompt with or without business info (per post)
        let prompt = config.prompt;
        if (config.useBusinessInfo) {
          const loc = options?.businessLocation || {};
          const details = options?.detailedBusinessInfo || {};
          const desc = loc.profile?.description || details.profile?.description || '';
          const categories = loc.categories?.primaryCategory?.displayName || details.categories?.primaryCategory?.displayName || '';
          const hours = loc.regularHours?.periods || details.regularHours?.periods || [];
          const address = loc.storefrontAddress || details.storefrontAddress || {};
          const addressStr = address.addressLines ? address.addressLines.join(', ') : '';
          const city = address.locality || '';
          const region = address.administrativeArea || '';
          const postal = address.postalCode || '';
          const website = loc.websiteUri || details.websiteUri || '';
          let hoursStr = '';
          if (hours.length) {
            hoursStr = hours.map((p: any) => `${p.openDay}: ${p.openTime} - ${p.closeTime}`).join('; ');
          }
          let businessInfo = `Description: ${desc}\nCategory: ${categories}\nAddress: ${addressStr}, ${city}, ${region}, ${postal}\nWebsite: ${website}\nHours: ${hoursStr}`;
          prompt = `Business Info:\n${businessInfo}\n${prompt}`;
        }
        // Add type-specific requirements
        let businessName = '';
        if (options?.businessLocation?.title) businessName = options.businessLocation.title;
        else if (options?.detailedBusinessInfo?.title) businessName = options.detailedBusinessInfo.title;
        // --- Per-field OFFER generation ---
        if (config.topicType === 'OFFER') {
          // Helper to call AI for a single field
          const aiField = async (fieldPrompt: string) => {
            const response = await fetch('/api/ai-generation', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'post', prompt: fieldPrompt, count: 1 }),
            });
            const result = await response.json();
            if (response.ok && result && result.data && result.data.posts && result.data.posts.length > 0) {
              return result.data.posts[0].summary || '';
            }
            return '';
          };
          
          // Helper to extract actual values from AI responses
          const extractValue = (aiResponse: string, type: 'date' | 'time' | 'code' | 'url' | 'text') => {
            if (!aiResponse) return '';
            const cleaned = aiResponse.trim();
            
            if (type === 'date') {
              // Extract YYYY-MM-DD pattern
              const dateMatch = cleaned.match(/(\d{4}-\d{2}-\d{2})/);
              return dateMatch ? dateMatch[1] : '';
            }
            
            if (type === 'time') {
              // Extract HH:MM or HH:MM AM/PM pattern
              const timeMatch = cleaned.match(/(\d{1,2}:\d{2}(?:\s*[APap][Mm])?)/);
              return timeMatch ? timeMatch[1] : '';
            }
            
            if (type === 'code') {
              // Extract alphanumeric code (usually uppercase)
              const codeMatch = cleaned.match(/([A-Z0-9]{3,15})/);
              return codeMatch ? codeMatch[1] : '';
            }
            
            if (type === 'url') {
              // Extract URL pattern
              const urlMatch = cleaned.match(/(https?:\/\/[^\s]+)/);
              return urlMatch ? urlMatch[1] : '';
            }
            
            // For text, return the cleaned response
            return cleaned;
          };
          
          // Generate fallback values
          const today = new Date();
          const tomorrow = new Date(today);
          tomorrow.setDate(today.getDate() + 7); // 1 week from now
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth() + 1).padStart(2, '0');
          const dd = String(today.getDate()).padStart(2, '0');
          const endYyyy = tomorrow.getFullYear();
          const endMm = String(tomorrow.getMonth() + 1).padStart(2, '0');
          const endDd = String(tomorrow.getDate()).padStart(2, '0');
          
          // Prompts for each field
          const summary = await aiField(`Write a summary (at least 25 words) for an offer at ${businessName}.`);
          const offerTitleRaw = await aiField(`Generate only a catchy offer title for ${businessName}. Return only the title, no extra text.`);
          const startDateRaw = await aiField(`Generate only a start date in YYYY-MM-DD format for an offer at ${businessName}. Return only the date.`);
          const startTimeRaw = await aiField(`Generate only a start time in HH:MM format for an offer at ${businessName}. Return only the time.`);
          const endDateRaw = await aiField(`Generate only an end date in YYYY-MM-DD format for an offer at ${businessName}. Return only the date.`);
          const endTimeRaw = await aiField(`Generate only an end time in HH:MM format for an offer at ${businessName}. Return only the time.`);
          const couponCodeRaw = await aiField(`Generate only a coupon code for ${businessName}. Return only the code, no extra text.`);
          const redeemOnlineUrlRaw = await aiField(`Generate only a redeem online URL for ${businessName}. Return only the URL, no extra text.`);
          const termsConditionsRaw = await aiField(`Generate only terms and conditions for an offer at ${businessName}. Return only the terms text.`);
          
          // Extract and fallback values
          const offerTitle = extractValue(offerTitleRaw, 'text') || 'Special Offer';
          const startDate = extractValue(startDateRaw, 'date') || `${yyyy}-${mm}-${dd}`;
          const startTime = extractValue(startTimeRaw, 'time') || '09:00';
          const endDate = extractValue(endDateRaw, 'date') || `${endYyyy}-${endMm}-${endDd}`;
          const endTime = extractValue(endTimeRaw, 'time') || '18:00';
          const couponCode = extractValue(couponCodeRaw, 'code') || 'SAVE20';
          const redeemOnlineUrl = extractValue(redeemOnlineUrlRaw, 'url') || `https://${businessName.toLowerCase().replace(/\s+/g, '')}.com/redeem`;
          const termsConditions = extractValue(termsConditionsRaw, 'text') || 'Limited time offer. Terms and conditions apply.';
          
          let enhancedPost: any = {
            topicType: config.topicType,
            actionType: config.actionType,
            summary,
            offer: {
              title: offerTitle,
              schedule: {
                startDate,
                startTime,
                endDate,
                endTime,
              },
              couponCode,
              redeemOnlineUrl,
              termsConditions,
            },
          };
          generatedPosts.push(enhancedPost);
          toast.success(`Generated offer post ${i + 1} of ${postConfigs.length}`);
          continue;
        }
        // --- End per-field OFFER generation ---
        prompt += getTypeSpecificPrompt(config.topicType, businessName);
        
        // Set publish date to today if not specified
        let publishDate = options?.allDate || options?.separateStartDate;
        if (!publishDate) {
          const d = new Date();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          publishDate = `${d.getFullYear()}-${month}-${day}`;
        }

        // Generate the post content (for non-OFFER types)
        const response = await fetch('/api/ai-generation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            type: 'post', 
            prompt, 
            count: 1,
            topicType: config.topicType,
            actionType: config.actionType,
            // Optionally pass scheduling info for future use
            scheduleType: options?.scheduleType,
            allDate: options?.allDate,
            separateCount: options?.separateCount,
            separateInterval: options?.separateInterval,
            separateStartDate: options?.separateStartDate,
            publishDate, // always set
          }),
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || `Failed to generate post ${i + 1}`);
        }
        
        if (result && result.data && result.data.posts && result.data.posts.length > 0) {
          const post = result.data.posts[0];
          let enhancedPost: any = {
            ...post,
            topicType: config.topicType,
            actionType: config.actionType,
            summary: post.summary || '',
          };
          // Parse and map structured fields for special types
          if (['EVENT', 'OFFER', 'ALERT'].includes(config.topicType)) {
            // Prefer post.raw or post.fullText, then summary
            const aiText = post.raw || post.fullText || post.summary || '';
            const parsed = parseStructuredFields(config.topicType, aiText);
            if (config.topicType === 'EVENT') {
              // Auto-fill missing event fields
              const today = new Date();
              const yyyy = today.getFullYear();
              const mm = String(today.getMonth() + 1).padStart(2, '0');
              const dd = String(today.getDate()).padStart(2, '0');
              const defaultDate = `${yyyy}-${mm}-${dd}`;
              enhancedPost.event = {
                title: parsed.eventTitle || 'TBD',
                schedule: {
                  startDate: parsed.startDate || defaultDate,
                  startTime: parsed.startTime || '12:00 PM',
                  endDate: parsed.endDate || defaultDate,
                  endTime: parsed.endTime || '12:00 PM',
                },
              };
            } else if (config.topicType === 'OFFER') {
              // Auto-fill missing offer fields
              const today = new Date();
              const yyyy = today.getFullYear();
              const mm = String(today.getMonth() + 1).padStart(2, '0');
              const dd = String(today.getDate()).padStart(2, '0');
              const defaultDate = `${yyyy}-${mm}-${dd}`;
              enhancedPost.offer = {
                title: parsed.offerTitle || 'TBD',
                schedule: {
                  startDate: parsed.startDate || defaultDate,
                  startTime: parsed.startTime || '12:00 PM',
                  endDate: parsed.endDate || defaultDate,
                  endTime: parsed.endTime || '12:00 PM',
                },
                couponCode: parsed.couponCode || '',
                redeemOnlineUrl: parsed.redeemOnlineUrl || '',
                termsConditions: parsed.termsConditions || '',
              };
              if (parsed.summary) enhancedPost.summary = parsed.summary;
            } else if (config.topicType === 'ALERT') {
              enhancedPost.alertType = parsed.alertType || '';
              if (parsed.summary) enhancedPost.summary = parsed.summary;
            }
          }
          generatedPosts.push(enhancedPost);
          
          // Generate image if requested with custom prompt
          if (config.generateImage && config.imagePrompt.trim()) {
            const imageUrl = await generateIdeogramImage(config.imagePrompt);
            if (imageUrl) {
              generatedImages[i] = imageUrl;
            }
          }
        }
        
        // Show progress
        toast.success(`Generated post ${i + 1} of ${postConfigs.length}${config.generateImage ? ' with image' : ''}`);
      }
      
      if (generatedPosts.length > 0) {
        setGeneratedPosts(generatedPosts);
        setGeneratedPostImages(generatedImages);
        setShowGeneratedPosts(true);
        
        const imageCount = Object.keys(generatedImages).length;
        toast.success(
          `Successfully generated ${generatedPosts.length} post${generatedPosts.length === 1 ? '' : 's'}${
            imageCount > 0 ? ` with ${imageCount} image${imageCount === 1 ? '' : 's'}` : ''
          }! Review and select the ones you want to use.`
        );
      } else {
        throw new Error('No posts were generated successfully');
      }
      
    } catch (error) {
      console.error('Enhanced AI Generation Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate posts with AI');
    } finally {
      setIsGeneratingAI(false);
      setAiGenerationType(null);
    }
  };

  // Original AI Generation handler (kept for backward compatibility)
  const handleAIGeneration = async (type: 'post' | 'qna' | 'image', prompt?: string, count: number = 1) => {
    setIsGeneratingAI(true);
    setAiGenerationType(type);
    
    try {
      // Handle image-only generation
      if (type === 'image') {
        const imageUrl = await generateIdeogramImage(prompt || '');
        if (imageUrl) {
          // Dispatch event to update the generated image in the dialog
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('imageGenerated', { 
              detail: { imageUrl } 
            }));
            toast.success('New image generated successfully!');
          }, 100);
        } else {
          throw new Error('Failed to generate image');
        }
        return;
      }
      
      // Handle post/qna generation as before
      const response = await fetch('/api/ai-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, prompt: prompt || aiPrompt, count }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate content');
      }

      if (type === 'post' && result && result.data && result.data.posts && result.data.posts.length > 0) {
        const posts = result.data.posts;
        
        // If only one post is generated, auto-import it directly
        if (posts.length === 1 && count === 1) {
          const post = posts[0];
          
          if (generateImage) {
            toast.success('Generated post content! Generating image...');
            const imageUrl = await generateIdeogramImage(post.summary || '');
            
            // Auto-import the single post with image
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('autoImportPost', { 
                detail: { post, imageUrl } 
              }));
              toast.success('Post content and image generated! Review and create your post.');
            }, 100);
          } else {
            // Auto-import the single post without image
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('autoImportPost', { 
                detail: { post, imageUrl: null } 
              }));
              toast.success('Post content generated! Review and create your post.');
            }, 100);
          }
        } else {
          // Multiple posts - show selection dialog as before
          setGeneratedPosts(posts);
          
          if (generateImage) {
            toast.success(`Generated ${posts.length} post suggestion(s)! Generating images...`);
            
            const imagePromises = posts.map(async (post: any, index: number) => {
              const imgUrl = await generateIdeogramImage(post.summary || '');
              return { index, imgUrl };
            });
            
            const imageResults = await Promise.all(imagePromises);
            const imageMap: {[key: number]: string} = {};
            imageResults.forEach(({ index, imgUrl }) => {
              if (imgUrl) {
                imageMap[index] = imgUrl;
              }
            });
            setGeneratedPostImages(imageMap);
            
            setShowGeneratedPosts(true);
            toast.success(`Generated ${posts.length} post(s) with images! Select the ones you want to use.`);
          } else {
            setShowGeneratedPosts(true);
            toast.success(`Generated ${posts.length} post suggestion(s)! Select the ones you want to use.`);
          }
        }
      } else if (type === 'qna' && result && result.data && result.data.questions) {
        toast.success(`Generated ${result.data.questions.length} question suggestions! Check the Q&A tab to use them.`);
        localStorage.setItem('generatedQuestions', JSON.stringify(result.data.questions));
        window.dispatchEvent(new CustomEvent('questionsGenerated', { detail: result.data.questions }));
      }
    } catch (error) {
      console.error('AI Generation Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate content with AI');
    } finally {
      setIsGeneratingAI(false);
      setAiGenerationType(null);
      setAiPrompt('');
    }
  };

  // Helper to call Ideogram API
  async function generateIdeogramImage(prompt: string): Promise<string | null> {
    try {
      const response = await fetch('/api/ideogram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.imageUrl || null;
    } catch {
      return null;
    }
  }

  // Handle using a generated post (legacy function)
  const handleUseGeneratedPost = (post: any, index: number, onPostSelect: (post: any, imageUrl?: string) => void) => {
    const imageUrl = generatedPostImages[index] || undefined;
    onPostSelect(post, imageUrl);
    
    // Remove the used post from the generated list
    setGeneratedPosts(prev => prev.filter((_, i) => i !== index));
    
    // Update the images map to adjust indices
    const newImageMap: {[key: number]: string} = {};
    Object.entries(generatedPostImages).forEach(([key, value]) => {
      const keyIndex = parseInt(key);
      if (keyIndex < index) {
        newImageMap[keyIndex] = value;
      } else if (keyIndex > index) {
        newImageMap[keyIndex - 1] = value;
      }
    });
    setGeneratedPostImages(newImageMap);
    
    // If no more posts, close the dialog
    if (generatedPosts.length <= 1) {
      setShowGeneratedPosts(false);
      setGeneratedPosts([]);
      setGeneratedPostImages({});
    }
    
    toast.success('Post content applied! Review and create your post.');
  };

  // Enhanced post handler for the new dialog - keeps dialog open
  const handleUseEnhancedPost = (post: any, imageUrl?: string) => {
    // Dispatch event to auto-import the post
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('autoImportPost', { 
        detail: { post, imageUrl } 
      }));
      toast.success('Post applied to editor! Generated posts remain available.');
    }, 100);
    // Don't close the dialog - let the enhanced dialog handle post tracking
  };

  // Clear all generated posts and close dialog
  const clearGeneratedPosts = () => {
    setShowGeneratedPosts(false);
    setGeneratedPosts([]);
    setGeneratedPostImages({});
    toast.success('All generated posts cleared.');
  };

  // Show the generated posts dialog (useful for reopening)
  const showGeneratedPostsDialog = () => {
    if (generatedPosts.length > 0) {
      setShowGeneratedPosts(true);
    } else {
      toast.error('No generated posts available. Generate some posts first.');
    }
  };

  return {
    // State
    isGeneratingAI,
    aiGenerationType,
    aiPrompt,
    generatedPosts,
    showGeneratedPosts,
    generatedPostImages,
    generateImage,
    showEnhancedGeneration,
    
    // Actions
    handleAIGeneration,
    handleEnhancedAIGeneration,
    handleUseGeneratedPost,
    handleUseEnhancedPost,
    clearGeneratedPosts,
    showGeneratedPostsDialog,
    setAiPrompt,
    setGenerateImage,
    setShowGeneratedPosts,
    setShowEnhancedGeneration,
  };
}
