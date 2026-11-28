/* =====================================================================
   ② 編集モード／編集・削除
   原因：長押し検出が pointerleave/pointercancel でキャンセルされていた（タッチ端末では長押し中に
   ブラウザが pointercancel→pointerleave を発火するため500msに届かない）／編集ボタンが無く長押しだけが入口／
   名称変更・削除が同期 prompt/confirm 依存。→ 修正：タッチ移動・スクロールのみでキャンセル、
   contextmenu(長押し)でも突入、専用「編集モード」ボタン、独自ダイアログ、stopPropagation 済みボタン。
   ===================================================================== */
function addR(){rModal(null)}
function addT(){tModal(null)}
async function del(k,id){const x=S[k].find(v=>v.id==id);if(!x)return;if(k=='R'&&TM&&TM.id==id)return uiAlert('計測中のため削除できません');
if(!await uiConfirm('「'+x.n+'」を削除しますか？','削除'))return;if(k=='T'&&x.rv){const e=S.rr.find(v=>v.id==x.rv);if(e){e.del=1;e.ok=0}}S[k]=S[k].filter(v=>v.id!=id);if(k=='R')delete S.rem[id];syncToday();save();render()}
(()=>{const m=$('#m');let tm=null,sx=0,sy=0,lpAt=0;const cl=()=>{clearTimeout(tm);tm=null};
const go=()=>{cl();lpAt=Date.now();if(!S.ed){S.ed=1;try{navigator.vibrate(40)}catch(_){}render()}};
m.addEventListener('pointerdown',e=>{cl();const c=e.target.closest('[data-lp]');if(!c||S.ed||e.target.closest('button,input,select'))return;sx=e.clientX;sy=e.clientY;tm=setTimeout(go,500)});
const mv=(x,y)=>{if(tm&&Math.hypot(x-sx,y-sy)>10)cl()};
m.addEventListener('pointermove',e=>{if(e.pointerType=='mouse')mv(e.clientX,e.clientY)});
m.addEventListener('touchmove',e=>{const t=e.touches[0];if(t)mv(t.clientX,t.clientY)},{passive:true});
['pointerup','touchend'].forEach(t=>m.addEventListener(t,cl));m.addEventListener('scroll',cl);
m.addEventListener('contextmenu',e=>{if(e.target.closest('[data-lp]')){e.preventDefault();if(!e.target.closest('button,input,select'))go()}});
m.addEventListener('click',e=>{if(Date.now()-lpAt<700){e.stopPropagation();e.preventDefault()}},true)})();

