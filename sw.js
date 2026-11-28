/* =====================================================================
   習慣の森 Service Worker（v2：マルチファイル構成対応）
   1. キャッシュ：画面(HTML/CSS/JS)はネット優先＋オフライン時はキャッシュ、音源はキャッシュ優先＋裏で更新
   2. 通知：push / notificationclick（✅達成・▶開始のアクションボタン）/ periodicsync（定期同期）
   https:// または http://localhost で配信したときだけ有効（file:// では登録されません）。
   ===================================================================== */
importScripts('js/notify/notify-core.js');

const V = 'shukan-v2';
/* ↓ build/make_index.py が index.html の読み込み一覧から自動生成します（手で書き換えなくてOK） */
const SHELL = /*__SHELL__*/["./", "index.html", "manifest.webmanifest", "icon.png", "css/base.css", "css/screens.css", "css/folders.css", "css/components.css", "css/tutorial.css", "css/features.css", "js/config.js", "js/notify/notify-core.js", "js/core/dom-util.js", "js/core/state.js", "js/core/storage.js", "js/core/compat.js", "js/modules/assetManager.js", "js/modules/zipUtil.js", "js/modules/folderList.js", "js/modules/readingSystem.js", "js/modules/dictationSystem.js", "js/core/render.js", "js/features/mypage.js", "js/features/grow.js", "js/core/utils.js", "js/features/diary.js", "js/features/mypage-stats.js", "js/features/edit-mode.js", "js/features/timer-core.js", "js/features/forest-select.js", "js/features/settings.js", "js/features/backup.js", "js/features/tasks-base.js", "js/features/pomodoro-audio.js", "js/features/routine-core.js", "js/features/home.js", "js/features/task-editor.js", "js/features/timer.js", "js/features/forest.js", "js/features/team-api.js", "js/features/team-profile.js", "js/features/team-ui.js", "js/features/review-bot.js", "js/features/explore.js", "js/features/skip-ticket.js", "js/features/team-feed.js", "js/notify/notify-ui.js", "js/features/tutorial.js", "js/main.js"];
const AUDIO = ['assets/audio/in.mp3', 'assets/audio/out.mp3', 'assets/audio/task.mp3', 'assets/audio/rest.mp3', 'assets/audio/勉強用.mp3', 'assets/audio/off.mp3'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    await Promise.allSettled(SHELL.map((u) => c.add(new Request(u, { cache: 'reload' }))));
    await Promise.allSettled(AUDIO.map((u) => c.add(new Request(u, { cache: 'reload' }))));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== V && k.startsWith('shukan-')) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

/* ---------- 音源：Rangeリクエスト（シーク・ループ再生）に、キャッシュ済みデータから応える ---------- */
function ranged(req, res) {
  const h = req.headers.get('range');
  if (!h) return res;
  const m = /bytes=(\d*)-(\d*)/.exec(h);
  if (!m) return res;
  return res.blob().then((b) => {
    let s, e;
    if (m[1] === '') { s = Math.max(0, b.size - (+m[2] || 0)); e = b.size - 1; }
    else { s = +m[1]; e = m[2] === '' ? b.size - 1 : Math.min(+m[2], b.size - 1); }
    return new Response(b.slice(s, e + 1), {
      status: 206, statusText: 'Partial Content',
      headers: { 'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg', 'Content-Range': `bytes ${s}-${e}/${b.size}`, 'Content-Length': String(e - s + 1) },
    });
  });
}

