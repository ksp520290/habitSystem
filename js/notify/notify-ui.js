/* =====================================================================
   通知（ページ側）：許可リクエスト／通知の表示／アクションボタンの処理／設定画面／Web Push購読
   中核の「誰に何を出すか」は notify-core.js（HabitNotify）に集約。
   ・アプリ起動中：remind()（30秒ごと）→ NTFUI.tick() が、まとめ通知の時刻を判定
   ・アプリを閉じている間：①対応ブラウザは periodicsync ②Web Push（server/ を立てた場合）
   ・通知の✅/▶ボタンを押すと、sw.js → postMessage（または ?na= 付きURL）→ NTFUI.handle() で処理
   ===================================================================== */
const NTFUI = (() => {
  const sup = () => typeof Notification !== 'undefined';
  const perm = () => (sup() ? Notification.permission : 'unsupported');
  const iconUrl = () => new URL('icon.png', location.href).href;
  const BG = { sw: false, periodic: false, push: false };   // 設定画面に出す現在の対応状況
  const PEND = [];                                          // 起動完了前に届いた通知アクション
  let REG = null;

  async function getReg() {
    if (REG) return REG;
    try { if ('serviceWorker' in navigator) REG = (await navigator.serviceWorker.getRegistration()) || null; } catch (e) {}
    return REG;
  }

  /* ---------- 通知の表示（アクションボタンは showNotification でしか出せない） ---------- */
  async function show(title, o) {
    if (perm() !== 'granted') return false;
    const opt = Object.assign({ icon: iconUrl(), badge: iconUrl() }, o || {});
    if (opt.actions) opt.actions = opt.actions.slice(0, Notification.maxActions || 0);
    try {
      const r = await getReg();
      if (r && r.showNotification) { await r.showNotification(title, opt); return true; }
    } catch (e) {}
    try {   // Service Workerが無い環境（file:// など）：アクション無しの通常通知
      const o2 = Object.assign({}, opt); delete o2.actions;
      const n = new Notification(title, o2);
      n.onclick = () => { try { window.focus(); } catch (e) {} n.close(); };
      return true;
    } catch (e) { return false; }
  }
  const showItem = (it) => show(it.title, { body: it.body, tag: 'habit-' + it.slot, renotify: true, data: { kind: it.kind, id: it.id, slot: it.slot }, actions: it.actions });

  /* ---------- 許可リクエスト ---------- */
  function deniedGuide() {
    return uiAlert('通知がブロックされています。\n\n【許可のしかた】\n・PC（Chrome/Edge）：アドレスバー左の🔒 →「通知」→「許可」\n・Android：ブラウザの⋮ →「サイト設定」→「通知」\n・iPhone：Safariで「ホーム画面に追加」したアプリから開き、設定アプリ →「通知」\n\n許可したあと、このページを再読み込みしてください。\n※ブロック中も、アプリを開いている間は画面内のメッセージ（トースト）でお知らせします。');
  }
  async function afterGranted() {
    S.notif.on = true; save();
    await afterSW(await getReg());
    pushSync();
  }
  /** 設定画面のボタン／復習の予約時などから呼ぶ。from='review' のときは確認ダイアログ無しで静かに依頼する */
  async function request(from) {
    if (!sup()) { if (from !== 'review') uiAlert('このブラウザは通知に対応していません'); return 'unsupported'; }
    if (perm() === 'denied') { if (from !== 'review') await deniedGuide(); return 'denied'; }
    if (perm() === 'default') {
      let p = 'default';
      try { p = await Notification.requestPermission(); } catch (e) {}
      if (p === 'granted') { await afterGranted(); toast('🔔 通知をONにしました'); }
      else if (p === 'denied' && from !== 'review') await deniedGuide();
      if (S && !TUTSB) render();
      return p;
    }
    await afterGranted();
    return 'granted';
  }

  /* ---------- 起動中の判定：まとめ通知の時刻 ---------- */
  async function tick() {
    if (!ready || TUTSB || !S.notif || !S.notif.on) return;
    const now = new Date(), sent = await HabitNotify.getSent();
    const due = HabitNotify.slotsDue(S, now, sent, 90);
    if (!due.length) return;
    await HabitNotify.markSent(now, due);
    const items = HabitNotify.pickTargets(S, now);          // 最大3件（ルーティーン1・ToDo1・復習1）
    if (!items.length) return;
    if (perm() === 'granted') { for (const it of items) await showItem(it); }
    else toast('🔔 ' + items[0].body.split('\n')[0]);       // 通知が使えないときのフォールバック：画面内メッセージ
  }
  /** 習慣のタイミングが「07:30」形式のとき、その時刻の個別リマインド（アクションボタン付き） */
  function routineReminder(r) {
    const it = HabitNotify.routineItem(S, r);
    if (perm() === 'granted') showItem(it); else toast('⏰ ' + it.body.split('\n')[0]);
  }
  async function test() {
    if (perm() !== 'granted') return request();
    const items = HabitNotify.pickTargets(S, new Date());
    if (!items.length) { await show('習慣の森', { body: 'テスト通知です。今日の未達成の項目はありません 🌳', tag: 'habit-test' }); return; }
    for (const it of items) await showItem(it);
    toast('🧪 テスト通知を送りました（' + items.length + '件）');
  }

  /* ---------- 通知のボタン／タップに対する処理（アプリ側で達成・タイマー開始） ---------- */
  function handle(m) {
    if (!m) return;
    if (!ready) { PEND.push(m); return; }
    if (TUTSB) return;
    checkDay();
    S.modal = ''; S.ed = 0; S.tab = 'home';
    const id = m.id;
    if (m.kind === 'R') {
      S.mode = 'rt';
      const r = S.R.find((x) => x.id == id);
      if (r && m.action === 'done') {
        if (!isDue(r, today)) toast('今日は休みの習慣です');
        else if (r.done && !isMulti(r)) toast('✅ 「' + r.n + '」は達成済みです');
        else { tog(r.id); toast('✅ 「' + r.n + '」を達成にしました'); return; }   // tog() が render() する
      } else if (r && m.action === 'start') {
        if (TM) toast('計測中のタスクがあります');
        else { render(); startT(r.id); return; }
      }
    } else if (m.kind === 'T') {
      S.mode = 'tk';
      const t = S.T.find((x) => x.id == id);
      if (t && m.action === 'done') {
        if (t.c > 0) toast('✅ 「' + t.n + '」は達成済みです');
        else { togT(t.id); toast('✅ 「' + t.n + '」を達成にしました'); return; }
      }
    }
    render();
  }
  function fromUrl() {   // 通知のボタンでアプリが新しく開かれたとき
    try {
      const u = new URL(location.href), a = u.searchParams.get('na');
      if (!a) return;
      const m = { action: a, kind: u.searchParams.get('nk') || '', id: u.searchParams.get('ni') || '' };
      ['na', 'nk', 'ni'].forEach((k) => u.searchParams.delete(k));
      history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
      handle(m);
    } catch (e) {}
  }
  function boot() { fromUrl(); while (PEND.length) handle(PEND.shift()); }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.type === 'NOTIF_ACTION') handle(e.data); });
  }

  /* ---------- 定期同期（サーバーレスで閉じている間も動かす手段。対応はChrome系のインストール済みPWAなど） ---------- */
  async function afterSW(reg) {
    if (reg) REG = reg; else await getReg();
    BG.sw = !!REG;
    if (!REG || perm() !== 'granted' || !S.notif || !S.notif.on) return;
    try {
      if ('periodicSync' in REG) {
        const st = await navigator.permissions.query({ name: 'periodic-background-sync' });
        if (st.state === 'granted') { await REG.periodicSync.register('habit-digest', { minInterval: 6 * 3600 * 1000 }); BG.periodic = true; }
      }
    } catch (e) {}
    try { BG.push = !!(REG.pushManager && (await REG.pushManager.getSubscription())); } catch (e) {}
  }
  async function stopBackground() {
    try { const r = await getReg(); if (r && r.periodicSync) await r.periodicSync.unregister('habit-digest'); } catch (e) {}
    BG.periodic = false;
    await pushUnsubscribe();
  }

  /* ---------- Web Push（サーバーあり）：購読と、通知時刻のサーバーへの登録 ---------- */
  const b64ToU8 = (s) => { const p = '='.repeat((4 - (s.length % 4)) % 4), b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, (c) => c.charCodeAt(0)); };
  const srv = () => (APP_CFG.PUSH_SERVER_URL || '').replace(/\/+$/, '');
  async function pushSync() {
    if (!srv() || !APP_CFG.VAPID_PUBLIC_KEY || perm() !== 'granted' || !S.notif.on) return false;
    try {
      const reg = await getReg();
      if (!reg || !reg.pushManager) return false;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(APP_CFG.VAPID_PUBLIC_KEY) });
      const r = await fetch(srv() + '/api/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), times: S.notif.times, tzOffset: new Date().getTimezoneOffset() }),
      });
      BG.push = r.ok;
      return r.ok;
    } catch (e) { console.warn('[push]', e); return false; }
  }
  async function pushUnsubscribe() {
    try {
      const reg = await getReg(), sub = reg && reg.pushManager ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        if (srv()) await fetch(srv() + '/api/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
        await sub.unsubscribe();
      }
    } catch (e) {}
    BG.push = false;
  }

  return { show, showItem, request, tick, routineReminder, test, handle, boot, afterSW, stopBackground, pushSync, perm, BG, getReg };
})();

