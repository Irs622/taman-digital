export interface Comment {
  id: string;
  authorUsername: string;
  content: string;
  date: string; // ISO string
}

export interface Post {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  date: string; // ISO string
  readTime: string;
  tags: string[];
  likes: number;
  shares: number;
  authorUsername: string;
  comments: Comment[];
  status?: 'draft' | 'published';
  lastEdited?: string;
  
  // Data Safety & Trash System
  isDeleted?: boolean; // Soft delete flag
  deletedAt?: string; // For auto-cleanup (e.g., 30 days)
  schemaVersion?: number; // For future-proofing data structure
}

export interface User {
  username: string;
  password: string; // In real app, this should be hashed
  name: string;
  bio?: string;
  profilePicture?: string; // Base64 string or URL
  followers: string[]; // List of usernames
  following: string[]; // List of usernames
  
  // New Profile Fields
  email?: string;
  penName?: string;
  writingThemes?: string[]; // e.g. ["Fiksi", "Esai"]
  writingStyle?: string; // e.g. "Deskriptif", "Analitis"
  featuredPostIds?: string[]; // IDs of posts to highlight
  
  // Privacy Settings
  isPublic?: boolean;
  showBio?: boolean;
  showStats?: boolean;
  
  // Preferences
  preferredTheme?: Theme;
  
  // Logic Only
  hasOnboarded?: boolean;
}

export interface Message {
  id: string;
  senderUsername: string;
  receiverUsername: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
}