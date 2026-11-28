/* =====================================================================
   ③④ タイマー／ストップウォッチ ＋ 音声(Media Session)
   ③原因：停止が同期 confirm() 依存（iframe/WebView等で抑止されると止められない）／計測中バーが
   スクロールする<main>内にあり、ロック解除後に消える・🔒ボタンが無い／setInterval 1秒カウントのずれ。
   → 計測中バーを画面上部に固定表示し、一時停止/再開・停止(完了・中断)・🔒を常設。経過時間は時刻ベースで計算。
   ===================================================================== */
const BG=new Audio();BG.loop=true;BG.preload='auto';
const Bgm={held:0,self:0,warned:0,src:'',kind:'',fb:0,
bgmOn(ph){ph=ph=='rest'?'rest':'work';const b=TM&&TM.bgm;return b?b[ph]!==false:(ph=='rest'?S.pomo.bgmRest:S.pomo.bgmWork)!==false},
cur(){const ph=TM&&TM.ph=='rest'?'rest':'work';if(!this.bgmOn(ph))return 'off';if(ph=='rest')return 'rest';const r=TM?S.R.find(x=>x.id==TM.id):null;return r&&isStudyBgm(r)&&!this.fb?'study':'task'},   // 作業=task.mp3（勉強タグは勉強用.mp3）／休憩=rest.mp3／OFF=off.mp3
play(){this.self=Date.now();this.load();try{const p=BG.play();if(p&&p.catch)p.catch(()=>{if(this.kind!='off')this.fail()})}catch(e){if(this.kind!='off')this.fail()}},
pause(){this.self=Date.now();try{BG.pause()}catch(e){}},
fail(){if(!this.warned){this.warned=1;toast('音声を再生できません（計測は続きます）')}},
load(){try{const k=this.cur(),u=new URL(Assets.url(k),location.href).href;this.kind=k;if(this.src!=u){this.self=Date.now();this.src=u;BG.src=u;BG.load()}}catch(e){this.fail()}},
hold(a){if(a&&!a._bh){a._bh=1;const r=()=>Bgm.release();a.addEventListener('pause',r);a.addEventListener('ended',r)}if(TM&&!TM.pa&&!BG.paused){this.held=1;this.pause()}},
release(){if(this.held){this.held=0;if(TM&&!TM.pa)this.play()}}};
BG.addEventListener('error',()=>{if(!TM)return;if(Bgm.kind=='study'){Bgm.fb=1;Bgm.load();if(!TM.pa&&!Bgm.held)Bgm.play();return}if(Bgm.kind!='off')Bgm.fail()});   // 勉強用.mp3が無ければtask.mp3、off.mp3が無ければ無音
BG.addEventListener('pause',()=>{if(TM&&!TM.pa&&!Bgm.held&&Date.now()-Bgm.self>600)pause()});   // OS側の一時停止にも追従
BG.addEventListener('play',()=>{if(TM&&TM.pa&&!Bgm.held&&Date.now()-Bgm.self>600)pause()});
const nowMs=()=>Date.now();
const elapsed=()=>TM.acc+(TM.last?nowMs()-TM.last:0);
function calc(){const e=Math.floor(elapsed()/1000);TM.t=TM.kind=='sw'?e:Math.max(0,TM.tot-e)}
function msMeta(){try{const ms=navigator.mediaSession;if(!ms||!TM)return;ms.metadata=new MediaMetadata({title:TM.name,artist:'習慣の森',album:TM.pomo?'ポモドーロ':'作業用'});ms.playbackState=TM.pa?'paused':'playing'}catch(e){}}
function msBind(on){try{const ms=navigator.mediaSession;if(!ms)return;
const h={play:()=>{if(TM&&TM.pa)pause()},pause:()=>{if(TM&&!TM.pa)pause()},stop:()=>{if(TM)endT(TM.ph=='rest'?'rest':'done')}};
for(const k in h){try{ms.setActionHandler(k,on?h[k]:null)}catch(e){}}if(!on){ms.metadata=null;ms.playbackState='none'}}catch(e){}}
function ntf(m,title){NTFUI.show(title||'習慣の森',{body:m,tag:'habit-timer'})}   // 通知の表示は notify-ui.js（Service Worker経由）
function tick(){if(!TM||TM.pa)return;calc();if(TM.kind=='cd'&&TM.t<=0)return fin();
const s=(i,f)=>{const e=$(i);if(e)f(e)},tx=fmt(TM.t),g=treeEm(stage()),sv=e=>{if(e._v!==g){e._v=g;e.innerHTML=vHtml(g)}};
s('#tt',e=>e.textContent=tx);s('#lt',e=>e.textContent=tx);s('#lg',sv);s('#mg',sv);s('#lb',e=>e.style.width=Math.round(prog()*100)+'%');s('#lc',e=>e.textContent=new Date().toTimeString().slice(0,5));
const st=stage();if(st!==TM.ls){TM.ls=st;if(S.tab=='grow'&&!S.modal&&!SC.n)render()}}
function pause(){if(!TM)return;if(TM.pa){TM.pa=0;TM.last=nowMs();Bgm.play()}else{TM.acc+=nowMs()-TM.last;TM.last=null;TM.pa=1;calc();Bgm.pause()}
msMeta();if(isLock())lock();else render()}
const SENT={};
function remind(){const n=new Date(),hm=pad(n.getHours())+':'+pad(n.getMinutes());
S.R.forEach(r=>{const m=/^(\d{1,2}):(\d{2})/.exec(r.w||'');if(!m||!S.rem[r.id]||r.done||pad(m[1])+':'+m[2]!=hm)return;const k=kd(n)+'_'+r.id;if(SENT[k])return;SENT[k]=1;NTFUI.routineReminder(r)});   // ✅達成／▶開始ボタン付き
NTFUI.tick()}   // まとめ通知（最大3件）の時刻判定
