/* ===== 保存基盤：IndexedDB優先／利用不可時のみlocalStorage =====
   状態本体は 'kv' ストアに、音源(dataUrl)は 'audio' ストアに分けて保存する
   （状態を保存するたびに巨大な音源を書き直さないため）。メモリ上では f.dataUrl として保持する。 */
let DB=null,IDBok=false,ready=false,svT=null,stored=new Set(),TUTSB=false,HAD=false;   // TUTSB：チュートリアル中（保存・送信を止める）／HAD：起動時に保存済みデータがあったか
const idbReq=r=>new Promise((ok,ng)=>{r.onsuccess=()=>ok(r.result);r.onerror=()=>ng(r.error)});
const txDone=tx=>new Promise((ok,ng)=>{tx.oncomplete=ok;tx.onerror=()=>ng(tx.error);tx.onabort=()=>ng(tx.error||new Error('abort'))});
function idbOpen(){return new Promise((ok,ng)=>{if(!window.indexedDB)return ng(new Error('IndexedDB非対応'));let q;try{q=indexedDB.open('shukan_no_mori',1)}catch(e){return ng(e)}
q.onupgradeneeded=()=>{const d=q.result;d.createObjectStore('kv');d.createObjectStore('audio')};q.onsuccess=()=>ok(q.result);q.onerror=()=>ng(q.error);q.onblocked=()=>ng(new Error('blocked'))})}
function ensure(){const D={books:[],bookFolders:[],dictationSets:[],dictationFolders:[],dictationRewards:{},customTrees:[],stageSet:{},diaryTickets:0,
act:{},rv:[],rr:[],fv:'',fp:'all',cum:{rt:{},tk:{},n:{rt:0,tk:0},ini:0},pomo:{work:25,rest:5,loop:false,bgm:true,bgmWork:true,bgmRest:true},rq:[],stopCnt:{d:'',n:0},pen:{until:0,rid:null},team:{db:'',tid:'',pw:'',uid:'',name:'',icon:'🙂',tname:''}};
for(const k in D)if(S[k]==null||typeof S[k]!=typeof D[k]||Array.isArray(S[k])!=Array.isArray(D[k]))S[k]=D[k];
if(!S.diary||Array.isArray(S.diary))S.diary={};if(!S.vw)S.vw='tree';if(!S.vwMig){S.vw='tree';S.vwMig=1}   /* ホームの既定表示を「今日の木」に（初回だけ移行） */;if(!S.rem||typeof S.rem!='object')S.rem={};
if(!S.user||typeof S.user!='object')S.user={};if(!S.user.settings||typeof S.user.settings!='object')S.user.settings={};
if(!S.user.settings.github||typeof S.user.settings.github!='object')S.user.settings.github={owner:'',repo:'',branch:'main',token:''};
pomoNorm();for(const k of ['db','tid','pw','uid','name','icon','tname'])if(typeof S.team[k]!='string')S.team[k]=k=='icon'?'🙂':'';
if(!S.team.db&&TEAM_DB_DEFAULT)S.team.db=TEAM_DB_DEFAULT;if(typeof S.pen.until!='number')S.pen.until=0;if(typeof S.stopCnt.n!='number')S.stopCnt={d:'',n:0};
S.R.concat(S.T).forEach(x=>{if(!Array.isArray(x.tags))x.tags=x.tag?[x.tag]:[];x.tags=x.tags.filter(t=>typeof t=='string'&&t);if(!x.tags.length)x.tags=['未分類'];x.tag=x.tags[0]});
for(const k of ['rt','tk'])if(!S.cum[k]||typeof S.cum[k]!='object')S.cum[k]={};if(!S.cum.n||typeof S.cum.n!='object')S.cum.n={rt:0,tk:0};
if(!S.cum.ini){S.cum.ini=1;for(const k in S.hist)((S.hist[k]||{}).ids||[]).forEach(id=>{const r=S.R.find(x=>x.id==id);if(r)cumAdd('rt',r,1)})}
delete S.D;
S.R.forEach(r=>{if(r.c==null)r.c=r.done?1:0});S.T.forEach(t=>{if(t.c==null)t.c=t.done?1:0});
S.customTrees=S.customTrees.filter(t=>Array.isArray(t)&&typeof t[0]=='string'&&t[0]&&typeof t[1]=='string').map(t=>{t=t.slice(0,5);t[2]=Math.max(0,Math.floor(+t[2]||0));
if(isTreeTok(t[0])){if(!isDataImg(t[3])||t[3].length>IMG_TREE_MAX)t[3]='';t[4]=emojiClean(t[4])||'🌳'}else t.length=3;return t});   // 画像樹種：[id,名前,コイン,画像dataURL,代替絵文字]
if(!S.stageSet||typeof S.stageSet!='object'||Array.isArray(S.stageSet))S.stageSet={};
for(const k in S.stageSet){const a=S.stageSet[k];if(!Array.isArray(a)){delete S.stageSet[k];continue}
S.stageSet[k]=[0,1,2,3].map(i=>{const v=a[i];return typeof v=='string'&&(isDataImg(v)?v.length<=IMG_TREE_MAX:(v.length<=8&&!/['"\\<>&\s]/.test(v)))?v:''});if(S.stageSet[k].every(x=>!x))delete S.stageSet[k]}
if(!BASE_TREES.concat(S.customTrees).some(t=>t[0]==S.sel))S.sel='🌸';
if(!S.notif||typeof S.notif!='object'||Array.isArray(S.notif))S.notif={on:false,times:['08:00','20:00']};
S.notif.on=!!S.notif.on;if(!Array.isArray(S.notif.times))S.notif.times=['08:00','20:00'];S.notif.times=S.notif.times.filter(t=>/^\d{1,2}:\d{2}$/.test(t)).slice(0,3);   // 通知：まとめ通知の時刻
if(!Array.isArray(S.anchors))S.anchors=[];S.anchors=S.anchors.filter(a=>typeof a=='string'&&a).slice(0,12);if(typeof S.rvAnchor!='string')S.rvAnchor='';   // 習慣トリガー（既存の日常習慣）
if(!S.skipTk||typeof S.skipTk!='object')S.skipTk={wk:'',n:0};if(!S.skipOffer||typeof S.skipOffer!='object')S.skipOffer=null;   // さぼり許容チケット
if(!['menu','write','list'].includes(S.xv))S.xv='menu';if(S.tdy!='td'&&S.tdy!='past')S.tdy=S.tdy=='yd'?'past':'td';
S.rr.forEach((e,i)=>{if(!e.id)e.id='rv'+(e.at||Date.now()).toString(36)+i});
delete S.modal;S.ed=0}
async function hydrateAudio(){for(const s of S.dictationSets)for(const f of s.audioFiles||[]){if(f.dataUrl)continue;
try{const v=IDBok?await idbReq(DB.transaction('audio').objectStore('audio').get(f.id)):localStorage.getItem('hba_'+f.id);if(v){f.dataUrl=v;stored.add(f.id)}}catch(e){}}}
async function loadState(){let raw=null;
try{DB=await idbOpen();IDBok=true;raw=await idbReq(DB.transaction('kv').objectStore('kv').get('state'));stored=new Set(await idbReq(DB.transaction('audio').objectStore('audio').getAllKeys()))}
catch(e){IDBok=false;DB=null;console.warn('[保存] IndexedDBが使えないためlocalStorageを使います',e)}
if(raw==null){try{raw=localStorage.getItem('hb')}catch(e){}}   // 旧バージョンのlocalStorageデータも引き継ぐ
HAD=raw!=null;
if(raw){try{Object.assign(S,JSON.parse(raw))}catch(e){console.error(e)}}
ensure();await hydrateAudio()}
async function doFlush(){if(!ready||TUTSB)return;clearTimeout(svT);
const files=[];S.dictationSets.forEach(s=>(s.audioFiles||[]).forEach(f=>files.push(f)));
const json=JSON.stringify(snap(),(k,v)=>k==='dataUrl'?undefined:v);
if(IDBok){try{const tx=DB.transaction(['kv','audio'],'readwrite'),kv=tx.objectStore('kv'),au=tx.objectStore('audio');kv.put(json,'state');
const ids=new Set();files.forEach(f=>{ids.add(f.id);if(f.dataUrl&&!stored.has(f.id)){au.put(f.dataUrl,f.id);stored.add(f.id)}});
[...stored].forEach(id=>{if(!ids.has(id)){au.delete(id);stored.delete(id)}});
await txDone(tx);try{localStorage.removeItem('hb')}catch(e){}return}
catch(e){console.error('[保存] IndexedDB書き込み失敗→localStorageへ',e);IDBok=false;stored=new Set()}}
try{localStorage.setItem('hb',json)}catch(e){toast('保存容量が足りません。バックアップを書き出してください')}
files.forEach(f=>{if(f.dataUrl&&!stored.has(f.id)){try{localStorage.setItem('hba_'+f.id,f.dataUrl);stored.add(f.id)}catch(e){toast('音源を保存できません（容量不足）')}}})}
let flQ=Promise.resolve();
const flush=()=>(flQ=flQ.then(doFlush).catch(e=>console.error(e)));
const save=()=>{if(!ready)return;clearTimeout(svT);svT=setTimeout(flush,250);if(teamOn())teamDirty()};

