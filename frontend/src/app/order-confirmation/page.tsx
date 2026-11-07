'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Clock, XCircle } from 'lucide-react';
import { verifyPayment, simulatePaymentSuccess, formatKhr } from '@/lib/api';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const md5 = searchParams.get('md5') || '';
  const [status, setStatus] = useState<string>('PENDING');
  const [data, setData] = useState<any>(null);
  const [qrData, setQrData] = useState<any>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('khqr_checkout');
    if (stored) setQrData(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (!md5) return;
    const poll = setInterval(async () => {
      try {
        const { data: res } = await verifyPayment(md5);
        setStatus(res.status);
        setData(res);
        if (res.status === 'SUCCESS' || res.status === 'EXPIRED' || res.status === 'FAILED') {
          clearInterval(poll);
        }
      } catch {
        // ignore
      }
    }, 3000);
    return () => clearInterval(poll);
  }, [md5]);

  const handleSimulate = async () => {
    await simulatePaymentSuccess(md5);
    const { data: res } = await verifyPayment(md5);
    setStatus(res.status);
    setData(res);
  };

  return (
    <div className="max-w-lg mx-auto text-center">
      {status === 'SUCCESS' ? (
        <>
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-green-700 mb-2">Payment Successful!</h1>
          <p className="text-slate-600 mb-4">Thank you for your order.</p>
          {data && (
            <div className="card p-4 text-left space-y-2 text-sm">
              <p><strong>Order ID:</strong> #{data.orderId}</p>
              <p><strong>Amount:</strong> {formatKhr(data.amountKhr)}</p>
              <p><strong>Reference:</strong> {data.bakongHash || data.md5}</p>
            </div>
          )}
        </>
      ) : status === 'EXPIRED' || status === 'FAILED' ? (
        <>
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-700 mb-2">Payment {status}</h1>
          <p className="text-slate-600">Please try again from the cart.</p>
        </>
      ) : (
        <>
          <Clock className="w-16 h-16 text-amber-500 mx-auto mb-4 animate-pulse" />
          <h1 className="text-2xl font-bold mb-2">Waiting for Payment</h1>
          <p className="text-slate-600 mb-6">
            Scan the QR code below with any Bakong-enabled banking app.
          </p>

          {qrData?.qrImageBase64 && (
            <div className="card p-6 inline-block mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrData.qrImageBase64}
                alt="Bakong KHQR"
                className="w-64 h-64 mx-auto"
              />
              <p className="mt-3 font-bold text-teal-700 text-lg">
                {formatKhr(qrData.amountKhr)}
              </p>
              <p className="text-xs text-slate-400 mt-1">Expires in ~10 minutes</p>
            </div>
          )}

          <p className="text-sm text-slate-500 mb-4">
            Status is checked automatically every 3 seconds…
          </p>

          {/* Dev helper */}
          <button onClick={handleSimulate} className="btn-secondary text-xs">
            [Dev] Simulate Successful Payment
          </button>
        </>
      )}
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<div className="text-center py-20">Loading…</div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
