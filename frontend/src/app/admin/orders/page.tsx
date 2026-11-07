'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { fetchOrders, formatKhr } from '@/lib/api';

export default function AdminOrdersPage() {
  const router = useRouter();
  const { isStaff, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated() || !isStaff()) {
      router.push('/login');
      return;
    }
    fetchOrders()
      .then((res) => setOrders(res.data.content || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isAuthenticated, isStaff, router]);

  if (loading) return <div className="py-20 text-center">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Order History</h1>
        <Link href="/admin" className="btn-secondary text-sm">← Dashboard</Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3">Order ID</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Total</th>
              <th className="p-3">Payment</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="p-3 font-medium">#{o.id}</td>
                <td className="p-3">{o.customerName}</td>
                <td className="p-3">{o.phone}</td>
                <td className="p-3">{formatKhr(o.totalKhr)}</td>
                <td className="p-3">
                  <StatusBadge status={o.paymentStatus} />
                </td>
                <td className="p-3">
                  <StatusBadge status={o.orderStatus} />
                </td>
                <td className="p-3 text-slate-500">
                  {new Date(o.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-700',
    PAID: 'bg-green-50 text-green-700',
    SUCCESS: 'bg-green-50 text-green-700',
    SHIPPED: 'bg-blue-50 text-blue-700',
    DELIVERED: 'bg-teal-50 text-teal-700',
    CANCELLED: 'bg-red-50 text-red-700',
    FAILED: 'bg-red-50 text-red-700',
    EXPIRED: 'bg-slate-100 text-slate-600',
    PROCESSING: 'bg-indigo-50 text-indigo-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || 'bg-slate-100'}`}>
      {status}
    </span>
  );
}
