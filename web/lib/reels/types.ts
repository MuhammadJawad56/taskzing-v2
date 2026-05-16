/** Matches Flutter `ReelsFeedMode.apiValue`. */
export type ReelsFeedModeApi = "for_you" | "following";

export interface ReelAuthor {
  id: string;
  username: string;
  avatarUrl?: string | null;
}

export interface Reel {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
  caption: string;
  location?: string | null;
  author: ReelAuthor;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked: boolean;
}

export interface ReelComment {
  id: string;
  reelId: string;
  text: string;
  user: ReelAuthor;
  createdAt: string;
}

export interface ReelFeedPage {
  items: Reel[];
  page: number;
  hasMore: boolean;
  followedCount?: number | null;
}
