/* =====================================================================
   要望書 追加仕様（1〜5章）
   1 ポモドーロ拡張 / 2 効果音・BGM・オフライン / 3 途中停止ペナルティ /
   4 タスク3分類 / 5 木とタスクの紐づけ
   （旧実装の home / tog / startT などはこのブロックの定義に置き換え済み）
   ===================================================================== */
const WD='日月火水木金土',WDO=[1,2,3,4,5,6,0];
const PEN_FREE=2,PEN_MIN=5,PEN_COST=5;   // 3回目以降の中断で5分ロック／5コインで解除
const CAT={rt:['ルーティーン','#2e7d4f'],tk:['ToDo','#f59e0b']};
const clampInt=(v,a,b,d)=>{v=Math.round(+v);return isFinite(v)?Math.min(b,Math.max(a,v)):d};
const hmNow=()=>new Date().toTimeString().slice(0,5);
const isDue=(r,d)=>!r.days||!r.days.length||r.days.includes((d||today).getDay());
const due=()=>S.R.filter(r=>isDue(r,today));
const daysLabel=r=>!r.days||!r.days.length||r.days.length>=7?'毎日':WDO.filter(w=>r.days.includes(w)).map(w=>WD[w]).join('・');
const tagsOf=x=>x&&x.tags&&x.tags.length?x.tags:['未分類'];
const allTags=()=>[...new Set([...S.R,...S.T].flatMap(tagsOf))];
const MULTI_TAG='反復',STUDY_TAG='継続';
const isMulti=r=>!!r&&tagsOf(r).includes(MULTI_TAG);   // ルーティーンは「反復」タグ付きだけ1日に複数回達成できる
const isStudyBgm=x=>!!x&&tagsOf(x).some(t=>t==STUDY_TAG||t=='勉強');   // 勉強／継続タグ付きは作業BGMに勉強用.mp3
const isStudy=x=>!!x&&tagsOf(x).includes(STUDY_TAG);   // 「継続」タグ付きは完了時にグループへ自動投稿
/* ---------- その日の木：ルーティーン／ToDoの達成率で育ち、日付が変わった時点で確定 ----------
   20%：種 → 40%：若木 → 60%：成長 → 80%：つぼみ → 100%：満開（ルーティーンとToDoで別々に1本ずつ） */
