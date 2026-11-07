'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { fetchTransactions, fetchTransactionAnalytics, formatKhr } from '@/lib/api';

export default function AdminTransactionsPage() {
  const router = useRouter();
  const { isAdmin, isAuthenticated } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated() || !isAdmin()) {
      router.push('/login');
      return;
    }
    Promise.all([fetchTransactions(), fetchTransactionAnalytics()])
      .then(([txRes, anRes]) => {
        setTransactions(txRes.data.content || []);
        setAnalytics(anRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isAuthenticated, isAdmin, router]);

  if (loading) return <div className="py-20 text-center">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Transaction Analytics</h1>
        <Link href="/admin" className="btn-secondary text-sm">← Dashboard</Link>
      </div>

      {analytics && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Metric label="Total Volume" value={formatKhr(analytics.totalVolumeKhr)} />
          <Metric label="Successful" value={formatKhr(analytics.successfulPaymentsKhr)} />
          <Metric label="Fail/Expire Rate" value={`${analytics.failedExpiredRate}%`} />
          <Metric label="Avg Order Value" value={formatKhr(analytics.averageOrderValue)} />
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Order</th>
              <th className="p-3">MD5</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Status</th>
              <th className="p-3">Time</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="p-3">{t.id}</td>
                <td className="p-3">#{t.orderId}</td>
                <td className="p-3 font-mono text-xs truncate max-w-[120px]">{t.khqrMd5}</td>
                <td className="p-3">{formatKhr(t.amountKhr)}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      t.status === 'SUCCESS'
                        ? 'bg-green-50 text-green-700'
                        : t.status === 'PENDING'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
                <td className="p-3 text-slate-500 text-xs">
                  {new Date(t.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
