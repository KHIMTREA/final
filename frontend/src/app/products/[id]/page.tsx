import { ProductDetail } from '@/components/ProductDetail';

async function getProduct(id: string) {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  try {
    const res = await fetch(`${base}/api/v1/products/${id}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id);
  if (!product) return { title: 'Product Not Found' };
  return {
    title: `${product.name} | Bakong Shop`,
    description: product.description?.slice(0, 160),
    openGraph: {
      title: product.name,
      description: product.description,
      images: product.imageUrl ? [product.imageUrl] : [],
    },
  };
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id);
  if (!product) {
    return <div className="text-center py-20">Product not found</div>;
  }
  return <ProductDetail product={product} />;
}
