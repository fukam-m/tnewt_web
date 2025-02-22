import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials');
}

// フロントエンド用のクライアント
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// サーバーサイド専用のクライアントは別ファイルに移動

// 接続テスト用の関数
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabaseClient
      .from('customer_info_data')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }

    console.log('Supabase connection test succeeded');
    return true;
  } catch (error) {
    console.error('Supabase connection test error:', error);
    return false;
  }
} 