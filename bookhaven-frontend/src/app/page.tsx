"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Search,
  BookOpen,
  ChevronRight,
  Star,
  Globe,
  Library,
  Layers,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useFeaturedBooks, useCategories } from "@/hooks/useLibrary";
import { BookCard } from "@/components/books/BookCard";
import Button from "@/components/ui/Button";

const STATS = [
  { value: "5,000+", label: "Books in Archive", icon: BookOpen },
  { value: "100+", label: "Languages", icon: Globe },
  { value: "50+", label: "Categories", icon: Layers },
  { value: "1,000+", label: "Active Readers", icon: Users },
];

export default function LandingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { data: featured } = useFeaturedBooks();
  const { data: categories } = useCategories();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/browse?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-parchment-50">
      {/* ── Navbar ── */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100" : "bg-transparent"}`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4.5 h-4.5 text-white" />
            </div>
            <span
              className={`font-display text-lg font-bold ${scrolled ? "text-slate-900" : "text-white"}`}
            >
              The Book Haven
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/browse"
              className={`font-sans text-sm font-medium transition-colors ${scrolled ? "text-slate-600 hover:text-teal-600" : "text-white/80 hover:text-white"}`}
            >
              Browse
            </Link>
            <Link
              href="/browse?sort=avg_rating"
              className={`font-sans text-sm font-medium transition-colors ${scrolled ? "text-slate-600 hover:text-teal-600" : "text-white/80 hover:text-white"}`}
            >
              Top Rated
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Button
                onClick={() => router.push("/dashboard")}
                variant="primary"
                size="sm"
              >
                My Library
              </Button>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant={scrolled ? "ghost" : "outline"} size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button variant="primary" size="sm">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-hero-gradient">
        {/* Decorative background elements */}
        <div className="absolute inset-0 opacity-10">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute text-white/30 font-display text-6xl font-bold select-none pointer-events-none"
              style={{
                left: `${(i * 17.3) % 95}%`,
                top: `${(i * 23.7) % 85}%`,
                opacity: 0.03 + (i % 4) * 0.01,
                transform: `rotate(${((i * 13) % 40) - 20}deg)`,
              }}
            >
              ✦ <Star className="w-4 h-4" />
            </div>
          ))}
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-32 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-parchment-300 text-sm font-sans px-4 py-2 rounded-full border border-white/20 mb-8 backdrop-blur-sm animate-fade-in">
            <Library className="w-3.5 h-3.5" />
            <span>5,000+ books and growing</span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-bold text-white mb-6 leading-tight animate-slide-up">
            Explore Knowledge,
            <br />
            <span className="text-parchment-400">Preserved Forever</span>
          </h1>

          <p className="font-body text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in">
            A renowned digital library where every book, manuscript, and
            document finds a permanent home. Start exploring today — no
            subscription is required to browse.
          </p>

          {/* Search Bar */}
          <form
            onSubmit={handleSearch}
            className="max-w-2xl mx-auto mb-8 animate-slide-up"
          >
            <div className="relative flex items-center">
              <Search className="absolute left-5 w-5 h-5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search titles, authors, subjects..."
                className="w-full pl-14 pr-4 py-4 rounded-2xl text-slate-800 font-sans text-base bg-white shadow-elevated focus:outline-none focus:ring-2 focus:ring-parchment-400 placeholder:text-slate-400"
              />
              <Button
                type="submit"
                className="absolute right-2 !rounded-xl"
                size="md"
                icon={<ChevronRight className="w-4 h-4" />}
              >
                Search
              </Button>
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-sans text-white/60 animate-fade-in">
            <span>Popular:</span>
            {["Fiction", "History", "Science", "Philosophy", "Technology"].map(
              (tag) => (
                <Link
                  key={tag}
                  href={`/browse?category=${tag.toLowerCase()}`}
                  className="text-white/80 hover:text-parchment-300 underline underline-offset-2 transition-colors"
                >
                  {tag}
                </Link>
              ),
            )}
          </div>
        </div>
      </section>

      {/* ── Stats ─── */}
      <section className="bg-white border-y border-slate-100 py-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map(({ value, label, icon: Icon }) => (
              <div key={label} className="text-center">
                <Icon className="w-5 h-5 text-teal-600 mx-auto mb-2" />
                <p className="font-display text-3xl font-bold text-slate-900">
                  {value}
                </p>
                <p className="font-sans text-sm text-slate-500 mt-0.5">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Books ── */}
      {featured && featured.length > 0 && (
        <section className="py-16 px-6 max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="font-display text-3xl font-bold text-slate-900">
                Featured Works
              </h2>
              <p className="font-sans text-slate-500 mt-1">
                Handpicked selections from our curators...
              </p>
            </div>
            <Link
              href="/browse?featured=true"
              className="font-sans text-sm text-teal-600 hover:underline flex items-center gap-1"
            >
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {featured.slice(0, 6).map((book: any) => (
              <BookCard key={book.id} book={book} view="grid" />
            ))}
          </div>
        </section>
      )}

      {/* ── Categories ─── */}
      {categories && categories.length > 0 && (
        <section className="py-16 bg-white border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-10">
              <h2 className="font-display text-3xl font-bold text-slate-900">
                Browse by Category
              </h2>
              <p className="font-sans text-slate-500 mt-2">
                Explore our curated collections
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {categories.slice(0, 10).map((cat: any) => (
                <Link
                  key={cat.id}
                  href={`/browse?category=${cat.slug}`}
                  className="group flex flex-col items-center justify-center p-5 rounded-xl border border-slate-200 hover:border-transparent hover:shadow-card transition-all duration-200 text-center"
                  style={{ "--cat-color": cat.color } as React.CSSProperties}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: `${cat.color}20` }}
                  >
                    <BookOpen
                      className="w-5 h-5"
                      style={{ color: cat.color }}
                    />
                  </div>
                  <span className="font-sans font-medium text-sm text-slate-800">
                    {cat.name}
                  </span>
                  {cat.book_count !== undefined && (
                    <span className="font-sans text-xs text-slate-400 mt-0.5">
                      {cat.book_count} books
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="py-20 px-6 bg-teal-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-4xl font-bold text-white mb-4">
            Ready to Start Reading?
          </h2>
          <p className="font-body text-lg text-teal-100 mb-8">
            Join thousands of readers who've made the Book Haven their home for
            knowledge.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register">
              <Button
                size="lg"
                className="bg-white !text-teal-700 hover:bg-parchment-50 shadow-lg"
              >
                Create Free Account
              </Button>
            </Link>
            <Link href="/browse">
              <Button
                variant="outline"
                size="lg"
                className="!border-white/40 !text-white hover:!bg-white/10"
              >
                Browse Without Signing Up
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-teal-600 rounded-md flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="font-display text-white font-bold">
                The Book Haven
              </span>
            </div>
            <p className="font-sans text-sm text-slate-500 text-center">
              &copy; {new Date().getFullYear()} The Book Haven. Preserving
              knowledge for future generations.
            </p>
            <div className="flex gap-4 text-sm font-sans">
              <Link
                href="/browse"
                className="hover:text-teal-400 transition-colors"
              >
                Browse
              </Link>
              <Link
                href="/auth/register"
                className="hover:text-teal-400 transition-colors"
              >
                Register
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
