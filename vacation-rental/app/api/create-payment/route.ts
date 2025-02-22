import { NextResponse } from "next/server";
import { Buffer } from "buffer";
import { headers } from "next/headers";
import { supabase } from "@/lib/supabase-admin";
import https from 'https';
import axios from 'axios';

const KOMOJU_API_KEY = process.env.KOMOJU_API_KEY;
const KOMOJU_MERCHANT_UUID = process.env.KOMOJU_MERCHANT_UUID;
const KOMOJU_ENDPOINT = process.env.KOMOJU_API_URL || "https://komoju.com/api/v1/sessions";

// リトライロジックを追加
async function checkBookingStatus(bookingId: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const { data: booking, error } = await supabase
      .from('customer_info_data')
      .select('status')
      .eq('id', bookingId)
      .single();

    if (!error && booking) {
      return booking;
    }

    // 1秒待機してリトライ
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const { booking_id, ...paymentData } = await request.json();
    console.log('Payment request:', { booking_id });

    // リトライ付きの予約チェック
    const booking = await checkBookingStatus(booking_id);
    
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status !== 'pending') {
      return NextResponse.json({ error: 'Invalid booking status' }, { status: 400 });
    }

    const session = await createKomojuSession({
      ...paymentData,
      metadata: { booking_id }
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json({ error: 'Payment creation failed' }, { status: 500 });
  }
}

// KOMOJUセッション作成関数を追加
async function createKomojuSession(data: any) {
  if (!KOMOJU_API_KEY || !KOMOJU_MERCHANT_UUID) {
    throw new Error("Missing KOMOJU credentials");
  }

  const retries = 3;
  const instance = axios.create({
    baseURL: KOMOJU_ENDPOINT,
    timeout: 30000,  // 30秒に延長
    headers: {
      'Authorization': `Basic ${Buffer.from(KOMOJU_API_KEY + ":").toString("base64")}`
    }
  });

  for (let i = 0; i < retries; i++) {
    try {
      const response = await instance.post('', {
        ...data,
        merchant_uuid: KOMOJU_MERCHANT_UUID,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancel`,
        locale: "ja",
        default_payment_method: "credit_card"
      });
      return { session_url: response.data.session_url };
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error('Failed to create KOMOJU session');
}
