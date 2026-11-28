/* my page */
function my(){const y=today.getFullYear(),mo=today.getMonth(),first=new Date(y,mo,1).getDay(),n=new Date(y,mo+1,0).getDate();let days=0,green=0;
let cells='日月火水木金土'.split('').map(x=>`<div class="sm">${x}</div>`).join('')+'<div></div>'.repeat(first);
for(let i=1;i<=n;i++){const d=new Date(y,mo,i),h=dayInfo(d);let bg='#e9ecea',c='#555';if(h&&h.d>0){days++;if(h.d>=h.t){bg='#22c55e';c='#fff';green++}else{bg='#facc15';c='#333'}}
cells+=`<div onclick="S.selDay=${i};render()"><b style="background:${bg};color:${c};${S.selDay==i?'outline:2px solid var(--pri)':''}">${i}</b></div>`}
let det='';if(S.selDay){const dd=new Date(y,mo,S.selDay),k=kd(dd),sd=dayInfo(dd),ids=sd?(k==kd(today)?S.R.filter(r=>r.done).map(r=>r.id):dayIds(k,sd)):[];
det=`<div class="sm" style="margin-top:8px"><b>${mo+1}月${S.selDay}日</b>：${sd?sd.d+'/'+sd.t+' 達成':'記録なし'}</div>`+(sd?S.R.map(r=>`<div class="sm">${ids.includes(r.id)?'✅':'⬜'} ${esc(r.n)}</div>`).join(''):'')}
const dn=Object.keys(S.diary).filter(isRec).length,tb=['mo','wk','cu'].includes(S.st)?S.st:'mo';
const body=tb=='mo'?`<div class="row" style="text-align:center"><div class="sp">✔ ルーティン<br><b style="font-size:26px">${days}</b>日</div><div class="sp">🟢 青信号<br><b style="font-size:26px">${green}</b>回</div><div class="sp">✍ 日記<br><b style="font-size:26px">${dn}</b>日</div></div>
<div class="card" style="margin-top:10px"><b>月間信号機カレンダー</b> <span class="sm">${y}年${mo+1}月</span><div class="cal" style="margin-top:8px">${cells}</div>${det}</div>`:tb=='wk'?weekRank():cumHtml();
return `${tutCard()}<h3 style="margin:4px 0">統計</h3><div class="tabs">${[['mo','月間'],['wk','週間'],['cu','累計']].map(t=>`<button class="${tb==t[0]?'on':''}" onclick="S.st='${t[0]}';render()">${t[1]}</button>`).join('')}</div>${body}

${settingsHtml()}`}
function ics(){const t=new Date(),p=n=>String(n).padStart(2,'0'),z=''+t.getFullYear()+p(t.getMonth()+1)+p(t.getDate()),st=t.toISOString().replace(/[-:]/g,'').slice(0,15)+'Z',e=s=>String(s).replace(/([,;\\])/g,'\\$1').replace(/\n/g,'\\n');
const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Habit Forest//JA','CALSCALE:GREGORIAN'];
S.R.forEach(r=>L.push('BEGIN:VEVENT','UID:'+r.id+'@habit-forest','DTSTAMP:'+st,'SUMMARY:'+e(r.n),'DESCRIPTION:'+e(r.w),'DTSTART:'+z+'T070000','DURATION:PT'+(r.m=='check'?10:(r.min||10))+'M','RRULE:FREQ=DAILY','END:VEVENT'));
L.push('END:VCALENDAR');dl('habits.ics',L.join('\r\n'),'text/calendar')}
