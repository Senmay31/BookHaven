"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bookmark, BookOpen, CheckCircle, XCircle, Inbox } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { BookCard, BookCardSkeleton } from "@/components/books/BookCard";
import { useShelf, useShelfMutation } from "@/hooks/useLibrary";
import { ShelfItem, ShelfStatus } from "@/types";

const TABS: {
  status: ShelfStatus | "all";
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  {
    status: "all",
    label: "All Books",
    icon: Bookmark,
    color: "text-slate-600",
  },
  {
    status: "reading",
    label: "Reading",
    icon: BookOpen,
    color: "text-teal-600",
  },
  {
    status: "want_to_read",
    label: "Want to Read",
    icon: Inbox,
    color: "text-parchment-600",
  },
  {
    status: "completed",
    label: "Completed",
    icon: CheckCircle,
    color: "text-green-600",
  },
  {
    status: "dropped",
    label: "Dropped",
    icon: XCircle,
    color: "text-slate-400",
  },
];

function ShelfContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") as ShelfStatus | null;
  const [activeTab, setActiveTab] = useState<ShelfStatus | "all">(
    initialStatus || "all",
  );

  const { data: allBooks, isLoading } = useShelf();
  const { remove } = useShelfMutation();

  const filtered =
    activeTab === "all"
      ? allBooks
      : allBooks?.filter((b: ShelfItem) => b.status === activeTab);

  const getCounts = () => {
    const counts: Record<string, number> = {};
    allBooks?.forEach((b: ShelfItem) => {
      counts[b.status] = (counts[b.status] || 0) + 1;
    });
    return counts;
  };
  const counts = getCounts();

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-slate-900">
          My Bookshelf
        </h1>
        <p className="font-sans text-slate-500 mt-1">
          {allBooks?.length || 0} book{allBooks?.length !== 1 ? "s" : ""} in
          your library
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 overflow-x-auto">
        {TABS.map(({ status, label, icon: Icon, color }) => (
          <button
            key={status}
            onClick={() => setActiveTab(status)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-sans font-medium whitespace-nowrap transition-all ${
              activeTab === status
                ? "bg-white shadow-sm text-slate-900"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon className={`w-4 h-4 ${activeTab === status ? color : ""}`} />
            {label}
            {status !== "all" && counts[status] !== undefined && (
              <span
                className={`text-xs font-medium rounded-full px-1.5 py-0.5 ${activeTab === status ? "bg-slate-100 text-slate-600" : "bg-slate-200 text-slate-400"}`}
              >
                {counts[status]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Books grid */}
      {isLoading ? (
        <div className="space-y-3">
          {Array(5)
            .fill(0)
            .map((_, i) => (
              <BookCardSkeleton key={i} view="list" />
            ))}
        </div>
      ) : filtered?.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bookmark className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="font-display text-xl font-bold text-slate-900 mb-2">
            {activeTab === "all"
              ? "Your shelf is empty"
              : `No books ${activeTab === "want_to_read" ? "on your want list" : `marked as ${activeTab}`}`}
          </h3>
          <p className="font-sans text-slate-500">
            <a href="/browse" className="text-teal-600 hover:underline">
              Browse the archive
            </a>{" "}
            to add books to your shelf.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered?.map((item: ShelfItem) => (
            <div key={item.id} className="relative group">
              <BookCard
                book={
                  {
                    id: item.book_id,
                    title: item.title,
                    author: item.author,
                    cover_url: item.cover_url,
                    file_type: item.file_type as any,
                    avg_rating: item.avg_rating,
                    language: item.language,
                    categories: [],
                    tags: [],
                  } as any
                }
                view="list"
                showProgress={item.status === "reading"}
                progressPercentage={item.progress_percentage}
              />
              {/* Status badge + remove button */}
              <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span
                  className={`text-xs font-sans px-2 py-0.5 rounded-full font-medium
                  ${
                    item.status === "reading"
                      ? "bg-teal-100 text-teal-700"
                      : item.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : item.status === "dropped"
                          ? "bg-slate-100 text-slate-500"
                          : "bg-parchment-100 text-parchment-700"
                  }`}
                >
                  {item.status.replace("_", " ")}
                </span>
                <button
                  onClick={() => remove.mutate(item.book_id)}
                  className="text-xs font-sans text-red-500 hover:text-red-700 bg-white border border-red-200 px-2 py-0.5 rounded-full"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

export default function ShelfPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full" />
        </div>
      }
    >
      <ShelfContent />
    </Suspense>
  );
}
