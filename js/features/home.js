function home(){const r=rate7(),c=r<=20?'#EF4444':r<60?'#F59E0B':'#3B82F6',vw=['tree','bar','dn'].includes(S.vw)?S.vw:'tree',yr=isRec(ykey()),md=['rt','tk'].includes(S.mode)?S.mode:'rt';
let h=`${homeTop(vw,r,c)}
<div class="card row" style="cursor:pointer" onclick="dOpen('w',ykey())"><span style="font-size:26px">📔</span><div class="sp"><b>霧晴れの開拓日誌</b><div class="sm">${yr?'昨日の記録：済み ✔':'昨日の記録がまだです（保存で+5🪙）'}</div></div><span class="sm">›</span></div>
<div class="tabs">${[['rt','ルーティーン'],['tk','ToDo']].map(t=>`<button class="${md==t[0]?'on':''}" onclick="S.mode='${t[0]}';S.ed=0;render()">${t[1]}</button>`).join('')}</div>
<div class="sm" style="margin:-2px 0 6px">${{rt:'1日1回の習慣。「反復」タグを付けたものだけ、1日に何度でも達成できます。曜日も選べます（未選択＝毎日）。',tk:'1日に何度でも達成OK。翌日になるとリセットされます。タグでグループ分け・絞り込みできます。'}[md]}</div>`;
h+=S.ed?edBar():`<div class="row" style="justify-content:flex-end;margin-bottom:6px"><button class="btn g" data-tu="edbtn" onclick="S.ed=1;render()">✏️ 編集モード</button></div>`;
if(md=='rt'){const t3=top3();
h+=`<div class="row"><select class="s" onchange="S.per=this.value;render()">${['1日','1週間','1ヶ月','1年'].map(p=>`<option ${p==S.per?'selected':''}>${p}</option>`).join('')}</select>${tagChips('tag',S.R)}</div>`;
const ft=tagCur('tag',S.R),all=S.R.filter(r=>ft=='すべて'||tagsOf(r).includes(ft)),nd=all.filter(r=>isDue(r,today)),shown=all.filter(r=>S.ed||S.showOff||isDue(r,today));
rtOrder(shown).forEach(r=>{const dn2=isDue(r,today),cnt={'1日':'','1週間':`今週 ${Math.min(7,r.st)}/7`,'1ヶ月':`今月 ${Math.min(30,r.st)}/30`,'1年':`今年 ${r.st*3}日`}[S.per],wk=r.days&&r.days.length&&r.days.length<7;
h+=`<div class="card rt ${r.done?'done':''} ${S.ed?'ed':''} ${dn2?'':'off'}" data-lp="r" ${!S.ed&&dn2?`onclick="tog(${r.id})"`:''}><div class="chk">${r.done?'✓':''}</div><div class="sp"><div class="sm">${esc(r.w)} ・ ${tagsOf(r).map(t=>'#'+esc(t)).join(' ')}${wk?' ・ 🗓'+daysLabel(r):''}${dn2?'':'（今日は休み）'}</div><b>${esc(r.alt&&r.useAlt?r.alt+'（ミニ）':r.n)}</b><div class="sm">${r.st}日連続${t3.includes(r.id)?' 🔥':''} ${cnt}${(r.c||0)>1?' ・ 今日 ×'+r.c:''}</div></div>
${S.ed?edBtns('R',r.id):`${(r.c||0)>0&&dn2?`<button class="btn g" title="直近の達成を取り消す" onclick="event.stopPropagation();untog(${r.id})">↩</button>`:''}${r.alt&&dn2?`<button class="btn g" onclick="event.stopPropagation();r_alt(${r.id})">${r.useAlt?'通常に':'ミニ'}</button>`:''}${r.m!='check'&&dn2?`<button class="btn" onclick="event.stopPropagation();startT(${r.id})">▶ ${r.m=='sw'?'計測':(r.pomo?(r.pw||S.pomo.work)+':'+(r.pr||S.pomo.rest):r.min+'分')}</button>`:''}`}</div>`});
if(!S.ed&&!nd.length&&all.length)h+=`<p class="sm" style="text-align:center">今日が対象のルーティーンはありません</p>`;
const hid=all.length-nd.length;if(!S.ed&&hid>0)h+=`<button class="chip" style="margin:4px 0" onclick="S.showOff=!S.showOff;render()">${S.showOff?'今日が休みの習慣を隠す':'今日が休みの習慣 '+hid+'件を表示'}</button>`;
if(!S.ed)h+=`<button class="fab" onclick="addR()">＋</button>`}
else{const ft=tagCur('tagT',S.T),L=S.T.filter(t=>ft=='すべて'||tagsOf(t).includes(ft)),grp=!S.ed&&ft=='すべて'&&S.grp!==0,
tile=(t,hd)=>`<div class="tile ${t.rv?'rv':''} ${t.done?'ok':''} ${t.st>=10?'top':''} ${S.ed?'ed':''}" data-lp="t" onclick="togT(${t.id})"><div class="ic" style="color:${t.st>=10?'#333':'#fff'}">${t.done&&t.st<10?'✔':icoHtml(t.ic)}</div>${esc(t.n)}${t.anchor?`<div style="font-size:11px;opacity:.9">【${esc(t.anchor)}】</div>`:''}${(hd?tagsOf(t).slice(1):tagsOf(t)).length?`<div style="font-size:10px;opacity:.85">${(hd?tagsOf(t).slice(1):tagsOf(t)).map(x=>'#'+esc(x)).join(' ')}</div>`:''}${t.c?`<div style="font-size:12px">今日 ×${t.c}</div>`:''}${t.st>=10?`<div style="font-size:12px">${t.st} ★</div>`:''}${t.c&&!S.ed?`<div><button class="btn g" style="margin-top:6px;padding:3px 10px;font-size:11px" onclick="event.stopPropagation();untogT(${t.id})">↩ 取り消し</button></div>`:''}${S.ed?`<div class="row" style="justify-content:center;flex-wrap:wrap;margin-top:8px;gap:4px">${edBtns('T',t.id)}</div>`:''}</div>`;
h+=`<div class="row">${tagChips('tagT',S.T)}${S.ed?'':`<button class="chip ${S.grp!==0?'on':''}" onclick="S.grp=S.grp===0?1:0;render()">🗂 グループ表示</button>`}</div>`;
if(grp){const g={};L.forEach(t=>{const k=tagsOf(t)[0];(g[k]=g[k]||[]).push(t)});
Object.keys(g).forEach(k=>{h+=`<div class="sm" style="margin:12px 0 4px"><b>#${esc(k)}</b>（${g[k].length}）</div><div class="grid">${g[k].map(t=>tile(t,1)).join('')}</div>`})}
else h+=`<div class="grid">${L.map(t=>tile(t,0)).join('')}</div>`;
if(!L.length)h+=`<p class="sm" style="text-align:center">該当するToDoがありません</p>`;
if(!S.ed)h+=`<div class="grid" style="margin-top:10px"><div class="tile" style="background:#999" onclick="addT()"><div class="ic">＋</div>ToDoを追加</div></div>`}
return h}

/* ホーム最上部のカード：既定は「今日の木」。右上のボタンで 達成数／達成率 に切り替え */
function homeTop(vw,r,c){const tt={tree:'今日の木',bar:'達成数（直近7日）',dn:'直近7日間の達成率'}[vw];
const body=vw=='tree'?dayTreeBig():vw=='dn'?donut([[r,c],[100-r,'#e5e7eb']],170,r+'%',c):bars7();
return `<div class="card" ${vw=='tree'?'data-tu="daytree"':''} style="text-align:center"><div class="row"><div class="sm sp" style="text-align:left">${tt}</div><div class="seg">${[['tree','今日の木'],['bar','達成数'],['dn','達成率']].map(x=>`<button class="${vw==x[0]?'on':''}" onclick="S.vw='${x[0]}';save();render()">${x[1]}</button>`).join('')}</div></div>${body}</div>`}