const DSTG=['種','若木','成長','つぼみ','満開'];
const rateStage=p=>p==null?-1:p>=100?4:p>=80?3:p>=60?2:p>=40?1:p>=20?0:-1;
const rtRate=(n,t)=>t?Math.round(n/t*100):null;
function dailyRates(){const du=due();return{rt:rtRate(du.filter(r=>r.done).length,du.length),tk:rtRate(S.T.filter(t=>t.c>0).length,S.T.length)}}
function dayTrees(rt,tk,at,prov){const o=[];[['rt',rt],['tk',tk]].forEach(a=>{const g=rateStage(a[1]);if(g<0)return;
const tk=treeEm(g);o.push({e:isDataImg(tk)?STG[g]:tk,tr:S.sel,n:CAT[a[0]][0]+' '+a[1]+'%（'+DSTG[g]+'）',tags:[CAT[a[0]][0]],cat:a[0],rate:a[1],stg:g,at,kind:'daily',prov:prov?1:0})});return o}
const liveTrees=()=>{const r=dailyRates();return dayTrees(r.rt,r.tk,Date.now(),1)};
function dailyToast(){const r=dailyRates(),f=(l,p)=>{if(p==null)return '';const g=rateStage(p);return l+' '+p+'%'+(g>=0?'→'+emTxt(treeEm(g),STG[g])+DSTG[g]:'')};toast('🌱 '+[f('ルーティーン',r.rt),f('ToDo',r.tk)].filter(Boolean).join(' ／ '))}
function dayTreeBig(){const r=dailyRates(),it=[['rt',r.rt],['tk',r.tk]].filter(a=>a[1]!=null);
if(!it.length)return '<p class="sm" style="padding:18px 0">ルーティーン・ToDoを追加すると、達成率に応じて今日の木が育ちます。</p>';
return `<div class="dtbig">${it.map(a=>{const g=rateStage(a[1]);return `<div class="dtcol"><div class="sm">${CAT[a[0]][0]}</div><div class="dtree">${g>=0?vHtml(treeEm(g)):'・'}</div><b style="font-size:20px">${a[1]}%</b><div class="sm">${g>=0?DSTG[g]:'まだ植わっていません（20%で種）'}</div><div class="dtstg">${[0,1,2,3,4].map(i=>`<span style="opacity:${i<=g?1:.3}">${vHtml(treeEm(i))}</span>`).join('')}</div></div>`}).join('')}</div><div class="sm" style="margin-top:6px">日付が変わった時点の達成率で森に確定します</div>`}
function plantTree(x,kind,isT){S.forest.push({e:S.sel,n:x.n,tags:tagsOf(x),rid:isT?null:x.id,tid:isT?x.id:null,at:Date.now(),kind})}   // 達成＝木を1本植える
function unplant(key,id){for(let i=S.forest.length-1;i>=0;i--){const f=S.forest[i];if(f&&typeof f=='object'&&f[key]==id&&f.kind!='abort'){S.forest.splice(i,1);return}}}
function cumAdd(kind,x,n){const c=S.cum;for(const t of tagsOf(x))c[kind][t]=Math.max(0,(c[kind][t]||0)+n);c.n[kind]=Math.max(0,(c.n[kind]||0)+n)}
function tagPicker(sel,pin){const all=[...new Set([...(pin||[]),...allTags(),...sel])];
return `<div class="row" id="tgp" style="flex-wrap:wrap;gap:6px;margin-bottom:6px">${all.map(t=>`<button type="button" class="chip ${sel.includes(t)?'on':''}" data-t="${esc(t)}" onclick="this.classList.toggle('on')">${esc(t)}</button>`).join('')}</div><input id="tgn" placeholder="新しいタグを追加（「、」や空白で区切って複数OK）">`}
function tgHelp(){const e=$('#tghelp');if(e)e.style.display=e.style.display=='none'?'block':'none'}
function readTags(){const on=[...document.querySelectorAll('#tgp .chip.on')].map(b=>b.dataset.t),nw=($('#tgn').value||'').split(/[、,，\s]+/).map(s=>s.trim().slice(0,12)).filter(Boolean),t=[...new Set([...on,...nw])].slice(0,6);return t.length?t:['未分類']}
function setTagF(k,t){S[k]=t;render()}
function tagChips(key,items){const tags=['すべて',...new Set(items.flatMap(tagsOf))],cur=tags.includes(S[key])?S[key]:'すべて';
return `<div class="chips">${tags.map(t=>`<button class="chip ${cur==t?'on':''}" data-t="${esc(t)}" onclick="setTagF('${key}',this.dataset.t)">${esc(t)}</button>`).join('')}</div>`}
const tagCur=(key,items)=>{const tags=new Set(items.flatMap(tagsOf));return tags.has(S[key])?S[key]:'すべて'};
const fE=x=>typeof x=='string'?x:(x&&x.e)||'🌳';
function actInc(kind,n,min){const k=kd(today),a=S.act[k]||(S.act[k]={rt:0,tk:0,td:0,m:0});
if(kind)a[kind]=Math.max(0,(a[kind]||0)+(n==null?1:n));if(min)a.m=Math.max(0,(a.m||0)+min)}
function weekData(){const o=[];for(let i=6;i>=0;i--){const d=new Date(today);d.setDate(d.getDate()-i);const k=kd(d),a=S.act[k],h=S.hist[k],md=(d.getMonth()+1)+'/'+d.getDate();
o.push(a?{k,w:d.getDay(),md,rt:a.rt||0,tk:(a.tk||0)+(a.td||0),td:0,m:a.m||0}:{k,w:d.getDay(),md,rt:h?h.d||0:0,tk:0,td:0,m:h?h.m||0:0})}return o}

