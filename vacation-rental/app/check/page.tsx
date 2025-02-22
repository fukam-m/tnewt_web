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
        .select('id, status')  // idも取得
        .eq('email', guestInfo.email)
        .eq('amount', amount)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      console.log('Payment status check:', {
        email: guestInfo.email,
        amount: amount,
        result: statusCheck,
        error: statusError
      });

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

      if (statusCheck.status === 'paid') {
        router.push('/payment-completed');
        return;
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

      const response = await fetch('/api/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${guestInfo.lastName} ${guestInfo.firstName}`,
          email: guestInfo.email,
          phone: guestInfo.phone,
          amount,
          currency: "JPY",
          external_order_num: Date.now().toString(),
          booking_id: statusCheck.id
        })
      });

      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error('Response parse error:', {
          status: response.status,
          statusText: response.statusText,
          error: parseError
        });
        throw new Error('レスポンスの解析に失敗しました');
      }

      console.log('Payment API Response:', {
        ok: response.ok,
        status: response.status,
        result
      });

      if (!response.ok) {
        console.error('Payment API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: result,
          errorMessage: result.error,
          errorDetails: result.details
        });
        throw new Error(result.error || '支払い処理に失敗しました');
      }

      if (!result.session_url) {
        console.error('Missing session URL:', result);
        throw new Error('支払いURLの取得に失敗しました');
      }

      window.location.href = result.session_url;
    } catch (error) {
      const errorDetails = {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error,
        context: {
          guestInfo,
          amount
        },
        timestamp: new Date().toISOString()
      };

      console.error("Payment Error:", errorDetails);
      alert(error instanceof Error ? error.message : "支払い処理中にエラーが発生しました");
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
