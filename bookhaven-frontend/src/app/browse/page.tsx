'use client';
import { useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, LayoutGrid, List, Filter, X, ChevronDown } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { BookCard, BookCardSkeleton } from '@/components/books/BookCard';
import { useBooks, useCategories } from '@/hooks/useLibrary';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { BookFilters } from '@/types';

const LANGUAGES = ['English', 'French', 'Spanish', 'German', 'Arabic', 'Portuguese', 'Mandarin', 'Russian'];
const SORT_OPTIONS = [
  { value: 'created_at', label: 'Newest First' },
  { value: 'avg_rating', label: 'Highest Rated' },
  { value: 'total_downloads', label: 'Most Downloaded' },
  { value: 'title', label: 'Title A-Z' },
  { value: 'published_year', label: 'Publication Year' },
];

export default function BrowsePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState<BookFilters>({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    language: '',
    sort: 'created_at',
    order: 'DESC',
    page: 1,
    limit: 24,
  });

  const [searchInput, setSearchInput] = useState(filters.search || '');

  const { data, isLoading } = useBooks({ ...filters, page });
  const { data: categories } = useCategories();

  const updateFilter = (key: keyof BookFilters, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ search: '', category: '', language: '', sort: 'created_at', order: 'DESC', page: 1, limit: 24 });
    setSearchInput('');
    setPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter('search', searchInput);
  };

  const activeFilterCount = [filters.search, filters.category, filters.language].filter(Boolean).length;

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-slate-900">Browse Archive</h1>
        <p className="font-sans text-slate-500 mt-1">
          {data?.pagination?.total !== undefined
            ? `${data.pagination.total.toLocaleString()} books found`
            : 'Searching through the archive...'}
        </p>
      </div>

      {/* Search + controls bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search titles, authors, subjects..."
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white"
            />
          </div>
          <Button type="submit" size="md">Search</Button>
        </form>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={() => setShowFilters(!showFilters)}
            icon={<Filter className="w-4 h-4" />}
          >
            Filters {activeFilterCount > 0 && <span className="bg-teal-600 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center">{activeFilterCount}</span>}
          </Button>

          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setView('grid')}
              className={`p-2.5 transition-colors ${view === 'grid' ? 'bg-teal-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2.5 transition-colors ${view === 'list' ? 'bg-teal-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <select
            value={`${filters.sort}:${filters.order}`}
            onChange={(e) => {
              const [sort, order] = e.target.value.split(':');
              setFilters((p) => ({ ...p, sort, order: order as 'ASC' | 'DESC' }));
            }}
            className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-sans bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={`${opt.value}:DESC`}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-sans font-semibold text-slate-800">Filter Books</h3>
            <div className="flex gap-2">
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} icon={<X className="w-3 h-3" />}>
                  Clear all
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Category filter */}
            <div>
              <label className="block text-sm font-sans font-medium text-slate-700 mb-1.5">Category</label>
              <select
                value={filters.category}
                onChange={(e) => updateFilter('category', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm font-sans bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="">All categories</option>
                {categories?.map((cat:any) => (
                  <option key={cat.id} value={cat.slug}>{cat.name} ({cat.book_count})</option>
                ))}
              </select>
            </div>

            {/* Language filter */}
            <div>
              <label className="block text-sm font-sans font-medium text-slate-700 mb-1.5">Language</label>
              <select
                value={filters.language}
                onChange={(e) => updateFilter('language', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm font-sans bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="">All languages</option>
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>

            {/* File type */}
            <div>
              <label className="block text-sm font-sans font-medium text-slate-700 mb-1.5">Format</label>
              <select
                value={filters.file_type || ''}
                onChange={(e) => updateFilter('file_type', e.target.value || undefined)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm font-sans bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="">All formats</option>
                <option value="pdf">PDF</option>
                <option value="epub">EPUB</option>
                <option value="mobi">MOBI</option>
              </select>
            </div>

            {/* Year range */}
            <div>
              <label className="block text-sm font-sans font-medium text-slate-700 mb-1.5">Published From</label>
              <input
                type="number"
                placeholder="e.g. 1900"
                min="1000"
                max={new Date().getFullYear()}
                value={filters.year_from || ''}
                onChange={(e) => updateFilter('year_from', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm font-sans bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label className="block text-sm font-sans font-medium text-slate-700 mb-1.5">Published To</label>
              <input
                type="number"
                placeholder={`e.g. ${new Date().getFullYear()}`}
                min="1000"
                max={new Date().getFullYear()}
                value={filters.year_to || ''}
                onChange={(e) => updateFilter('year_to', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm font-sans bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filters.search && (
            <span className="flex items-center gap-1.5 bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-xs font-sans font-medium border border-teal-200">
              Search: "{filters.search}"
              <button onClick={() => { updateFilter('search', ''); setSearchInput(''); }}><X className="w-3 h-3" /></button>
            </span>
          )}
          {filters.category && (
            <span className="flex items-center gap-1.5 bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-xs font-sans font-medium border border-teal-200">
              Category: {filters.category}
              <button onClick={() => updateFilter('category', '')}><X className="w-3 h-3" /></button>
            </span>
          )}
          {filters.language && (
            <span className="flex items-center gap-1.5 bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-xs font-sans font-medium border border-teal-200">
              Language: {filters.language}
              <button onClick={() => updateFilter('language', '')}><X className="w-3 h-3" /></button>
            </span>
          )}
        </div>
      )}

      {/* Results grid */}
      {isLoading ? (
        <div className={view === 'grid'
          ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'
          : 'space-y-3'
        }>
          {Array(12).fill(0).map((_, i) => <BookCardSkeleton key={i} view={view} />)}
        </div>
      ) : data?.data?.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="font-display text-xl font-bold text-slate-900 mb-2">No books found</h3>
          <p className="font-sans text-slate-500 mb-4">Try adjusting your search or filters.</p>
          <Button variant="secondary" onClick={clearFilters}>Clear all filters</Button>
        </div>
      ) : (
        <>
          <div className={view === 'grid'
            ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'
            : 'space-y-3'
          }>
            {data?.data?.map((book:any) => (
              <BookCard key={book.id} book={book} view={view} />
            ))}
          </div>

          {/* Pagination */}
          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="font-sans text-sm text-slate-600 px-4">
                Page {page} of {data.pagination.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={!data.pagination.hasMore}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
