'use client';

import { useRouter } from 'next/navigation';

export default function PaymentExpiredPage() {
  const router = useRouter();

  return (
    <div className="container max-w-2xl mx-auto py-8 text-center">
      <h1 className="text-2xl font-bold mb-4">お支払い期限が切れています</h1>
      <p className="mb-4">
        申し訳ありませんが、お支払いの期限が切れてしまいました。
      </p>
      <p className="mb-8">
        お手数ですが、最初から予約をやり直してください。
      </p>
      <button
        onClick={() => router.push('/')}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        トップページへ戻る
      </button>
    </div>
  );
} 