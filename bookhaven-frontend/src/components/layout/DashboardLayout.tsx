"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import Sidebar from "@/components/layout/Sidebar";
import { BookOpen } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment-50">
        <div className="animate-spin w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <main className="lg:pl-64 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8 pt-16 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}

// Public layout — no auth required, shows sidebar for logged-in users
// and a simple header for guests
export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  // If logged in, use the full dashboard layout
  if (isAuthenticated) {
    return <DashboardLayout>{children}</DashboardLayout>;
  }

  // If guest, show a minimal header with login/register links
  return (
    <div className="min-h-screen bg-parchment-50">
      {/* Guest navigation bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <a href="/" className="flex items-center gap-2">
              <BookOpen className="w-7 h-7 text-teal-600" />
              <span className="font-display text-xl font-bold text-slate-900">
                BookHaven
              </span>
            </a>

            {/* Nav links */}
            <nav className="hidden md:flex items-center gap-6">
              <a
                href="/browse"
                className="font-sans text-sm font-medium text-teal-600"
              >
                Browse
              </a>
            </nav>

            {/* Auth buttons */}
            <div className="flex items-center gap-3">
              <a
                href="/auth/login"
                className="font-sans text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Sign In
              </a>

              <a
                href="/auth/register"
                className="bg-teal-600 hover:bg-teal-700 text-white font-sans text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Get Started
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
