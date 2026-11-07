'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { fetchAllProductsAdmin, formatKhr } from '@/lib/api';

export default function AdminProductsPage() {
  const router = useRouter();
  const { isStaff, isAuthenticated } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated() || !isStaff()) {
      router.push('/login');
      return;
    }
    fetchAllProductsAdmin()
      .then((res) => setProducts(res.data.content || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isAuthenticated, isStaff, router]);

  if (loading) return <div className="py-20 text-center">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Product Management</h1>
        <Link href="/admin" className="btn-secondary text-sm">← Dashboard</Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Name</th>
              <th className="p-3">Price (KHR)</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">{p.id}</td>
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3">{formatKhr(p.price)}</td>
                <td className="p-3">
                  <span className={p.stockQuantity <= 5 ? 'text-amber-600 font-medium' : ''}>
                    {p.stockQuantity}
                  </span>
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      p.status === 'ACTIVE'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
