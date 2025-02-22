import { NextResponse } from "next/server";
import { supabase } from '@/lib/supabase-admin';  // サーバーサイド用クライアントをインポート
import crypto from 'crypto';

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

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('X-Komoju-Signature');

    console.log('Webhook Request:', {
      hasSignature: !!signature,
      headers: Object.fromEntries(request.headers.entries()),
      bodyPreview: rawBody.substring(0, 100) + '...'
    });

    // 開発環境でのみ署名検証をスキップ
    if (process.env.NODE_ENV !== 'development') {
      if (!signature || !verifyWebhookSignature(rawBody, signature)) {
        console.error('Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const data = JSON.parse(rawBody);
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

      // 更新前の予約情報を確認
      const { data: currentBooking } = await supabase
        .from('customer_info_data')
        .select('status, id')
        .eq('id', bookingId)
        .single();

      console.log('Current booking status:', {
        bookingId,
        currentStatus: currentBooking?.status
      });

      // IDに基づいて予約情報を更新
      try {
        const { data: updatedData, error: updateError } = await supabase
          .from('customer_info_data')
          .update({ status: 'paid' })
          .eq('id', bookingId)
          .eq('status', 'pending')
          .select()
          .single();

        if (updateError) {
          console.error('Failed to update payment status:', {
            error: updateError,
            bookingId,
            currentStatus: currentBooking?.status,
            errorDetails: {
              message: updateError.message,
              details: updateError.details,
              hint: updateError.hint,
              code: updateError.code
            }
          });
          throw new Error(`Failed to update payment status: ${updateError.message}`);
        }

        console.log('Successfully updated payment status:', {
          bookingId,
          oldStatus: currentBooking?.status,
          newStatus: updatedData.status
        });

        return NextResponse.json({ success: true });

      } catch (error) {
        console.error('Payment status update error:', error);
        return NextResponse.json(
          { error: 'Failed to update payment status' },
          { status: 500 }
        );
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