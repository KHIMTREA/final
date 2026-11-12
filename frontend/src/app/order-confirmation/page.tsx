'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Clock, XCircle } from 'lucide-react';
import { getApiErrorMessage, verifyPayment, formatKhr } from '@/lib/api';

type PaymentStatus = {
  md5: string;
  status: string;
  orderId: number;
  amountKhr: number;
  bakongHash: string | null;
  message: string;
};

type CheckoutQr = {
  qrImageBase64?: string;
  amountKhr: number;
};

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const md5 = searchParams.get('md5') || '';
  const [status, setStatus] = useState<string>('PENDING');
  const [data, setData] = useState<PaymentStatus | null>(null);
  const [qrData, setQrData] = useState<CheckoutQr | null>(null);
  const [verificationError, setVerificationError] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('khqr_checkout');
    if (stored) setQrData(JSON.parse(stored) as CheckoutQr);
  }, []);

  useEffect(() => {
    if (!md5) return;
    const poll = setInterval(async () => {
      try {
        const { data: res } = await verifyPayment(md5);
        setStatus(res.status);
        setData(res);
        setVerificationError('');
        if (res.status === 'SUCCESS' || res.status === 'EXPIRED' || res.status === 'FAILED') {
          clearInterval(poll);
        }
      } catch (error) {
        setVerificationError(getApiErrorMessage(error, 'Could not verify payment with Bakong. Retrying…'));
      }
    }, 3000);
    return () => clearInterval(poll);
  }, [md5]);

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
          <p className="text-slate-600">{data?.message || 'Please try again from the cart.'}</p>
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
          {(verificationError || data?.message) && (
            <p role="status" className={`mb-4 text-sm ${verificationError ? 'text-red-600' : 'text-slate-500'}`}>
              {verificationError || data?.message}
            </p>
          )}

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
