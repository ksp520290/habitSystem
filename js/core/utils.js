const pad=n=>String(n).padStart(2,'0');
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
/* ---- アイコン：絵文字のほか、画像ファイル（96px四方に縮小したdataURL）でも代用できる ---- */
const ICV={};   // 編集中の画像アイコン（入力欄ごと）
const isImgIc=s=>/^(data:image\/|https?:\/\/)/.test(s||'');
const icoHtml=(s,sz)=>isImgIc(s)?`<img class="icimg" src="${esc(s)}" alt=""${sz?` style="width:${sz}px;height:${sz}px"`:''}>`:esc(s);
const icoNorm=(s,n)=>{s=String(s==null?'':s);if(/^data:image\/(png|jpe?g|webp|gif);base64,/.test(s))return s.length<=40000?s:'🙂';if(/^https?:\/\//.test(s))return s.length<=300?s:'🙂';return s.slice(0,n||8)||'🙂'};
function imgToIcon(file){return new Promise((ok,ng)=>{if(!file||!/^image\//.test(file.type))return ng(new Error('画像ファイルを選んでください'));
const fr=new FileReader();fr.onerror=()=>ng(new Error('画像を読み込めませんでした'));
fr.onload=()=>{const im=new Image();im.onerror=()=>ng(new Error('この画像は開けませんでした'));
im.onload=()=>{const N=96,c=document.createElement('canvas');c.width=c.height=N;const x=c.getContext('2d'),m=Math.min(im.width,im.height)||N,sx=(im.width-m)/2,sy=(im.height-m)/2;
x.drawImage(im,sx,sy,m,m,0,0,N,N);let u=c.toDataURL('image/webp',.85);if(!/^data:image\/webp/.test(u))u=c.toDataURL('image/png');ok(u)};im.src=fr.result};fr.readAsDataURL(file)})}
function icPick(inp,pv){const f=inp.files&&inp.files[0];inp.value='';if(!f)return;imgToIcon(f).then(u=>{ICV[pv]=u;const e=$('#'+pv);if(e)e.innerHTML=icoHtml(u,36)}).catch(e=>uiAlert(e.message))}
function icClear(pv){ICV[pv]='';const e=$('#'+pv);if(e)e.innerHTML=''}
const icPickerHtml=(inp,val,pv,mx)=>`<div class="row" style="flex-wrap:wrap"><input id="${inp}" maxlength="${mx}" style="width:72px" value="${esc(isImgIc(val)?'':val)}"><span id="${pv}">${ICV[pv]?icoHtml(ICV[pv],36):''}</span><button type="button" class="btn g" onclick="this.nextElementSibling.click()">🖼 画像を選ぶ</button><input type="file" accept="image/*" style="display:none" onchange="icPick(this,'${pv}')"><button type="button" class="btn g" onclick="icClear('${pv}')">画像を外す</button></div><div class="sm">画像を選ぶと、絵文字より優先して表示されます</div>`;
/* ---- 樹種・成長段階の見た目：絵文字／画像の両対応 ----
   トークン：絵文字 ／ 'img:xxxx'（画像樹種のID＝S.customTrees の1要素目）／ 'st:樹種:段階'（チーム共有用の段階画像）／ data:image…（段階に指定した画像）
   森(SVG)の中では <text> ではなく <image> を使う（vSvg）。HTMLの中では <img class="tvimg">（vHtml）。 */
const IMG_TREE_MAX=40000;
const isDataImg=s=>typeof s=='string'&&/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+\/=]+$/.test(s);
const isTreeTok=t=>typeof t=='string'&&/^(img|st):[\w:-]+$/.test(t);
const emojiClean=v=>String(v||'').replace(/['"\\<>&\s]/g,'').slice(0,8);
const treeRec=tok=>(S.customTrees||[]).find(t=>t&&t[0]==tok);
const treeFb=tok=>{const t=treeRec(tok);return (t&&t[4])||'🌳'};
const treeImgUrl=(tok,ti)=>{const t=treeRec(tok);if(t&&isDataImg(t[3]))return t[3];const u=ti&&ti[tok];return isDataImg(u)?u:''};
function visOf(tok,ti){tok=String(tok==null?'':tok);if(isDataImg(tok))return{img:tok};if(isTreeTok(tok)){const u=treeImgUrl(tok,ti);return u?{img:u}:{em:treeFb(tok)}}return{em:tok||'🌳'}}
const vHtml=(tok,sz,ti)=>{const v=visOf(tok,ti);return v.img?`<img class="tvimg" src="${esc(v.img)}" alt=""${sz?` style="width:${sz}px;height:${sz}px"`:''}>`:esc(v.em)};
const emTxt=(tok,def,ti)=>{const v=visOf(tok,ti);return v.em||(isTreeTok(tok)?treeFb(tok):(def||'🌳'))};   // 文字だけが使える場所（通知など）用の絵文字
const vSvg=(tok,x,y,ti)=>{const v=visOf(tok,ti);return v.img?`<image href="${esc(v.img)}" x="${x-14}" y="${y-6}" width="28" height="28" preserveAspectRatio="xMidYMid meet"/>`:`<text x="${x}" y="${y+18}" text-anchor="middle" font-size="24">${esc(v.em)}</text>`};
function stgTok(i,tr){tr=tr==null?S.sel:tr;if(i>=4||i<0)return tr;const u=((S.stageSet||{})[tr]||[])[i];return u||STG[i]}   // 満開＝樹種そのもの／それ以外＝樹種ごとの指定、なければ共通の絵文字
function fTok(x){if(typeof x=='string')return x||'🌳';if(!x)return '🌳';if(x.kind=='daily'&&x.tr!=null&&x.stg>=0&&x.stg<4)return stgTok(x.stg,x.tr);return x.e||'🌳'}
/* 画像（絵文字の代わり）を縮小：樹種・段階用（切り抜かず、透過を保ったまま96px四方に収める） */
function imgToTreeImg(file){return new Promise((ok,ng)=>{if(!file||!/^image\//.test(file.type))return ng(new Error('画像ファイルを選んでください'));
const fr=new FileReader();fr.onerror=()=>ng(new Error('画像を読み込めませんでした'));
fr.onload=()=>{const im=new Image();im.onerror=()=>ng(new Error('この画像は開けませんでした'));
im.onload=()=>{const enc=(N,q)=>{const c=document.createElement('canvas');c.width=c.height=N;const x=c.getContext('2d'),m=Math.max(im.width,im.height)||N,w=im.width*N/m,h=im.height*N/m;
x.drawImage(im,(N-w)/2,(N-h)/2,w,h);let u=c.toDataURL('image/webp',q);if(!/^data:image\/webp/.test(u))u=c.toDataURL('image/png');return u};
let u=enc(96,.85);if(u.length>14000)u=enc(96,.6);if(u.length>14000)u=enc(72,.5);
if(u.length>IMG_TREE_MAX)return ng(new Error('画像が大きすぎます。シンプルな画像をお使いください'));ok(u)};im.src=fr.result};fr.readAsDataURL(file)})}
const icOf=p=>(p.uid&&S.team.uid&&p.uid==S.team.uid)?S.team.icon:((typeof TMEM!='undefined'&&TMEM[p.uid]&&TMEM[p.uid].icon)||p.icon);
const iso=k=>{const[a,b,c]=k.split('-');return a+'-'+pad(b)+'-'+pad(c)};
const unIso=v=>{const[a,b,c]=v.split('-');return a+'-'+(+b)+'-'+(+c)};
const ykey=()=>{const d=new Date(today);d.setDate(d.getDate()-1);return kd(d)};
const isRec=k=>{const e=S.diary[k];return !!(e&&(e.c||e.f||e.e))};
const isOld=k=>{const[a,b,c]=k.split('-').map(Number);return new Date(a,b-1,c)<new Date(today.getFullYear(),today.getMonth(),today.getDate()-1)};
const snap=()=>{const o={};for(const k in S)if(!['modal','ed','dd','dv','selDay'].includes(k))o[k]=S[k];return o};
const prog=()=>TM.kind=='sw'?Math.min(TM.t/1800,1):1-TM.t/TM.tot;
const isLock=()=>!!S.modal&&S.modal.includes('class="lock"');
function toast(m){const d=document.createElement('div');d.textContent=m;d.className='toast';document.body.appendChild(d);setTimeout(()=>d.remove(),2200)}
function dl(n,t,m){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:m}));a.download=n;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}
function bars7(){const a=weekData().map(d=>[d.rt+d.tk+d.td,WD[d.w]]);const mx=Math.max(S.R.length,...a.map(x=>x[0]),1);
return `<div class="bars">`+a.map(b=>`<div class="bc"><span>${b[0]}</span><i style="height:${Math.max(4,b[0]/mx*90)}px"></i><small>${b[1]}</small></div>`).join('')+`</div>`}
function edBtns(k,id){const e=f=>`event.stopPropagation();${f}`;return `<button class="btn g" onclick="${e(`edit('${k}',${id})`)}">✏️</button><button class="btn g" onclick="${e(`mv('${k}',${id},-1)`)}">↑</button><button class="btn g" onclick="${e(`mv('${k}',${id},1)`)}">↓</button><button class="btn" style="background:#d9534f" onclick="${e(`del('${k}',${id})`)}">🗑️</button>`}
const edBar=()=>`<div class="card row" data-tu="edbar"><span class="sp sm">✏️編集／↑↓並び替え／🗑️削除</span><button class="btn" onclick="S.ed=0;render()">完了</button></div>`;
function mv(k,id,d){const a=S[k],i=a.findIndex(v=>v.id==id),j=i+d;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];save();render()}
