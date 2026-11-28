/* ===== バックアップ：JSON／ZIP（backup.json＋audio/） ===== */
const snapExport=()=>{const o=JSON.parse(JSON.stringify(snap(),(k,v)=>k==='dataUrl'?undefined:v));try{delete o.user.settings.github.token}catch(e){}try{delete o.team.pw}catch(e){}return o};
async function dataUrlBytes(u){try{return new Uint8Array(await(await fetch(u)).arrayBuffer())}catch(e){const b=atob((u||'').split(',')[1]||''),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a}}
const bytesDataUrl=(b,m)=>new Promise((ok,ng)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>ng(new Error('音源の変換に失敗しました'));r.readAsDataURL(new Blob([b],{type:m||'application/octet-stream'}))});
async function exportZip(){try{const ent=[],aud=[];
for(const s of S.dictationSets)for(const f of s.audioFiles||[]){if(!f.dataUrl)continue;const mime=(/^data:([^;,]+)/.exec(f.dataUrl)||[])[1]||'application/octet-stream',ext=(/\.[A-Za-z0-9]{1,5}$/.exec(f.name||'')||['.bin'])[0].toLowerCase(),p=`audio/${s.id}/${f.id}${ext}`;
ent.push({name:p,data:await dataUrlBytes(f.dataUrl)});aud.push({id:f.id,setId:s.id,path:p,mime})}
const o=snapExport();o.__audio=aud;o.__format='shukan-no-mori-backup';o.__v=1;ent.unshift({name:'backup.json',data:JSON.stringify(o)});
dl('shukan_no_mori_backup_'+iso(kd(new Date()))+'.zip',ZipUtil.create(ent),'application/zip');toast('ZIPを書き出しました（音源'+aud.length+'件）')}
catch(e){console.error(e);uiAlert('ZIPの書き出しに失敗しました: '+e.message)}}
async function restore(t,files){try{const o=typeof t=='string'?JSON.parse(t):t;if(!o||typeof o!='object'||Array.isArray(o)||(o.R&&!Array.isArray(o.R)))throw new Error('形式が不正です');
if(!await uiConfirm('現在のデータをバックアップの内容で上書きします。よろしいですか？','復元する'))return;
const aud=o.__audio;delete o.__audio;delete o.__format;delete o.__v;const tk=((S.user||{}).settings||{}).github;const oldTok=tk&&tk.token;
const oldPw=S.team&&S.team.pw,oldTid=S.team&&S.team.tid;Object.assign(S,o);ensure();const g=S.user.settings.github;if(!g.token&&oldTok)g.token=oldTok;if(!S.team.pw&&oldPw&&S.team.tid==oldTid)S.team.pw=oldPw;pomoSaveLS();
if(aud&&files)for(const a of aud){const b=files.get(a.path);if(!b)continue;const du=await bytesDataUrl(b,a.mime);for(const s of S.dictationSets)for(const f of s.audioFiles||[])if(f.id==a.id)f.dataUrl=du}
await hydrateAudio();await flush();render();toast('復元しました')}catch(e){console.error(e);uiAlert('バックアップを読み込めません：'+e.message)}}
async function rdAny(i){const f=i.files[0];i.value='';if(!f)return;
try{if(/\.zip$/i.test(f.name)||f.type=='application/zip'){const fl=await ZipUtil.read(await f.arrayBuffer()),b=fl.get('backup.json');if(!b)throw new Error('ZIP内に backup.json がありません');await restore(ZipUtil.textOf(b),fl)}
else await restore(await f.text())}catch(e){uiAlert('読み込みに失敗しました：'+e.message)}}

