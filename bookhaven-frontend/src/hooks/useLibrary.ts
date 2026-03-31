import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  booksApi,
  shelfApi,
  progressApi,
  reviewsApi,
  recommendationsApi,
  adminApi,
} from "@/lib/api";
import { BookFilters } from "@/types";
import toast from "react-hot-toast";

// ─── BOOKS HOOKS ───

export const useBooks = (filters: BookFilters = {}) => {
  return useQuery({
    queryKey: ["books", filters],
    queryFn: () => booksApi.getBooks(filters).then((r) => r.data),
  });
};

export const useBook = (id: string) => {
  return useQuery({
    queryKey: ["book", id],
    queryFn: () => booksApi.getBook(id).then((r) => r.data.data),
    enabled: !!id,
  });
};

export const useFeaturedBooks = () => {
  return useQuery({
    queryKey: ["books", "featured"],
    queryFn: () => booksApi.getFeatured().then((r) => r.data.data),
    staleTime: 1000 * 60 * 10,
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => booksApi.getCategories().then((r) => r.data.data),
    staleTime: 1000 * 60 * 15,
  });
};

// export const useReadUrl = (bookId: string, enabled: boolean) => {
//   return useQuery({
//     queryKey: ["readUrl", bookId],
//     queryFn: () => booksApi.getReadUrl(bookId).then((r) => r.data.data),
//     enabled: enabled && !!bookId,
//     staleTime: 1000 * 55 * 55, // Slightly less than the signed URL's 1hr expiry
//   });
// };

export const useReadUrl = (bookId: string, enabled: boolean = false) => {
  return useQuery({
    queryKey: ["readUrl", bookId],
    queryFn: async () => {
      const res = await booksApi.getReadUrl(bookId);
      return res.data.data as { readUrl: string; fileType: string };
    },
    enabled: !!bookId && enabled,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });
};

// ─── SHELF HOOKS ───

export const useShelf = (status?: string) => {
  return useQuery({
    queryKey: ["shelf", status],
    queryFn: () => shelfApi.getShelf(status).then((r) => r.data.data),
  });
};

export const useShelfMutation = () => {
  const queryClient = useQueryClient();

  const add = useMutation({
    mutationFn: (data: { book_id: string; status: string }) =>
      shelfApi.upsertShelf(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shelf"] });
      toast.success("Bookshelf updated!");
    },
    onError: () => toast.error("Failed to update shelf."),
  });

  const remove = useMutation({
    mutationFn: (bookId: string) => shelfApi.removeFromShelf(bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shelf"] });
      toast.success("Removed from shelf.");
    },
    onError: () => toast.error("Failed to remove from shelf."),
  });

  return { add, remove };
};

// ─── PROGRESS HOOKS ───

export const useReadingProgress = (bookId: string) => {
  return useQuery({
    queryKey: ["progress", bookId],
    queryFn: () => progressApi.getProgress(bookId).then((r) => r.data.data),
    enabled: !!bookId,
  });
};

export const useReadingHistory = () => {
  return useQuery({
    queryKey: ["progress", "history"],
    queryFn: () => progressApi.getHistory().then((r) => r.data.data),
  });
};

export const useSaveProgress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      book_id: string;
      position?: number;
      total_pages?: number;
      progress_percentage?: number;
      last_read_at?: string;
    }) => progressApi.saveProgress(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["progress", variables.book_id],
      });
    },
  });
};

// ─── REVIEWS HOOKS ───

export const useReviews = (bookId: string, page = 1) => {
  return useQuery({
    queryKey: ["reviews", bookId, page],
    queryFn: () => reviewsApi.getReviews(bookId, { page }).then((r) => r.data),
    enabled: !!bookId,
  });
};

export const useReviewMutation = (bookId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { rating: number; body?: string }) =>
      reviewsApi.upsertReview(bookId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", bookId] });
      queryClient.invalidateQueries({ queryKey: ["book", bookId] });
      toast.success("Review saved!");
    },
    onError: () => toast.error("Failed to save review."),
  });
};

// ─── RECOMMENDATIONS HOOK ───

export const useRecommendations = () => {
  return useQuery({
    queryKey: ["recommendations"],
    queryFn: () => recommendationsApi.get().then((r) => r.data),
    staleTime: 1000 * 60 * 15,
  });
};

// ─── ADMIN HOOKS ───

export const useAdminStats = () => {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => adminApi.getStats().then((r) => r.data.data),
  });
};

export const useAdminUsers = (params?: { page?: number; search?: string }) => {
  return useQuery({
    queryKey: ["admin", "users", params],
    queryFn: () => adminApi.getUsers(params).then((r) => r.data.data),
  });
};
