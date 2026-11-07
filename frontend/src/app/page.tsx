import { ProductGrid } from '@/components/ProductGrid';

async function getProducts() {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  try {
    const res = await fetch(`${base}/api/v1/products?size=20`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return { content: [] };
    return res.json();
  } catch {
    return { content: [] };
  }
}

export default async function HomePage() {
  const data = await getProducts();
  const products = data.content || [];

  return (
    <div>
      <section className="mb-10 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
          Authentic Cambodian Crafts
        </h1>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Discover handwoven silk, traditional krama, Kampot pepper and more.
          Pay securely with Bakong KHQR in KHR.
        </p>
      </section>

      <ProductGrid products={products} />
    </div>
  );
}
