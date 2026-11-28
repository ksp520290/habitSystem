/* =====================================================================
   さぼり許容チケット（週に1回まで、連続記録が途切れないお守り）
   ・消費：その時点で所有しているコインの50%（小数点以下切り捨て）
   ・対象：「7日以上連続している習慣」があれば、その習慣だけ。
           1つも7日に届いていなければ、連続日数が最大の習慣だけ（同数なら、その中から選べる）
   ・日付が変わって、対象の習慣が前日に実施できず連続記録が途切れたとき、アプリを開くと確認ポップアップを出す
   ===================================================================== */
const SKIP_RATE=0.5,SKIP_MIN_STREAK=7;
const weekKey=d=>{const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-(x.getDay()+6)%7);return kd(x)};   // その週の月曜日
const skipUsedThisWeek=()=>!!(S.skipTk&&S.skipTk.wk===weekKey(new Date()));
const skipCost=()=>Math.floor(S.coins*SKIP_RATE);
function skipTargets(list){const big=list.filter(x=>x.st>=SKIP_MIN_STREAK);if(big.length)return big;
const mx=Math.max(0,...list.map(x=>x.st));return mx>0?list.filter(x=>x.st===mx):[]}
/* checkDay() の日付切り替え時に呼ぶ（連続日数を0に戻す直前）。missed＝前日にできなかった習慣のid */
function skipPrepare(missed,gap,ld){S.skipOffer=null;
if(gap||!missed.size||skipUsedThisWeek()||skipCost()<1)return;      // 2日以上あいた場合は対象外（チケットは1日ぶん）
const tg=skipTargets(S.R.map(r=>({id:r.id,st:r.st||0,n:r.n}))).filter(x=>missed.has(x.id));
if(!tg.length)return;
S.skipOffer={k:kd(ld),items:tg.map(x=>({id:x.id,n:x.n,st:x.st}))}}
function skipHtml(){const o=S.skipOffer;if(!o)return '';const items=o.items.filter(x=>S.R.some(r=>r.id==x.id));if(!items.length){S.skipOffer=null;return ''}
const[a,b,c]=o.k.split('-').map(Number),cost=skipCost(),it=items[0];
return `<div class="modal"><div><h3 style="margin:0 0 6px">🎫 さぼり許容チケット</h3>
<p style="margin:0 0 8px">昨日（${b}/${c}）は${items.length>1?'対象の習慣':'「'+esc(it.n)+'」'}ができず、連続記録が途切れました。${items.length>1?'':'<br>（'+it.st+'日連続でした）'}</p>
${items.length>1?`<label>守る習慣を選んでください</label><select id="skid">${items.map(x=>`<option value="${x.id}">${esc(x.n)}（${x.st}日連続）</option>`).join('')}</select>`:''}
<p style="margin:8px 0"><b>さぼり許容チケット（所有コインの50%消費）を使って記録を維持しますか？</b></p>
<div class="sm" style="margin-bottom:10px">所有コイン 🪙${S.coins} → 🪙${cost} を消費します。チケットは週に1回まで使えます（今週は未使用）。</div>
<div class="row"><button class="btn g sp" onclick="skipDecline()">使わない</button><button class="btn sp" onclick="skipUse()">🎫 使って維持する</button></div></div></div>`}
function skipUse(){const o=S.skipOffer;if(!o)return;const el=$('#skid'),it=o.items.find(x=>el?x.id==el.value:true)||o.items[0],r=S.R.find(x=>x.id==it.id);
if(!r){S.skipOffer=null;S.modal='';render();return}
if(skipUsedThisWeek()){S.skipOffer=null;S.modal='';save();render();return uiAlert('今週はすでにチケットを使いました（週に1回まで）')}
const cost=skipCost();if(cost<1){S.skipOffer=null;S.modal='';save();render();return uiAlert('コインが足りません')}
S.coins-=cost;r.st=it.st;S.skipTk={wk:weekKey(new Date()),n:1,id:r.id,k:o.k,cost};
const h=S.hist[o.k]||(S.hist[o.k]={d:0,t:0,ids:[],m:0});(h.sk=h.sk||[]).push(r.id);
S.skipOffer=null;S.modal='';save();render();toast('🎫 「'+r.n+'」の'+it.st+'日連続を守りました（🪙-'+cost+'）')}
function skipDecline(){S.skipOffer=null;S.modal='';save();render()}
function skipInfoHtml(){const used=skipUsedThisWeek(),tk=S.skipTk||{};
return `<p class="sm" style="margin:0 0 6px">連続記録が途切れた翌日にアプリを開くと、「使いますか？」と確認します。</p>
<div class="sm">・週に1回まで<br>・消費：その時点の所有コインの50%（いま使うと🪙${skipCost()}）<br>・対象：7日以上連続している習慣があればその習慣だけ。なければ、連続日数がいちばん長い習慣だけ</div>
<div class="row" style="margin-top:8px"><b class="sp">今週のチケット</b><span>${used?'使用済み 🎫':'未使用 ✨'}</span></div>${used&&tk.id?`<div class="sm">${esc((S.R.find(r=>r.id==tk.id)||{}).n||'習慣')}の記録を守りました（🪙-${tk.cost||0}）</div>`:''}`}
