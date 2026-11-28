/* =====================================================================
   チーム画面：メッセージの「今日／過去」振り分けと、復習bot・ToDo自動連携
   ・今日の達成状況：今日の「報告bot」の達成状況／今日の「復習bot」の通知／今日の自分（とチーム）の投稿
   ・過去の達成状況：昨日以前のメッセージ（日付が変わるところに日付ヘッダー）
   ・復習botの今日の分は、ToDoに「#復習」タグ付きで自動追加（未達成＝水色、達成＝青）
   ・日付が変わると、チーム画面の復習botのメッセージは、達成済み＝緑／未達成＝水色になる
   ===================================================================== */
const RV_MIN=(typeof APP_CFG!='undefined'&&APP_CFG.REVIEW_MINUTES)||3;
const dayStart=k=>{const[a,b,c]=k.split('-').map(Number);return new Date(a,b-1,c).getTime()};
const dayLabel=k=>{const[a,b,c]=k.split('-').map(Number),d=new Date(a,b-1,c);return a+'/'+pad(b)+'/'+pad(c)+'（'+WD[d.getDay()]+'）'};
const hm2ms=tm=>{const m=/^(\d{1,2}):(\d{2})/.exec(tm||'');return m?(+m[1]*60+ +m[2])*60000:0};
const rvTopic=t=>{const m=/「([^」]+)」/.exec(t||'');return ((m?m[1]:String(t||'').replace(/^📚\s*/,'').split(/[\s　]/)[0])||'学習').slice(0,16)};
const rvAnchorNow=()=>S.rvAnchor||(S.anchors||[])[0]||'';

/* ---------- 復習bot → ToDo（#復習） ---------- */
function rvSyncTodos(){const tk=kd(today);let ch=0;
S.rr.forEach(e=>{if(e.fin||e.del||kd(new Date(e.at))!=tk)return;if(e.tid&&S.T.some(t=>t.id==e.tid))return;
const id=Date.now()+ch++;S.T.push({id,n:(e.tp||rvTopic(e.t))+'を'+RV_MIN+'分復習する',ic:'📚',st:0,done:0,c:0,tags:[HabitNotify.RV_TAG],tag:HabitNotify.RV_TAG,rv:e.id,anchor:e.an||''});e.tid=id});
if(ch)save();return ch}
/* 日付が変わったとき：その日の復習ToDoの結果を復習botの記録に確定し、ToDoからは外す */
function rvFinalize(k){S.T.filter(t=>t.rv).forEach(t=>{const e=S.rr.find(v=>v.id==t.rv);if(e){e.fin=1;e.ok=t.c>0?1:0}});
S.T=S.T.filter(t=>!t.rv);S.rr.forEach(e=>{if(!e.fin&&kd(new Date(e.at))!=k)e.fin=1})}
function rvNotify(m){const t=S.T.find(x=>HabitNotify.isRv(x)&&!(x.c>0));
if(t&&NTFUI.perm()==='granted')NTFUI.showItem(HabitNotify.reviewItem(S,t));else ntf(m,'🤖 復習bot')}

