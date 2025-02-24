'use client';

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabaseClient } from '@/lib/supabase';  // フロントエンド用クライアント
import type { GuestInfo } from "@/types/database.types";

export default function ConfirmPage() {
  const router = useRouter();
  const [guestInfo, setGuestInfo] = useState<GuestInfo>({
    last_name: "",
    first_name: "",
    email: "",
    phone: "",
    amount: 0,
    status: "pending",
    check_in_date: new Date().toISOString(),
    check_out_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
    id: "",
    address: ""
  });

  useEffect(() => {
    // ローカルストレージのデータをログ
    console.log('LocalStorage Data:', {
      guestInfo: localStorage.getItem("guestInfo"),
      bookingDetails: localStorage.getItem("bookingDetails"),
      bookingAmount: localStorage.getItem("bookingAmount")
    });

    const savedGuestInfo = localStorage.getItem("guestInfo");
    const savedAmount = localStorage.getItem("bookingAmount");
    const savedBookingDetails = localStorage.getItem("bookingDetails");

    if (savedGuestInfo && savedBookingDetails) {
      const parsedInfo = JSON.parse(savedGuestInfo);
      const parsedBooking = JSON.parse(savedBookingDetails);
      const amount = savedAmount ? parseInt(savedAmount, 10) : 0;

      // パース後のデータをログ
      console.log('Parsed Data:', {
        guestInfo: parsedInfo,
        bookingDetails: parsedBooking,
        amount: amount
      });

      setGuestInfo({
        last_name: parsedInfo.last_name || "",
        first_name: parsedInfo.first_name || "",
        email: parsedInfo.email || "",
        phone: parsedInfo.phone || "",
        amount: amount,
        status: "pending",
        check_in_date: parsedBooking.checkIn,
        check_out_date: parsedBooking.checkOut,
        created_at: new Date().toISOString(),
        id: "",
        address: parsedInfo.address || ""
      });
    } else {
      console.log('Missing required data, redirecting to guest-info');
      router.push("/guest-info");
    }
  }, [router]);

  const handleBack = () => {
    router.push("/guest-info");
  };

  // バリデーション関数の追加
  const validateGuestInfo = (info: GuestInfo) => {
    const errors: string[] = [];

    // メールアドレスの検証
    if (!info.email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      errors.push('無効なメールアドレスです');
    }

    // 電話番号の検証
    if (!info.phone?.match(/^[0-9-]{10,}$/)) {
      errors.push('無効な電話番号です');
    }

    // 名前の検証
    if (!info.last_name?.trim() || !info.first_name?.trim()) {
      errors.push('お名前を入力してください');
    }

    // 金額の検証
    if (typeof info.amount !== 'number' || info.amount <= 0) {
      errors.push('無効な金額です');
    }

    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }
  };

  const handleConfirm = async () => {
    try {
      console.log('Pre-validation state:', { guestInfo, localStorage });
      
      // バリデーション
      if (!guestInfo || !localStorage) {
        throw new Error('必要な情報が不足しています');
      }

      // データベースへの登録は削除（guest-info/page.tsxで既に行っているため）

      // メール送信前のデータ確認
      console.log('Sending email with data:', guestInfo);

      const emailResponse = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          last_name: guestInfo.last_name,
          first_name: guestInfo.first_name,
          email: guestInfo.email,
          phone: guestInfo.phone,
          amount: guestInfo.amount
        }),
      });

      if (!emailResponse.ok) {
        console.error('Email sending failed:', await emailResponse.text());
        throw new Error("メール送信に失敗しました");
      }

      // クリーンアップ
      localStorage.removeItem("guestInfo");
      localStorage.removeItem("bookingDetails");
      localStorage.removeItem("bookingAmount");

      router.push("/email-sent");
    } catch (error) {
      console.error("Detailed error:", error);
      throw error;
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>入力内容の確認 / Confirm Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">予約情報 / Booking Information</h2>
              <div className="grid gap-2">
                <div>
                  <p className="text-sm text-gray-500">チェックイン / Check-in</p>
                  <p className="font-medium">
                    {new Date(guestInfo.check_in_date).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">チェックアウト / Check-out</p>
                  <p className="font-medium">
                    {new Date(guestInfo.check_out_date).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              
              <h2 className="text-lg font-semibold">お客様情報 / Guest Information</h2>
              <div className="grid gap-2">
                <div>
                  <p className="text-sm text-gray-500">お名前 / Name</p>
                  <p className="font-medium">{`${guestInfo.last_name} ${guestInfo.first_name}`}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">メールアドレス / Email</p>
                  <p className="font-medium">{guestInfo.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">電話番号 / Phone</p>
                  <p className="font-medium">{guestInfo.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">住所 / Address</p>
                  <p className="font-medium">{guestInfo.address}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">予約金額 / Amount</p>
                  <p className="font-medium">¥{guestInfo.amount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 justify-between">
              <Button
                onClick={handleBack}
                variant="outline"
              >
                修正する / Edit
              </Button>
              <Button
                onClick={handleConfirm}
              >
                確認する / Confirm
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 