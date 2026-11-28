# 習慣の森（マルチファイル構成）

単一HTML（習慣の森.html）を、機能別の HTML / CSS / JavaScript に分割し、通知・ホーム・探索・継続支援・教材編集・チームの各改修を入れた版です。
サーバーサイド：**なし（クライアントサイド完結）**。ただし、アプリを閉じていても時刻どおり通知したい場合だけ、任意で `server/`（Node.js・Web Push）を使えます。

## ディレクトリ構成

```
habit-forest/
├─ index.html                 画面の骨組み。CSS/JSを依存順に読み込む（クラシックスクリプト＝グローバルのlet/constを共有）
├─ manifest.webmanifest       PWA情報（ホーム画面に追加／定期同期・プッシュの前提）
├─ sw.js                      Service Worker（キャッシュ＋push／notificationclick／periodicsync）
├─ icon.png                   アイコン（通知にも使用）
├─ css/
│  ├─ base.css                変数・レイアウト・カード・ナビ・タイル等の基本
│  ├─ screens.css             共通画面（ヘッダー、ダイアログ、パネル、設定アコーディオン）
│  ├─ folders.css             フォルダ一覧・音読ディクテ画面の見た目
│  ├─ components.css          アイコン画像、樹種・成長段階
│  ├─ tutorial.css            チュートリアル（スポットライト）
│  └─ features.css            今回追加：今日の木／探索／#復習の色／チームの日付ヘッダー・bot／教材編集
├─ js/
│  ├─ config.js               設定（Push用サーバーURL・VAPID公開鍵・復習の分数）
│  ├─ notify/
│  │  ├─ notify-core.js       通知の中核（ページとService Workerで共有）：対象を最大3件に絞る／習慣トリガー文面／時刻判定
│  │  └─ notify-ui.js         許可リクエスト・表示・✅/▶の処理・設定画面・Web Push購読
│  ├─ core/                   dom-util / state（既定値）/ storage（IndexedDB）/ compat（Router・ダイアログ）/ render（5タブのナビ）/ utils
│  ├─ modules/                assetManager / zipUtil / folderList / readingSystem / dictationSystem（教材編集画面を刷新）
│  ├─ features/
│  │  ├─ home.js              ホーム（今日の木・ルーティーン/ToDo一覧）
│  │  ├─ routine-core.js      達成・日付切替（checkDay）・並び替え（rtOrder）
│  │  ├─ task-editor.js       ルーティーン/ToDoの追加・編集（ポモドーロの集中/休憩を保存）
│  │  ├─ timer.js / timer-core.js / pomodoro-audio.js   タイマー・BGM・ペナルティ
│  │  ├─ explore.js / diary.js                          探索タブ（霧晴れの開拓日誌）
│  │  ├─ skip-ticket.js       さぼり許容チケット
│  │  ├─ team-feed.js         チーム画面（今日/過去・報告bot・復習bot・ToDo連携）
│  │  ├─ team-api.js / team-profile.js / team-ui.js / review-bot.js   チーム通信・投稿・復習の予約
│  │  └─ mypage*.js / grow.js / forest*.js / settings.js / backup.js / tutorial.js / edit-mode.js / tasks-base.js
│  └─ main.js                 起動処理
├─ assets/audio/              効果音・BGM（in/out/task/rest/勉強用/off .mp3 を置く。配布ZIPには含まれません）
├─ server/                    （任意）Web Push用の最小Node.jsサーバー
└─ tools/make-zip.sh, make-zip.ps1   ZIP化スクリプト
```

※ 画面（HTML）はJSのテンプレートで描画する作りのため、HTMLファイルは `index.html`（骨組み）だけです。

## セットアップ

1. `assets/audio/` に、元のプロジェクトの `in.mp3 out.mp3 task.mp3 rest.mp3 勉強用.mp3 off.mp3` をコピー（無くても動きます）。
2. https か `localhost` で配信（Service Worker・通知・暗号化(チーム)は `file://` では動きません）。
   ```
   cd habit-forest
   python3 -m http.server 8000      # → http://localhost:8000/
   ```
3. 以前のデータは、旧アプリの「マイページ → バックアップ（ZIP/JSON）」で書き出し、新しいアプリで「復元」できます。
   （同じオリジンで開けば、IndexedDBの保存データはそのまま引き継がれます）

## 通知の仕組み

| 場面 | 仕組み |
|---|---|
| アプリを開いている | 30秒ごとに `NTFUI.tick()` が、設定した「まとめ通知の時刻」を判定して送る |
| 閉じている（サーバーなし） | 対応ブラウザ（Chrome/Edge系のインストール済みPWA）の **定期同期**（`periodicsync`）。OSの都合で頻度は粗く、時刻ぴったりは保証されません |
| 閉じている（サーバーあり） | **Web Push**。`server/` が時刻に「起こす」だけ送り、中身は端末内のデータから作る |

