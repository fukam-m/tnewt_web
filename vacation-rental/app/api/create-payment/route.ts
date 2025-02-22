import { NextResponse } from "next/server";
import { Buffer } from "buffer";
import { headers } from "next/headers";
import { supabase } from "@/lib/supabase-admin";
import https from 'https';
import axios from 'axios';

const KOMOJU_API_KEY = process.env.KOMOJU_API_KEY;
const KOMOJU_MERCHANT_UUID = process.env.KOMOJU_MERCHANT_UUID;
const KOMOJU_ENDPOINT = process.env.KOMOJU_API_URL || "https://komoju.com/api/v1/sessions";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log("Request Data:", data);

    if (!KOMOJU_API_KEY || !KOMOJU_MERCHANT_UUID) {
      throw new Error("環境変数が正しく設定されていません");
    }

    // 環境変数の確認を追加
    console.log('KOMOJU Config:', {
      apiUrl: KOMOJU_ENDPOINT,
      hasMerchantUuid: !!KOMOJU_MERCHANT_UUID,
      hasApiKey: !!KOMOJU_API_KEY
    });

    // KOMOJU設定のより詳細なログ
    console.log('KOMOJU Configuration:', {
      endpoint: KOMOJU_ENDPOINT,
      environment: KOMOJU_ENDPOINT.includes('sandbox') ? 'test' : 'production',
      merchantUuid: {
        exists: !!KOMOJU_MERCHANT_UUID,
        length: KOMOJU_MERCHANT_UUID?.length,
        preview: KOMOJU_MERCHANT_UUID?.substring(0, 4) + '...'
      },
      apiKey: {
        exists: !!KOMOJU_API_KEY,
        length: KOMOJU_API_KEY?.length,
        preview: KOMOJU_API_KEY?.substring(0, 4) + '...'
      }
    });

    // 支払い状態をチェック
    const { data: bookingData, error: bookingError } = await supabase
      .from('customer_info_data')
      .select('status, created_at, id')
      .eq('id', data.booking_id)
      .single();

    // より詳細なログを追加
    console.log('Booking check details:', {
      input: { booking_id: data.booking_id },
      query: {
        table: 'customer_info_data',
        conditions: { id: data.booking_id }
      },
      result: {
        found: !!bookingData,
        data: bookingData,
        error: bookingError
      },
      timestamp: new Date().toISOString()
    });

    if (bookingError) {
      console.error('Booking check error:', {
        error: bookingError,
        details: {
          message: bookingError.message,
          details: bookingError.details,
          hint: bookingError.hint,
          code: bookingError.code
        },
        query: { id: data.booking_id }
      });

      return NextResponse.json(
        { error: "予約情報の確認中にエラーが発生しました", details: bookingError.message },
        { status: 400 }
      );
    }

    if (!bookingData) {
      return NextResponse.json(
        { error: "予約情報が見つかりません" },
        { status: 404 }
      );
    }

    if (bookingData.status === 'paid') {
      return NextResponse.json(
        { error: "この予約は既に支払い済みです" },
        { status: 400 }
      );
    }

    const komojuData = {
      amount: data.amount,
      currency: data.currency,
      external_order_num: data.external_order_num,
      email: data.email,
      name: data.name,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancel`,
      locale: "ja",
      default_payment_method: "credit_card",
      merchant_uuid: KOMOJU_MERCHANT_UUID,
      metadata: {
        booking_id: bookingData.id  // 予約IDをメタデータとして追加
      }
    };

    try {
      // axiosインスタンスの設定
      const instance = axios.create({
        baseURL: KOMOJU_ENDPOINT,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(KOMOJU_API_KEY + ":").toString("base64")}`
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: true
        })
      });

      console.log('KOMOJU API Request:', {
        url: KOMOJU_ENDPOINT,
        method: 'POST',
        data: komojuData
      });

      try {
        const response = await instance.post('', komojuData);

        console.log('KOMOJU API Response:', {
          status: response.status,
          statusText: response.statusText,
          data: response.data
        });

        const paymentSession = response.data;
        
        // 支払いセッション作成後、ステータスを更新
        await supabase
          .from('customer_info_data')
          .update({ status: 'processing' })
          .eq('id', bookingData.id)  // booking_idを使用
          .single();

        return NextResponse.json({ session_url: paymentSession.session_url });

      } catch (axiosError) {
        if (axios.isAxiosError(axiosError)) {
          console.error('KOMOJU API Error:', {
            status: axiosError.response?.status,
            statusText: axiosError.response?.statusText,
            data: axiosError.response?.data,
            message: axiosError.message
          });

          return NextResponse.json(
            { 
              error: "KOMOJU APIとの通信に失敗しました",
              details: axiosError.response?.data || axiosError.message
            },
            { status: axiosError.response?.status || 502 }
          );
        }

        throw axiosError;  // 予期せぬエラーの場合は上位のエラーハンドラーに委ねる
      }
    } catch (error: unknown) {
      console.error("KOMOJU API Error:", error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.json(
          { error: "決済サービスとの通信がタイムアウトしました。しばらく待ってから再度お試しください。" },
          { status: 504 }
        );
      }

      return NextResponse.json(
        { error: "決済サービスとの通信に失敗しました。しばらく待ってから再度お試しください。" },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Payment initialization error:", error);
    return NextResponse.json(
      { error: "予期せぬエラーが発生しました。しばらく待ってから再度お試しください。" },
      { status: 500 }
    );
  }
}
