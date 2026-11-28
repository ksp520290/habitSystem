/* =====================================================================
   6. チーム機能（別端末のメンバーと共有）
   ・サーバーは Firebase Realtime Database の REST API（SDK不要）。URLを設定画面/チーム画面で入力。
   ・データはチームのパスワードから作った鍵で端末内で暗号化(AES-GCM)してから送るため、
     サーバー側ではチームIDを知っていても中身は読めない。
   ・未参加のときは、従来どおりの1人用デモ表示になる。
   ===================================================================== */
const TEAM_DB_DEFAULT='';   // 共通のサーバーURLをここに入れると、参加者はURL入力が不要になります
let TP=[],TMEM={},TLAST=0,TSIG='',TBUSY=false,TERR='',DRAFT='',MEMV=null,MEMM='n',TPUSHT=null;
const teamOn=()=>!!(S.team&&S.team.db&&S.team.tid&&S.team.pw&&S.team.uid);
const safeImg=u=>/^(https?:|data:image\/)/.test(u||'')?u:'';
const rndId=n=>{const A='abcdefghijklmnopqrstuvwxyz0123456789',a=crypto.getRandomValues(new Uint8Array(n));return [...a].map(x=>A[x%A.length]).join('')};
const TeamAPI=(()=>{const enc=new TextEncoder(),dec=new TextDecoder(),kc={};
const b64=u=>{let s='';for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return btoa(s)};
const need=()=>{if(!(window.crypto&&crypto.subtle))throw new Error('この環境では暗号化が使えません（https または localhost で開いてください）')};
async function key(tid,pw){need();const id=tid+'\n'+pw;if(kc[id])return kc[id];
const m=await crypto.subtle.importKey('raw',enc.encode(pw),'PBKDF2',false,['deriveKey']);
return kc[id]=await crypto.subtle.deriveKey({name:'PBKDF2',salt:enc.encode('shukan-no-mori:'+tid),iterations:120000,hash:'SHA-256'},m,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
async function seal(tid,pw,o){const k=await key(tid,pw),iv=crypto.getRandomValues(new Uint8Array(12)),ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},k,enc.encode(JSON.stringify(o))));
const u=new Uint8Array(12+ct.length);u.set(iv);u.set(ct,12);return b64(u)}
async function unseal(tid,pw,s){const k=await key(tid,pw),u=Uint8Array.from(atob(s),c=>c.charCodeAt(0));
return JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:u.slice(0,12)},k,u.slice(12))))}
async function http(db,path,method,body,qs){if(TUTSB&&method&&method!='GET')return null;   // チュートリアル中はサーバーへ書き込まない
const c=new AbortController(),t=setTimeout(()=>c.abort(),10000);
try{const r=await fetch(db.replace(/\/+$/,'')+path+'.json'+(qs||''),{method:method||'GET',body:body===undefined?undefined:JSON.stringify(body),signal:c.signal,headers:body===undefined?undefined:{'Content-Type':'application/json'}});
if(!r.ok)throw new Error('サーバーエラー('+r.status+')。URLとデータベースのルールを確認してください');return await r.json()}
catch(e){if(e.name=='AbortError'||e instanceof TypeError)throw new Error('サーバーに接続できません');throw e}finally{clearTimeout(t)}}
const gid=n=>{const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',a=crypto.getRandomValues(new Uint8Array(n));return [...a].map(x=>A[x%A.length]).join('')};
const T=()=>S.team,base=()=>'/teams/'+T().tid;
const cleanTi=o=>{const r={};if(o&&typeof o=='object')Object.keys(o).slice(0,12).forEach(k=>{if(/^(img|st):[\w:-]{1,40}$/.test(k)&&isDataImg(o[k])&&o[k].length<=12000)r[k]=o[k]});return r};
return{
async create(db,name){need();const tid='MORI-'+gid(6),pw=gid(8);
await http(db,'/teams/'+tid+'/meta','PUT',{v:await seal(tid,pw,{ok:'shukan'}),n:await seal(tid,pw,{name})});return{tid,pw}},
async verify(db,tid,pw){need();const m=await http(db,'/teams/'+tid+'/meta');if(!m||!m.v)throw new Error('そのチームIDは見つかりません');
try{await unseal(tid,pw,m.v)}catch(e){throw new Error('パスワードが違います')}
let name='チーム';try{name=(await unseal(tid,pw,m.n)).name||name}catch(e){}return{name}},
async putMe(obj){const t=T();await http(t.db,base()+'/members/'+t.uid,'PUT',await seal(t.tid,t.pw,obj))},
async delMe(){const t=T();await http(t.db,base()+'/members/'+t.uid,'DELETE')},
async members(){const t=T(),o=await http(t.db,base()+'/members')||{},out={};
for(const u of Object.keys(o)){if(!/^[A-Za-z0-9_]+$/.test(u))continue;try{const m=await unseal(t.tid,t.pw,o[u]);
out[u]={name:String(m.name||'メンバー').slice(0,12),icon:icoNorm(m.icon),week:Array.isArray(m.week)?m.week.slice(0,7):[],forest:Array.isArray(m.forest)?m.forest.slice(-36).map(x=>x&&typeof x=='object'?x:{e:String(x||'🌳').slice(0,8)}):[],ti:cleanTi(m.ti),fc:+m.fc||0,upd:+m.upd||0}}catch(e){}}return out},
async post(obj){const t=T();return await http(t.db,base()+'/posts','POST',{c:await seal(t.tid,t.pw,obj)})},
async posts(){const t=T(),o=await http(t.db,base()+'/posts','GET',undefined,'?orderBy=%22%24key%22&limitToLast=120')||{},out=[];
for(const id of Object.keys(o)){try{const p=await unseal(t.tid,t.pw,o[id].c);
out.push({id,uid:String(p.u||''),name:String(p.n||'メンバー').slice(0,12),icon:icoNorm(p.i),t:String(p.t||''),img:p.img||'',day:p.day||'',tm:p.tm||'',ed:p.ed?1:0,st:Object.values(o[id].st||{}).map(String)})}catch(e){}}
return out.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)},
async editPost(pid,obj){const t=T();await http(t.db,base()+'/posts/'+encodeURIComponent(pid)+'/c','PUT',await seal(t.tid,t.pw,obj))},
async stamp(pid,e){const t=T();await http(t.db,base()+'/posts/'+pid+'/st','POST',e)}}})();
/* チームへ共有する森：画像の樹種・段階は容量が増えすぎないよう、小さいものだけ画像のまま共有し（1枚10KB以下・合計26KB以下・最大8種）、超える分は代替絵文字にする */
const SHARE_IMG_ONE=10000,SHARE_IMG_TOT=26000,SHARE_IMG_CNT=8;
function shareForest(){const ti={};let used=0,cnt=0;
const tokShare=(tok,key,fb)=>{tok=String(tok||'🌳');if(!isTreeTok(tok)&&!isDataImg(tok))return tok.slice(0,8);const k=isTreeTok(tok)?tok:key,u=visOf(tok).img;if(!u||!k)return fb;
if(ti[k])return k;if(u.length<=SHARE_IMG_ONE&&used+u.length<=SHARE_IMG_TOT&&cnt<SHARE_IMG_CNT){ti[k]=u;used+=u.length;cnt++;return k}return fb};
const f=S.forest.slice(-36).map(x=>{if(typeof x=='string')return{e:tokShare(x,'','🌳')};
const tk=fTok(x),sd=isDataImg(tk),key=sd?'st:'+String(x.tr).replace(/\W/g,'').slice(0,14)+':'+x.stg:'',fb=sd?(STG[x.stg]||'🌳'):(isTreeTok(tk)?treeFb(tk):'🌳');
const o={e:tokShare(tk,key,fb),n:x.n||'',at:x.at||0,kind:x.kind||'',min:x.min||0,tags:(x.tags||(x.tag?[x.tag]:[])).slice(0,4)};
if(x.kind=='daily'){o.rate=x.rate;o.stg=x.stg;o.prov=x.prov?1:0}return o});return{f,ti}}
