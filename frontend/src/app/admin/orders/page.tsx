'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import {
  createOrder,
  deleteOrder,
  fetchAllProductsAdmin,
  fetchOrder,
  fetchOrders,
  formatKhr,
  getApiErrorMessage,
  updateOrder,
} from '@/lib/api';

type Order = {
  id: number;
  customerName: string;
  email: string;
  phone: string;
  shippingAddress?: string;
  totalKhr: number;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
};

type Product = { id: number; name: string; status: string };
type OrderForm = {
  customerName: string;
  email: string;
  phone: string;
  shippingAddress: string;
  orderStatus: string;
  items: { productId: string; quantity: string }[];
};

const emptyForm: OrderForm = {
  customerName: '',
  email: '',
  phone: '',
  shippingAddress: '',
  orderStatus: 'PROCESSING',
  items: [{ productId: '', quantity: '1' }],
};

export default function AdminOrdersPage() {
  const router = useRouter();
  const { isStaff, isAdmin, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<OrderForm>(emptyForm);
  const [error, setError] = useState('');
  const admin = isAdmin();

  const loadOrders = () =>
    fetchOrders()
      .then((res) => setOrders(res.data.content || []))
      .catch((cause) => setError(getApiErrorMessage(cause, 'Unable to load orders')))
      .finally(() => setLoading(false));

  useEffect(() => {
    if (!isAuthenticated() || !isStaff()) {
      router.push('/login');
      return;
    }
    loadOrders();
    if (isAdmin()) {
      fetchAllProductsAdmin()
        .then((res) => setProducts((res.data.content || []).filter((p: Product) => p.status === 'ACTIVE')))
        .catch((cause) => setError(getApiErrorMessage(cause, 'Unable to load products for new orders')));
    }
  }, [isAuthenticated, isStaff, isAdmin, router]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      items: [{ productId: products[0] ? String(products[0].id) : '', quantity: '1' }],
    });
    setFormOpen(true);
    setError('');
  };

  const openEdit = async (order: Order) => {
    setError('');
    try {
      const { data } = await fetchOrder(order.id);
      setEditing(data);
      setForm({
        ...emptyForm,
        customerName: data.customerName,
        email: data.email,
        phone: data.phone,
        shippingAddress: data.shippingAddress || '',
        orderStatus: data.orderStatus,
      });
      setFormOpen(true);
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Unable to load order details'));
    }
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const details = {
        customerName: form.customerName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        shippingAddress: form.shippingAddress.trim(),
      };
      if (editing) {
        await updateOrder(editing.id, {
          ...details,
          orderStatus: form.orderStatus,
        });
      } else {
        await createOrder({
          ...details,
          items: form.items.map((item) => ({
            productId: Number(item.productId),
            quantity: Number(item.quantity),
          })),
        });
      }
      setFormOpen(false);
      setEditing(null);
      await loadOrders();
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Unable to save order'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (order: Order) => {
    if (!window.confirm(`Delete unpaid order #${order.id}? Its reserved stock will be restored.`)) return;
    setError('');
    try {
      await deleteOrder(order.id);
      await loadOrders();
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Unable to delete order'));
    }
  };

  if (loading) return <div className="py-20 text-center">Loading…</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Order History</h1>
        <div className="flex gap-2">
          {admin && <button onClick={openCreate} className="btn-primary text-sm">Create Order</button>}
          <Link href="/admin" className="btn-secondary text-sm">← Dashboard</Link>
        </div>
      </div>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

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
              {admin && <th className="p-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t">
                <td className="p-3 font-medium">#{order.id}</td>
                <td className="p-3">{order.customerName}</td>
                <td className="p-3">{order.phone}</td>
                <td className="p-3">{formatKhr(order.totalKhr)}</td>
                <td className="p-3"><StatusBadge status={order.paymentStatus} /></td>
                <td className="p-3"><StatusBadge status={order.orderStatus} /></td>
                <td className="p-3 text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                {admin && (
                  <td className="p-3 whitespace-nowrap">
                    <button onClick={() => openEdit(order)} className="text-teal-700 hover:underline">Edit</button>
                    {order.paymentStatus !== 'PAID' && (
                      <button onClick={() => remove(order)} className="ml-3 text-red-600 hover:underline">Delete</button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {orders.length === 0 && <tr><td className="p-6 text-center text-slate-500" colSpan={admin ? 8 : 7}>No orders found.</td></tr>}
          </tbody>
        </table>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={save} className="card max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto p-6">
            <h2 className="text-lg font-bold">{editing ? `Edit Order #${editing.id}` : 'Create Order'}</h2>
            <label className="label">Customer name<input required maxLength={100} className="input mt-1" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} /></label>
            <label className="label">Email<input required type="email" maxLength={100} className="input mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label className="label">Phone<input required maxLength={20} className="input mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
            <label className="label">Shipping address<textarea required rows={2} className="input mt-1" value={form.shippingAddress} onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })} /></label>
            {editing ? (
              <div className="space-y-3">
                <label className="label">Order status<select className="input mt-1" value={form.orderStatus} onChange={(e) => setForm({ ...form, orderStatus: e.target.value })}><option>PROCESSING</option><option>SHIPPED</option><option>DELIVERED</option><option>CANCELLED</option></select></label>
                <p className="text-sm text-slate-500">Payment status is confirmed by Bakong and cannot be changed here.</p>
              </div>
            ) : (
              <fieldset className="space-y-3">
                <legend className="label">Order items</legend>
                {form.items.map((item, index) => (
                  <div key={index} className="grid items-end gap-3 sm:grid-cols-[1fr_120px_auto]">
                    <label className="label">Product<select required className="input mt-1" value={item.productId} onChange={(e) => setForm({
                      ...form,
                      items: form.items.map((line, lineIndex) => lineIndex === index ? { ...line, productId: e.target.value } : line),
                    })}><option value="">Select a product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
                    <label className="label">Quantity<input required min="1" step="1" type="number" className="input mt-1" value={item.quantity} onChange={(e) => setForm({
                      ...form,
                      items: form.items.map((line, lineIndex) => lineIndex === index ? { ...line, quantity: e.target.value } : line),
                    })} /></label>
                    {form.items.length > 1 && <button type="button" className="mb-1 text-sm text-red-600 hover:underline" onClick={() => setForm({
                      ...form,
                      items: form.items.filter((_, lineIndex) => lineIndex !== index),
                    })}>Remove</button>}
                  </div>
                ))}
                <button type="button" className="text-sm text-teal-700 hover:underline" onClick={() => setForm({
                  ...form,
                  items: [...form.items, { productId: products[0] ? String(products[0].id) : '', quantity: '1' }],
                })}>+ Add item</button>
              </fieldset>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button>
              <button disabled={saving || (!editing && (products.length === 0 || form.items.some((item) => !item.productId)))} className="btn-primary">{saving ? 'Saving…' : 'Save Order'}</button>
            </div>
          </form>
        </div>
      )}
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
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${colors[status] || 'bg-slate-100'}`}>{status}</span>;
}
