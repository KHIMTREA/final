'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { createProduct, deleteProduct, fetchAllProductsAdmin, formatKhr, getApiErrorMessage, updateProduct } from '@/lib/api';

type Product = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  stockQuantity: number;
  imageUrl: string | null;
  status: string;
};

type ProductForm = {
  name: string;
  description: string;
  price: string;
  stockQuantity: string;
  imageUrl: string;
  status: string;
};

const emptyForm: ProductForm = {
  name: '',
  description: '',
  price: '',
  stockQuantity: '0',
  imageUrl: '',
  status: 'ACTIVE',
};

export default function AdminProductsPage() {
  const router = useRouter();
  const { isStaff, isAdmin, isAuthenticated } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState('');
  const admin = isAdmin();

  const loadProducts = () =>
    fetchAllProductsAdmin()
      .then((res) => setProducts(res.data.content || []))
      .catch((cause) => setError(getApiErrorMessage(cause, 'Unable to load products')))
      .finally(() => setLoading(false));

  useEffect(() => {
    if (!isAuthenticated() || !isStaff()) {
      router.push('/login');
      return;
    }
    loadProducts();
  }, [isAuthenticated, isStaff, router]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
    setError('');
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description || '',
      price: String(product.price),
      stockQuantity: String(product.stockQuantity),
      imageUrl: product.imageUrl || '',
      status: product.status,
    });
    setFormOpen(true);
    setError('');
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const data = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      stockQuantity: Number(form.stockQuantity),
      imageUrl: form.imageUrl.trim(),
      status: form.status,
    };
    try {
      if (editing) await updateProduct(editing.id, data);
      else await createProduct(data);
      setEditing(null);
      setFormOpen(false);
      await loadProducts();
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Unable to save product'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (product: Product) => {
    if (!window.confirm(`Archive "${product.name}"? It will be hidden from the storefront and retained for order history.`)) return;
    setError('');
    try {
      await deleteProduct(product.id);
      await loadProducts();
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Unable to archive product'));
    }
  };

  if (loading) return <div className="py-20 text-center">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Product Management</h1>
        <div className="flex gap-2">
          <button onClick={openCreate} className="btn-primary text-sm">Add Product</button>
          <Link href="/admin" className="btn-secondary text-sm">← Dashboard</Link>
        </div>
      </div>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Name</th>
              <th className="p-3">Price (KHR)</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
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
                <td className="p-3 whitespace-nowrap">
                  <button onClick={() => openEdit(p)} className="text-teal-700 hover:underline">Edit</button>
                  {admin && p.status === 'ACTIVE' && (
                    <button onClick={() => remove(p)} className="ml-3 text-red-600 hover:underline">Archive</button>
                  )}
                </td>
              </tr>
            ))}
            {products.length === 0 && <tr><td className="p-6 text-center text-slate-500" colSpan={6}>No products found.</td></tr>}
          </tbody>
        </table>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={save} className="card w-full max-w-xl space-y-4 p-6">
            <h2 className="text-lg font-bold">{editing ? 'Edit Product' : 'Add Product'}</h2>
            <label className="label">Name<input required maxLength={255} className="input mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label className="label">Description<textarea className="input mt-1" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="label">Price (KHR)<input required min="0.01" step="0.01" type="number" className="input mt-1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
              <label className="label">Stock<input required min="0" step="1" type="number" className="input mt-1" value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })} /></label>
            </div>
            <label className="label">Image URL<input type="url" className="input mt-1" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} /></label>
            <label className="label">Status<select className="input mt-1" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button>
              <button disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Product'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
