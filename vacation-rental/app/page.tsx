'use client';

import { useEffect, useState } from 'react';
import { DateRange } from 'react-day-picker';
import { supabaseClient } from "@/lib/supabase";
import { addDays, eachDayOfInterval } from 'date-fns';
import { BookingForm } from "@/components/booking-form";

interface BookedDates {
  check_in_date: Date;    // カラム名に合わせて修正
  check_out_date: Date;   // カラム名に合わせて修正
}

export default function DetailsPage() {
  const [disabledDates, setDisabledDates] = useState<Date[]>([]);
  
  // 予約済みと仮予約の日付を取得
  useEffect(() => {
    const fetchBookedDates = async () => {
      const { data, error } = await supabaseClient
        .from('customer_info_data')
        .select('check_in_date, check_out_date')
        .in('status', ['waiting', 'paid']);

      if (error) {
        console.error('Error fetching booked dates:', error);
        return;
      }

      // 予約期間中の全日付を取得
      const allBookedDates = data.flatMap(booking => {
        const checkIn = new Date(booking.check_in_date);
        const checkOut = new Date(booking.check_out_date);
        
        // チェックイン日からチェックアウト日までの全日付を取得
        return eachDayOfInterval({
          start: checkIn,
          end: addDays(checkOut, -1) // チェックアウト日は除外
        });
      });

      setDisabledDates(allBookedDates);
    };

    fetchBookedDates();
  }, []);

  // DatePickerのdisabledDays設定
  const disabledDays = {
    from: undefined,
    to: undefined,
    dates: disabledDates
  };

  return (
    <div className="container mx-auto py-8">
      <div className="bg-muted p-6 rounded-lg">
        <h2 className="text-2xl font-semibold mb-6">予約フォーム</h2>
        <BookingForm />
      </div>
    </div>
  );
}
