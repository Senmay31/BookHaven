// ─── USER ───
export interface User {
  id: string;
  name: string;
  email: string;
  role: "reader" | "admin" | "librarian";
  avatar_url: string | null;
  created_at: string;
  last_login: string | null;
}

// ─── BOOK ────
export interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
  book_count?: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  description?: string;
  isbn?: string;
  publisher?: string;
  published_year?: number;
  language: string;
  pages?: number;
  file_type: "pdf" | "epub" | "mobi";
  file_size?: number;
  cover_url: string | null;
  tags: string[];
  avg_rating: number;
  total_reviews: number;
  total_downloads: number;
  total_reads: number;
  is_featured: boolean;
  is_public: boolean;
  categories: Category[];
  created_at: string;
  updated_at: string;
}

// ─── SHELF ───
export type ShelfStatus = "reading" | "want_to_read" | "completed" | "dropped";

export interface ShelfItem {
  id: string;
  status: ShelfStatus;
  added_at: string;
  book_id: string;
  title: string;
  author: string;
  cover_url: string | null;
  file_type: string;
  avg_rating: number;
  language: string;
  pages: number;
  progress_percentage: number;
  progress_position: number;
}

// ─── READING PROGRESS ───
export interface ReadingProgress {
  id: string;
  user_id: string;
  book_id: string;
  position: number;
  total_pages: number;
  percentage: number;
  last_read_at: string;
}

// ─── REVIEW ───
export interface Review {
  id: string;
  rating: number;
  body?: string;
  created_at: string;
  user_id: string;
  user_name: string;
  avatar_url: string | null;
}

// ─── API RESPONSE ────
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: Pagination;
}

// ─── BOOK FILTERS ────
export interface BookFilters {
  search?: string;
  category?: string;
  language?: string;
  year_from?: number;
  year_to?: number;
  file_type?: "pdf" | "epub" | "mobi";
  sort?: string;
  order?: "ASC" | "DESC";
  page?: number;
  limit?: number;
}
