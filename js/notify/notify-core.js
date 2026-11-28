/* =====================================================================
   通知の中核ロジック（ページ(window)と Service Worker(self) の両方から読み込む）
   ・DOM や画面のグローバル変数には依存しない。状態 S（保存データ）を引数で受け取る。
   ・通知の対象は「ルーティーンから1つ」「ToDoから1つ」「復習(#復習)から1つ」の最大3件。
   ・通知文面は、ユーザーが登録した「既存の日常習慣（きっかけ）」とセットにする。
       例：【お風呂から出たら】英単語を3分復習する
   ===================================================================== */
(function (root) {
  'use strict';
  const DB_NAME = 'shukan_no_mori';
  const RV_TAG = '復習';
  const TIME_RE = /^\d{1,2}:\d{2}$/;
  const pad = (n) => String(n).padStart(2, '0');
  const kd = (d) => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  const tagsOf = (x) => (x && x.tags && x.tags.length ? x.tags : x && x.tag ? [x.tag] : []);
  const isRv = (t) => !!t && (!!t.rv || tagsOf(t).includes(RV_TAG));
  const isDue = (r, d) => !r.days || !r.days.length || r.days.includes(d.getDay());
  const hasTimer = (r) => r.m === 'timer' || r.m === 'sw' || !!r.pomo;

  /* ---------- IndexedDB（ページと同じ DB を読む／通知の送信済み記録を書く） ---------- */
  function openDb() {
    return new Promise((ok, ng) => {
      if (!root.indexedDB) return ng(new Error('IndexedDBなし'));
      const q = root.indexedDB.open(DB_NAME, 1);
      q.onupgradeneeded = () => {
        const d = q.result;
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
        if (!d.objectStoreNames.contains('audio')) d.createObjectStore('audio');
      };
      q.onsuccess = () => ok(q.result);
      q.onerror = () => ng(q.error);
    });
  }
  async function kvGet(key) {
    const db = await openDb();
    try {
      return await new Promise((ok, ng) => {
        const r = db.transaction('kv').objectStore('kv').get(key);
        r.onsuccess = () => ok(r.result);
        r.onerror = () => ng(r.error);
      });
    } finally { db.close(); }
  }
  async function kvPut(key, val) {
    const db = await openDb();
    try {
      await new Promise((ok, ng) => {
        const tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(val, key);
        tx.oncomplete = ok;
        tx.onerror = () => ng(tx.error);
      });
    } finally { db.close(); }
  }
  /** Service Worker用：ページが保存した状態(JSON)を読む */
  async function readState() {
    try {
      const raw = await kvGet('state');
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  async function getSent() {
    try { const v = await kvGet('notif_sent'); if (v) return v; } catch (e) {}
    try { return JSON.parse((root.localStorage && root.localStorage.getItem('shukan_notif_sent')) || 'null') || { day: '', keys: [] }; }
    catch (e) { return { day: '', keys: [] }; }
  }
  async function markSent(now, keys) {
    const day = kd(now);
    const cur = await getSent();
    const v = { day, keys: (cur.day === day ? cur.keys : []).concat(keys) };
    try { await kvPut('notif_sent', v); return; } catch (e) {}
    try { root.localStorage && root.localStorage.setItem('shukan_notif_sent', JSON.stringify(v)); } catch (e) {}
  }

  /* ---------- 通知文面（習慣トリガー） ---------- */
  const trigger = (w) => (w && w !== 'いつでも' ? '【' + w + '】' : '');
  const ACTION_DONE = { action: 'done', title: '✅ 達成' };
  const ACTION_START = { action: 'start', title: '▶ 開始' };

  function routineItem(S, r) {
    return {
      slot: 'rt', kind: 'R', id: r.id,
      title: '🌿 ルーティーン',
      body: trigger(r.w) + r.n + (r.alt ? '\nミニ目標：' + r.alt : ''),
      // タイマー／ストップウォッチが設定されている習慣には「▶開始」も付ける
      actions: hasTimer(r) ? [ACTION_DONE, ACTION_START] : [ACTION_DONE],
    };
  }
  function todoItem(S, t) {
    return { slot: 'tk', kind: 'T', id: t.id, title: '✅ ToDo', body: trigger(t.anchor) + t.n, actions: [ACTION_DONE] };
  }
  function reviewItem(S, t) {
    const an = t.anchor || S.rvAnchor || (S.anchors || [])[0] || '';
    return { slot: 'rv', kind: 'T', id: t.id, title: '📚 復習', body: trigger(an) + t.n, actions: [ACTION_DONE] };
  }

  /** 通知する対象を最大3件（ルーティーン1・ToDo1・復習1）に絞り込む */
  function pickTargets(S, now) {
    now = now || new Date();
    const stale = !!S.lastDay && S.lastDay !== kd(now);   // 日付が変わってからアプリ未起動：ルーティーン・ToDoは全て未達成として扱う
    const R = S.R || [], T = S.T || [], out = [];
    const rDone = (r) => !stale && !!r.done;
    const tDone = (t) => !stale && (!!t.done || t.c > 0);
    const r = R.find((x) => isDue(x, now) && !rDone(x));
    if (r) out.push(routineItem(S, r));
    const tk = T.find((x) => !isRv(x) && !tDone(x));
    if (tk) out.push(todoItem(S, tk));
    const rv = stale ? null : T.find((x) => isRv(x) && !tDone(x));
    if (rv) out.push(reviewItem(S, rv));
    return out.slice(0, 3);
  }

  /** まとめ通知の時刻（S.notif.times）のうち、いま送るべきもの。grace分以内の取りこぼしだけ送る */
  function slotsDue(S, now, sent, grace) {
    const n = S.notif || {};
    if (!n.on) return [];
    const cur = now.getHours() * 60 + now.getMinutes();
    const done = sent && sent.day === kd(now) ? sent.keys : [];
    return (n.times || []).filter((t) => {
      if (!TIME_RE.test(t)) return false;
      const [h, m] = t.split(':').map(Number);
      const mins = h * 60 + m;
      return cur >= mins && cur - mins <= (grace == null ? 90 : grace) && !done.includes(t);
    });
  }

  /** Service Worker用：状態を読み、まとめ通知を出す。force=trueは時刻に関係なく出す（Web Push受信時） */
  async function run(o) {
    const S = o.S || (await readState());
    if (!S) return 0;
    const now = new Date();
    if (!o.force) {
      const due = slotsDue(S, now, await getSent(), o.grace);
      if (!due.length) return 0;
      await markSent(now, due);
    }
    const items = pickTargets(S, now);
    for (const it of items) await o.show(it);
    return items.length;
  }

  root.HabitNotify = { kd, pad, isDue, isRv, hasTimer, trigger, routineItem, todoItem, reviewItem, pickTargets, slotsDue, run, readState, getSent, markSent, RV_TAG, TIME_RE };
})(typeof self !== 'undefined' ? self : this);
