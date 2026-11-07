'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/store/cart';
import { createKhqrCheckout, formatKhr } from '@/lib/api';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    customerName: '',
    email: '',
    phone: '',
    shippingAddress: '',
  });

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="mb-4">Your cart is empty.</p>
        <a href="/" className="btn-primary">Back to store</a>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await createKhqrCheckout({
        ...form,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      });
      // Persist QR data for confirmation page
      sessionStorage.setItem('khqr_checkout', JSON.stringify(data));
      clearCart();
      router.push(`/order-confirmation?md5=${data.khqrMd5}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      <div className="card p-4 mb-6">
        <p className="text-sm text-slate-500 mb-1">Order total</p>
        <p className="text-xl font-bold text-teal-700">{formatKhr(total())}</p>
        <p className="text-xs text-slate-400 mt-1">{items.length} item(s)</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div>
          <label className="label">Full Name *</label>
          <input
            required
            className="input"
            value={form.customerName}
            onChange={(e) => setForm({ ...form, customerName: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Email *</label>
          <input
            required
            type="email"
            className="input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Phone Number *</label>
          <input
            required
            className="input"
            placeholder="0xx xxx xxx"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Shipping Address *</label>
          <textarea
            required
            rows={3}
            className="input"
            value={form.shippingAddress}
            onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })}
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? 'Generating KHQR...' : 'Pay with Bakong KHQR'}
        </button>
      </form>
    </div>
  );
}
