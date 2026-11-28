/* ---------- 4. タスク（ルーティーン／タスク／ToDo） ---------- */
function rate7(){let d=0,t=0;for(let i=0;i<7;i++){const x=new Date(today);x.setDate(x.getDate()-i);const du=due(),h=i?S.hist[kd(x)]:{d:du.filter(r=>r.done).length,t:du.length};if(h){d+=h.d;t+=h.t}}return t?Math.round(d/t*100):0}
function dayInfo(d){const k=kd(d);if(k==kd(today)){const du=due();return{d:du.filter(r=>r.done).length,t:du.length,m:0}}return S.hist[k]}
function nextR(){const du=due();return du.find(r=>!r.done)||du[0]||S.R[0]}
function syncToday(){const du=due(),dn=du.filter(r=>r.done);S.hist[kd(today)]={d:dn.length,t:du.length,ids:dn.map(r=>r.id),m:(S.hist[kd(today)]||{}).m||0}}
function checkDay(){const n=new Date(),k=kd(n);if(!S.lastDay){S.lastDay=k;today=n;return 0}if(S.lastDay==k){today=n;return 0}
const[a,b,c]=S.lastDay.split('-').map(Number),ld=new Date(a,b-1,c),dueL=S.R.filter(r=>isDue(r,ld)),dn=dueL.filter(r=>r.done);
S.hist[S.lastDay]={d:dn.length,t:dueL.length,ids:dn.map(r=>r.id),m:(S.hist[S.lastDay]||{}).m||0};
dayTrees(rtRate(dn.length,dueL.length),rtRate(S.T.filter(t=>t.c>0).length,S.T.length),new Date(a,b-1,c,23,59,59).getTime(),0).forEach(x=>S.forest.push(x));   // 前日の終わりの達成率で、木を確定
let gap=0;const missed=new Set(),d=new Date(ld);S.R.forEach(r=>{if(isDue(r,ld)&&!r.done)missed.add(r.id)});
for(;;){d.setDate(d.getDate()+1);if(kd(d)==k||d>n)break;gap=1;S.R.forEach(r=>{if(isDue(r,d))missed.add(r.id)});if(!S.hist[kd(d)])S.hist[kd(d)]={d:0,t:S.R.filter(r=>isDue(r,d)).length,ids:[],m:0}}
skipPrepare(missed,gap,ld);S.R.forEach(r=>{if(missed.has(r.id))r.st=0;r.done=0;r.c=0;r.useAlt=0});                 // ルーティーン：対象曜日に未達成で再表示
rvFinalize(k);S.P.forEach(p=>{if(!p.day)p.day=(p.d=='td')?S.lastDay:kd(new Date(ld.getFullYear(),ld.getMonth(),ld.getDate()-1))});S.T.forEach(t=>{if(gap||!t.done)t.st=0;t.done=0;t.c=0});                                 // タスク（1日リピート）：毎日リセット
S.stopCnt={d:k,n:0};                                                                      // 途中停止回数は日付が変わるとリセット
const lim=new Date(n);lim.setDate(lim.getDate()-90);for(const x in S.act){const[y,m2,d2]=x.split('-').map(Number);if(new Date(y,m2-1,d2)<lim)delete S.act[x]}
S.lastDay=k;today=n;save();return 1}
function tog(id){if(S.ed)return;checkDay();const r=S.R.find(x=>x.id==id);if(!r||!isDue(r,today))return;
if(r.done&&!isMulti(r)){toast('✅ 今日はもう達成済みです（1日に複数回達成できるのは「反復」タグの習慣だけ）');return}
const first=!r.done;r.c=(r.c||0)+1;if(first){r.done=1;r.st++;S.coins+=5}actInc('rt');cumAdd('rt',r,1);studyPost(r);syncToday();save();render();dailyToast()}
function untog(id){const r=S.R.find(x=>x.id==id);if(!r||!(r.c>0))return;r.c--;actInc('rt',-1);cumAdd('rt',r,-1);
if(r.c==0&&r.done){r.done=0;r.st=Math.max(0,r.st-1);S.coins=Math.max(0,S.coins-5)}syncToday();save();render()}
function togT(id){if(S.ed)return;checkDay();const t=S.T.find(x=>x.id==id);if(!t)return;if(!t.c){t.done=1;t.st++}t.c=(t.c||0)+1;actInc('tk');cumAdd('tk',t,1);studyPost(t);save();render();dailyToast()}
function untogT(id){const t=S.T.find(x=>x.id==id);if(!t||!(t.c>0))return;t.c--;actInc('tk',-1);cumAdd('tk',t,-1);if(t.c==0){t.done=0;t.st=Math.max(0,t.st-1)}save();render()}
function r_alt(id){const r=S.R.find(x=>x.id==id);r.useAlt=!r.useAlt;render()}

function rtOrder(list){if(S.ed)return list;const on=list.filter(r=>isDue(r,today));
return [...on.filter(r=>!r.done),...on.filter(r=>r.done),...list.filter(r=>!isDue(r,today))]}   // Array.filter は元の並びを保つ
