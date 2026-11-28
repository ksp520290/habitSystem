function copyText(t){const fb=()=>{const a=document.createElement('textarea');a.value=t;a.style.cssText='position:fixed;opacity:0';document.body.appendChild(a);a.select();try{document.execCommand('copy');toast('コピーしました')}catch(e){uiAlert(t)}a.remove()};
try{if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(t).then(()=>toast('コピーしました')).catch(fb)}catch(e){}fb()}
const inviteText=()=>`「習慣の森」のチームに参加しよう！\nチームID：${S.team.tid}\nパスワード：${S.team.pw}`+(TEAM_DB_DEFAULT?'':`\nサーバーURL：${S.team.db}`)+`\n（アプリの「チーム」タブ →「チーム」ボタンから参加）`;
function teamSetup(){S.modal=teamHtml();render()}
function teamHtml(){const T=S.team;ICV.ticpv=isImgIc(T.icon)?T.icon:'';
if(teamOn())return `<div class="modal"><div><div class="row"><b class="sp">👥 チーム設定</b><button class="btn g" onclick="S.modal='';render()">閉じる</button></div>
<div class="card" style="margin-top:10px"><div class="sm">チーム名</div><b>${esc(T.tname||'チーム')}</b><div class="sm" style="margin-top:8px">チームID</div><div class="row"><b class="sp" style="font-size:20px;letter-spacing:1px">${esc(T.tid)}</b><button class="btn g" onclick="copyText(S.team.tid)">コピー</button></div>
<div class="sm" style="margin-top:8px">パスワード</div><div class="row"><b class="sp" style="font-size:20px;letter-spacing:1px">${esc(T.pw)}</b><button class="btn g" onclick="copyText(S.team.pw)">コピー</button></div>
<button class="btn" style="width:100%;margin-top:10px;padding:10px" onclick="copyText(inviteText())">📨 招待メッセージをコピー</button><p class="sm" style="margin:6px 0 0">このIDとパスワードを仲間に伝えると、別の端末から同じチームに参加できます。</p></div>
<div class="card"><b>あなたの表示</b><label>表示名</label><input id="tnm" maxlength="12" value="${esc(T.name)}"><label>アイコン（絵文字1つ、または画像ファイル）</label>${icPickerHtml('tic',T.icon,'ticpv',8)}<button class="btn" style="width:100%;margin-top:8px" onclick="tmSaveProfile()">保存</button></div>
<div class="row"><button class="btn g sp" onclick="teamPull(true).then(()=>teamPush()).then(()=>toast('同期しました'))">🔄 今すぐ同期</button><button class="btn d sp" onclick="tmLeave()">チームを抜ける</button></div>
<p class="sm">チームに共有される情報：表示名・アイコン・直近7日の達成数と集中時間・森の木（達成したタスク名つき）・投稿。内容はチームのパスワードで暗号化されます。森に画像の樹種を使っている場合、容量を抑えるため小さい画像だけ（1枚約10KB以下・合計約26KB以下・最大8種）が画像のまま共有され、超える分は代替絵文字で表示されます。</p></div></div>`;
return `<div class="modal"><div><div class="row"><b class="sp">👥 チームに参加・作成</b><button class="btn g" onclick="S.modal='';render()">閉じる</button></div>
${TEAM_DB_DEFAULT?'':`<label>サーバーURL（Firebase Realtime Database）</label><input id="tdb" placeholder="https://xxxx-default-rtdb.firebaseio.com" value="${esc(T.db)}" autocapitalize="off">
<details class="acc"><summary>サーバーの用意のしかた（最初の1人だけ）</summary><div class="accb sm">1. Firebaseコンソールでプロジェクトを作り、Realtime Databaseを作成<br>2. 「ルール」を下記にして公開<br><code style="user-select:all">{"rules":{"teams":{"$tid":{".read":true,".write":true}}}}</code><br>3. 画面上部のデータベースURLをここに貼り付け<br>※チームIDを知らない人は一覧を取得できず、中身はパスワードで暗号化されます。</div></details>`}
<label>あなたの表示名</label><input id="tnm" maxlength="12" value="${esc(T.name)}" placeholder="例：たろう"><label>アイコン（絵文字1つ、または画像ファイル）</label>${icPickerHtml('tic',T.icon||'🙂','ticpv',8)}
<div class="card" style="margin-top:10px"><b>チームに参加する</b><label>チームID</label><input id="ttid" placeholder="MORI-XXXXXX" autocapitalize="characters" value="${esc(T.tid)}"><label>パスワード</label><input id="tpw" autocapitalize="characters" autocomplete="off"><button class="btn" style="width:100%;margin-top:8px;padding:10px" onclick="tmJoin()">参加する</button></div>
<div class="card"><b>新しくチームを作る</b><label>チーム名</label><input id="ttn" maxlength="20" value="バランスのいい食事"><button class="btn" style="width:100%;margin-top:8px;padding:10px" onclick="tmCreate()">作成してID・パスワードを発行</button></div></div></div>`}
function tmForm(){let db=TEAM_DB_DEFAULT||($('#tdb')?$('#tdb').value.trim().replace(/\/+$/,''):S.team.db);
if(!/^https:\/\/[^\s\/]+/.test(db||''))throw new Error('サーバーURL（https://…）を入力してください');
return{db,name:($('#tnm').value.trim()||'ゲスト').slice(0,12),icon:ICV.ticpv||([...($('#tic').value.trim()||'🙂')][0]||'🙂')}}
async function tmCreate(){try{const f=tmForm(),tn=($('#ttn').value.trim()||'チーム').slice(0,20);toast('作成中…');const r=await TeamAPI.create(f.db,tn);
S.team={db:f.db,tid:r.tid,pw:r.pw,uid:'u_'+rndId(10),name:f.name,icon:f.icon,tname:tn};save();TP=[];TMEM={};TSIG='';await teamPush();S.modal=teamHtml();render();toast('チームを作成しました。IDとパスワードを仲間に共有してください')}
catch(e){uiAlert(e.message)}}
async function tmJoin(){try{const f=tmForm(),tid=$('#ttid').value.trim().toUpperCase(),pw=$('#tpw').value.trim().toUpperCase();
if(!tid||!pw)return uiAlert('チームIDとパスワードを入力してください');toast('確認中…');const r=await TeamAPI.verify(f.db,tid,pw);
S.team={db:f.db,tid,pw,uid:(S.team.uid&&S.team.tid==tid?S.team.uid:'u_'+rndId(10)),name:f.name,icon:f.icon,tname:r.name};save();TP=[];TMEM={};TSIG='';TLAST=0;
await teamPush();await teamPull(true);S.modal='';render();toast('「'+r.name+'」に参加しました')}
catch(e){uiAlert(e.message)}}
function tmSaveProfile(){S.team.name=($('#tnm').value.trim()||'ゲスト').slice(0,12);S.team.icon=ICV.ticpv||[...($('#tic').value.trim()||'🙂')][0]||'🙂';save();teamPush().then(()=>teamPull(true)).then(()=>render());toast('保存しました')}
async function tmLeave(){if(!await uiConfirm('このチームを抜けますか？（投稿は残り、自分の記録の共有が止まります）','抜ける'))return;
try{await TeamAPI.delMe()}catch(e){}const T=S.team;S.team={db:T.db,tid:'',pw:'',uid:'',name:T.name,icon:T.icon,tname:''};TP=[];TMEM={};TSIG='';save();S.modal='';render();toast('チームを抜けました')}
let PEDIT=null;
function pEdit(key){const on=teamOn();let t='';
if(on){const p=TP.find(x=>x.id==key);if(!p||p.uid!=S.team.uid)return;t=p.t}else{const p=S.P[key];if(!p||p.bot||p.u!='あなた')return;t=p.t}
PEDIT=key;S.modal=`<div class="modal"><div><h3 style="margin:0 0 6px">✏️ メッセージを編集</h3><textarea id="pet" rows="5">${esc(t)}</textarea><p class="sm">画像・スタンプはそのまま残ります。</p><div class="row" style="margin-top:8px"><button class="btn g sp" onclick="S.modal='';PEDIT=null;render()">キャンセル</button><button class="btn sp" onclick="pEditSave()">保存</button></div></div></div>`;render()}
async function pEditSave(){const t=$('#pet').value.trim();if(!t)return uiAlert('メッセージを入力してください');const key=PEDIT;
if(teamOn()){const p=TP.find(x=>x.id==key);if(!p||p.uid!=S.team.uid){S.modal='';render();return}
try{await TeamAPI.editPost(key,{u:p.uid,n:p.name,i:isImgIc(p.icon)?'🙂':p.icon,t,img:p.img||'',day:p.day,tm:p.tm,ed:1});p.t=t;p.ed=1}catch(e){return uiAlert('編集できませんでした：'+e.message)}}
else{const p=S.P[key];if(!p||p.bot||p.u!='あなた'){S.modal='';render();return}p.t=t;p.ed=1;save()}
S.modal='';PEDIT=null;render();if(teamOn())teamPull(true);toast('メッセージを編集しました')}
function stamp(i){S.P[i].st.push(['👍','❤️','👏'][Math.floor(Math.random()*3)]);save();render()}
function teamStamp(pid){const e=['👍','❤️','👏'][Math.floor(Math.random()*3)],p=TP.find(x=>x.id==pid);if(p)p.st.push(e);render();TeamAPI.stamp(pid,e).then(()=>teamPull(true)).catch(x=>toast(x.message))}