* 対象は **ルーティーン1・ToDo1・復習(#復習)1 の最大3件**。通知にはタグ（`habit-rt/tk/rv`）が付き、新しい通知は古いものを置き換えます。
* 文面は **【既存の日常習慣】＋内容**。例：`【お風呂から出たら】英単語を3分復習する`
  「既存の日常習慣」は、マイページ → 🔔通知設定 → 🪝習慣トリガー で登録（復習用の既定も選べます）。ルーティーンは「タイミング」欄、ToDoは「きっかけ」欄が使われます。
* ボタン：全通知に **✅ 達成**。タイマー／ポモドーロ／ストップウォッチ付きのルーティーンには **▶ 開始** も付きます。
  押すとタブを開く（開いていればフォーカス）→ アプリ側で達成／計測開始。タブが無いときは `?na=…` 付きで新しく開き、起動後に処理します。
* 通知が拒否（denied）のとき：許可のしかたを案内し、アプリを開いている間は画面内のメッセージで代替します。
* ※ iOS Safari は通知のアクションボタン非対応（ホーム画面に追加したアプリでの通知自体は可）。

### Web Push（任意）を有効にする
```
cd server
npm install
npx web-push generate-vapid-keys        # Public / Private Key を控える
cp .env.example .env                    # キーを書き込む
npm start                               # https で公開（Render / Fly.io / Railway / VPS など）
```
`js/config.js` に `PUSH_SERVER_URL`（サーバーのURL）と `VAPID_PUBLIC_KEY` を設定 → アプリで通知を許可すると自動で購読（`pushManager.subscribe`）して、通知時刻をサーバーに登録します。
Firebase Cloud Functions で組む場合も、同じ「時刻に `{type:'digest'}` を1通送る」だけの関数＋ `subscribe` 受付で置き換えられます。

## 動作確認の手順

1. `python3 -m http.server 8000` → `http://localhost:8000/`（スマホ実機は https が必要。ngrok / Cloudflare Tunnel や GitHub Pages など）。
2. DevTools → Application → Service Workers で `sw.js` が activated、Cache Storage に `shukan-v2`。
3. 通知：マイページ → 🔔通知設定 →「通知を許可する」→「🧪テスト通知」。3件（ルーティーン/ToDo/復習）が出て、✅ や ▶開始 を押すとアプリ側で反映。
   DevTools → Application → Service Workers → Push に `{"type":"digest"}` を入力して Push、Periodic Sync に `habit-digest` を入力して試せます。
4. ホーム：最上部が「今日の木」。ルーティーンを達成すると一番下へ。日付を翌日に変える（端末の日付変更 or DevToolsで `S.lastDay` を昨日にして30秒待つ）と元の順に戻る。
5. ポモドーロ：ルーティーン編集 → 計測「ポモドーロ」を選ぶと集中/休憩の欄が出る。保存後の▶はそのまま開始。
6. さぼり許容チケット：コンソールで `S.lastDay` を昨日にして、7日以上の習慣を未達成のまま `checkDay();render()` → 確認ポップアップ。
7. 教材編集：探索 → 音読ディクテ → 教材を開く。音声を再生して「✂カット」。文をタップで選択→カット（1つ前の終了から再生）。長押しで文章編集。
8. チーム：マイページ等で「学習報告」を投稿 → 復習予約。コンソールで `S.rv.forEach(v=>v.due=0);rvCheck()` → ToDoに「#復習」が追加（水色→達成で青）。日付を進めるとチームの過去の達成状況で 緑／水色。

## 仕様の解釈メモ（変えたいときの場所）

* 下部ナビのラベル「森林・森」は依頼文どおり。変更は `js/core/render.js` の `NAV_ITEMS`。
* **さぼり許容チケット**（`js/features/skip-ticket.js`）
  * 対象は全ルーティーンの連続日数で決定：7日以上の習慣があればその習慣だけ／無ければ最大の習慣だけ（同数なら選択）。その習慣が**前日に未達成**で途切れたときだけ、翌日の起動時に確認。
  * 2日以上あいた場合は対象外（チケットは1日ぶん）。週は月曜始まり。コスト＝所有コイン×50%（切り捨て）。
* **復習bot の色**：今日は 未達成＝水色／達成＝青（ToDoと同じ）。日付が変わると 達成＝緑／未達成＝水色。
* 復習ToDo（#復習）は、その日の終わりに結果をチームの復習botに確定して、ToDoからは消えます。
* 旧「昨日の達成状況」は「過去の達成状況」（昨日以前すべて・日付ヘッダー付き）になりました。
* ホーム最上部の既定表示は初回のみ「今日の木」に移行（以降は選んだ表示を保存）。
