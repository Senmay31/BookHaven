"use client";
import { useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
  BookOpen,
  Star,
  Download,
  Bookmark,
  BookmarkCheck,
  Globe,
  Calendar,
  Hash,
  FileText,
  User,
  ChevronLeft,
  AlertCircle,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PublicLayout from "@/components/layout/DashboardLayout";
import {
  useBook,
  useReadUrl,
  useShelfMutation,
  useReviews,
  useReviewMutation,
} from "@/hooks/useLibrary";
import { useAuthStore } from "@/store/authStore";
import Button from "@/components/ui/Button";
import { format } from "date-fns";
import dynamic from "next/dynamic";

const BookReader = dynamic(() => import("@/components/reader/BookReader"), {
  ssr: false,
});
const StarSelector = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        onClick={() => onChange(star)}
        className="p-0.5 focus:outline-none"
      >
        <Star
          className={`w-6 h-6 transition-colors ${star <= value ? "text-parchment-500 fill-parchment-500" : "text-slate-300 hover:text-parchment-400"}`}
        />
      </button>
    ))}
  </div>
);

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [showReader, setShowReader] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewBody, setReviewBody] = useState("");
  const [reviewPage] = useState(1);

  const { data: book, isLoading } = useBook(id);
  const { data: readUrlData } = useReadUrl(id, showReader);
  const { data: reviews } = useReviews(id, reviewPage);
  const { add: addToShelf } = useShelfMutation();
  const reviewMutation = useReviewMutation(id);

  const handleShelfAdd = (status: string) => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    addToShelf.mutate({ book_id: id, status });
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewRating === 0) return;
    reviewMutation.mutate({ rating: reviewRating, body: reviewBody });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-4">
          <div className="skeleton h-8 w-1/3 rounded" />
          <div className="flex gap-8">
            <div className="skeleton w-48 h-72 rounded-xl" />
            <div className="flex-1 space-y-3">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    className="skeleton h-4 rounded"
                    style={{ width: `${80 - i * 10}%` }}
                  />
                ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!book) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h2 className="font-display text-2xl font-bold text-slate-900 mb-2">
            Book Not Found
          </h2>
          <Button variant="secondary" onClick={() => router.back()}>
            Go back
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <PublicLayout>
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm font-sans text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Library
      </button>

      {/* Main book info */}
      <div className="flex flex-col lg:flex-row gap-8 mb-10">
        {/* Cover */}
        <div className="flex-shrink-0">
          <div className="w-48 h-72 relative rounded-xl overflow-hidden shadow-book bg-gradient-to-br from-teal-700 to-teal-900">
            {book.cover_url ? (
              <Image
                src={book.cover_url}
                alt={book.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                <BookOpen className="w-10 h-10 text-teal-200 mb-3" />
                <p className="text-teal-100 text-sm font-display leading-tight">
                  {book.title}
                </p>
              </div>
            )}
          </div>
          <div className="mt-4 space-y-2">
            <Button
              fullWidth
              size="lg"
              onClick={() => {
                if (!isAuthenticated) {
                  router.push(`/auth/login?redirect=/books/${id}`);
                  return;
                }
                setShowReader(true);
              }}
              icon={<BookOpen className="w-4 h-4" />}
            >
              {isAuthenticated ? "Read Now" : "Sign In to Read"}
            </Button>
            <Button
              fullWidth
              variant="secondary"
              size="md"
              onClick={() => handleShelfAdd("want_to_read")}
              icon={<Bookmark className="w-4 h-4" />}
            >
              Add to Shelf
            </Button>
          </div>
        </div>

        {/* Details */}
        <div className="flex-1">
          {/* Categories */}
          {book.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {book.categories.map((cat: any) => (
                <span
                  key={cat.id}
                  className="text-xs font-sans px-2.5 py-1 rounded-full text-white font-medium"
                  style={{ backgroundColor: cat.color }}
                >
                  {cat.name}
                </span>
              ))}
            </div>
          )}

          <h1 className="font-display text-3xl lg:text-4xl font-bold text-slate-900 mb-2 leading-tight">
            {book.title}
          </h1>
          <p className="font-sans text-lg text-slate-600 mb-4 flex items-center gap-2">
            <User className="w-4 h-4" /> {book.author}
          </p>

          {/* Rating */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${star <= Math.round(book.avg_rating) ? "text-parchment-500 fill-parchment-500" : "text-slate-300"}`}
                />
              ))}
            </div>
            <span className="font-sans font-medium text-slate-800">
              {Number(book.avg_rating).toFixed(1)}
            </span>
            <span className="font-sans text-slate-400 text-sm">
              ({book.total_reviews} reviews)
            </span>
          </div>

          {/* Metadata grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-parchment-50 rounded-xl p-4 mb-6">
            {[
              { icon: Globe, label: "Language", value: book.language },
              {
                icon: Calendar,
                label: "Published",
                value: book.published_year || "Unknown",
              },
              {
                icon: FileText,
                label: "Format",
                value: book.file_type?.toUpperCase(),
              },
              { icon: Hash, label: "Pages", value: book.pages || "N/A" },
              {
                icon: BookOpen,
                label: "Total Reads",
                value: book.total_reads?.toLocaleString() || 0,
              },
              {
                icon: Download,
                label: "Downloads",
                value: book.total_downloads?.toLocaleString() || 0,
              },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label}>
                <p className="font-sans text-xs text-slate-400 mb-0.5 flex items-center gap-1">
                  <Icon className="w-3 h-3" /> {label}
                </p>
                <p className="font-sans font-medium text-slate-800 text-sm">
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Description */}
          {book.description && (
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900 mb-2">
                About this book
              </h3>
              <p className="font-body text-slate-600 leading-relaxed">
                {book.description}
              </p>
            </div>
          )}

          {/* Tags */}
          {book.tags?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {book.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="bg-slate-100 text-slate-600 text-xs font-sans px-2.5 py-1 rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Inline reader */}
      {showReader && (
        <BookReader book={book} onClose={() => setShowReader(false)} />
      )}
      {showReader && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-xl font-bold text-slate-900">
              Reading: {book.title}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReader(false)}
            >
              Close reader
            </Button>
          </div>
          {/* Loading state */}
          {!readUrlData && (
            <div className="h-48 flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200">
              <div className="animate-spin w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full" />
            </div>
          )}

          {/* PDF — embed directly in page */}
          {readUrlData?.readUrl && readUrlData?.fileType === "pdf" && (
            <iframe
              src={readUrlData.readUrl}
              className="w-full h-[80vh] rounded-xl border border-slate-200 shadow-card"
              title={book.title}
            />
          )}

          {/* EPUB or Google Books — open in new tab */}
          {readUrlData?.readUrl && readUrlData?.fileType !== "pdf" && (
            <div className="text-center p-8 bg-parchment-50 rounded-xl border border-parchment-200">
              <BookOpen className="w-10 h-10 text-teal-600 mx-auto mb-3" />
              <p className="font-sans text-slate-600 mb-4">
                This book opens in a new tab for the best reading experience.
              </p>
              <a
                href={readUrlData.readUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-teal-600 hover:bg-teal-700 text-white font-sans font-semibold py-2.5 px-8 rounded-lg transition-colors"
              >
                📖 Open Book
              </a>
            </div>
          )}

          {/* {readUrlData?.url ? (
            <iframe
              src={readUrlData.url}
              className="w-full h-[80vh] rounded-xl border border-slate-200 shadow-card"
              title={book.title}
            />
          ) : (
            <div className="h-48 flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200">
              <div className="animate-spin w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full" />
            </div>
          )} */}
        </div>
      )}

      {/* Reviews section */}
      <div className="border-t border-slate-100 pt-8">
        <h3 className="font-display text-2xl font-bold text-slate-900 mb-6">
          Reader Reviews
        </h3>

        {/* Write review */}
        {isAuthenticated && (
          <form
            onSubmit={handleReviewSubmit}
            className="bg-parchment-50 rounded-xl p-5 mb-6 border border-parchment-200"
          >
            <h4 className="font-sans font-semibold text-slate-800 mb-3">
              Write a review
            </h4>
            <StarSelector value={reviewRating} onChange={setReviewRating} />
            <textarea
              value={reviewBody}
              onChange={(e) => setReviewBody(e.target.value)}
              placeholder="Share your thoughts about this book..."
              rows={3}
              className="w-full mt-3 px-3 py-2.5 rounded-lg border border-slate-300 text-sm font-sans resize-none focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white"
            />
            <Button
              type="submit"
              loading={reviewMutation.isPending}
              disabled={reviewRating === 0}
              className="mt-3"
              size="sm"
            >
              Submit Review
            </Button>
          </form>
        )}

        {/* Reviews list */}
        <div className="space-y-4">
          {reviews?.data?.map((review: any) => (
            <div
              key={review.id}
              className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-sans font-semibold text-sm">
                    {review.user_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-sans font-medium text-slate-900 text-sm">
                      {review.user_name}
                    </p>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3 h-3 ${s <= review.rating ? "text-parchment-500 fill-parchment-500" : "text-slate-300"}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <span className="font-sans text-xs text-slate-400">
                  {format(new Date(review.created_at), "MMM d, yyyy")}
                </span>
              </div>
              {review.body && (
                <p className="font-body text-slate-600 text-sm leading-relaxed">
                  {review.body}
                </p>
              )}
            </div>
          ))}

          {reviews?.data?.length === 0 && (
            <p className="text-center font-sans text-slate-400 py-8">
              No reviews yet. Be the first to share your thoughts!
            </p>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
