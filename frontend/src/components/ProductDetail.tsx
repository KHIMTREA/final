'use client';

import { useState } from 'react';
import { ShoppingCart, Share2 } from 'lucide-react';
import { useCart } from '@/store/cart';
import { formatKhr } from '@/lib/api';

interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  stockQuantity: number;
  imageUrl?: string;
}

export function ProductDetail({ product }: { product: Product }) {
  const [qty, setQty] = useState(1);
  const addItem = useCart((s) => s.addItem);

  const shareFacebook = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  const shareTelegram = () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(product.name);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
  };

  return (
    <div className="grid md:grid-cols-2 gap-10">
      <div className="aspect-square bg-slate-100 rounded-xl overflow-hidden">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">No image</div>
        )}
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{product.name}</h1>
        <p className="text-2xl font-bold text-teal-700 mb-4">{formatKhr(product.price)}</p>
        <p className="text-slate-600 mb-6 leading-relaxed">{product.description}</p>

        <div className="mb-4">
          <span className={`text-sm font-medium ${product.stockQuantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {product.stockQuantity > 0 ? `In stock (${product.stockQuantity})` : 'Out of stock'}
          </span>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <label className="label mb-0">Qty</label>
          <input
            type="number"
            min={1}
            max={product.stockQuantity}
            value={qty}
            onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
            className="input w-20"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() =>
              addItem(
                {
                  productId: product.id,
                  name: product.name,
                  price: product.price,
                  imageUrl: product.imageUrl,
                },
                qty
              )
            }
            disabled={product.stockQuantity < 1}
            className="btn-primary gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            Add to Cart
          </button>

          <button onClick={shareFacebook} className="btn-secondary gap-2">
            <Share2 className="w-4 h-4" />
            Facebook
          </button>
          <button onClick={shareTelegram} className="btn-secondary gap-2">
            Telegram
          </button>
        </div>
      </div>
    </div>
  );
}
