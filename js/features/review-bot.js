/* ---------- 学習報告：復習の通知（1・3・7・14・28日後に、自分の投稿への返信として届く） ---------- */
const RV_DAYS=[1,3,7,14,28],STUDY_RE=/英単語|単語|英語|英文|勉強|学習|暗記|復習|問題集|参考書|リスニング|音読|ディクテーション|読書|資格/;
function schedRv(pid,t){if(!pid)return;const at=Date.now(),tp=rvTopic(t),an=rvAnchorNow();RV_DAYS.forEach(n=>S.rv.push({pid:String(pid),t:String(t).slice(0,60),n,due:at+n*864e5,tp,an}));save();NTFUI.request('review')}   // 復習を予約するとき、通知の許可もお願いする
function rvCheck(){if(!ready)return;const now=Date.now(),du=S.rv.filter(v=>v.due<=now);if(!du.length)return;
du.sort((x,y)=>x.due-y.due).forEach((v,i)=>S.rr.unshift({id:'rv'+now.toString(36)+i,pid:v.pid,t:v.t,n:v.n,at:now,rd:0,tp:v.tp||rvTopic(v.t),an:v.an||''}));S.rv=S.rv.filter(v=>v.due>now);S.rr=S.rr.slice(0,200);rvSyncTodos();save();
const m=du.length==1?'📚 復習のタイミングです（'+du[0].n+'日後）：'+du[0].t.slice(0,30):'📚 復習のタイミングです（'+du.length+'件）';rvNotify(m);toast('🤖 復習bot：復習のタイミングです（ToDoに追加しました）');if(!S.modal&&!SC.n)render()}
const rvUnread=()=>S.rr.filter(r=>!r.rd).length;
function rvRead(i){if(S.rr[i]){S.rr[i].rd=1;save();render()}}
function rvReadAll(){S.rr.forEach(r=>r.rd=1);save();render()}
async function sendPost(t,img,study){
if(teamOn()){const r=await TeamAPI.post({u:S.team.uid,n:S.team.name||'ゲスト',i:isImgIc(S.team.icon)?'🙂':(S.team.icon||'🙂'),t,img,day:kd(today),tm:hmNow()});if(study)schedRv(r&&r.name,t);await teamPull(true);return}
const lid='l'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);S.P.push({u:'あなた',d:'td',day:kd(today),t,img,tm:hmNow(),st:[],lid});if(study)schedRv(lid,t);save();render()}
/* 「継続」タグのタスクを完了したら、自動でグループに投稿（学習報告として復習通知も予約） */
function autoPost(t){sendPost(t,'',true).then(()=>{toast('📚 グループに自動投稿しました');if(S.tab=='team'&&!S.modal&&!SC.n)render()}).catch(e=>toast('グループへの自動投稿に失敗：'+e.message))}
function studyPost(x,mn){if(TUTSB||!isStudy(x))return;if(!Array.isArray(S.rq))S.rq=[];S.rq.push({n:x.n,mn:mn||0});save();   // 報告する前に「学習範囲」を入力するポップアップを出す（render()で順番に表示）
setTimeout(()=>{if(S.rq.length&&!S.modal&&!SC.n)render()},60)}
function rqHtml(){const q=S.rq[0];return `<div class="modal"><div><h3 style="margin:0 0 6px">🤖 報告bot：学習報告</h3><p class="sm" style="margin:0 0 6px">「${esc(q.n)}」${q.mn?'（'+q.mn+'分）':''}をグループに報告します。今回の学習範囲を入力してください（空欄でもOK）。</p><label>学習範囲</label><input id="rqr" placeholder="例：英単語 p.10〜20 ／ No.101〜150" maxlength="60" autocomplete="off"><div class="row" style="margin-top:10px"><button class="btn g sp" onclick="rqGo(0)">報告しない</button><button class="btn sp" onclick="rqGo(1)">報告する</button></div>${S.rq.length>1?`<p class="sm" style="margin:6px 0 0">ほかに報告待ち：${S.rq.length-1}件</p>`:''}</div></div>`}
function rqGo(y){const el=$('#rqr'),rg=el?el.value.trim():'',q=S.rq.shift();S.modal='';save();
if(q&&y)autoPost('📚 「'+q.n+'」を完了しました！'+(q.mn?'（'+q.mn+'分）':'')+(rg?' 範囲：'+rg:'')+' #'+STUDY_TAG);render()}
function post(){const t=$('#pt').value.trim(),f=$('#pi').files[0];if(!t&&!f)return;const study=!!($('#pst')&&$('#pst').checked)||STUDY_RE.test(t);
const add=async img=>{
if(teamOn()){if(img&&/^data:/.test(img)){toast('画像をチームで共有するにはGitHub連携が必要です。テキストのみ投稿します');img=''}if(!t&&!img)return;
try{await sendPost(t,img,study);DRAFT='';S.coins+=3;save();render();if(study)toast('📚 復習の通知を予約しました（1・3・7・14・28日後）')}catch(e){uiAlert('投稿できませんでした：'+e.message)}return}
DRAFT='';await sendPost(t,img,study);S.coins+=3;save();if(study)toast('📚 復習の通知を予約しました（1・3・7・14・28日後）');
setTimeout(()=>{S.P.push({u:'にゃんチャレAI',bot:1,d:'td',day:kd(today),t:'素晴らしい継続力ですね！その調子にゃ！🐾',img:'',tm:hmNow(),st:[]});save();render()},700)};
if(f)AssetManager.uploadImage(f,'post').then(o=>add(o.image));else add('')}