/* ---------- 表示用メッセージの組み立て ---------- */
function teamItems(on){const tk=kd(today),yk=ykey(),it=[];
const posts=on?TP.map(p=>Object.assign({},p,{day:p.day||tk})):S.P.map((p,i)=>({idx:i,uid:p.bot?'bot':p.u=='あなた'?'me':'demo:'+p.u,name:p.u,icon:p.bot?'🐱':p.u=='あなた'?(S.team.icon||'🙂'):'🙂',t:p.t,img:p.img,tm:p.tm,st:p.st,bot:p.bot,lid:p.lid,ed:p.ed,day:p.day||(p.d=='td'?tk:yk)}));
posts.forEach((p,i)=>it.push({k:'post',day:p.day,ts:dayStart(p.day)+hm2ms(p.tm)+i,p}));
S.rr.forEach((e,i)=>it.push({k:'rv',day:kd(new Date(e.at)),ts:e.at,e,i}));
it.push({k:'rep',day:tk,ts:dayStart(tk),live:1});
Object.keys(S.hist).forEach(d=>{if(d==tk)return;const h=S.hist[d];if(!h||!h.t)return;if(dayStart(d)<Date.now()-14*864e5)return;it.push({k:'rep',day:d,ts:dayStart(d)+86399000,h})});
return it}
function teamPostHtml(p,on){return `<div class="post">${p.bot?`<div style="font-size:28px">🐱</div>`:`<button class="av" onclick="memberOpen('${esc(p.uid)}')" title="${esc(p.name)}のプロフィール">${icoHtml(icOf(p))}</button>`}<div class="bub"><div class="sm row"><span class="sp">${esc(p.name)} ${esc(p.tm)}${p.ed?' （編集済み）':''}</span>${(on?(!p.bot&&p.uid&&p.uid==S.team.uid):(!p.bot&&p.uid=='me'))?`<button class="chip" onclick="pEdit(${on?`'${esc(p.id)}'`:p.idx})">✏️ 編集</button>`:''}</div>${safeImg(p.img)?`<img src="${esc(safeImg(p.img))}">`:''}${esc(p.t)}<div style="margin-top:4px">${p.st.map(esc).join(' ')} ${p.bot?'':`<button class="chip" onclick="${on?`teamStamp('${esc(p.id)}')`:`stamp(${p.idx})`}">👍 ❤️</button>`}</div></div></div>`}
/* 復習bot：今日＝未達成は水色／達成は青、昨日以前＝達成は緑／未達成は水色 */
function rvBubbleHtml(x){const e=x.e,td=x.day==kd(today),tgt=e.tid?S.T.find(t=>t.id==e.tid):null,ok=td?!!(tgt&&tgt.c>0):!!e.ok;
const cls=td?(ok?'rvb-blue':'rvb-sky'):(ok?'rvb-green':'rvb-sky'),d=new Date(e.at);
const st=td?(ok?'✅ ToDoで達成済み':(e.del?'ToDoは削除されました':'ToDoの「#復習」で達成できます')):(ok?'✅ 達成しました':'⬜ 未達成');
return `<div class="post"><div style="font-size:28px">📚</div><div class="bub ${cls}" data-rv="${esc(e.id)}"><div class="sm row"><span class="sp">🤖 復習bot ${pad(d.getHours())}:${pad(d.getMinutes())}</span>${e.rd?'':`<button class="chip" onclick="rvRead(${x.i})">既読</button>`}</div>
<b>${e.an?'【'+esc(e.an)+'】':''}${esc(e.tp||rvTopic(e.t))}を${RV_MIN}分復習する</b><div class="sm">${e.n}日後の復習 ・ ${st}</div><div class="sm">投稿「${esc(String(e.t||'').slice(0,28))}」</div></div></div>`}
/* 報告bot：今日の達成状況（その場の集計）／過去の日の達成状況（記録から） */
function repBubbleHtml(x){let msg,pct='';
if(x.live){const du=due(),dn=du.filter(r=>r.done).length,tn=S.T.length,td=S.T.filter(t=>t.c>0).length;msg=`📊 今日の達成状況：ルーティーン ${dn}/${du.length}`+(tn?`・ToDo ${td}/${tn}`:'');if(du.length)pct=Math.round(dn/du.length*100)}
else{msg=`📊 達成状況：ルーティーン ${x.h.d}/${x.h.t}`+(x.h.m?`・集中${x.h.m}分`:'')+(x.h.sk&&x.h.sk.length?' ・🎫お守り使用':'');pct=x.h.t?Math.round(x.h.d/x.h.t*100):''}
return `<div class="post"><div style="font-size:28px">🤖</div><div class="bub"><div class="sm">報告bot${x.live?' ・ 更新中':''}</div><b>${msg}</b>${pct!==''?`<div class="prgb"><i style="width:${pct}%"></i></div>`:''}</div></div>`}

function team(){const on=teamOn();if(on)teamPull();
const v=S.tdy=='past'?'past':'td',tk=kd(today),all=teamItems(on);
const sel=all.filter(x=>v=='td'?x.day==tk:x.day!=tk).sort((a,b)=>v=='td'?a.ts-b.ts:(a.day==b.day?a.ts-b.ts:dayStart(b.day)-dayStart(a.day)));
const tp=all.filter(x=>x.k=='post'&&x.day==tk),n=new Set(tp.filter(x=>!x.p.bot).map(x=>x.p.uid)).size,tot=on?Math.max(Object.keys(TMEM).length,n,1):5;
let h='';
if(!on)h+=`<div class="card row"><span class="sp sm">🔗 いまは一人用のデモ表示です。別の端末の仲間とチームを組めます。</span><button class="btn" onclick="teamSetup()">チーム</button></div>`;
else if(TERR)h+=`<div class="card sm" style="color:#d9534f">⚠ 同期できません：${esc(TERR)}</div>`;
h+=`<div class="card"><div class="row"><b class="sp">${esc(on?(S.team.tname||'チーム'):'バランスのいい食事')}</b><select class="s" onchange="S.tdy=this.value;save();render()"><option value="td" ${v=='td'?'selected':''}>今日の達成状況</option><option value="past" ${v=='past'?'selected':''}>過去の達成状況</option></select><b>${n}/${tot}人</b>${on?`<button class="btn g" onclick="teamSetup()">⚙</button>`:''}</div>${on&&Object.keys(TMEM).length?`<div class="chips" style="margin-top:6px">${Object.keys(TMEM).map(u=>`<button class="chip" onclick="memberOpen('${u}')">${icoHtml(TMEM[u].icon,18)} ${esc(TMEM[u].name)}</button>`).join('')}</div>`:''}</div>`;
let last='';
h+=sel.length?sel.map(x=>{let hd='';if(x.day!=last){last=x.day;hd=`<div class="dh">${dayLabel(x.day)}</div>`}
return hd+(x.k=='post'?teamPostHtml(x.p,on):x.k=='rv'?rvBubbleHtml(x):repBubbleHtml(x))}).join(''):'<p class="sm" style="text-align:center">この期間のメッセージはまだありません</p>';
h+=v=='td'?`<div class="card"><input id="pt" placeholder="達成報告を書く…" value="${esc(DRAFT)}" oninput="DRAFT=this.value"><div class="row" style="margin-top:6px"><input id="pi" type="file" accept="image/*" style="font-size:12px"><button class="btn" onclick="post()">投稿</button></div><label class="row sm" style="margin-top:6px"><input id="pst" type="checkbox" style="width:auto"> 📚 学習報告として投稿（1・3・7・14・28日後に復習の通知）</label></div>`:'<p class="sm" style="text-align:center">投稿は「今日の達成状況」の表示から行えます</p>';
return h}
