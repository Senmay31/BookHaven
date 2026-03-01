'use client';
import { useState, useRef } from 'react';
import { Users, BookOpen, Star, TrendingUp, Upload, Search, ToggleLeft, ToggleRight } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAdminStats, useAdminUsers } from '@/hooks/useLibrary';
import { booksApi, adminApi } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-card border border-slate-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-sans text-sm text-slate-500">{label}</p>
          <p className="font-display text-3xl font-bold text-slate-900 mt-1">{value?.toLocaleString()}</p>
          {sub && <p className="font-sans text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'books' | 'users'>('overview');
  const [userSearch, setUserSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const bookFileRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const [bookForm, setBookForm] = useState({
    title: '', author: '', description: '', language: 'English',
    published_year: '', pages: '', isbn: '', publisher: '',
  });

  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: users } = useAdminUsers({ search: userSearch });

  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'librarian') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const bookFile = bookFileRef.current?.files?.[0];
    if (!bookFile || !bookForm.title || !bookForm.author) {
      toast.error('Title, author, and book file are required.');
      return;
    }

    const fd = new FormData();
    Object.entries(bookForm).forEach(([k, v]) => { if (v) fd.append(k, v); });
    fd.append('book', bookFile);
    if (coverFileRef.current?.files?.[0]) {
      fd.append('cover', coverFileRef.current.files[0]);
    }

    setUploading(true);
    try {
      await booksApi.uploadBook(fd);
      toast.success('Book uploaded successfully!');
      queryClient.invalidateQueries({ queryKey: ['books'] });
      setBookForm({ title: '', author: '', description: '', language: 'English', published_year: '', pages: '', isbn: '', publisher: '' });
      if (bookFileRef.current) bookFileRef.current.value = '';
      if (coverFileRef.current) coverFileRef.current.value = '';
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const toggleUser = async (userId: string) => {
    try {
      await adminApi.toggleUser(userId);
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User status updated.');
    } catch {
      toast.error('Failed to update user.');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'books', label: 'Upload Book' },
    { id: 'users', label: 'Users' },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-slate-900">Admin Panel</h1>
        <p className="font-sans text-slate-500 mt-1">Manage the library and its members</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-2 rounded-lg text-sm font-sans font-medium transition-all ${
              activeTab === tab.id ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ─── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {statsLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array(4).fill(0).map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
            </div>
          ) : stats && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Total Users" value={stats.users.total} sub={`+${stats.users.new_this_month} this month`} color="bg-teal-600" />
                <StatCard icon={BookOpen} label="Total Books" value={stats.books.total} sub={`+${stats.books.new_this_month} this month`} color="bg-parchment-500" />
                <StatCard icon={Star} label="Total Reviews" value={stats.reviews} color="bg-amber-500" />
                <StatCard icon={TrendingUp} label="Total Reads" value={stats.total_reads} color="bg-green-600" />
              </div>

              {stats.popular_books?.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-card overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="font-sans font-semibold text-slate-900">Most Read Books</h3>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {stats.popular_books.map((book: any, i: number) => (
                      <div key={book.id} className="flex items-center gap-4 px-5 py-3">
                        <span className="font-display text-2xl font-bold text-slate-200 w-6 text-center">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-sans font-medium text-slate-900 truncate">{book.title}</p>
                          <p className="font-sans text-xs text-slate-400">{book.author}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-sans font-semibold text-slate-800 text-sm">{book.total_reads?.toLocaleString()} reads</p>
                          <p className="font-sans text-xs text-parchment-500">★ {Number(book.avg_rating).toFixed(1)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── UPLOAD BOOK ─── */}
      {activeTab === 'books' && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-xl border border-slate-100 shadow-card p-6">
            <h3 className="font-display text-xl font-bold text-slate-900 mb-5 flex items-center gap-2">
              <Upload className="w-5 h-5 text-teal-600" /> Upload New Book
            </h3>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Title *"
                  placeholder="Book title"
                  value={bookForm.title}
                  onChange={(e) => setBookForm((p) => ({ ...p, title: e.target.value }))}
                />
                <Input
                  label="Author *"
                  placeholder="Author name"
                  value={bookForm.author}
                  onChange={(e) => setBookForm((p) => ({ ...p, author: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-sans font-medium text-slate-700 mb-1.5">Description</label>
                <textarea
                  rows={3}
                  placeholder="Brief description of the book..."
                  value={bookForm.description}
                  onChange={(e) => setBookForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm font-sans resize-none focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="ISBN"
                  placeholder="978-0-xxx-xxx"
                  value={bookForm.isbn}
                  onChange={(e) => setBookForm((p) => ({ ...p, isbn: e.target.value }))}
                />
                <Input
                  label="Publisher"
                  placeholder="Publisher name"
                  value={bookForm.publisher}
                  onChange={(e) => setBookForm((p) => ({ ...p, publisher: e.target.value }))}
                />
                <Input
                  label="Publication Year"
                  type="number"
                  placeholder="e.g. 2024"
                  value={bookForm.published_year}
                  onChange={(e) => setBookForm((p) => ({ ...p, published_year: e.target.value }))}
                />
                <Input
                  label="Pages"
                  type="number"
                  placeholder="e.g. 320"
                  value={bookForm.pages}
                  onChange={(e) => setBookForm((p) => ({ ...p, pages: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-sans font-medium text-slate-700 mb-1.5">Book File * (PDF, EPUB, MOBI)</label>
                <input
                  ref={bookFileRef}
                  type="file"
                  accept=".pdf,.epub,.mobi"
                  required
                  className="w-full text-sm font-sans text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-teal-50 file:text-teal-700 file:font-medium file:cursor-pointer hover:file:bg-teal-100 border border-slate-300 rounded-lg p-1"
                />
              </div>

              <div>
                <label className="block text-sm font-sans font-medium text-slate-700 mb-1.5">Cover Image (JPG, PNG, WebP)</label>
                <input
                  ref={coverFileRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  className="w-full text-sm font-sans text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-50 file:text-slate-700 file:font-medium file:cursor-pointer hover:file:bg-slate-100 border border-slate-300 rounded-lg p-1"
                />
              </div>

              <Button type="submit" loading={uploading} icon={<Upload className="w-4 h-4" />} size="lg">
                Upload to Book Haven Archive
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* ── USERS ─── */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="max-w-md">
            <Input
              placeholder="Search by name or email..."
              leftIcon={<Search className="w-4 h-4" />}
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-card overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['User', 'Role', 'Joined', 'Last Login', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-sans text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users?.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-semibold text-sm flex-shrink-0">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-sans text-sm font-medium text-slate-900">{u.name}</p>
                          <p className="font-sans text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-sans font-medium px-2 py-0.5 rounded-full capitalize ${
                        u.role === 'admin' ? 'bg-red-50 text-red-700' :
                        u.role === 'librarian' ? 'bg-teal-50 text-teal-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-sans text-xs text-slate-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-sans text-xs text-slate-500">
                      {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-sans font-medium px-2 py-0.5 rounded-full ${u.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.id !== user?.id && (
                        <button
                          onClick={() => toggleUser(u.id)}
                          className="text-xs font-sans text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
                        >
                          {u.is_active ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
