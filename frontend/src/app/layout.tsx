import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Bakong Shop – Khmer Crafts & Goods',
  description: 'Shop authentic Cambodian products. Pay securely with Bakong KHQR.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen`}>
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-200 mt-16 py-8 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} Bakong Shop · Powered by Bakong KHQR
        </footer>
      </body>
    </html>
  );
}
