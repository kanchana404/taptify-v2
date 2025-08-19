"use client";

import { useState, useEffect, useRef } from "react";
import {
    Search, Filter, ThumbsUp, ThumbsDown, Calendar,
    MessageCircle, Share2, Trash2,
    Check, CheckCircle, Sparkles, Send, Smile
} from "lucide-react";
import { format } from "date-fns";
import Picker, { EmojiClickData } from "emoji-picker-react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationEllipsis,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useRouter } from 'next/navigation';

// Interface for Google Review from API
interface GoogleReview {
    reviewId: string;
    reviewer: {
        profilePhotoUrl: string;
        displayName: string;
    };
    starRating: string;
    comment: string;
    createTime: string;
    updateTime: string;
    name: string;
    reviewReply?: {
        comment: string;
        updateTime: string;
    };
}

// Interface for review data (adapted for UI)
interface Review {
    id: string;
    customerName: string;
    customerEmail: string;
    customerAvatar: string;
    reviewDate: string;
    rating: number;
    sentiment: string;
    comment: string;
    isReplied: boolean;
    replyDate: string | null;
    reply: string;
    isAiGenerated: boolean;
    phone: string;
}

// Function to convert starRating string to number
const getRatingValue = (starRating: string): number => {
    switch (starRating.toUpperCase()) {
        case 'ONE': return 1;
        case 'TWO': return 2;
        case 'THREE': return 3;
        case 'FOUR': return 4;
        case 'FIVE': return 5;
        default: return 0;
    }
};

// Function to render stars based on rating
const RatingStars = ({ rating }: { rating: number }) => {
    const starsArray = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
            starsArray.push(
                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            );
        } else if (i === fullStars && hasHalfStar) {
            starsArray.push(
                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400 opacity-50" />
            );
        } else {
            starsArray.push(
                <Star key={i} className="h-4 w-4 text-muted-foreground" />
            );
        }
    }

    return <div className="flex">{starsArray}</div>;
};

// Import Star component
import { Star } from "lucide-react";
import Link from "next/link";

