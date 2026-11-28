/* ---------- 1. ポモドーロ設定（localStorageにも保存） ---------- */
const PLS='shukan_pomo_settings';
function pomoNorm(){const p=S.pomo&&typeof S.pomo=='object'?S.pomo:(S.pomo={});p.work=clampInt(p.work,1,180,25);p.rest=clampInt(p.rest,1,60,5);p.loop=!!p.loop;p.bgmWork=p.bgmWork===undefined?p.bgm!==false:p.bgmWork!==false;p.bgmRest=p.bgmRest===undefined?p.bgm!==false:p.bgmRest!==false;p.bgm=p.bgmWork||p.bgmRest}
function pomoLoadLS(){try{const o=JSON.parse(localStorage.getItem(PLS)||'null');if(o&&typeof o=='object'){S.pomo.work=o.work;S.pomo.rest=o.rest;S.pomo.loop=o.loop;S.pomo.bgm=o.bgm;S.pomo.bgmWork=o.bgmWork;S.pomo.bgmRest=o.bgmRest}}catch(e){}pomoNorm()}
function pomoSaveLS(){try{localStorage.setItem(PLS,JSON.stringify(S.pomo))}catch(e){}}
function setPomo(p){Object.assign(S.pomo,p);pomoNorm();pomoSaveLS();save()}
function pomoSaveForm(){const w=$('#pwk').value,r=$('#prs').value;
if(!(+w>=1&&+w<=180)||!(+r>=1&&+r<=60))return uiAlert('集中は1〜180分、休憩は1〜60分で入力してください');
setPomo({work:Math.round(+w),rest:Math.round(+r)});render();toast('保存しました（集中'+S.pomo.work+'分／休憩'+S.pomo.rest+'分）')}
function setBgmDef(k,v){setPomo(k=='rest'?{bgmRest:!!v}:{bgmWork:!!v});toast('🎵 '+(k=='rest'?'休憩用':'作業用')+'BGM（既定）'+(v?'ON':'OFF'))}
function togBgm(){if(!TM)return;if(!TM.bgm)TM.bgm={work:S.pomo.bgmWork!==false,rest:S.pomo.bgmRest!==false};   // 計測中：いま流れている段階（集中／休憩）のBGMだけを、この計測中に限って切り替える
const k=TM.ph=='rest'?'rest':'work';TM.bgm[k]=!TM.bgm[k];if(!TM.pa&&!Bgm.held)Bgm.play();
if(isLock())lock();else render();toast('🎵 '+(k=='rest'?'休憩用':'作業用')+'BGM '+(TM.bgm[k]?'ON':'OFF')+'（この計測中のみ）')}
function togLoop(){setPomo({loop:!S.pomo.loop});if(isLock())lock();else render();toast('🔁 ループ '+(S.pomo.loop?'ON':'OFF'))}

/* ---------- 2. 効果音・BGM・オフライン ----------
   in.mp3 / out.mp3 / task.mp3 / rest.mp3 / 勉強用.mp3 / off.mp3 を「assets/audio/」に置く。
   取得できた音源はIndexedDBにも保存し（オフラインでも再生可）、https配信ならsw.jsもキャッシュする。
   in/out が見つからない場合だけ、代わりに簡易のビープ音を鳴らす。 */
