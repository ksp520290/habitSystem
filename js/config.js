/* =====================================================================
   アプリ設定（ここだけ書き換えれば動作を切り替えられます）
   ・PUSH_SERVER_URL / VAPID_PUBLIC_KEY を設定すると、アプリを閉じていても届く「Web Push」が有効になります。
     空のままなら「サーバーレス運用」（アプリ起動中の判定＋対応ブラウザではService Workerの定期同期）です。
   ・サーバーは server/ フォルダのNode.jsサンプルを使います（README参照）。
   ===================================================================== */
const APP_CFG = {
  PUSH_SERVER_URL: '',      // 例：'https://your-push-server.example.com'
  VAPID_PUBLIC_KEY: '',     // 例：npx web-push generate-vapid-keys で出た Public Key
  REVIEW_MINUTES: 3,        // 復習通知の文面「◯◯を3分復習する」の分数
};
