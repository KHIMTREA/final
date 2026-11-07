'use client';

import Link from 'next/link';
import { ShoppingCart, User, LayoutDashboard, LogOut, Package } from 'lucide-react';
import { useCart } from '@/store/cart';
import { useAuth } from '@/store/auth';

export function Navbar() {
  const count = useCart((s) => s.count());
  const { fullName, isAuthenticated, isStaff, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-teal-700">
          <Package className="w-7 h-7" />
          Bakong Shop
        </Link>

        <nav className="flex items-center gap-4 sm:gap-6">
          <Link href="/" className="text-sm font-medium text-slate-600 hover:text-teal-700">
            Store
          </Link>

          {isStaff() && (
            <Link
              href="/admin"
              className="text-sm font-medium text-slate-600 hover:text-teal-700 flex items-center gap-1"
            >
              <LayoutDashboard className="w-4 h-4" />
              Admin
            </Link>
          )}

          <Link href="/cart" className="relative text-slate-600 hover:text-teal-700">
            <ShoppingCart className="w-5 h-5" />
            {count > 0 && (
              <span className="absolute -top-2 -right-2 bg-teal-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {count}
              </span>
            )}
          </Link>

          {isAuthenticated() ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600 hidden sm:inline">
                {fullName}
              </span>
              <button
                onClick={logout}
                className="text-slate-500 hover:text-red-600"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-teal-700"
            >
              <User className="w-4 h-4" />
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
