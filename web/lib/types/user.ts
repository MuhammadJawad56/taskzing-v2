/**
 * User/Profile types
 * Based on the users table schema
 */

export type UserRole = "client" | "provider" | "both";

export interface User {
  id: string;
  email: string;
  username?: string;
  fullName?: string;
  photoUrl?: string;
  uid: string;
  phoneNumber?: string;
  role?: UserRole;
  currentRole?: UserRole;
  location?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  photos?: string[];
  isVerified: boolean;
  totalRating: number;
  totalReviews: number;
  rate?: number; // Hourly rate for providers
  completedAt?: number; // Completed jobs count
  skills?: string[];
  isAvailableForWork?: boolean;
  isOnline?: boolean;
  lastSeen?: string;
  postingAs?: "individual" | "company" | "instore";
  companyName?: string;
  storeName?: string;
  createdAt: string;
  updatedAt: string;
  lastUsernameChangeDate?: string;
  pendingFullName?: string;
  pendingFullNameRequestedAt?: string;
}

export interface UserProfile extends User {
  portfolio?: PortfolioItem[];
  reviews?: Review[];
}

export interface PortfolioItem {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  url?: string;
  category?: string;
}

export interface Review {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerPhoto?: string;
  rating: number;
  comment: string;
  jobId?: string;
  createdAt: string;
}

