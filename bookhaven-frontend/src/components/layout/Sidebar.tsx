'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  BookOpen, Home, Compass, BookMarked, History,
  Heart, Settings, LogOut, Shield, Menu, X, ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/browse', icon: Compass, label: 'Browse Archive' },
  { href: '/shelf', icon: BookMarked, label: 'My Bookshelf' },
  { href: '/history', icon: History, label: 'Reading History' },
];

const bottomItems = [
  { href: '/settings', icon: Settings, label: 'Settings' },
];

interface NavLinkProps {
  href: string;
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
}

const NavLink = ({ href, icon: Icon, label, onClick }: NavLinkProps) => {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      onClick={onClick}
      className={clsx(
        'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-sans font-medium transition-all duration-150 group',
        isActive
          ? 'bg-teal-600 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      )}
    >
      <Icon className={clsx('w-4 h-4 flex-shrink-0', isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600')} />
      {label}
      {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
    </Link>
  );
};

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, refreshToken, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {}
    logout();
    toast.success('Logged out successfully');
    router.push('/');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-100">
        <div className="w-9 h-9 bg-teal-600 rounded-lg flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-display text-base font-bold text-slate-900 leading-none">BookHaven</h1>
          <p className="text-[11px] text-slate-400 font-sans mt-0.5">Knowledge Preserved From Time...</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} onClick={() => setMobileOpen(false)} />
        ))}

        {(user?.role === 'admin' || user?.role === 'librarian') && (
          <>
            <div className="pt-3 pb-1 px-4">
              <p className="text-[10px] font-sans font-semibold text-slate-400 uppercase tracking-widest">Management</p>
            </div>
            <NavLink
              href="/admin"
              icon={Shield}
              label="Admin Panel"
              onClick={() => setMobileOpen(false)}
            />
          </>
        )}
      </nav>

      {/* User section */}
      <div className="px-3 pb-4 border-t border-slate-100 pt-4 space-y-1">
        {bottomItems.map((item) => (
          <NavLink key={item.href} {...item} onClick={() => setMobileOpen(false)} />
        ))}
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg mt-2">
          <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-sans font-semibold text-sm flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium font-sans text-slate-900 truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 font-sans capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-sans font-medium text-red-500 hover:bg-red-50 w-full transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-card border border-slate-200"
      >
        <Menu className="w-5 h-5 text-slate-700" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-slate-100"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-white border-r border-slate-100 fixed left-0 top-0 bottom-0">
        <SidebarContent />
      </aside>
    </>
  );
}