/* ---------- 設定画面（マイページ →「🔔 通知設定」） ---------- */
function ntfSettingsHtml() {
  const n = S.notif, p = NTFUI.perm(), BG = NTFUI.BG;
  const pm = { granted: '許可済み', denied: 'ブロック中（ブラウザ設定で変更）', default: '未設定', unsupported: 'このブラウザは未対応' }[p];
  const t = (i) => esc((n.times || [])[i] || '');
  const bgTxt = [
    BG.sw ? '・Service Worker：有効' : '・Service Worker：無効（https / localhost で開くと有効）',
    BG.periodic ? '・定期同期：有効（アプリを閉じていても、ときどき判定）' : '・定期同期：未対応／未許可（Chrome系のインストール済みアプリで有効）',
    APP_CFG.PUSH_SERVER_URL ? (BG.push ? '・Web Push：購読中（アプリを閉じていても時刻どおり届きます）' : '・Web Push：サーバー設定済み（通知を許可するとここが「購読中」になります）') : '・Web Push：サーバー未設定（js/config.js で設定）',
  ].join('<br>');
  const routineRows = S.R.length
    ? S.R.map((r) => `<div class="row" style="margin:6px 0"><span class="sp">⏰ ${esc(r.n)}${/^\d{1,2}:\d{2}/.test(r.w || '') ? ' <span class="sm">（' + esc(r.w) + '）</span>' : ''}</span><input type="checkbox" ${S.rem[r.id] ? 'checked' : ''} onchange="S.rem[${r.id}]=this.checked;save()"></div>`).join('')
    : '<p class="sm">ルーティーンがありません</p>';
  const anchors = (S.anchors || []).map((a, i) => `<span class="chip on" style="display:inline-flex;gap:6px;align-items:center">${esc(a)}<b style="cursor:pointer" onclick="ntfAnchorDel(${i})">×</b></span>`).join(' ') || '<span class="sm">まだ登録がありません</span>';
  return `<div class="row" style="margin:4px 0"><span class="sp"><b>まとめ通知</b>（最大3件：ルーティーン・ToDo・復習から各1つ）</span><input type="checkbox" ${n.on ? 'checked' : ''} onchange="ntfToggle(this.checked)"></div>
<div class="sm" style="margin:2px 0 6px">現在の状態：${pm}</div>
<div class="row"><button class="btn sp" onclick="askNotif()">🔔 通知を許可する</button><button class="btn g sp" onclick="NTFUI.test()">🧪 テスト通知</button></div>
${p === 'denied' ? '<p class="sm" style="color:#d9534f;margin:6px 0 0">通知がブロックされています。「🔔 通知を許可する」を押すと、許可のしかたを表示します。</p>' : ''}
<label class="sm">まとめ通知の時刻（最大3つ。空欄は使いません）</label>
<div class="row"><input type="time" id="nt0" value="${t(0)}" onchange="ntfTimes()"><input type="time" id="nt1" value="${t(1)}" onchange="ntfTimes()"><input type="time" id="nt2" value="${t(2)}" onchange="ntfTimes()"></div>
<p class="sm" style="margin:6px 0">通知には「✅ 達成」ボタンが付き、タイマー／ストップウォッチ付きのルーティーンには「▶ 開始」も付きます。押すとアプリが開いて、その場で達成／計測開始になります。</p>
<div class="sm" style="margin:12px 0 4px"><b>🪝 習慣トリガー</b>（既存の日常習慣）</div>
<p class="sm" style="margin:0 0 6px">登録すると、復習やToDoの通知が「【お風呂から出たら】英単語を3分復習する」のような文面になります。</p>
<div class="row" style="flex-wrap:wrap;gap:6px">${anchors}</div>
<div class="row" style="margin-top:6px"><input id="anin" maxlength="20" placeholder="例：お風呂から出たら"><button class="btn" onclick="ntfAnchorAdd()">追加</button></div>
<label class="sm">復習通知に使うきっかけ</label>
<select onchange="S.rvAnchor=this.value;save()"><option value="">（指定しない）</option>${(S.anchors || []).map((a) => `<option value="${esc(a)}" ${S.rvAnchor === a ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select>
<div class="sm" style="margin:12px 0 4px"><b>⏰ 時刻リマインダー</b>（タイミングを「07:30」形式にした習慣・アプリ起動中）</div>${routineRows}
<div class="sm" style="margin:12px 0 4px"><b>📡 閉じている間の通知</b></div><p class="sm" style="margin:0">${bgTxt}</p>`;
}
function askNotif() { NTFUI.request(); }
async function ntfToggle(on) {
  S.notif.on = !!on; save();
  if (on) { if (NTFUI.perm() !== 'granted') await NTFUI.request(); else { await NTFUI.afterSW(await NTFUI.getReg()); NTFUI.pushSync(); } }
  else NTFUI.stopBackground();
  render();
}
function ntfTimes() {
  const v = [0, 1, 2].map((i) => ($('#nt' + i) || {}).value || '').filter((x) => HabitNotify.TIME_RE.test(x));
  S.notif.times = [...new Set(v)].sort(); save(); NTFUI.pushSync(); toast('通知の時刻を保存しました');
}
function ntfAnchorAdd() {
  const el = $('#anin'), v = (el.value || '').trim().slice(0, 20);
  if (!v) return;
  if (!S.anchors.includes(v)) { if (S.anchors.length >= 12) return uiAlert('登録できるのは12個までです'); S.anchors.push(v); }
  if (!S.rvAnchor) S.rvAnchor = v;
  save(); render();
}
function ntfAnchorDel(i) {
  const a = S.anchors[i]; S.anchors.splice(i, 1);
  if (S.rvAnchor === a) S.rvAnchor = S.anchors[0] || '';
  save(); render();
}
