'use client';

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabase";

export default function CheckPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [guestInfo, setGuestInfo] = useState({
    lastName: "",
    firstName: "",
    email: "",
    phone: ""
  });
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    // URLパラメータから情報を取得
    const name = searchParams.get("name") || "";
    const [lastName, firstName] = name.split(" ");
    const email = searchParams.get("email") || "";
    const phone = searchParams.get("phone") || "";
    const urlAmount = searchParams.get("amount");

    setGuestInfo({
      lastName: lastName || "",
      firstName: firstName || "",
      email,
      phone
    });

    if (urlAmount) {
      setAmount(parseInt(urlAmount, 10));
    }
  }, [searchParams]);

  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        const email = searchParams.get("email");
        const amount = parseInt(searchParams.get("amount") || "0", 10);

        console.log('Checking payment status for:', { email, amount });

        const { data, error } = await supabaseClient
          .from('customer_info_data')
          .select('id, status')
          .eq('email', email)
          .eq('amount', amount)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error) {
          console.error('Payment status check error:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          return;
        }

        if (data?.status === 'paid') {
          router.push('/payment-completed');
          return;
        }

        if (data?.status === 'processing') {
          alert('支払い処理中です。しばらく待ってから再度お試しください。');
          router.push('/');
          return;
        }
      } catch (error) {
        console.error('Status check error:', error instanceof Error ? error.message : error);
      }
    };

    if (searchParams.get("email") && searchParams.get("amount")) {
      checkPaymentStatus();
    }
  }, [searchParams, router]);

  const handlePayment = async () => {
    try {
      // 支払い前に再度状態チェック
      const { data: statusCheck, error: statusError } = await supabaseClient
        .from('customer_info_data')
        .select('id, status')
        .eq('email', guestInfo.email)
        .eq('amount', amount)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (statusCheck?.status === 'paid') {
        // 支払い済みの場合は支払い完了ページに遷移
        localStorage.setItem('currentBookingId', statusCheck.id);
        router.push('/payment-completed');
        return;
      }

      // エラーハンドリング
      if (statusError) {
        console.error('Status check error:', {
          message: statusError.message,
          details: statusError.details,
          hint: statusError.hint,
          code: statusError.code
        });
        throw new Error('予約情報の確認中にエラーが発生しました');
      }

      if (!statusCheck) {
        throw new Error('予約情報が見つかりません');
      }

      if (statusCheck.status === 'processing') {
        alert('支払い処理中です。しばらく待ってから再度お試しください。');
        router.push('/');
        return;
      }

      // 支払い処理の開始
      console.log('Initiating payment for:', {
        id: statusCheck.id,
        email: guestInfo.email,
        amount: amount
      });

      const paymentData = {
        name: `${guestInfo.lastName} ${guestInfo.firstName}`,
        email: guestInfo.email,
        phone: guestInfo.phone,
        amount,
        currency: "JPY",
        external_order_num: Date.now().toString(),
        booking_id: statusCheck.id
      };

      const response = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '支払い処理中にエラーが発生しました');
      }

      if (!result.session_url) {
        throw new Error('支払いセッションの作成に失敗しました');
      }

      // 支払いページに遷移する前にbooking_idを保存
      localStorage.setItem('currentBookingId', statusCheck.id);
      window.location.href = result.session_url;
    } catch (error) {
      console.error("Payment Error:", { 
        message: error instanceof Error ? error.message : '不明なエラー',
        details: error 
      });
      alert('支払い処理中にエラーが発生しました。時間をおいて再度お試しください。');
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">確認ページ</h1>
      <p>名前: {`${guestInfo.lastName} ${guestInfo.firstName}`}</p>
      <p>メールアドレス: {guestInfo.email}</p>
      <p>電話番号: {guestInfo.phone}</p>
      <p>金額: ¥{amount.toLocaleString()}</p>
      <button onClick={handlePayment} className="mt-4 p-2 bg-green-500 text-white rounded">
        支払い
      </button>
    </div>
  );
}
