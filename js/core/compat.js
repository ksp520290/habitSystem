/* ===== StudyGameのモジュールを動かすための最小限の互換層 ===== */
const Utils={
el(tag,attrs,kids){const e=document.createElement(tag);for(const k in (attrs||{})){const v=attrs[k];if(v==null||v===false)continue;
if(k==='class')e.className=v;else if(k==='style')e.style.cssText=v;else if(k.slice(0,2)==='on'&&typeof v==='function')e.addEventListener(k.slice(2),v);else e.setAttribute(k,v===true?'':String(v))}
const add=c=>{if(c==null||c===false)return;if(Array.isArray(c))c.forEach(add);else e.appendChild(c.nodeType?c:document.createTextNode(String(c)))};add(kids);return e},
generateId:p=>p+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),
showToast:m=>toast(m),
todayStr:()=>iso(kd(new Date()))};
const GameState={getState:()=>S,update(fn){fn(S);save()},persist:()=>flush()};
const RewardSystem={grantCompass(n){S.coins+=n;save()}};   // 学習ゲームの「コンパス」は、この森ではコインに読み替える
let SC={n:null,p:null};
let SCL=null;   // 画面を離れるとき（戻る・閉じる・パンくず）に呼ぶ処理：音を止める／報酬を付与する
const Router={_s:{},registerScreen(n,f){this._s[n]=f},onLeave(f){SCL=f},
navigate(n,p){const c=$('#screen-container');const keep=c&&SC.n==n?c.scrollTop:0;SC={n,p:p||{}};SCL=null;drawSc(keep)}};
function scLeave(){const f=SCL;SCL=null;if(f){try{f()}catch(e){console.error(e)}}}
/* 音読ディクテーションのヘッダー：[パンくず（ラベル, 移動先）…], 「戻る」の移動先 */
const NAVD={dictationList:[[['音読Top']],null],
dictationDetail:[[['音読Top','dictationList'],['教材の編集']],'dictationList'],
dictationPractice:[[['音読Top','dictationList'],['教材の編集','dictationDetail'],['ディクテーション']],'dictationDetail'],
dictationListen:[[['音読Top','dictationList'],['教材の編集','dictationDetail'],['音読']],'dictationDetail']};
function scBar(){const n=SC.n,d=NAVD[n];
if(!d)return '<div class="scbar"><button class="btn g" onclick="closeSc()">✕ 閉じる</button><b>'+(n&&/^book/.test(n)?'📖 読書記録':'🎧 音読ディクテ')+'</b></div>';
const cr=d[0].map(c=>c[1]?`<button class="crb" onclick="scNav('${c[1]}')">${c[0]}</button>`:`<b class="crc">${c[0]}</b>`).join('<span class="crs">＞</span>');
return `<div class="scbar"><button class="btn g" ${d[1]?'onclick="scBack()"':'style="visibility:hidden"'}>← 戻る</button><div class="crumb">${cr}</div><button class="btn g" onclick="closeSc()">✕ 閉じる</button></div>`}
function scNav(n){scLeave();Router.navigate(n,n=='dictationList'?{}:{setId:(SC.p||{}).setId})}
function scBack(){const d=NAVD[SC.n];if(d&&d[1])scNav(d[1])}
function drawSc(keep){const box=$('#sc');box.style.display='flex';
box.innerHTML=scBar()+'<div id="sc2"></div><div id="screen-container"></div>';
const c=$('#screen-container');try{Router._s[SC.n](c,SC.p)}catch(e){console.error(e);c.textContent='画面を表示できませんでした: '+e.message}
c.scrollTop=keep||0}
function openScreen(n){S.modal='';S.tab='explore';SC={n:null,p:null};render();Router.navigate(n)}
function closeSc(){scLeave();SC={n:null,p:null};const b=$('#sc');b.style.display='none';b.innerHTML='';Bgm.release();S.tab='explore';S.xv='menu';S.dd=null;S.modal='';render()}   // 読書記録・音読ディクテを閉じたら、探索（霧晴れの開拓日誌）に戻る

/* ===== alert/confirmの代替（iframe・WebView・PWAでも確実に動く） ===== */
function dlg(o){return new Promise(res=>{const d=$('#dg');
d.innerHTML=`<div class="dgb"><div class="dgm">${esc(o.msg)}</div>${o.input!=null?`<input id="dgi" value="${esc(o.input)}">`:''}<div class="dgbtn">${o.btns.map((b,i)=>`<button class="btn ${b.c==null?'g':b.c}" data-i="${i}">${esc(b.l)}</button>`).join('')}</div></div>`;
d.style.display='flex';const done=v=>{d.style.display='none';d.innerHTML='';res(v)};
d.querySelectorAll('button').forEach(b=>b.onclick=()=>{const v=o.btns[+b.dataset.i].v;done(v==='__input'?$('#dgi').value:v)});const i=$('#dgi');if(i){i.focus();i.select();i.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();done(i.value)}}}})}
const uiAlert=m=>dlg({msg:m,btns:[{l:'OK',v:true,c:''}]});
const uiConfirm=(m,ok)=>dlg({msg:m,btns:[{l:'キャンセル',v:false},{l:ok||'OK',v:true,c:''}]});
const uiPrompt=(m,d)=>dlg({msg:m,input:d||'',btns:[{l:'キャンセル',v:null},{l:'OK',v:'__input',c:''}]});

