let TM=null;
function donut(parts,sz,ctr,col){const r=sz/2-14,c=2*Math.PI*r;let o=0,tot=parts.reduce((a,b)=>a+b[0],0)||1;
return `<svg width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}"><circle cx="${sz/2}" cy="${sz/2}" r="${r}" fill="none" stroke="#e5e7eb" stroke-width="16"/>`+parts.map(p=>{const l=p[0]/tot*c;const s=`<circle cx="${sz/2}" cy="${sz/2}" r="${r}" fill="none" stroke="${p[1]}" stroke-width="16" stroke-dasharray="${l} ${c-l}" stroke-dashoffset="${-o}" transform="rotate(-90 ${sz/2} ${sz/2})"/>`;o+=l;return s}).join('')+`<text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" font-size="${sz/4.5}" font-weight="700" fill="${col||'currentColor'}">${ctr}</text></svg>`}
const top3=()=>[...S.R].sort((a,b)=>b.st-a.st).slice(0,3).map(r=>r.id);
const fmt=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
function stage(){if(!TM)return 0;const p=TM.kind=='sw'?Math.min(TM.t/1800,1):1-TM.t/TM.tot;return Math.min(4,Math.floor(p*5))}
const treeEm=(i,tr)=>stgTok(i,tr);   // 段階 i(0〜4) の見た目トークン（絵文字／画像）
/* 下部ナビ：ホーム／チーム／探索(📖)／マイページ／森林・森（ラベルはここで変更できます） */
const NAV_ITEMS=[['home','🏠','ホーム'],['team','👥','チーム'],['explore','📖','探索'],['my','👤','マイページ'],['grow','🌳','森林・森']];
function render(){const sc=$('#m').scrollTop;
$('#nv').innerHTML=NAV_ITEMS.map(a=>`<button class="${S.tab==a[0]?'on':''}" onclick="S.tab='${a[0]}';S.ed=0;render()"><span>${a[1]}</span>${a[2]}${a[0]=='team'&&rvUnread()?' 🔴'+rvUnread():''}</button>`).join('');
renderMini();$('#m').innerHTML=(({home,team,explore,my,grow})[S.tab]||home)();
if(!S.modal&&!SC.n&&S.skipOffer)S.modal=skipHtml();   // さぼり許容チケットの確認（前日に記録が途切れたとき）
if(!S.modal&&!SC.n&&S.rq&&S.rq.length)S.modal=rqHtml();
$('#ov').innerHTML=S.modal||'';$('#m').scrollTop=sc}
/* addT/addR/saveR/タイマー群は末尾の拡張ブロックで再定義 */
