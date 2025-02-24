# 簡単なセットアップ

# テスト環境のセットアップ

WSL上で作業ディレクトリを作成後、リポジトリをクローン
```
git clone git@github.com:fukam-m/tnewt_web.git
```

作業したいブランチをチェックアウト
```
git checkout "ブランチ名"
```

## Cursor等でWSLに接続後ターミナルを開く
テスト環境用のパッケージをインストール
```
sudo apt install npm
```

# vacation-rentalディレクトリに移動していることを確認
```
cd ~/tnewt_web/vacation-rental #自分の環境にあったパス
```

# .env.localファイルを作成
```
touch .env.local
```

# .env.localファイルに以下を記載（自分の環境にあったものを記載）
```
KOMOJU_API_KEY=your_api_key_here
KOMOJU_MERCHANT_UUID=your_merchant_uuid_here
NEXT_PUBLIC_BASE_URL=http://localhost:3000
KOMOJU_API_URL=https://komoju.com/api/v1/sessions
```

# パッケージをインストール
```
npm install --save-dev @types/node
npm install next@latest
```

# node_modulesをインストール
```
npm install
```

# テスト環境を起動
```
npm run dev
```


# テスト環境用のWebhookを設定
```
sudo npm install -g ngrok
ngrok authtoken your_auth_token
ngrok http 3000
```
