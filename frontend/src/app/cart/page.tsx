'use client';

import Link from 'next/link';
import { Trash2, Minus, Plus } from 'lucide-react';
import { useCart } from '@/store/cart';
import { formatKhr } from '@/lib/api';

export default function CartPage() {
  const { items, updateQuantity, removeItem, clearCart, total } = useCart();

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
        <Link href="/" className="btn-primary">
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Shopping Cart</h1>
        <button onClick={clearCart} className="text-sm text-red-600 hover:underline">
          Clear cart
        </button>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.productId} className="card p-4 flex gap-4 items-center">
            <div className="w-20 h-20 bg-slate-100 rounded-lg overflow-hidden shrink-0">
              {item.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{item.name}</h3>
              <p className="text-teal-700 font-semibold">{formatKhr(item.price)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                className="p-1 rounded border hover:bg-slate-50"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                className="p-1 rounded border hover:bg-slate-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <p className="font-semibold w-28 text-right">
              {formatKhr(item.price * item.quantity)}
            </p>
            <button
              onClick={() => removeItem(item.productId)}
              className="text-slate-400 hover:text-red-600"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-slate-500 text-sm">Total</p>
          <p className="text-2xl font-bold text-teal-700">{formatKhr(total())}</p>
        </div>
        <Link href="/checkout" className="btn-primary text-base px-8 py-3">
          Proceed to Checkout
        </Link>
      </div>
    </div>
  );
}
