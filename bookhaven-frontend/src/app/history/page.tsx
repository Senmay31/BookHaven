'use client';
import Link from 'next/link';
import { History, BookOpen, ExternalLink } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useReadingHistory } from '@/hooks/useLibrary';
import { BookCard, BookCardSkeleton } from '@/components/books/BookCard';
import { formatDistanceToNow } from 'date-fns';

export default function HistoryPage() {
  const { data: history, isLoading } = useReadingHistory();

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-slate-900 flex items-center gap-3">
          <History className="w-7 h-7 text-teal-600" />
          Reading History
        </h1>
        <p className="font-sans text-slate-500 mt-1">
          Pick up where you left off
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array(6).fill(0).map((_, i) => <BookCardSkeleton key={i} view="list" />)}
        </div>
      ) : history?.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="font-display text-xl font-bold text-slate-900 mb-2">No reading history yet</h3>
          <p className="font-sans text-slate-500 mb-4">
            Start reading a book to track your progress here.
          </p>
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg font-sans text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            Browse Archive <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {history?.map((item: any) => (
            <div key={item.book_id} className="relative">
              <BookCard
                book={{
                  id: item.book_id,
                  title: item.title,
                  author: item.author,
                  cover_url: item.cover_url,
                  file_type: item.file_type,
                  avg_rating: 0,
                  language: 'English',
                  categories: [],
                  tags: [],
                } as any}
                view="list"
                showProgress
                progressPercentage={item.percentage}
              />
              <div className="absolute bottom-3 right-4 font-sans text-xs text-slate-400">
                Last read {formatDistanceToNow(new Date(item.last_read_at), { addSuffix: true })}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
