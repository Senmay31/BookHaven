import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/authStore";
import { BookFilters } from "@/types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// ─── REQUEST INTERCEPTOR ───
// Automatically attaches the access token to every request — like showing your
// library card at the door without thinking about it every time
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── RESPONSE INTERCEPTOR ───
// If the access token expires (401), automatically try to refresh it
// Like the security guard accepting your renewal card automatically
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (v: unknown) => void;
  reject: (e: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = useAuthStore.getState().refreshToken;

      if (!refreshToken) {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });
        const { accessToken, refreshToken: newRefreshToken } =
          response.data.data;

        useAuthStore.getState().setTokens(accessToken, newRefreshToken);
        processQueue(null, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ─── API HELPERS ───
export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  logout: (refreshToken: string) => api.post("/auth/logout", { refreshToken }),
  getMe: () => api.get("/auth/me"),
  updateProfile: (data: { name?: string; avatar_url?: string }) =>
    api.patch("/auth/profile", data),
};

export const booksApi = {
  getBooks: (params?: BookFilters) => api.get("/books", { params }),
  getBook: (id: string) => api.get(`/books/${id}`),
  getFeatured: () => api.get("/books/featured"),
  getCategories: () => api.get("/books/categories"),
  getReadUrl: (id: string) => api.get(`/books/${id}/read-url`),
  uploadBook: (formData: FormData) =>
    api.post("/books", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  updateBook: (id: string, data: Record<string, unknown>) =>
    api.patch(`/books/${id}`, data),
  deleteBook: (id: string) => api.delete(`/books/${id}`),
};

export const shelfApi = {
  getShelf: (status?: string) => api.get("/shelf", { params: { status } }),
  upsertShelf: (data: { book_id: string; status: string }) =>
    api.post("/shelf", data),
  removeFromShelf: (bookId: string) => api.delete(`/shelf/${bookId}`),
};

export const progressApi = {
  saveProgress: (data: {
    book_id: string;
    position: number;
    total_pages: number;
  }) => api.post("/progress", data),
  getProgress: (bookId: string) => api.get(`/progress/${bookId}`),
  getHistory: () => api.get("/progress/history"),
};

export const reviewsApi = {
  getReviews: (bookId: string, params?: { page?: number }) =>
    api.get(`/books/${bookId}/reviews`, { params }),
  upsertReview: (bookId: string, data: { rating: number; body?: string }) =>
    api.post(`/books/${bookId}/reviews`, data),
  deleteReview: (bookId: string) => api.delete(`/books/${bookId}/reviews`),
};

export const recommendationsApi = {
  get: () => api.get("/recommendations"),
};

export const adminApi = {
  getStats: () => api.get("/admin/stats"),
  getUsers: (params?: { page?: number; search?: string }) =>
    api.get("/admin/users", { params }),
  toggleUser: (userId: string) => api.patch(`/admin/users/${userId}/toggle`),
};
