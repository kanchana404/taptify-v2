import fs from 'fs/promises';
import path from 'path';

// Path to the reviews.json file
const reviewsFilePath = path.join(process.cwd(), 'data', 'reviews.json');

// Interface for review data
export interface Review {
  id: string;
  customerName: string;
  customerEmail: string;
  customerAvatar: string;
  reviewDate: string;
  rating: number;
  sentiment: string;
  comment: string;
  callType: string;
  callId: string;
  isReplied: boolean;
  replyDate: string | null;
  reply: string;
  isAiGenerated: boolean;
}

// Read reviews from JSON file
export async function getReviews(): Promise<Review[]> {
  try {
    const data = await fs.readFile(reviewsFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading reviews file:', error);
    // If the file doesn't exist, create it with initial data
    await fs.mkdir(path.dirname(reviewsFilePath), { recursive: true });
    await fs.writeFile(reviewsFilePath, '[]', 'utf8');
    return [];
  }
}

// Write reviews to JSON file
export async function saveReviews(reviews: Review[]): Promise<boolean> {
  try {
    const dirPath = path.dirname(reviewsFilePath);
    await fs.mkdir(dirPath, { recursive: true });
    await fs.writeFile(reviewsFilePath, JSON.stringify(reviews, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving reviews file:', error);
    return false;
  }
}

// Get a single review by ID
export async function getReviewById(id: string): Promise<Review | null> {
  const reviews = await getReviews();
  const review = reviews.find(review => review.id === id);
  return review || null;
}

// Update a review
export async function updateReview(updatedReview: Review): Promise<boolean> {
  const reviews = await getReviews();
  const index = reviews.findIndex(review => review.id === updatedReview.id);
  
  if (index === -1) {
    return false;
  }
  
  reviews[index] = updatedReview;
  return await saveReviews(reviews);
}

// Delete a review
export async function deleteReview(id: string): Promise<boolean> {
  const reviews = await getReviews();
  const filteredReviews = reviews.filter(review => review.id !== id);
  
  if (filteredReviews.length === reviews.length) {
    return false;
  }
  
  return await saveReviews(filteredReviews);
}

// Create a new review
export async function createReview(review: Omit<Review, 'id'>): Promise<Review> {
  const reviews = await getReviews();
  const newId = `rev-${String(reviews.length + 1).padStart(3, '0')}`;
  
  const newReview: Review = {
    id: newId,
    ...review
  };
  
  reviews.push(newReview);
  await saveReviews(reviews);
  return newReview;
}