const Assets=(()=>{const N={in:'assets/audio/in.mp3',out:'assets/audio/out.mp3',task:'assets/audio/task.mp3',rest:'assets/audio/rest.mp3',study:'assets/audio/勉強用.mp3',off:'assets/audio/off.mp3'},U={},P={};
const idbGet=k=>new Promise(ok=>{try{if(!DB)return ok(null);const r=DB.transaction('kv').objectStore('kv').get('asset_'+k);r.onsuccess=()=>ok(r.result||null);r.onerror=()=>ok(null)}catch(e){ok(null)}});
const idbPut=(k,b)=>{try{if(DB)DB.transaction('kv','readwrite').objectStore('kv').put(b,'asset_'+k)}catch(e){}};
const okType=b=>!!b&&b.size>0&&!/text\/html|json/.test(b.type||'');
async function net(k,old){try{const r=await fetch(N[k],{cache:'no-cache'});if(!r.ok)return null;const b=await r.blob();if(!okType(b))return null;if(!old||old.size!==b.size)idbPut(k,b);return b}catch(e){return null}}
function load(k){return P[k]||(P[k]=(async()=>{let b=await idbGet(k);if(okType(b)){net(k,b);}else{b=await net(k,null)}
U[k]=okType(b)?URL.createObjectURL(b):N[k];return U[k]})())}
return{load,preload:()=>Promise.all(Object.keys(N).map(load)),url:k=>U[k]||N[k]}})();
const Sfx=(()=>{let ac=null;const buf={};
const ctx=()=>{try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();if(ac.state=='suspended')ac.resume();return ac}catch(e){return null}};
function synth(k){const c=ctx();if(!c)return;try{const t=c.currentTime,o=c.createOscillator(),g=c.createGain(),f=k=='in'?[523,1047]:[1047,523];
o.type='sine';o.frequency.setValueAtTime(f[0],t);o.frequency.exponentialRampToValueAtTime(f[1],t+.35);
g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.25,t+.03);g.gain.exponentialRampToValueAtTime(.0001,t+.5);
o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+.55)}catch(e){}}
async function getBuf(k){if(buf[k]!==undefined)return buf[k];const c=ctx();if(!c)return null;
try{const u=await Assets.load(k);buf[k]=await c.decodeAudioData(await(await fetch(u)).arrayBuffer())}catch(e){buf[k]=null}return buf[k]}
return{unlock(){ctx()},async play(k){const c=ctx();if(!c)return;const b=await getBuf(k);
if(b){const s=c.createBufferSource(),g=c.createGain();s.buffer=b;g.gain.value=.9;s.connect(g);g.connect(c.destination);s.start();return}
try{const a=new Audio(Assets.url(k));a.addEventListener('error',()=>synth(k));const p=a.play();if(p&&p.catch)p.catch(()=>{})}catch(e){synth(k)}}}})();
function SWreg(){try{if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))navigator.serviceWorker.register('sw.js').then(r=>NTFUI.afterSW(r)).catch(()=>{})}catch(e){}}

/* ---------- 3. 途中停止ペナルティ ---------- */
const penOn=()=>!!(S.pen&&S.pen.until>Date.now());
const stopToday=()=>S.stopCnt&&S.stopCnt.d==kd(today)?S.stopCnt.n:0;
function regStop(){const k=kd(today);if(!S.stopCnt||S.stopCnt.d!=k)S.stopCnt={d:k,n:0};return ++S.stopCnt.n}
const penLeft=()=>Math.max(0,Math.ceil((S.pen.until-Date.now())/1000));
function penHtml(){return `<div class="modal"><div class="pnl"><h3 style="margin:0 0 6px">⏳ タイマーはお休み中</h3><p class="sm" style="margin:0">今日の中断が${stopToday()}回になったため、しばらくタイマーを再開できません。</p><div id="plt" style="font-size:46px;text-align:center;font-weight:700;margin:10px 0">${fmt(penLeft())}</div><button class="btn" style="width:100%;padding:12px" onclick="penPay()">🪙 ${PEN_COST}コインを消費して即時再開する</button><div class="sm" style="text-align:center;margin:6px 0 10px">所持コイン 🪙${S.coins}</div><button class="btn g" style="width:100%;padding:10px" onclick="S.modal='';render()">閉じる（待つ）</button></div></div>`}
function penModal(id){if(id!=null)S.pen.rid=id;S.modal=penHtml();render()}
function penPay(){if(!penOn())return;if(S.coins<PEN_COST)return uiAlert('コインが足りません（'+PEN_COST+'🪙必要です）');
const rid=S.pen.rid;S.coins-=PEN_COST;S.pen={until:0,rid:null};S.modal='';save();render();toast('🪙-'+PEN_COST+' ロックを解除しました');
if(rid!=null&&!TM&&S.R.some(x=>x.id==rid))startT(rid)}
function penTick(){if(!S.pen||!S.pen.until)return;if(!penOn()){S.pen.until=0;const was=(S.modal||'').includes('class="pnl"');if(was){S.modal='';render()}save();toast('⏰ ロックが解除されました')}
else{const e=$('#plt');if(e)e.textContent=fmt(penLeft())}}

