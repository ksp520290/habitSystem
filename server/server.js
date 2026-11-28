/* =====================================================================
   習慣の森 Web Push サーバー（最小構成）
   ・役割：端末の購読情報(subscription)と「通知してほしい時刻」を預かり、時刻になったら push を1通送るだけ。
   ・送るのは { type: 'digest' } だけ。通知の中身（ルーティーン／ToDo／復習の最大3件）は、
     受け取った端末の Service Worker が端末内のデータから作る → 個人データはサーバーに置かない。
   ・使い方：  npm install → .env を作る（.env.example 参照）→ npm start
   ・HTTPS必須（push の購読はhttps上のアプリからのみ）。Render / Fly.io / Railway / VPS などにそのまま置ける。
   ===================================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');
const webpush = require('web-push');

try { // .env を簡易に読む（dotenv 不要）
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n').forEach((l) => {
    const m = /^\s*([A-Z_]+)\s*=\s*(.*)\s*$/.exec(l);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  });
} catch (e) {}

const PORT = +process.env.PORT || 8787;
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || '*';
const STORE = process.env.STORE_FILE || path.join(__dirname, 'subscriptions.json');
const TIME_RE = /^\d{1,2}:\d{2}$/;

let subs = {};
try { subs = JSON.parse(fs.readFileSync(STORE, 'utf8')); } catch (e) {}
const saveSubs = () => { try { fs.writeFileSync(STORE, JSON.stringify(subs)); } catch (e) { console.error('保存失敗', e.message); } };

/** 端末ごとの「現地時刻」。tzOffset は JS の getTimezoneOffset()（UTC - 現地、分） */
function localParts(now, tzOffset) {
  const l = new Date(now - (tzOffset || 0) * 60000);
  const pad = (n) => String(n).padStart(2, '0');
  return { day: l.getUTCFullYear() + '-' + (l.getUTCMonth() + 1) + '-' + l.getUTCDate(), hm: pad(l.getUTCHours()) + ':' + pad(l.getUTCMinutes()) };
}

/** 毎分呼ぶ：時刻が一致した端末に push を送る。send は差し替え可能（テスト用） */
async function tick(now, send) {
  send = send || ((sub, body) => webpush.sendNotification(sub, body, { TTL: 3600 }));
  let sent = 0;
  for (const ep of Object.keys(subs)) {
    const s = subs[ep];
    const { day, hm } = localParts(now, s.tzOffset);
    const times = (s.times || []).map((t) => t.replace(/^(\d):/, '0$1:'));
    if (!times.includes(hm)) continue;
    const key = day + '@' + hm;
    if (s.last === key) continue;           // 同じ時刻は1日1回
    s.last = key;
    try { await send(s.subscription, JSON.stringify({ type: 'digest' })); sent++; }
    catch (e) {
      if (e && (e.statusCode === 404 || e.statusCode === 410)) { delete subs[ep]; console.log('期限切れの購読を削除'); }
      else console.error('送信失敗', e && (e.statusCode || e.message));
    }
  }
  if (sent) saveSubs();
  return sent;
}

function readBody(req) {
  return new Promise((ok, ng) => {
    let b = '';
    req.on('data', (c) => { b += c; if (b.length > 20000) { ng(new Error('too large')); req.destroy(); } });
    req.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch (e) { ng(e); } });
  });
}

function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOW_ORIGIN);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  const json = (code, o) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (req.method === 'GET' && req.url === '/api/health') return json(200, { ok: true, subscribers: Object.keys(subs).length });
  if (req.method === 'POST' && req.url === '/api/subscribe') {
    return readBody(req).then((b) => {
      const sub = b.subscription;
      if (!sub || typeof sub.endpoint !== 'string' || !/^https:\/\//.test(sub.endpoint) || !sub.keys) return json(400, { error: 'bad subscription' });
      const times = (Array.isArray(b.times) ? b.times : []).filter((t) => TIME_RE.test(t)).slice(0, 3);
      subs[sub.endpoint] = { subscription: sub, times, tzOffset: Math.max(-840, Math.min(840, +b.tzOffset || 0)), last: (subs[sub.endpoint] || {}).last || '' };
      saveSubs();
      json(200, { ok: true });
    }).catch(() => json(400, { error: 'bad request' }));
  }
  if (req.method === 'POST' && req.url === '/api/unsubscribe') {
    return readBody(req).then((b) => { delete subs[b.endpoint]; saveSubs(); json(200, { ok: true }); }).catch(() => json(400, { error: 'bad request' }));
  }
  json(404, { error: 'not found' });
}

if (require.main === module) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) { console.error('VAPID キーが未設定です。npm run keys で作って .env に入れてください'); process.exit(1); }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  http.createServer(handler).listen(PORT, () => console.log('push server on :' + PORT));
  setInterval(() => tick(Date.now()).catch(console.error), 30000);
}
module.exports = { handler, tick, localParts, _subs: () => subs };
