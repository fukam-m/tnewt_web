import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// メール送信用のトランスポーター設定
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function POST(request: Request) {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error("メール設定が不正です");
    }

    const data = await request.json();
    const { last_name: lastName, first_name: firstName, email, phone, amount } = data;

    // デバッグ用のログ追加
    console.log('Email data received:', {
      lastName,
      firstName,
      email,
      phone,
      amount
    });

    // 支払いページのURL生成を修正
    const paymentUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/check?` + new URLSearchParams({
      name: `${lastName} ${firstName}`,
      email: email,
      phone: phone,
      amount: amount.toString()
    }).toString();

    // メールの内容を作成
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "予約内容の確認 / Booking Confirmation",
      html: `
        <h2>予約内容の確認 / Booking Confirmation</h2>
        
        <p>以下の内容で承りました。/ We have received your booking information as follows:</p>
        
        <div style="margin: 20px 0; padding: 20px; background-color: #f8f9fa; border-radius: 5px;">
          <p><strong>お名前 / Name:</strong> ${lastName} ${firstName}</p>
          <p><strong>メールアドレス / Email:</strong> ${email}</p>
          <p><strong>電話番号 / Phone:</strong> ${phone}</p>
          <p><strong>予約金額 / Amount:</strong> ¥${amount?.toLocaleString() || '0'}</p>
        </div>
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="${paymentUrl}" 
             style="background-color: #0070f3; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            お支払いに進む / Proceed to Payment
          </a>
        </div>
        
        <p>上記のボタンをクリックして、お支払い手続きにお進みください。</p>
        <p>Please click the button above to proceed with the payment.</p>
        
        <p style="margin-top: 20px; font-size: 0.9em; color: #666;">
          ご不明な点がございましたら、お気軽にお問い合わせください。<br>
          If you have any questions, please feel free to contact us.
        </p>
      `,
    };

    // メールを送信
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email sending error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "メールの送信に失敗しました" },
      { status: 500 }
    );
  }
} 