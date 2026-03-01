'use client';
import Link from 'next/link';
import { ChevronRight, Sparkles, Clock, Bookmark } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { BookCard, BookCardSkeleton } from '@/components/books/BookCard';
import { useAuthStore } from '@/store/authStore';
import { useReadingHistory, useRecommendations, useFeaturedBooks } from '@/hooks/useLibrary';

function SectionHeader({ title, subtitle, href, icon: Icon }: {
  title: string; subtitle?: string; href?: string; icon?: React.ElementType;
}) {
  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          {Icon && <Icon className="w-4 h-4 text-teal-600" />}
          <h2 className="font-display text-2xl font-bold text-slate-900">{title}</h2>
        </div>
        {subtitle && <p className="font-sans text-sm text-slate-500">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="font-sans text-sm text-teal-600 hover:underline flex items-center gap-1">
          View all <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: history, isLoading: historyLoading } = useReadingHistory();
  const { data: recommendations, isLoading: recsLoading } = useRecommendations();
  const { data: featured, isLoading: featuredLoading } = useFeaturedBooks();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <DashboardLayout>
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-slate-900">
          {greeting}, {user?.name?.split(' ')[0]}. 👋
        </h1>
        <p className="font-sans text-slate-500 mt-1">Ready to pick up where you left off?</p>
      </div>

      {/* Continue Reading */}
      {(historyLoading || (history && history.length > 0)) && (
        <section className="mb-10">
          <SectionHeader
            title="Continue Reading"
            subtitle="Your active reads"
            href="/history"
            icon={Clock}
          />
          <div className="space-y-3">
            {historyLoading
              ? Array(3).fill(0).map((_, i) => <BookCardSkeleton key={i} view="list" />)
              : history?.slice(0, 4).map((item:any) => (
                  <BookCard
                    key={item.book_id}
                    book={{ id: item.book_id, title: item.title, author: item.author, cover_url: item.cover_url, file_type: item.file_type } as any}
                    view="list"
                    showProgress
                    progressPercentage={item.percentage}
                  />
                ))
            }
          </div>
        </section>
      )}

      {/* Recommendations */}
      <section className="mb-10">
        <SectionHeader
          title={recommendations?.personalized ? 'Recommended For You' : 'Popular in the Archive'}
          subtitle={recommendations?.personalized ? 'Based on your reading history' : 'Top books our readers love'}
          href="/browse"
          icon={Sparkles}
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {recsLoading
            ? Array(6).fill(0).map((_, i) => <BookCardSkeleton key={i} />)
            : recommendations?.data?.slice(0, 6).map((book: any) => (
                <BookCard key={book.id} book={book} view="grid" />
              ))
          }
        </div>
      </section>

      {/* Quick access shelf summary */}
      <section className="mb-10">
        <SectionHeader title="My Bookshelf" href="/shelf" icon={Bookmark} />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { status: 'reading', label: 'Currently Reading', color: 'bg-teal-50 border-teal-200 text-teal-700' },
            { status: 'want_to_read', label: 'Want to Read', color: 'bg-parchment-50 border-parchment-200 text-parchment-700' },
            { status: 'completed', label: 'Completed', color: 'bg-green-50 border-green-200 text-green-700' },
          ].map(({ status, label, color }) => (
            <Link
              key={status}
              href={`/shelf?status=${status}`}
              className={`rounded-xl border p-5 font-sans text-sm font-medium transition-all hover:shadow-card ${color}`}
            >
              {label} →
            </Link>
          ))}
        </div>
      </section>

      {/* Featured section */}
      {featured && featured.length > 0 && (
        <section>
          <SectionHeader title="Featured Works" subtitle="Curator's picks" href="/browse?featured=true" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {featuredLoading
              ? Array(4).fill(0).map((_, i) => <BookCardSkeleton key={i} />)
              : featured.slice(0, 4).map((book:any) => (
                  <BookCard key={book.id} book={book} view="grid" />
                ))
            }
          </div>
        </section>
      )}
    </DashboardLayout>
  );
}
