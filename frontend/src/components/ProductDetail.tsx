'use client';

import { useEffect, useState } from 'react';
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

async function createShareImage(
  product: Pick<Product, 'id' | 'name' | 'price' | 'imageUrl'>,
  quantity: number
): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to create the product share image.');
  if (!product.imageUrl) throw new Error('This product does not have an image to share.');

  context.fillStyle = '#f8fafc';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#0f766e';
  context.font = 'bold 24px sans-serif';
  context.fillText('BAKONG SHOP', 72, 82);

  context.fillStyle = '#0f172a';
  context.font = 'bold 48px sans-serif';
  const words = product.name.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > 460 && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  lines.slice(0, 3).forEach((text, index) => {
    context.fillText(text, 72, 190 + index * 60, 460);
  });

  const detailsY = 190 + Math.min(lines.length, 3) * 60 + 28;
  context.fillStyle = '#475569';
  context.font = '28px sans-serif';
  context.fillText(`Quantity: ${quantity}`, 72, detailsY);
  context.fillStyle = '#0f766e';
  context.font = 'bold 36px sans-serif';
  context.fillText(`Price: ${formatKhr(product.price)}`, 72, detailsY + 62, 460);

  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = product.imageUrl;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Unable to load the product image for sharing.'));
  });

  const imageX = 600;
  const imageY = 45;
  const imageWidth = 540;
  const imageHeight = 540;
  const scale = Math.max(imageWidth / image.naturalWidth, imageHeight / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.save();
  context.beginPath();
  context.rect(imageX, imageY, imageWidth, imageHeight);
  context.clip();
  context.drawImage(
    image,
    imageX + (imageWidth - drawWidth) / 2,
    imageY + (imageHeight - drawHeight) / 2,
    drawWidth,
    drawHeight
  );
  context.restore();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error('Unable to generate the product share image.'));
    }, 'image/png');
  });
  return new File([blob], `product-${product.id}-share.png`, { type: 'image/png' });
}

export function ProductDetail({ product }: { product: Product }) {
  const [qty, setQty] = useState(1);
  const [shareImage, setShareImage] = useState<File | null>(null);
  const [shareError, setShareError] = useState('');
  const [shareStatus, setShareStatus] = useState('');
  const addItem = useCart((s) => s.addItem);
  const { id: productId, name: productName, price: productPrice, imageUrl: productImageUrl } = product;

  useEffect(() => {
    let cancelled = false;
    setShareImage(null);
    setShareError('');
    createShareImage({
      id: productId,
      name: productName,
      price: productPrice,
      imageUrl: productImageUrl,
    }, qty)
      .then((file) => {
        if (!cancelled) setShareImage(file);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setShareError(error instanceof Error ? error.message : 'Unable to generate the product share image.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [productId, productName, productPrice, productImageUrl, qty]);

  const shareProduct = async (platform: 'facebook' | 'telegram') => {
    if (!shareImage) return;
    setShareStatus('');
    const caption = `${product.name}\nPrice: ${formatKhr(product.price)}\nQuantity: ${qty}`;
    try {
      if (navigator.share && navigator.canShare?.({ files: [shareImage] })) {
        await navigator.share({
          files: [shareImage],
          title: product.name,
          text: caption,
          url: window.location.href,
        });
        setShareStatus('Choose a sharing app to send the generated product image.');
        return;
      }

      const imageUrl = URL.createObjectURL(shareImage);
      const download = document.createElement('a');
      download.href = imageUrl;
      download.download = shareImage.name;
      download.click();
      window.setTimeout(() => URL.revokeObjectURL(imageUrl), 60_000);

      const url = encodeURIComponent(window.location.href);
      const text = encodeURIComponent(caption);
      const shareUrl = platform === 'facebook'
        ? `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`
        : `https://t.me/share/url?url=${url}&text=${text}`;
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
      setShareStatus(`Image downloaded. Attach it when sharing on ${platform === 'facebook' ? 'Facebook' : 'Telegram'}.`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareStatus(error instanceof Error ? error.message : 'Unable to share the product image.');
    }
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

          <button onClick={() => shareProduct('facebook')} disabled={!shareImage} className="btn-secondary gap-2 disabled:cursor-wait disabled:opacity-50">
            <Share2 className="w-4 h-4" />
            Facebook
          </button>
          <button onClick={() => shareProduct('telegram')} disabled={!shareImage} className="btn-secondary gap-2 disabled:cursor-wait disabled:opacity-50">
            Telegram
          </button>
        </div>
        {(shareError || shareStatus) && (
          <p role={shareError ? 'alert' : 'status'} className={`mt-3 text-sm ${shareError ? 'text-red-600' : 'text-slate-600'}`}>
            {shareError || shareStatus}
          </p>
        )}
      </div>
    </div>
  );
}
