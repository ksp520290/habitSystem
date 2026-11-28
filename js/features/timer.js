/* ---------- 1〜3. タイマー本体 ---------- */
function finish(r,sec){const mn=Math.round((sec||0)/60);
if(r){if(!r.done||isMulti(r)){r.c=(r.c||0)+1;actInc('rt',1,mn);cumAdd('rt',r,1)}else actInc(null,0,mn);if(!r.done){r.done=1;r.st++}}else actInc(null,0,mn);
S.coins+=15;S.forest.push({e:S.sel,n:r?r.n:'',tags:r?tagsOf(r):[],rid:r?r.id:null,at:Date.now(),kind:'focus',min:mn});   // 木とタスクの紐づけ
syncToday();const h=S.hist[kd(today)];if(h&&sec)h.m=(h.m||0)+mn;if(r)studyPost(r,mn)}
function startT(id,skip){checkDay();if(TM)return uiAlert('計測中のタスクがあります');const r=S.R.find(x=>x.id==id);if(!r)return;
if(penOn())return penModal(id);
const sw=r.m=='sw',isP=!!r.pomo&&!r.useAlt&&!sw;if(isP&&!skip&&!(r.pw>0&&r.pr>0))return pomoAsk(id);const mins=r.useAlt?2:(isP?(r.pw||S.pomo.work):r.min);   // 集中・休憩を保存済みなら、聞かずにすぐ開始
TM={id,name:r.n,kind:sw?'sw':'cd',t:sw?0:mins*60,tot:mins*60,acc:0,last:nowMs(),pa:0,ph:'work',pomo:isP,pw:isP?(r.pw||S.pomo.work):0,pr:isP?(r.pr||S.pomo.rest):0,ls:0,cyc:1,bgm:{work:S.pomo.bgmWork!==false,rest:S.pomo.bgmRest!==false}};
try{if(window.Notification&&Notification.permission=='default')Notification.requestPermission()}catch(e){}
Sfx.unlock();Sfx.play('in');Bgm.load('work');Bgm.play();msBind(1);msMeta();TM.iv=setInterval(tick,500);lock()}
function pomoAsk(id){const r=S.R.find(x=>x.id==id);if(!r)return;const w=r.pw||S.pomo.work,rs=r.pr||S.pomo.rest;
S.modal=`<div class="modal"><div><h3>🍅 ポモドーロの時間を設定</h3><p class="sm" style="margin:0">「${esc(r.n)}」の集中と休憩の長さを決めて始めます。前回の設定が入っています。</p>
<div class="row" style="margin-top:8px"><div class="sp"><label class="sm">集中（分）</label><input id="pk_w" type="number" min="1" max="180" value="${w}"></div><div class="sp"><label class="sm">休憩（分）</label><input id="pk_r" type="number" min="1" max="60" value="${rs}"></div></div>
<div class="chips" style="margin-top:8px">${[[15,3],[25,5],[50,10]].map(q=>`<button type="button" class="chip" onclick="$('#pk_w').value=${q[0]};$('#pk_r').value=${q[1]}">${q[0]}/${q[1]}</button>`).join('')}</div>
<div class="row" style="margin:10px 0"><span class="sp">🔁 ループ（集中→休憩を自動で繰り返す）</span><input id="pk_l" type="checkbox" style="width:auto" ${S.pomo.loop?'checked':''}></div>
<div class="row"><button class="btn g sp" onclick="S.modal='';render()">キャンセル</button><button class="btn sp" onclick="pomoGo(${id})">▶ 開始</button></div></div></div>`;render()}
function pomoGo(id){const r=S.R.find(x=>x.id==id);if(!r)return;const w=$('#pk_w').value,rs=$('#pk_r').value;
if(!(+w>=1&&+w<=180)||!(+rs>=1&&+rs<=60))return uiAlert('集中は1〜180分、休憩は1〜60分で入力してください');
r.pw=Math.round(+w);r.pr=Math.round(+rs);setPomo({work:r.pw,rest:r.pr,loop:$('#pk_l').checked});S.modal='';startT(id,1)}
function fin(){const r=S.R.find(x=>x.id==TM.id);try{navigator.vibrate([500,200,500])}catch(e){}
if(TM.pomo&&TM.ph=='work'){finish(r,TM.tot);Sfx.play('out');const rs=TM.pr||S.pomo.rest,m='☕ 作業お疲れさま！木を植えました(+15🪙)。'+rs+'分休憩です';ntf(m);
TM.ph='rest';TM.name=r.n+'（休憩'+rs+'分）';TM.tot=rs*60;TM.acc=0;TM.last=nowMs();TM.t=TM.tot;TM.ls=0;Bgm.load('rest');Bgm.play();msMeta();save();if(isLock())lock();else render();toast(m);return}
if(TM.pomo&&TM.ph=='rest'&&S.pomo.loop){const w=TM.pw||S.pomo.work,m='🍅 休憩おわり。次の集中（'+w+'分）を始めます';
TM.cyc=(TM.cyc||1)+1;TM.ph='work';TM.name=r.n;TM.tot=w*60;TM.acc=0;TM.last=nowMs();TM.t=TM.tot;TM.ls=0;Sfx.play('in');Bgm.load('work');Bgm.play();msMeta();ntf(m);if(isLock())lock();else render();toast(m);return}
endT(TM.ph=='rest'?'rest':'done')}
function endT(mode){if(!TM)return;const r=S.R.find(x=>x.id==TM.id);calc();const sec=Math.round(elapsed()/1000),sw=TM.kind=='sw';let m='',pen=false;
clearInterval(TM.iv);Bgm.pause();msBind(0);
if(mode=='done'){finish(r,sec);Sfx.play('out');m='🌳 完了！森に木を植えました (+15🪙)'+(sw?' 記録 '+fmt(sec):'')}
else if(mode=='abort'){S.forest.push({e:'🪵',n:r?r.n:TM.name,tags:r?tagsOf(r):[],rid:TM.id,at:Date.now(),kind:'abort',min:Math.round(sec/60)});Sfx.play('out');
const n=regStop();m='🪵 中断しました。木が枯れました（今日'+n+'回目）';
if(n>PEN_FREE){S.pen={until:Date.now()+PEN_MIN*60000,rid:TM.id};pen=true}else m+='。'+(n==PEN_FREE?'次の中断から':'あと'+(PEN_FREE+1-n)+'回の中断で')+PEN_MIN+'分間ロックされます'}
else m='休憩おわり。おつかれさま！';
const wasLock=isLock();TM=null;if(wasLock)S.modal='';if(pen)S.modal=penHtml();save();render();toast(m);ntf(m)}
async function stopT(){if(!TM)return;if(TM.ph=='rest')return endT('rest');
const warn=stopToday()>=PEN_FREE?'\n⚠ 今日'+(stopToday()+1)+'回目の中断：'+PEN_MIN+'分間タイマーがロックされます':'';
const v=await dlg({msg:'「'+TM.name+'」を終了しますか？'+warn,btns:[{l:'✅ 完了として記録（森に植樹）',v:'done',c:''},{l:'🪵 中断する（木が枯れます）',v:'abort',c:'d'},{l:'続ける',v:null}]});
if(v&&TM)endT(v)}
function renderMini(){const e=$('#mini'),a=$('#app');if(!e)return;if(!TM){e.innerHTML='';a.classList.remove('timing');return}a.classList.add('timing');
e.innerHTML=`<div class="bar"><span id="mg" style="font-size:24px">${vHtml(treeEm(stage()))}</span><div class="sp" style="min-width:0"><b class="ell">${esc(TM.name)}</b><div id="tt" style="font-size:20px">${fmt(TM.t)}</div></div>${TM.pomo?`<button class="btn g" title="ループ ${S.pomo.loop?'ON':'OFF'}" style="${S.pomo.loop?'':'opacity:.45'}" onclick="togLoop()">🔁</button>`:''}<button class="btn g" onclick="pause()">${TM.pa?'▶ 再開':'⏸ 一時停止'}</button><button class="btn" onclick="stopT()">■ 停止</button><button class="btn g" onclick="lock()" title="ロック画面に戻る">🔒</button></div>`}
function lock(){const n=nextR()||{n:'（ルーティーン未登録）',w:'',st:0};
S.modal=`<div class="lock"><div id="lc" style="font-size:56px">${new Date().toTimeString().slice(0,5)}</div>
<div class="w"><div class="sm" style="color:#cde">タスクタイマー${TM&&TM.pomo?' ・ '+(TM.ph=='rest'?'☕ 休憩':'🍅 集中 '+(TM.cyc||1)+'回目'):''}</div>${TM?`<b>${esc(TM.name)}</b><div id="lt" style="font-size:40px;text-align:center">${fmt(TM.t)}</div><div class="tree sway" id="lg">${vHtml(treeEm(stage()))}</div><div class="prog"><i id="lb" style="width:${Math.round(prog()*100)}%"></i></div><div class="row"><button class="btn sp" onclick="pause()">${TM.pa?'▶ 再開':'⏸ 一時停止'}</button><button class="btn sp" onclick="stopT()">■ 停止</button></div><div class="row" style="margin-top:8px"><button class="btn g sp" onclick="togBgm()">🎵 ${TM.ph=='rest'?'休憩':'作業'}BGM：${Bgm.bgmOn(TM.ph)?'ON':'OFF'}</button>${TM.pomo?`<button class="btn g sp" onclick="togLoop()">🔁 ループ：${S.pomo.loop?'ON':'OFF'}</button>`:''}</div>`:'計測中のタスクはありません'}</div>
<div class="w" onclick="S.modal='';S.tab='home';render()"><div class="sm" style="color:#cde">次の習慣 (Next Habit)</div><b>${esc(n.n)}</b><div>${esc(n.w)} ・ ${n.st}日連続</div></div>
<button class="btn g" onclick="S.modal='';render()">ロック解除</button></div>`;render()}