// ReviewReplyGenerator Component
// Updated ReviewReplyGenerator Component
const ReviewReplyGenerator = ({
    review,
    onReplyGenerated,
    selectedLocation,
    selectedAccount
}: {
    review: Review,
    onReplyGenerated: (reply: string) => void,
    selectedLocation?: string,
    selectedAccount?: string
}) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [replyType, setReplyType] = useState('short');

    const generateAIReply = async () => {
        setIsGenerating(true);

        try {
            const response = await fetch('/api/ai-reply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reviewId: review.id,
                    reviewContent: review.comment, // Send the review content directly
                    rating: review.rating, // Send the rating directly
                    regenerate: true,
                    replyType: replyType,
                    locationName: selectedLocation, // Send location info for Google Business
                    accountName: selectedAccount // Send account info for Google Business
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate reply');
            }

            const data = await response.json();

            if (onReplyGenerated && data.reply) {
                onReplyGenerated(data.reply);
            }
            toast.success('AI reply generated successfully');
        } catch (err) {
            console.error('Error generating AI reply:', err);
            toast.error(err.message || 'Something went wrong. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Select value={replyType} onValueChange={setReplyType}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Reply Length" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="short">Short (2-3 sentences)</SelectItem>
                        <SelectItem value="medium">Medium (4-5 sentences)</SelectItem>
                        <SelectItem value="long">Long (6-8 sentences)</SelectItem>
                    </SelectContent>
                </Select>

                <Button
                    onClick={generateAIReply}
                    disabled={isGenerating}
                    className="ml-2 bg-purple-600 hover:bg-purple-500"
                >
                    {isGenerating ? 'Generating...' : 'Generate AI Reply'}
                </Button>
            </div>
        </div>
    );
};

// Main ReviewManagementPage Component
export default function ReviewManagementPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [sentiment, setSentiment] = useState("all");
    const [answered, setAnswered] = useState("all");
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [isFiltersVisible, setIsFiltersVisible] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [reviewToDelete, setReviewToDelete] = useState<Review | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
    const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
    const [formattedDates, setFormattedDates] = useState<{ [key: string]: string }>({});
    const [formattedReplyDates, setFormattedReplyDates] = useState<{ [key: string]: string }>({});
    const [isMounted, setIsMounted] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<string>('');
    const [selectedLocation, setSelectedLocation] = useState<string>('');
    const [accounts, setAccounts] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);
    const [loadingLocations, setLoadingLocations] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const router = useRouter();
    const reviewsPerPage = 5;

    // Ensure client-side rendering
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Check authentication and fetch accounts
    useEffect(() => {
        async function checkConnection() {
            try {
                const response = await fetch('/api/business?type=debug');
                const data = await response.json();
                if (response.ok && data.tokenInfo) {
                    setIsConnected(true);
                    // Fetch accounts immediately after confirming connection
                    await fetchAccounts();
                } else {
                    setIsConnected(false);
                    setLoading(false);
                }
            } catch (error) {
                console.error('Error checking connection:', error);
                setIsConnected(false);
                setLoading(false);
            }
        }

        checkConnection();
    }, []);

    // Fetch accounts
    const fetchAccounts = async () => {
        setLoadingAccounts(true);
        try {
            const response = await fetch('/api/business?type=accounts');
            const data = await response.json();
            if (response.ok) {
                setAccounts(data.accounts || []);
                if (data.accounts?.length > 0) {
                    setSelectedAccount(data.accounts[0].name);
                }
            } else {
                toast.error('Failed to load accounts');
            }
        } catch (error) {
            console.error('Error fetching accounts:', error);
            toast.error('Failed to load accounts');
        } finally {
            setLoadingAccounts(false);
            setLoading(false);
        }
    };

    // Fetch locations for selected account
    useEffect(() => {
        if (!selectedAccount) return;

        async function fetchLocations() {
            setLoadingLocations(true);
            try {
                const response = await fetch(`/api/business?type=locations&accountName=${encodeURIComponent(selectedAccount)}`);
                const data = await response.json();
                if (response.ok) {
                    setLocations(data.locations || []);
                    if (data.locations?.length > 0) {
                        setSelectedLocation(data.locations[0].name);
                    }
                } else {
                    toast.error('Failed to load locations');
                }
            } catch (error) {
                console.error('Error fetching locations:', error);
                toast.error('Failed to load locations');
            } finally {
                setLoadingLocations(false);
            }
        }

        fetchLocations();
    }, [selectedAccount]);

    // Fetch reviews for selected location
    useEffect(() => {
        if (!selectedLocation || !selectedAccount) return;

        async function fetchReviews() {
            setLoading(true);
            try {
                const response = await fetch(`/api/business?type=reviews&locationName=${encodeURIComponent(selectedLocation)}&accountName=${encodeURIComponent(selectedAccount)}`);
                const data = await response.json();
                if (response.ok) {
                    const mappedReviews: Review[] = (data.reviews || []).map((review: GoogleReview) => ({
                        id: review.reviewId,
                        customerName: review.reviewer.displayName,
                        customerEmail: '', // Google API doesn't provide email
                        customerAvatar: review.reviewer.profilePhotoUrl,
                        reviewDate: review.createTime,
                        rating: getRatingValue(review.starRating),
                        sentiment: getRatingValue(review.starRating) >= 4 ? 'positive' : 'negative',
                        comment: review.comment || '',
                        isReplied: !!review.reviewReply,
                        replyDate: review.reviewReply ? review.reviewReply.updateTime : null,
                        reply: review.reviewReply ? review.reviewReply.comment : '',
                        isAiGenerated: false, // Assume manual unless set by AI reply endpoint
                        phone: '', // Google API doesn't provide phone
                    }));
                    setReviews(mappedReviews);
                } else {
                    toast.error(data.message || 'Failed to load reviews');
                }
            } catch (error) {
                console.error('Error fetching reviews:', error);
                toast.error('Failed to load reviews');
            } finally {
                setLoading(false);
            }
        }

        fetchReviews();
    }, [selectedLocation, selectedAccount]);

    // Format dates
    useEffect(() => {
        if (reviews.length === 0) return;

        const newFormattedDates: { [key: string]: string } = {};
        const newFormattedReplyDates: { [key: string]: string } = {};

        reviews.forEach(review => {
            newFormattedDates[review.id] = format(new Date(review.reviewDate), 'MMM d, yyyy');
            if (review.replyDate) {
                newFormattedReplyDates[review.id] = format(new Date(review.replyDate), 'MMM d, yyyy');
            }
        });

        setFormattedDates(newFormattedDates);
        setFormattedReplyDates(newFormattedReplyDates);
    }, [reviews]);

    // Apply filters
    useEffect(() => {
        if (reviews.length === 0) return;

        let results = [...reviews];

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            results = results.filter(
                review =>
                    review.customerName.toLowerCase().includes(term) ||
                    review.comment.toLowerCase().includes(term)
            );
        }

        if (sentiment !== "all") {
            results = results.filter(review => review.sentiment === sentiment);
        }

        if (answered !== "all") {
            results = results.filter(review =>
                answered === "replied" ? review.isReplied : !review.isReplied
            );
        }

        if (startDate) {
            results = results.filter(review =>
                new Date(review.reviewDate) >= new Date(startDate)
            );
        }

        if (endDate) {
            results = results.filter(review =>
                new Date(review.reviewDate) <= new Date(endDate)
            );
        }

        setFilteredReviews(results);
        setCurrentPage(1);
    }, [searchTerm, sentiment, answered, startDate, endDate, reviews]);

    // Handle drag start for name tag
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, name: string) => {
        e.dataTransfer.setData('text/plain', name);
        e.dataTransfer.effectAllowed = 'copy';
    };

    // Handle drop into textarea
    const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>, reviewId: string) => {
        e.preventDefault();
        const name = e.dataTransfer.getData('text/plain');
        const textarea = textareaRef.current;
        if (textarea && editingReplyId === reviewId) {
            const startPos = textarea.selectionStart;
            const endPos = textarea.selectionEnd;
            const textBefore = replyText.substring(0, startPos);
            const textAfter = replyText.substring(endPos);
            setReplyText(textBefore + name + textAfter);
            setTimeout(() => {
                textarea.focus();
                textarea.selectionStart = textarea.selectionEnd = startPos + name.length;
            }, 0);
        }
    };

    // Prevent default drag over behavior
    const handleDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    // Handle reply submission
    const handleReplySubmit = async (review: Review) => {
        if (!replyText.trim()) {
            toast.error('Reply text cannot be empty');
            return;
        }

        try {
            const response = await fetch('/api/google-business-reply', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reviewId: review.id,
                    comment: replyText,
                    accountName: selectedAccount,
                    locationName: selectedLocation,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to submit reply');
            }

            const data = await response.json();

            // Update local state to reflect the reply
            setReviews(prevReviews =>
                prevReviews.map(r =>
                    r.id === review.id
                        ? {
                            ...r,
                            isReplied: true,
                            replyDate: new Date().toISOString(),
                            reply: replyText,
                            isAiGenerated: false
                        }
                        : r
                )
            );

            setEditingReplyId(null);
            setReplyText("");
            setShowEmojiPicker(null);
            toast.success('Reply sent successfully to Google Business');
        } catch (error) {
            console.error('Error saving reply:', error);
            toast.error(error.message || 'Failed to send reply to Google Business');
        }
    };
    const handleDeleteReply = async (review: Review) => {
        try {
            const response = await fetch(`/api/google-business-reply?reviewId=${encodeURIComponent(review.id)}&accountName=${encodeURIComponent(selectedAccount)}&locationName=${encodeURIComponent(selectedLocation)}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete reply');
            }

            // Update local state to reflect the deleted reply
            setReviews(prevReviews =>
                prevReviews.map(r =>
                    r.id === review.id
                        ? {
                            ...r,
                            isReplied: false,
                            replyDate: null,
                            reply: '',
                            isAiGenerated: false
                        }
                        : r
                )
            );

            toast.success('Reply deleted successfully from Google Business');
        } catch (error) {
            console.error('Error deleting reply:', error);
            toast.error(error.message || 'Failed to delete reply from Google Business');
        }
    };
    // Handle AI reply generated
    const handleReplyGenerated = (reviewId: string, generatedReply: string) => {
        setReplyText(generatedReply);
        setEditingReplyId(reviewId);
    };

    // Handle emoji selection
    const handleEmojiClick = (emojiData: EmojiClickData, reviewId: string) => {
        setReplyText(prev => prev + emojiData.emoji);
        setShowEmojiPicker(null);
    };

    // Handle delete confirmation
    const handleDeleteConfirm = async () => {
        if (!reviewToDelete) return;

        try {
            const response = await fetch(`/api/business?type=deleteReview&reviewId=${reviewToDelete.id}&locationName=${encodeURIComponent(selectedLocation)}&accountName=${encodeURIComponent(selectedAccount)}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete review');
            }

            setReviews(prevReviews => prevReviews.filter(review => review.id !== reviewToDelete.id));
            setFilteredReviews(prevReviews => prevReviews.filter(review => review.id !== reviewToDelete.id));

            toast.success('Review deleted successfully');
        } catch (error) {
            console.error('Error deleting review:', error);
            toast.error(error.message || 'Failed to delete review');
        } finally {
            setDeleteConfirmOpen(false);
            setReviewToDelete(null);
        }
    };

    // Start editing a reply
    const startEditing = (review: Review) => {
        setEditingReplyId(review.id);
        setReplyText(review.reply || '');
    };

    // Cancel editing
    const cancelEditing = () => {
        setEditingReplyId(null);
        setReplyText('');
        setShowEmojiPicker(null);
    };

    // Calculate paginated reviews
    const paginatedReviews = filteredReviews.slice(
        (currentPage - 1) * reviewsPerPage,
        currentPage * reviewsPerPage
    );

    const totalPages = Math.ceil(filteredReviews.length / reviewsPerPage);

    // Avoid rendering until the component is mounted
    if (!isMounted) {
        return null;
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
                    <div className="@container/main flex flex-1 flex-col">
                        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                            {/* Header and Filter Controls */}
                            <div className="px-4 lg:px-6">
                                <h1 className="text-2xl font-bold">Review Management</h1>
                                {loading ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3].map((i) => (
                                            <Card key={i} className="overflow-hidden">
                                                <CardContent className="p-6">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <Skeleton className="h-12 w-12 rounded-full" />
                                                        <div className="space-y-2">
                                                            <Skeleton className="h-4 w-32" />
                                                            <Skeleton className="h-3 w-24" />
                                                        </div>
                                                        <div className="ml-auto">
                                                            <Skeleton className="h-4 w-24" />
                                                        </div>
                                                    </div>
                                                    <Skeleton className="h-16 w-full mb-4" />
                                                    <div className="flex justify-between">
                                                        <Skeleton className="h-8 w-20" />
                                                        <Skeleton className="h-8 w-20" />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                ) : !isConnected ? (
                                    <div className="text-center py-12">
                                        <div className="mb-4 text-muted-foreground">
                                            <MessageCircle className="inline-block h-12 w-12 opacity-20" />
                                        </div>
                                        <h3 className="text-lg font-medium mb-2">No Google Business Account Connected</h3>
                                        <p className="text-muted-foreground">
                                            Please connect your Google Business Profile to view and manage reviews.
                                        </p>
                                        <Link href="/Intergrations" >
                                            <Button className="mt-2">Connect Google Business</Button>
                                        </Link>
                                    </div>
                                ) : (
                                    <>
                                        {/* Account and Location Selection */}
                                        <div className="flex flex-col md:flex-row gap-4 mb-6">
                                            <div className="flex-1">
                                                <Label className="block text-sm font-medium mb-2">
                                                    Select Account ({accounts.length} found)
                                                </Label>
                                                <Select
                                                    value={selectedAccount}
                                                    onValueChange={(value) => {
                                                        setSelectedAccount(value);
                                                        setSelectedLocation('');
                                                        setReviews([]);
                                                        setFilteredReviews([]);
                                                    }}
                                                    disabled={loadingAccounts}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={loadingAccounts ? "Loading accounts..." : "Choose an account..."} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {accounts.map((account) => (
                                                            <SelectItem key={account.name} value={account.name}>
                                                                {account.accountName || account.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex-1">
                                                <Label className="block text-sm font-medium mb-2">
                                                    Select Location ({locations.length} found)
                                                </Label>
                                                <Select
                                                    value={selectedLocation}
                                                    onValueChange={setSelectedLocation}
                                                    disabled={loadingLocations || !selectedAccount}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={loadingLocations ? "Loading locations..." : !selectedAccount ? "Select an account first" : "Choose a location..."} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {locations.map((location) => (
                                                            <SelectItem key={location.name} value={location.name}>
                                                                {location.title || location.displayName || 'Unnamed Location'}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        {/* Filters */}
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                            <div className="flex flex-wrap gap-2">
                                                <div className="relative w-full md:w-auto">
                                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        type="search"
                                                        placeholder="Search reviews..."
                                                        className="w-full md:w-[200px] pl-8"
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                    />
                                                </div>

                                                <Popover open={isFiltersVisible} onOpenChange={setIsFiltersVisible}>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" size="default" className="h-9 gap-1.5">
                                                            <Filter className="h-4 w-4" />
                                                            <span>Filters</span>
                                                            {(sentiment !== "all" || answered !== "all" || startDate || endDate) && (
                                                                <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                                                                    Active
                                                                </Badge>
                                                            )}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[300px]" align="end">
                                                        <div className="grid gap-4">
                                                            <div className="space-y-2">
                                                                <h4 className="font-medium leading-none">Review Filters</h4>
                                                                <p className="text-sm text-muted-foreground">
                                                                    Filter reviews by different criteria
                                                                </p>
                                                            </div>

                                                            <div className="grid gap-2">
                                                                <Label htmlFor="sentiment">Sentiment</Label>
                                                                <Select
                                                                    value={sentiment}
                                                                    onValueChange={(value) => setSentiment(value)}
                                                                >
                                                                    <SelectTrigger id="sentiment" className="h-8">
                                                                        <SelectValue placeholder="Select sentiment" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="all">All Reviews</SelectItem>
                                                                        <SelectItem value="positive">
                                                                            <div className="flex items-center">
                                                                                <ThumbsUp className="mr-2 h-4 w-4 text-green-500" />
                                                                                <span>Positive</span>
                                                                            </div>
                                                                        </SelectItem>
                                                                        <SelectItem value="negative">
                                                                            <div className="flex items-center">
                                                                                <ThumbsDown className="mr-2 h-4 w-4 text-red-500" />
                                                                                <span>Negative</span>
                                                                            </div>
                                                                        </SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>

                                                            <div className="grid gap-2">
                                                                <Label htmlFor="answered">Status</Label>
                                                                <Select
                                                                    value={answered}
                                                                    onValueChange={(value) => setAnswered(value)}
                                                                >
                                                                    <SelectTrigger id="answered" className="h-8">
                                                                        <SelectValue placeholder="Select status" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="all">All Statuses</SelectItem>
                                                                        <SelectItem value="replied">
                                                                            <div className="flex items-center">
                                                                                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                                                                <span>Replied</span>
                                                                            </div>
                                                                        </SelectItem>
                                                                        <SelectItem value="pending">
                                                                            <div className="flex items-center">
                                                                                <MessageCircle className="mr-2 h-4 w-4 text-orange-500" />
                                                                                <span>Pending Reply</span>
                                                                            </div>
                                                                        </SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>

                                                            <div className="grid gap-2">
                                                                <Label>Date Range</Label>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <Popover>
                                                                        <PopoverTrigger asChild>
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                className="justify-start text-left font-normal"
                                                                            >
                                                                                <Calendar className="mr-2 h-4 w-4" />
                                                                                {startDate ? format(startDate, 'PP') : "Start date"}
                                                                            </Button>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent className="w-auto p-0" align="start">
                                                                            <CalendarComponent
                                                                                mode="single"
                                                                                selected={startDate}
                                                                                onSelect={(date) => setStartDate(date || null)}
                                                                                initialFocus
                                                                            />
                                                                        </PopoverContent>
                                                                    </Popover>

                                                                    <Popover>
                                                                        <PopoverTrigger asChild>
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                className="justify-start text-left font-normal"
                                                                            >
                                                                                <Calendar className="mr-2 h-4 w-4" />
                                                                                {endDate ? format(endDate, 'PP') : "End date"}
                                                                            </Button>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent className="w-auto p-0" align="start">
                                                                            <CalendarComponent
                                                                                mode="single"
                                                                                selected={endDate}
                                                                                onSelect={(date) => setEndDate(date || null)}
                                                                                initialFocus
                                                                                disabled={(date) =>
                                                                                    startDate ? date < startDate : false
                                                                                }
                                                                            />
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                </div>
                                                            </div>

                                                            <div className="flex justify-between pt-2">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setSearchTerm("");
                                                                        setSentiment("all");
                                                                        setAnswered("all");
                                                                        setStartDate(null);
                                                                        setEndDate(null);
                                                                    }}
                                                                >
                                                                    Reset All
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => setIsFiltersVisible(false)}
                                                                >
                                                                    Apply Filters
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        </div>
                                        {(sentiment !== "all" || answered !== "all" || startDate || endDate) && (
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {sentiment !== "all" && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="flex items-center gap-1 px-3 py-1"
                                                    >
                                                        {sentiment === "positive" && <ThumbsUp className="h-3 w-3 text-green-500" />}
                                                        {sentiment === "negative" && <ThumbsDown className="h-3 w-3 text-red-500" />}
                                                        <span className="capitalize">{sentiment}</span>
                                                        <button
                                                            className="ml-1 text-muted-foreground hover:text-foreground"
                                                            onClick={() => setSentiment("all")}
                                                        >
                                                            ×
                                                        </button>
                                                    </Badge>
                                                )}

                                                {answered !== "all" && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="flex items-center gap-1 px-3 py-1"
                                                    >
                                                        {answered === "replied"
                                                            ? <CheckCircle className="h-3 w-3 text-green-500" />
                                                            : <MessageCircle className="h-3 w-3 text-orange-500" />
                                                        }
                                                        <span>{answered === "replied" ? "Replied" : "Pending Reply"}</span>
                                                        <button
                                                            className="ml-1 text-muted-foreground hover:text-foreground"
                                                            onClick={() => setAnswered("all")}
                                                        >
                                                            ×
                                                        </button>
                                                    </Badge>
                                                )}

                                                {(startDate || endDate) && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="flex items-center gap-1 px-3 py-1"
                                                    >
                                                        <Calendar className="h-3 w-3" />
                                                        <span>
                                                            {startDate && endDate
                                                                ? `${format(startDate, 'PP')} - ${format(endDate, 'PP')}`
                                                                : startDate
                                                                    ? `From ${format(startDate, 'PP')}`
                                                                    : `Until ${format(endDate, 'PP')}`
                                                            }
                                                        </span>
                                                        <button
                                                            className="ml-1 text-muted-foreground hover:text-foreground"
                                                            onClick={() => {
                                                                setStartDate(null);
                                                                setEndDate(null);
                                                            }}
                                                        >
                                                            ×
                                                        </button>
                                                    </Badge>
                                                )}

                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-xs text-muted-foreground"
                                                    onClick={() => {
                                                        setSearchTerm("");
                                                        setSentiment("all");
                                                        setAnswered("all");
                                                        setStartDate(null);
                                                        setEndDate(null);
                                                    }}
                                                >
                                                    Clear all filters
                                                </Button>
                                            </div>
                                        )}

                                        <div className="text-sm text-muted-foreground mb-4">
                                            Showing {paginatedReviews.length} of {filteredReviews.length} reviews
                                            {filteredReviews.length !== reviews.length && (
                                                <span> (filtered from {reviews.length} total)</span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            {isConnected && !loading && (
                                <div className="px-4 lg:px-6">
                                    <style jsx global>{`
                                        .emoji-picker-react .EmojiPickerReact {
                                            border: 1px solid #e5e7eb;
                                            border-radius: 8px;
                                            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                                        }
                                        .emoji-picker-react .EmojiPickerReact .epr-header {
                                            display: none !important;
                                        }
                                        .emoji-picker-react .EmojiPickerReact .epr-body {
                                            padding: 2px !important;
                                            height: 184px !important;
                                            overflow-y: auto;
                                        }
                                        .emoji-picker-react .EmojiPickerReact .epr-emoji-category-label {
                                            display: none !important;
                                        }
                                        .emoji-picker-react .EmojiPickerReact .epr-emoji-list {
                                            display: grid !important;
                                            grid-template-columns: repeat(auto-fill, minmax(20px, 1fr)) !important;
                                            gap: 1px !important;
                                        }
                                        .emoji-picker-react .EmojiPickerReact .epr-emoji {
                                            font-size: 16px !important;
                                            padding: 1px !important;
                                            line-height: 18px !important;
                                        }
                                        .draggable-name:hover {
                                            cursor: move;
                                            opacity: 0.8;
                                        }
                                        .textarea-dropzone {
                                            transition: background-color 0.2s;
                                        }
                                        .textarea-dropzone.drag-over {
                                            background-color: #f0f0f0;
                                        }
                                    `}</style>

                                    {paginatedReviews.length > 0 ? (
                                        <div className="space-y-4">
                                            {paginatedReviews.map((review) => (
                                                <Card key={review.id} className="overflow-hidden">
                                                    <CardContent className="p-0">
                                                        <div className="p-6">
                                                            <div className="flex flex-col sm:flex-row gap-4 justify-between mb-4">
                                                                <div className="flex items-center gap-3">
                                                                    <Avatar className="h-12 w-12 border border-purple-100 dark:border-purple-800">
                                                                        <AvatarImage src={review.customerAvatar} alt={review.customerName} />
                                                                        <AvatarFallback className="bg-purple-50 text-purple-700 dark:bg-purple-900 dark:text-purple-200">
                                                                            {review.customerName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <div>
                                                                        <h3 className="font-medium">{review.customerName}</h3>
                                                                        <p className="text-sm text-muted-foreground">
                                                                            {review.customerEmail || 'No contact info'}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="flex flex-col items-end sm:items-end gap-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <RatingStars rating={review.rating} />
                                                                        <span className="text-sm font-medium">{review.rating.toFixed(1)}</span>

                                                                        <Badge
                                                                            variant="outline"
                                                                            className={`ml-2 ${review.sentiment === 'positive'
                                                                                ? 'text-green-600 dark:text-green-400 border-green-200 dark:border-green-800'
                                                                                : 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
                                                                                }`}
                                                                        >
                                                                            {review.sentiment === 'positive' ? (
                                                                                <div className="flex items-center">
                                                                                    <ThumbsUp className="mr-1 h-3 w-3" />
                                                                                    <span>Positive</span>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="flex items-center">
                                                                                    <ThumbsDown className="mr-1 h-3 w-3" />
                                                                                    <span>Negative</span>
                                                                                </div>
                                                                            )}
                                                                        </Badge>
                                                                    </div>
                                                                    <p className="text-sm text-muted-foreground flex items-center">
                                                                        <Calendar className="h-3 w-3 mr-1" />
                                                                        {formattedDates[review.id] || review.reviewDate}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="mb-4">
                                                                <p className="text-slate-700 dark:text-slate-300">{review.comment}</p>
                                                            </div>

                                                            <div className="mb-4 ml-6 pl-4 border-l-2 border-purple-200 dark:border-purple-800">
                                                                {editingReplyId === review.id ? (
                                                                    <div className="space-y-2">
                                                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                                            <Label htmlFor={`reply-${review.id}`} className="text-sm font-medium">
                                                                                Your reply
                                                                            </Label>
                                                                            <Badge
                                                                                variant="secondary"
                                                                                className="draggable-name px-2 py-1 text-xs cursor-move select-none"
                                                                                draggable
                                                                                onDragStart={(e) => handleDragStart(e, review.customerName)}
                                                                            >
                                                                                {review.customerName}
                                                                            </Badge>
                                                                            <ReviewReplyGenerator
                                                                                review={review}
                                                                                onReplyGenerated={(generatedReply) => handleReplyGenerated(review.id, generatedReply)}
                                                                                selectedLocation={selectedLocation}
                                                                                selectedAccount={selectedAccount}
                                                                            />
                                                                            <Button
                                                                                type="button"
                                                                                variant="outline"
                                                                                size="sm"
                                                                                className="h-7 px-2 gap-1 ml-auto"
                                                                                onClick={() => setShowEmojiPicker(showEmojiPicker === review.id ? null : review.id)}
                                                                            >
                                                                                <Smile className="h-3 w-3" />
                                                                                <span>Emojis</span>
                                                                            </Button>
                                                                        </div>
                                                                        <div className="relative">
                                                                            <Textarea
                                                                                id={`reply-${review.id}`}
                                                                                ref={textareaRef}
                                                                                value={replyText}
                                                                                onChange={(e) => setReplyText(e.target.value)}
                                                                                placeholder="Write your reply here or drag the name tag..."
                                                                                rows={3}
                                                                                className="w-full resize-none textarea-dropzone"
                                                                                onDragOver={handleDragOver}
                                                                                onDrop={(e) => handleDrop(e, review.id)}
                                                                            />
                                                                            {showEmojiPicker === review.id && (
                                                                                <div suppressHydrationWarning className="absolute bottom-[calc(100%+4px)] z-[1000]">
                                                                                    <Picker
                                                                                        onEmojiClick={(emojiData) => handleEmojiClick(emojiData, review.id)}
                                                                                        width={400}
                                                                                        height={184}
                                                                                        searchDisabled={true}
                                                                                        disableAutoFocus={true}
                                                                                        previewConfig={{ showPreview: false }}
                                                                                    />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex justify-end gap-2 mt-2">
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={cancelEditing}
                                                                            >
                                                                                Cancel
                                                                            </Button>
                                                                            <Button
                                                                                size="sm"
                                                                                onClick={() => handleReplySubmit(review)}
                                                                                disabled={!replyText.trim()}
                                                                            >
                                                                                <Send className="h-4 w-4 mr-2" />
                                                                                Send
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                ) : review.isReplied ? (
                                                                    <div>
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <Badge variant="secondary" className="text-xs">Reply</Badge>
                                                                            <span className="text-xs text-muted-foreground">
                                                                                {formattedReplyDates[review.id] || review.replyDate}
                                                                            </span>
                                                                            {review.isAiGenerated && (
                                                                                <Badge variant="outline" className="ml-auto text-xs flex items-center gap-1">
                                                                                    <Sparkles className="h-3 w-3" />
                                                                                    <span>AI Generated</span>
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-sm text-slate-600 dark:text-slate-400">{review.reply}</p>
                                                                        <div className="mt-2 flex justify-end">
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="h-7 text-xs"
                                                                                onClick={() => startEditing(review)}
                                                                            >
                                                                                Edit Reply
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex justify-between items-center py-2">
                                                                        <span className="text-sm text-muted-foreground">No reply yet</span>
                                                                        <div className="flex gap-2">
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                className="h-8"
                                                                                onClick={() => {
                                                                                    setEditingReplyId(review.id);
                                                                                    setReplyText('');
                                                                                }}
                                                                            >
                                                                                <Sparkles className="mr-1 h-4 w-4" />
                                                                                AI Reply
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="flex justify-end items-center mt-2">
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                                <Share2 className="h-4 w-4 text-muted-foreground" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p>Share review</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>

                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-8 w-8"
                                                                                onClick={() => {
                                                                                    setReviewToDelete(review);
                                                                                    setDeleteConfirmOpen(true);
                                                                                }}
                                                                            >
                                                                                <Trash2 className="h-4 w-4 text-red-500" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p>Delete review</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <div className="mb-4 text-muted-foreground">
                                                <MessageCircle className="inline-block h-12 w-12 opacity-20" />
                                            </div>
                                            <h3 className="text-lg font-medium mb-2">No reviews found</h3>
                                            <p className="text-muted-foreground">
                                                {searchTerm || sentiment !== "all" || answered !== "all" || startDate || endDate
                                                    ? "Try adjusting your filters to see more results."
                                                    : selectedLocation
                                                        ? "No reviews have been submitted for this location."
                                                        : "Please select a location to view reviews."}
                                            </p>
                                            {(searchTerm || sentiment !== "all" || answered !== "all" || startDate || endDate) && (
                                                <Button
                                                    variant="outline"
                                                    className="mt-4"
                                                    onClick={() => {
                                                        setSearchTerm("");
                                                        setSentiment("all");
                                                        setAnswered("all");
                                                        setStartDate(null);
                                                        setEndDate(null);
                                                    }}
                                                >
                                                    Clear all filters
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            {isConnected && filteredReviews.length > reviewsPerPage && (
                                <div className="px-4 lg:px-6 mt-4">
                                    <Pagination>
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious
                                                    href="#"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        if (currentPage > 1) setCurrentPage(currentPage - 1);
                                                    }}
                                                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                                                />
                                            </PaginationItem>

                                            {Array.from({ length: totalPages }).map((_, index) => {
                                                const pageNumber = index + 1;

                                                if (
                                                    pageNumber === 1 ||
                                                    pageNumber === totalPages ||
                                                    (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                                                ) {
                                                    return (
                                                        <PaginationItem key={pageNumber}>
                                                            <PaginationLink
                                                                href="#"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    setCurrentPage(pageNumber);
                                                                }}
                                                                isActive={pageNumber === currentPage}
                                                            >
                                                                {pageNumber}
                                                            </PaginationLink>
                                                        </PaginationItem>
                                                    );
                                                }

                                                if (
                                                    (pageNumber === 2 && currentPage > 3) ||
                                                    (pageNumber === totalPages - 1 && currentPage < totalPages - 2)
                                                ) {
                                                    return (
                                                        <PaginationItem key={pageNumber}>
                                                            <PaginationEllipsis />
                                                        </PaginationItem>
                                                    );
                                                }

                                                return null;
                                            })}

                                            <PaginationItem>
                                                <PaginationNext
                                                    href="#"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                                                    }}
                                                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                                                />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </SidebarInset>

            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Delete Review</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this review? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>

                    {reviewToDelete && (
                        <div className="py-2">
                            <div className="flex items-center gap-2 mb-2">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={reviewToDelete.customerAvatar} alt={reviewToDelete.customerName} />
                                    <AvatarFallback>
                                        {reviewToDelete.customerName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-medium">{reviewToDelete.customerName}</div>
                                    <div className="text-sm text-muted-foreground">
                                        {formattedDates[reviewToDelete.id] || reviewToDelete.reviewDate}
                                    </div>
                                </div>
                                <div className="ml-auto">
                                    <RatingStars rating={reviewToDelete.rating} />
                                </div>
                            </div>

                            <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3">
                                "{reviewToDelete.comment}"
                            </p>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteConfirmOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteConfirm}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </SidebarProvider>
    );
}