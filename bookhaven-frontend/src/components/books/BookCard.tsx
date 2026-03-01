"use client";
import Image from "next/image";
import Link from "next/link";
import { Star, BookOpen, Globe } from "lucide-react";
import { Book } from "@/types";
import { clsx } from "clsx";

interface BookCardProps {
  book: Book;
  view?: "grid" | "list";
  showProgress?: boolean;
  progressPercentage?: number;
}

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={clsx(
          "w-3 h-3",
          star <= Math.round(rating)
            ? "text-parchment-500 fill-parchment-500"
            : "text-slate-300",
        )}
      />
    ))}
    <span className="text-xs text-slate-500 ml-1 font-sans">
      {Number(rating).toFixed(1)}
    </span>
  </div>
);

const BookCover = ({ book, className }: { book: Book; className?: string }) => (
  <div
    className={clsx(
      "relative bg-gradient-to-br from-teal-700 to-teal-900 overflow-hidden flex-shrink-0",
      className,
    )}
  >
    {book.cover_url ? (
      <Image
        src={book.cover_url}
        alt={book.title}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 50vw, 200px"
      />
    ) : (
      <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
        <BookOpen className="w-8 h-8 text-teal-200 mb-2 opacity-60" />
        <p className="text-teal-100 text-xs font-display leading-tight line-clamp-3">
          {book.title}
        </p>
        <p className="text-teal-300 text-xs mt-1 opacity-70">{book.author}</p>
      </div>
    )}
    {/* File type badge */}
    <span className="absolute top-2 right-2 bg-black/50 text-white text-[10px] font-sans font-medium px-1.5 py-0.5 rounded uppercase tracking-wide">
      {book.file_type}
    </span>
  </div>
);

export function BookCard({
  book,
  view = "grid",
  showProgress,
  progressPercentage,
}: BookCardProps) {
  if (view === "list") {
    return (
      <Link href={`/books/${book.id}`}>
        <div className="book-card flex gap-4 bg-white rounded-xl p-4 shadow-card border border-slate-100 hover:border-teal-200">
          <BookCover book={book} className="w-16 h-24 rounded-md" />
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-base font-semibold text-slate-900 line-clamp-1">
              {book.title}
            </h3>
            <p className="text-sm text-slate-500 font-sans mt-0.5">
              {book.author}
            </p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <StarRating rating={book.avg_rating} />
              <span className="text-xs text-slate-400 font-sans">
                {book.total_reviews} review{book.total_reviews !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-400 font-sans">
                <Globe className="w-3 h-3" /> {book.language}
              </span>
            </div>
            {book.categories?.length > 0 && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {book.categories?.slice(0, 3).map((cat) => (
                  <span
                    key={cat.id}
                    className="text-xs font-sans px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: cat.color }}
                  >
                    {cat.name}
                  </span>
                ))}
              </div>
            )}
            {showProgress &&
              progressPercentage !== undefined &&
              progressPercentage > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-slate-400 font-sans mb-1">
                    <span>Progress</span>
                    <span>{Math.round(progressPercentage)}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-600 rounded-full transition-all"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/books/${book.id}`}>
      <div className="book-card group relative bg-white rounded-xl overflow-hidden shadow-card border border-slate-100 hover:border-teal-200">
        <BookCover book={book} className="w-full aspect-[3/4]" />
        <div className="p-3">
          <h3 className="font-display text-sm font-semibold text-slate-900 line-clamp-2 leading-tight">
            {book.title}
          </h3>
          <p className="text-xs text-slate-500 font-sans mt-1 line-clamp-1">
            {book.author}
          </p>
          <div className="mt-2">
            <StarRating rating={book.avg_rating} />
          </div>
          {showProgress &&
            progressPercentage !== undefined &&
            progressPercentage > 0 && (
              <div className="mt-2">
                <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-600 rounded-full"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            )}
          {book.is_featured && (
            <span className="absolute top-2 left-2 bg-parchment-500 text-white text-[10px] font-sans font-medium px-2 py-0.5 rounded-full">
              Featured
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── SKELETON LOADER ──────────────────────────────────────────────────────────
export function BookCardSkeleton({
  view = "grid",
}: {
  view?: "grid" | "list";
}) {
  if (view === "list") {
    return (
      <div className="flex gap-4 bg-white rounded-xl p-4 border border-slate-100">
        <div className="skeleton w-16 h-24 rounded-md" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-3 w-1/2 rounded" />
          <div className="skeleton h-3 w-1/3 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl overflow-hidden border border-slate-100">
      <div className="skeleton aspect-[3/4] w-full" />
      <div className="p-3 space-y-2">
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-3 w-2/3 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
      </div>
    </div>
  );
}
