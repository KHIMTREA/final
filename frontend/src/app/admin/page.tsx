'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DollarSign,
  ShoppingBag,
  Package,
  Users,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useAuth } from '@/store/auth';
import {
  fetchDashboardSummary,
  fetchTopProducts,
  formatKhr,
} from '@/lib/api';

type DashboardSummary = {
  totalRevenueKhr: number;
  totalOrders: number;
  lowStockCount: number;
  registeredCustomers: number;
  guestCheckouts: number;
  pendingOrders: number;
  paidOrders: number;
  shippedOrders: number;
  cancelledOrders: number;
};

export default function AdminDashboard() {
  const router = useRouter();
  const { isStaff, isAdmin, isAuthenticated } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [topProducts, setTopProducts] = useState<Array<{ name: string; quantitySold: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated() || !isStaff()) {
      router.push('/login');
      return;
    }
    Promise.all([fetchDashboardSummary(), fetchTopProducts()])
      .then(([sumRes, topRes]) => {
        setSummary(sumRes.data);
        setTopProducts(topRes.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isAuthenticated, isStaff, router]);

  if (loading) return <div className="text-center py-20">Loading dashboard…</div>;
  if (!summary) return null;

  const cards = [
    {
      label: 'Total Revenue',
      value: formatKhr(summary.totalRevenueKhr || 0),
      icon: DollarSign,
      color: 'bg-teal-50 text-teal-700',
    },
    {
      label: 'Total Orders',
      value: summary.totalOrders,
      icon: ShoppingBag,
      color: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Low Stock Alerts',
      value: summary.lowStockCount,
      icon: AlertTriangle,
      color: 'bg-amber-50 text-amber-700',
    },
    {
      label: 'Customers',
      value: `${summary.registeredCustomers} / ${summary.guestCheckouts} guests`,
      icon: Users,
      color: 'bg-purple-50 text-purple-700',
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold">Executive Dashboard</h1>
        <div className="flex gap-2">
          <Link href="/admin/products" className="btn-secondary text-sm">Products</Link>
          <Link href="/admin/orders" className="btn-secondary text-sm">Orders</Link>
          {isAdmin() && (
            <>
              <Link href="/admin/transactions" className="btn-secondary text-sm">Transactions</Link>
              <Link href="/admin/users" className="btn-secondary text-sm">Users</Link>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="card p-5">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${c.color}`}>
                <c.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{c.label}</p>
                <p className="text-lg font-bold">{c.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Order status breakdown */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="card p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Order Status
          </h2>
          <div className="space-y-2 text-sm">
            <Row label="Pending Payment" value={summary.pendingOrders} />
            <Row label="Paid" value={summary.paidOrders} />
            <Row label="Shipped" value={summary.shippedOrders} />
            <Row label="Cancelled" value={summary.cancelledOrders} />
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Package className="w-4 h-4" /> Top Selling Products
          </h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-slate-400">No sales data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="quantitySold" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-600">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
