function myProfile(){const T=S.team||{},sf=shareForest();return{name:(T.name||'あなた').slice(0,12),icon:icoNorm(T.icon||'🙂'),week:weekData().map(d=>[d.k,d.rt,d.tk,d.td,d.m]),
forest:sf.f,ti:sf.ti,fc:S.forest.length,upd:Date.now()}}
function teamDirty(){clearTimeout(TPUSHT);TPUSHT=setTimeout(teamPush,4000)}
async function teamPush(){if(!teamOn())return;try{await TeamAPI.putMe(myProfile())}catch(e){}}
async function teamPull(force){if(!teamOn()||TBUSY)return;if(!force&&Date.now()-TLAST<8000)return;TBUSY=true;
try{const[ps,ms]=await Promise.all([TeamAPI.posts(),TeamAPI.members()]);TP=ps;TMEM=ms;TERR='';
const sig=JSON.stringify([ps.map(p=>p.id+':'+p.st.length+(p.ed?':e'+p.t:'')),Object.keys(ms).map(k=>k+ms[k].upd)]);
if(sig!=TSIG){TSIG=sig;if(S.tab=='team'&&!S.modal&&!SC.n)render()}}
catch(e){const was=TERR;TERR=e.message;if(was!=TERR&&S.tab=='team'&&!S.modal&&!SC.n)render()}
finally{TLAST=Date.now();TBUSY=false}}
const fromWeek=a=>(a||[]).map(x=>{const[y,mo,dd]=String(x[0]).split('-').map(Number),d=new Date(y,mo-1,dd);return{k:x[0],w:d.getDay(),md:mo+'/'+dd,rt:x[1]|0,tk:(x[2]|0)+(x[3]|0),td:0,m:x[4]|0}});
function demoMember(name){let h=0;for(const c of name)h=(h*31+c.charCodeAt(0))%9973;const rnd=i=>{const x=Math.sin(h*12.9898+i*78.233)*43758.5453;return x-Math.floor(x)};
const w=weekData().map((d,i)=>[d.k,Math.floor(rnd(i)*5),Math.floor(rnd(i+9)*4),Math.floor(rnd(i+19)*3),Math.floor(rnd(i+29)*90)]),
tasks=['英単語','読書','ストレッチ','ジョギング','日記'],trees=['🌸','🍁','🌳','🌲','🎄','🌻'],
f=[...Array(14+Math.floor(rnd(5)*10))].map((_,i)=>({e:trees[Math.floor(rnd(i+40)*trees.length)],n:tasks[Math.floor(rnd(i+60)*tasks.length)],at:Date.now()-i*6e7,kind:'focus',min:25}));
return{name,icon:'🙂',week:w,forest:f,fc:f.length,upd:Date.now(),demo:1}}
function memberOpen(uid){let m=null;
if(uid=='me'||(teamOn()&&uid==S.team.uid))m=myProfile();else if(String(uid).startsWith('demo:'))m=demoMember(uid.slice(5));else if(TMEM[uid])m=TMEM[uid];
if(!m)return toast('このメンバーのデータはまだありません');
MEMV={name:m.name,icon:m.icon,week:fromWeek(m.week),forest:m.forest||[],ti:m.ti||{},fc:m.fc||0,upd:m.upd,demo:!!m.demo};MEMM='n';memberReopen()}
function memberReopen(){S.modal=memberHtml();render()}
function weekBars(w,mt){const mx=Math.max(1,...w.map(d=>mt=='m'?d.m:d.rt+d.tk)),W=330,H=130,bw=30,gap=(W-7*bw)/8;
let s=`<svg viewBox="0 0 ${W} ${H+38}" width="100%" style="color:var(--tx)">`;
w.forEach((d,i)=>{const x=gap+i*(bw+gap),segs=mt=='m'?[[d.m,'#8e6bbf']]:[[d.rt,CAT.rt[1]],[d.tk,CAT.tk[1]]],tot=segs.reduce((a,b)=>a+b[0],0);let y=H;
segs.forEach(sg=>{if(!sg[0])return;const h=sg[0]/mx*(H-20);y-=h;s+=`<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="3" fill="${sg[1]}"/>`});
s+=`<text x="${x+bw/2}" y="${y-4}" text-anchor="middle" font-size="11" fill="currentColor">${tot?tot+(mt=='m'?'分':''):''}</text><text x="${x+bw/2}" y="${H+14}" text-anchor="middle" font-size="12" fill="currentColor">${WD[d.w]}</text><text x="${x+bw/2}" y="${H+27}" text-anchor="middle" font-size="9" style="fill:var(--sub)">${d.md}</text>`});
return s+`<line x1="0" y1="${H}" x2="${W}" y2="${H}" stroke="currentColor" stroke-opacity=".25"/></svg>`}
function memberHtml(){const m=MEMV;if(!m)return '';const w=m.week,tot={rt:0,tk:0,td:0,m:0};w.forEach(d=>{tot.rt+=d.rt;tot.tk+=d.tk;tot.td+=d.td;tot.m+=d.m});
const sum=tot.rt+tot.tk,keys=['rt','tk'],ago=m.upd?Math.max(0,Math.round((Date.now()-m.upd)/60000)):null;
return `<div class="modal"><div><div class="row"><span style="font-size:34px">${icoHtml(m.icon,34)}</span><div class="sp"><b>${esc(m.name)}</b><div class="sm">直近1週間の記録${m.demo?'（デモデータ）':ago!=null?' ・ '+(ago<1?'いま更新':ago<60?ago+'分前に更新':Math.round(ago/60)+'時間前に更新'):''}</div></div><button class="btn g" onclick="S.modal='';render()">閉じる</button></div>
<div class="card" style="margin-top:10px"><div class="row"><b class="sp">📊 達成グラフ</b><div class="seg"><button class="${MEMM=='n'?'on':''}" onclick="MEMM='n';memberReopen()">達成数</button><button class="${MEMM=='m'?'on':''}" onclick="MEMM='m';memberReopen()">集中時間</button></div></div>${weekBars(w,MEMM)}
<div class="sm" style="text-align:center">${MEMM=='m'?'棒の上の数字は集中した分数':keys.map(k=>`<span style="color:${CAT[k][1]}">■</span> ${CAT[k][0]}`).join('　')}</div></div>
<div class="card"><b>🥧 内訳（7日間）</b><div class="row">${donut(keys.map(k=>[tot[k],CAT[k][1]]),150,sum+'件')}<div class="sm">${keys.map(k=>`<div><span style="color:${CAT[k][1]}">●</span> ${CAT[k][0]} <b>${tot[k]}</b>件</div>`).join('')}<div style="margin-top:6px">⏱ 集中 合計 <b>${tot.m}</b>分</div></div></div></div>
<div class="card"><b>🌳 ${esc(m.name)}の森</b> <span class="sm">${m.fc}本 ・ 木をタップで達成タスクを表示</span>${forestSvg(m.forest,1,null,m.ti)}</div></div></div>`}
