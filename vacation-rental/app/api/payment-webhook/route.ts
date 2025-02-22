import { NextResponse } from "next/server";
import { supabase } from '@/lib/supabase-admin';  // サーバーサイド用クライアントをインポート
import crypto from 'crypto';

type BookingResponse = {
  data: { status: string; id: string } | null;
  error: any;
};

type PostgrestError = {
  message: string;
  details: string;
  hint: string;
  code: string;
};

// Webhookの署名を検証する関数
function verifyWebhookSignature(payload: string, signature: string) {
  const secret = process.env.KOMOJU_WEBHOOK_SECRET || '';
  console.log('Webhook Verification:', {
    hasSecret: !!secret,
    receivedSignature: signature,
    payloadLength: payload.length
  });

  const hmac = crypto.createHmac('sha256', secret);
  const calculatedSignature = hmac.update(payload).digest('hex');
  
  console.log('Signature Comparison:', {
    received: signature,
    calculated: calculatedSignature,
    match: signature === calculatedSignature
  });

  return signature === calculatedSignature;
}

async function fetchWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Retry failed');
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('X-Komoju-Signature');
    const data = JSON.parse(rawBody);

    console.log('Webhook received:', {
      type: data.type,
      bookingId: data.data?.metadata?.booking_id,
      timestamp: new Date().toISOString()
    });

    // 開発環境でのみ署名検証をスキップ
    if (process.env.NODE_ENV !== 'development') {
      if (!signature || !verifyWebhookSignature(rawBody, signature)) {
        console.error('Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    console.log('Webhook Data:', {
      type: data.type,
      payment_id: data.data?.id,
      metadata: data.data?.metadata,
      timestamp: new Date().toISOString()
    });

    // KOMOJUからのWebhookを検証
    // 実際の実装では適切な検証が必要です
    
    if (data.type === 'payment.captured') {
      console.log('Payment captured webhook received:', {
        metadata: data.data?.metadata,
        payment_details: {
          email: data.data?.email,
          amount: data.data?.amount,
          currency: data.data?.currency
        }
      });

      const bookingId = data.data.metadata?.booking_id;
      console.log('Extracted booking ID:', bookingId);
      
      if (!bookingId) {
        console.error('Booking ID not found in webhook data');
        return NextResponse.json(
          { error: 'Booking ID not found' },
          { status: 400 }
        );
      }

      // 支払い情報の更新を一意に保つ
      try {
        // 現在の状態を確認（リトライロジックを適用）
        const { data: currentBooking, error: selectError } = await fetchWithRetry<BookingResponse>(async () => {
          const result = await supabase
            .from('customer_info_data')
            .select('status, id')
            .eq('id', bookingId)
            .single();

          if (result.error) {
            console.warn('Retrying due to error:', result.error);
            throw result.error;
          }

          return result;
        });

        if (!currentBooking) {
          console.error('Booking not found:', { bookingId });
          return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        // 既に支払い済みの場合は重複処理を防ぐ
        if (currentBooking.status === 'paid') {
          return NextResponse.json({ success: true, message: 'Payment already processed' });
        }

        // pendingステータスの予約のみ更新
        const { error: updateError } = await fetchWithRetry(async () => {
          const result = await supabase
            .from('customer_info_data')
            .update({ status: 'paid' })
            .eq('id', bookingId)
            .eq('status', 'pending')
            .single();

          if (result.error) {
            console.warn('Retrying update due to error:', result.error);
            throw result.error;
          }

          return result;
        });

        if (updateError) {
          console.error('Update failed:', { error: updateError, bookingId });
          throw new Error(`Failed to update payment status: ${(updateError as PostgrestError).message}`);
        }

        return NextResponse.json({ success: true });
      } catch (error) {
        console.error('Payment status update error:', error);
        return NextResponse.json({ error: 'Failed to update payment status' }, { status: 500 });
      }
    } else {
      console.log('Non-payment completion webhook received:', data.type);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook Error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
} 