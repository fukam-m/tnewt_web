'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { BookingDetails } from "@/types/booking"
import { DateRange } from "react-day-picker"
import { RefreshCw } from "lucide-react"
import { supabaseClient } from "@/lib/supabase"

const OPTIONS = [
  { id: "breakfast", label: "朝食付き (+2000円)" },
  { id: "bbq", label: "BBQセット (+5000円)" },
  { id: "parking", label: "駐車場 (+1000円)" },
]

export function BookingForm() {
  const router = useRouter()
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [booking, setBooking] = useState<BookingDetails>({
    checkIn: new Date(0),
    checkOut: new Date(0),
    guests: 1,
    options: [],
    couponCode: ""
  })
  const [isCouponApplied, setIsCouponApplied] = useState(false)
  const [couponMessage, setCouponMessage] = useState<{ text: string; isSuccess: boolean } | null>(null)
  const [totalPrice, setTotalPrice] = useState(1000);
  const [error, setError] = useState<string | null>(null);

  const calculateNights = (checkIn: Date, checkOut: Date) => {
    const diffTime = checkOut.getTime() - checkIn.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  }

  const calculateTotal = (currentBooking: BookingDetails) => {
    let total = 0

    const nights = calculateNights(currentBooking.checkIn, currentBooking.checkOut)
    total += nights * 1000

    total += currentBooking.guests * 1000

    currentBooking.options.forEach(option => {
      switch (option) {
        case "breakfast":
          total += 2000
          break
        case "bbq":
          total += 5000
          break
        case "parking":
          total += 1000
          break
      }
    })

    if (isCouponApplied) {
      total -= 1000
    }

    return total
  }

  useEffect(() => {
    const newTotal = calculateTotal(booking);
    setTotalPrice(newTotal);
    localStorage.setItem("bookingAmount", JSON.stringify(newTotal));
  }, [booking, isCouponApplied]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!dateRange?.from || !dateRange?.to) {
        setError("チェックイン・チェックアウト日を選択してください。");
        return;
      }

      localStorage.setItem("bookingDetails", JSON.stringify({
        checkIn: dateRange.from,
        checkOut: dateRange.to,
        guests: booking.guests,
        options: booking.options,
        couponCode: booking.couponCode
      }));

      router.push("/guest-info");
    } catch (err) {
      setError("エラーが発生しました。もう一度お試しください。");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-lg">
          {error}
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <Label>チェックイン/チェックアウト日</Label>
          <div className="flex flex-col space-y-4">
            <div className="grid gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>チェックイン・チェックアウト</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDateRange(undefined)
                      setBooking(prev => ({
                        ...prev,
                        checkIn: new Date(0),
                        checkOut: new Date(0)
                      }))
                      setIsCouponApplied(false)
                      setCouponMessage(null)
                      setBooking(prev => ({
                        ...prev,
                        couponCode: ""
                      }))
                    }}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    リセット
                  </Button>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <div>
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, 'yyyy/MM/dd', { locale: ja })}
                              {" - "}
                              {format(dateRange.to, 'yyyy/MM/dd', { locale: ja })}
                            </>
                          ) : (
                            format(dateRange.from, 'yyyy/MM/dd', { locale: ja })
                          )
                        ) : (
                          "日付を選択"
                        )}
                      </div>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={new Date()}
                      selected={dateRange}
                      onSelect={(range) => {
                        if (range?.to && range.from && range.to < range.from) {
                          return;
                        }
                        setDateRange(range);
                        if (range?.from instanceof Date && range?.to instanceof Date) {
                          const checkIn = new Date(range.from);
                          const checkOut = new Date(range.to);
                          
                          setBooking(prev => ({
                            ...prev,
                            checkIn,
                            checkOut
                          }));
                        }
                      }}
                      numberOfMonths={2}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today;
                      }}
                    />
                  </PopoverContent>
                </Popover>

                {dateRange?.from && dateRange?.to && (
                  <div className="text-center text-sm text-muted-foreground">
                    宿泊日数：
                    {Math.floor(
                      (dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)
                    )}泊
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="guests">宿泊人数</Label>
            <Input
              id="guests"
              type="number"
              min={1}
              max={4}
              value={booking.guests}
              onChange={(e) =>
                setBooking({ ...booking, guests: parseInt(e.target.value) })
              }
            />
          </div>

          <div className="space-y-4">
            <Label>オプション</Label>
            {OPTIONS.map((option) => (
              <div key={option.id} className="flex items-center space-x-2">
                <Checkbox
                  id={option.id}
                  checked={booking.options.includes(option.id)}
                  onCheckedChange={(checked) => {
                    setBooking({
                      ...booking,
                      options: checked
                        ? [...booking.options, option.id]
                        : booking.options.filter((id) => id !== option.id),
                    })
                  }}
                />
                <Label htmlFor={option.id}>{option.label}</Label>
              </div>
            ))}
          </div>

          <div className="grid gap-2">
            <Label>クーポンコード</Label>
            <div className="flex gap-2">
              <Input
                placeholder="クーポンコードを入力"
                value={booking.couponCode}
                onChange={(e) => setBooking(prev => ({ ...prev, couponCode: e.target.value }))}
                disabled={isCouponApplied}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (booking.couponCode === "aaa") {
                    setCouponMessage({ text: "クーポンの発行に成功しました", isSuccess: true })
                    setIsCouponApplied(true)
                  } else {
                    setCouponMessage({ text: "クーポンの発行に失敗しました", isSuccess: false })
                    setIsCouponApplied(false)
                    setBooking(prev => ({ ...prev, couponCode: "" }))
                  }
                }}
              >
                {isCouponApplied ? "適用済" : "決定"}
              </Button>
            </div>
            {couponMessage && (
              <p className={`text-sm ${couponMessage.isSuccess ? 'text-green-600' : 'text-red-600'}`}>
                {couponMessage.text}
              </p>
            )}
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full">次へ</Button>

      <div className="mt-4 p-4 border rounded-lg bg-muted">
        <div className="flex justify-between items-center">
          <span className="font-semibold">合計金額</span>
          <span className="text-xl font-bold">¥{calculateTotal(booking).toLocaleString()}</span>
        </div>
      </div>
    </form>
  )
}

