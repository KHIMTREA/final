'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import {
  createTransaction,
  deleteTransaction,
  fetchOrders,
  fetchTransactionAnalytics,
  fetchTransactions,
  formatKhr,
  getApiErrorMessage,
  updateTransaction,
} from '@/lib/api';

type Transaction = {
  id: number;
  orderId: number;
  khqrMd5: string;
  currency: string;
  amountKhr: number;
  status: string;
  fromAccount: string | null;
  bakongHash: string | null;
  createdAt: string;
};
type Order = { id: number; totalKhr: number; paymentStatus: string };
type TransactionAnalytics = {
  totalVolumeKhr: number | string;
  successfulPaymentsKhr: number | string;
  failedExpiredRate: number;
  averageOrderValue: number | string;
};
type TransactionForm = {
  orderId: string;
  khqrMd5: string;
  amountKhr: string;
  status: string;
  fromAccount: string;
  bakongHash: string;
};
const emptyForm: TransactionForm = {
  orderId: '',
  khqrMd5: '',
  amountKhr: '',
  status: 'PENDING',
  fromAccount: '',
  bakongHash: '',
};

export default function AdminTransactionsPage() {
  const router = useRouter();
  const { isAdmin, isAuthenticated } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [analytics, setAnalytics] = useState<TransactionAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<TransactionForm>(emptyForm);
  const [error, setError] = useState('');

  const load = () =>
    Promise.all([fetchTransactions(), fetchTransactionAnalytics()])
      .then(([txRes, analyticsRes]) => {
        setTransactions(txRes.data.content || []);
        setAnalytics(analyticsRes.data);
      })
      .catch((cause) => setError(getApiErrorMessage(cause, 'Unable to load transactions')))
      .finally(() => setLoading(false));

  useEffect(() => {
    if (!isAuthenticated() || !isAdmin()) {
      router.push('/login');
      return;
    }
    load();
    fetchOrders()
      .then((res) => setOrders(res.data.content || []))
      .catch((cause) => setError(getApiErrorMessage(cause, 'Unable to load orders')));
  }, [isAuthenticated, isAdmin, router]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
    setError('');
  };

  const openEdit = (transaction: Transaction) => {
    setEditing(transaction);
    setForm({
      orderId: String(transaction.orderId),
      khqrMd5: transaction.khqrMd5,
      amountKhr: String(transaction.amountKhr),
      status: transaction.status,
      fromAccount: transaction.fromAccount || '',
      bakongHash: transaction.bakongHash || '',
    });
    setFormOpen(true);
    setError('');
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const data = {
      orderId: Number(form.orderId),
      khqrMd5: form.khqrMd5.trim(),
      amountKhr: Number(form.amountKhr),
      status: form.status,
      currency: 'KHR',
      fromAccount: form.fromAccount.trim() || undefined,
      bakongHash: form.bakongHash.trim() || undefined,
    };
    try {
      if (editing) await updateTransaction(editing.id, data);
      else await createTransaction(data);
      setFormOpen(false);
      setEditing(null);
      await load();
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Unable to save transaction'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (transaction: Transaction) => {
    if (!window.confirm(`Delete transaction #${transaction.id}?`)) return;
    setError('');
    try {
      await deleteTransaction(transaction.id);
      await load();
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Unable to delete transaction'));
    }
  };

  if (loading) return <div className="py-20 text-center">Loading…</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Transaction Analytics</h1>
        <div className="flex gap-2">
          <button onClick={openCreate} className="btn-primary text-sm">Add Transaction</button>
          <Link href="/admin" className="btn-secondary text-sm">← Dashboard</Link>
        </div>
      </div>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {analytics && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="border-t">
                <td className="p-3">{transaction.id}</td>
                <td className="p-3">#{transaction.orderId}</td>
                <td className="max-w-[120px] truncate p-3 font-mono text-xs">{transaction.khqrMd5}</td>
                <td className="p-3">{formatKhr(transaction.amountKhr)}</td>
                <td className="p-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                    transaction.status === 'SUCCESS' ? 'bg-green-50 text-green-700' :
                    transaction.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                  }`}>{transaction.status}</span>
                </td>
                <td className="p-3 text-xs text-slate-500">{new Date(transaction.createdAt).toLocaleString()}</td>
                <td className="whitespace-nowrap p-3">
                  {transaction.status !== 'SUCCESS' && (
                    <>
                      <button onClick={() => openEdit(transaction)} className="text-teal-700 hover:underline">Edit</button>
                      <button onClick={() => remove(transaction)} className="ml-3 text-red-600 hover:underline">Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {transactions.length === 0 && <tr><td className="p-6 text-center text-slate-500" colSpan={7}>No transactions found.</td></tr>}
          </tbody>
        </table>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={save} className="card max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto p-6">
            <h2 className="text-lg font-bold">{editing ? `Edit Transaction #${editing.id}` : 'Add Transaction'}</h2>
            <label className="label">Order<select required className="input mt-1" value={form.orderId} disabled={!!editing} onChange={(e) => {
              const selected = orders.find((order) => order.id === Number(e.target.value));
              setForm({ ...form, orderId: e.target.value, amountKhr: selected ? String(selected.totalKhr) : '' });
            }}><option value="">Select an order</option>{orders.map((order) => <option key={order.id} value={order.id}>#{order.id} — {formatKhr(order.totalKhr)} ({order.paymentStatus})</option>)}</select></label>
            <label className="label">KHQR MD5<input required maxLength={64} className="input mt-1 font-mono" value={form.khqrMd5} onChange={(e) => setForm({ ...form, khqrMd5: e.target.value })} /></label>
            <label className="label">Amount (KHR)<input required min="0.01" step="0.01" type="number" className="input mt-1" value={form.amountKhr} onChange={(e) => setForm({ ...form, amountKhr: e.target.value })} /></label>
            {editing && <label className="label">Status<select className="input mt-1" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>PENDING</option><option>FAILED</option><option>EXPIRED</option></select></label>}
            <label className="label">From account<input maxLength={100} className="input mt-1" value={form.fromAccount} onChange={(e) => setForm({ ...form, fromAccount: e.target.value })} /></label>
            <label className="label">Bakong hash<input maxLength={128} className="input mt-1" value={form.bakongHash} onChange={(e) => setForm({ ...form, bakongHash: e.target.value })} /></label>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button>
              <button disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Transaction'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="card p-4"><p className="text-xs text-slate-500">{label}</p><p className="text-lg font-bold">{value}</p></div>;
}
