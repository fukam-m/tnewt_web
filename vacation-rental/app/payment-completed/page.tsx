'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseClient } from "@/lib/supabase";

export default function PaymentCompletedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const verifyPaymentStatus = async () => {
      try {
        const bookingId = localStorage.getItem('currentBookingId');
        if (!bookingId) {
          // booking_idがない場合は最新の支払い済み予約を探す
          const { data: latestBooking } = await supabaseClient
            .from('customer_info_data')
            .select('id, status')
            .eq('email', searchParams.get('email'))
            .eq('status', 'paid')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (latestBooking) {
            localStorage.setItem('currentBookingId', latestBooking.id);
            return;
          }

          console.error('No paid booking found');
          router.push('/');
          return;
        }

        // 既存の処理を続行
        const { data: booking } = await supabaseClient
          .from('customer_info_data')
          .select('status')
          .eq('id', bookingId)
          .single();

        if (!booking || booking.status !== 'paid') {
          router.push('/');
        }

        setIsVerified(true);
      } catch (error) {
        console.error('Payment verification error:', error);
        router.push('/');
      }
    };

    verifyPaymentStatus();
  }, [router, searchParams]);

  if (!isVerified) {
    return null;
  }

  return (
    <div className="container max-w-2xl mx-auto py-8 text-center">
      <h1 className="text-2xl font-bold mb-4">お支払いは完了しています</h1>
      <p className="mb-4">この予約は既にお支払いが完了しています。</p>
      <p>ご予約内容の確認メールを送信していますので、ご確認ください。</p>
      <button
        onClick={() => router.push('/')}
        className="mt-8 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        トップページへ戻る
      </button>
    </div>
  );
} 