self.addEventListener('fetch', (e) => {
  const q = e.request;
  if (q.method !== 'GET') return;
  const u = new URL(q.url);
  if (u.origin !== location.origin) return;

  if (/\.(mp3|m4a|wav|ogg)$/i.test(u.pathname)) {            // 音源：キャッシュ優先＋裏で更新
    e.respondWith((async () => {
      const c = await caches.open(V), hit = await c.match(u.href);
      const fresh = fetch(u.href, { cache: 'no-cache' }).then((r) => { if (r.status === 200) c.put(u.href, r.clone()); return r; }).catch(() => null);
      if (hit) { e.waitUntil(fresh); return ranged(q, hit); }
      const r = await fresh;
      return r ? ranged(q, r) : Response.error();
    })());
    return;
  }
  if (q.mode === 'navigate' || /\.(html|css|js|json|webmanifest|png)$/i.test(u.pathname)) {   // 画面：ネット優先、オフライン時はキャッシュ
    e.respondWith((async () => {
      const c = await caches.open(V);
      try {
        const r = await fetch(q);
        if (r.ok && !u.search) c.put(q, r.clone());
        return r;
      } catch (err) {
        const h = (await c.match(q, { ignoreSearch: true })) || (q.mode === 'navigate' ? await c.match('index.html', { ignoreSearch: true }) : null);
        return h || Response.error();
      }
    })());
  }
});

/* =====================================================================
   通知
   ===================================================================== */
const ICON = () => new URL('icon.png', self.registration.scope).href;

function showItem(it) {
  const max = (typeof Notification !== 'undefined' && Notification.maxActions) || 0;
  return self.registration.showNotification(it.title, {
    body: it.body,
    icon: ICON(), badge: ICON(),
    tag: 'habit-' + it.slot, renotify: true,
    data: { kind: it.kind, id: it.id, slot: it.slot },
    actions: (it.actions || []).slice(0, max),   // 「✅ 達成」「▶ 開始」
  });
}

/* Web Push 受信：サーバーは「起こす」だけ（中身は端末内の状態から作る＝個人データをサーバーに置かない） */
self.addEventListener('push', (e) => {
  e.waitUntil((async () => {
    let d = {};
    try { d = e.data ? e.data.json() : {}; } catch (_) { try { d = { body: e.data.text() }; } catch (__) {} }
    if (d.title && d.type !== 'digest') {   // サーバーが文面ごと送ってきた場合
      await self.registration.showNotification(d.title, { body: d.body || '', icon: ICON(), badge: ICON(), tag: d.tag || 'habit-push', data: d.data || {} });
      return;
    }
    const n = await HabitNotify.run({ show: showItem, force: true });
    if (!n) {   // userVisibleOnly の購読では、受信のたびに何か表示する必要がある
      await self.registration.showNotification('習慣の森', { body: '今日の習慣はすべて達成済みです 🌳', icon: ICON(), badge: ICON(), tag: 'habit-none' });
    }
  })());
});

/* 通知クリック：アプリのタブを開く（すでに開いていればフォーカス）。✅ / ▶ はアプリ側に処理を依頼する */
self.addEventListener('notificationclick', (e) => {
  const n = e.notification, d = n.data || {}, action = e.action || 'open';
  n.close();
  e.waitUntil((async () => {
    const msg = { type: 'NOTIF_ACTION', action, kind: d.kind || '', id: d.id == null ? '' : d.id, slot: d.slot || '' };
    const scope = self.registration.scope;
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const c = all.find((x) => x.url.startsWith(scope));
    if (c) {
      try { if ('focus' in c) await c.focus(); } catch (_) {}
      c.postMessage(msg);
      return;
    }
    // タブが無いとき：開いて、起動後にアプリが ?na= を読んで処理する
    const qs = '?na=' + encodeURIComponent(action) + '&nk=' + encodeURIComponent(msg.kind) + '&ni=' + encodeURIComponent(msg.id);
    if (self.clients.openWindow) await self.clients.openWindow(new URL('index.html' + qs, scope).href);
  })());
});

/* 定期同期（Chromeのインストール済みPWAなど）：ページが開かれていないときだけ、まとめ通知の時刻を判定 */
self.addEventListener('periodicsync', (e) => {
  if (e.tag !== 'habit-digest') return;
  e.waitUntil((async () => {
    const cl = await self.clients.matchAll({ type: 'window' });
    if (cl.some((c) => c.visibilityState === 'visible')) return;
    await HabitNotify.run({ show: showItem, grace: 180 });
  })());
});
