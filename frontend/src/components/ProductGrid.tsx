'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/store/cart';
import { formatKhr } from '@/lib/api';

interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  stockQuantity: number;
  imageUrl?: string;
  status: string;
}

export function ProductGrid({ products }: { products: Product[] }) {
  const addItem = useCart((s) => s.addItem);

  if (!products.length) {
    return (
      <div className="text-center py-20 text-slate-500">
        No products available. Make sure the backend is running.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((p) => (
        <div key={p.id} className="card overflow-hidden group">
          <Link href={`/products/${p.id}`}>
            <div className="relative aspect-square bg-slate-100">
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                  No image
                </div>
              )}
            </div>
          </Link>
          <div className="p-4">
            <Link href={`/products/${p.id}`}>
              <h3 className="font-semibold text-slate-900 line-clamp-1 hover:text-teal-700">
                {p.name}
              </h3>
            </Link>
            <p className="text-sm text-slate-500 line-clamp-2 mt-1 mb-3">
              {p.description}
            </p>
            <div className="flex items-center justify-between">
              <span className="font-bold text-teal-700">
                {formatKhr(p.price)}
              </span>
              <button
                onClick={() =>
                  addItem({
                    productId: p.id,
                    name: p.name,
                    price: p.price,
                    imageUrl: p.imageUrl,
                  })
                }
                disabled={p.stockQuantity < 1}
                className="btn-primary text-xs px-3 py-1.5 gap-1"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
            {p.stockQuantity <= 5 && p.stockQuantity > 0 && (
              <p className="text-xs text-amber-600 mt-2">Only {p.stockQuantity} left</p>
            )}
            {p.stockQuantity < 1 && (
              <p className="text-xs text-red-600 mt-2">Out of stock</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
