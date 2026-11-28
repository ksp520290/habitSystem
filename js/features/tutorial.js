/* =====================================================================
   チュートリアル（スポットライト方式）
   ・説明したい部分だけ明るく照らし、ほかは暗くする。吹き出しに説明文と「次へ」「スキップ」。
   ・光っている部分をタップ（または実際に操作）するか、「次へ」で次のステップへ。
   ・各ステップの pre（事前処理）で、必要なタブ・モーダル・画面を開く。tg は光らせる要素（関数）。
   ・★説明文は下の TUT_STEPS の t（見出し）と x（本文）を書き換えるだけで差し替えられます。
   ・実データを汚さない：開始時に状態を退避し、中は保存・チームへの送信を止める。終了（完了／スキップ）で操作前の状態に戻す。
   ・初回判定：localStorage の shukan_tutorial_done の有無。完了／スキップで保存。
     保存済みデータがある既存ユーザーには自動表示せず、マイページの案内だけを出す。
   ===================================================================== */
const TUT_KEY='shukan_tutorial_done',TUT_AUTO='shukan_tutorial_auto',TUT_N=11,TUT_HEAVY=['dictationSets','books','bookFolders','dictationFolders','dictationRewards'];
const tutLS={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}},del:k=>{try{localStorage.removeItem(k)}catch(e){}}};
const qa=s=>[...document.querySelectorAll(s)];
const TUT={on:0,i:0,n:0,bk:null,iv:null,rect:null,acc0:{}};
const tH=m=>{S.tab='home';S.mode=m||'rt';render()};
const tAcc=k=>{for(const a in ACC)ACC[a]=false;if(k)ACC[k]=true};

const TUT_STEPS=[
{ch:0,t:'ようこそ、習慣の森へ',x:`主な機能を順番にご案内します。\n光っている部分をタップするか、「次へ」を押すと進みます。\n\n※チュートリアル中の操作は保存されません。終わる（完了・スキップ）と、操作前の状態に戻ります。チームへの投稿や通知も送られません。`,pre:()=>tH('rt')},
{ch:1,t:'今日の木・達成数・達成率',x:`ホームの一番上のカードです。最初は「今日の木」が表示されます。\n右上のボタンで「達成数」（直近7日の棒グラフ）と「達成率」（直近7日のドーナツ）に切り替えられます。`,pre:()=>{S.vw='tree';tH('rt')},tg:()=>$('#m .card'),pass:1},
{ch:2,t:'ルーティーンとToDo',x:`ここで「ルーティーン」と「ToDo」を切り替えます。\n・ルーティーン：毎日（または決めた曜日）続ける習慣。基本は1日1回で、連続日数が伸びていきます。\n・ToDo：1日に何度でも達成できるタイル。翌日になるとリセットされます。`,pre:()=>tH('rt'),tg:()=>$('#m .tabs'),pass:1},
{ch:2,t:'ルーティーン・ToDoを追加する',x:`右下の「＋」でルーティーンを追加します。名前・きっかけ・ミニ目標・タグ・計測方法を決めて保存します。\nToDoは、ToDo画面の「ToDoを追加」タイルから追加します（アイコンは絵文字か画像）。`,pre:()=>tH('rt'),tg:()=>$('#m .fab')},
{ch:2,t:'曜日を指定する',x:`「繰り返す曜日」で、習慣をやる曜日を決められます。何も選ばなければ毎日です。\n選んだ曜日だけ今日の一覧に出て、ほかの日は「今日は休み」になり、連続日数も途切れません。`,pre:()=>{tH('rt');rModal(null)},tg:()=>$('#a8')},
{ch:2,t:'「継続」タグ・「反復」タグ',x:`タグは複数つけられます。特別な意味を持つ2つがあります。\n・「反復」：1日に何度でも達成できます（付けないと1日1回）。\n・「継続」：完了すると🤖報告botが学習範囲をたずねて、チームに自動で報告します。作業BGMも勉強用になります。\n右の❓でも説明を見られます。`,pre:()=>{tH('rt');rModal(null);tgHelp()},tg:()=>{const b=qa('.modal .btn').find(x=>x.textContent.trim()=='❓');return [b,$('#tghelp'),$('#tgp')]}},
{ch:2,t:'削除・編集モード',x:`「✏️ 編集モード」ボタン（または項目の長押し）で編集モードに入ります。\n各項目に ✏️編集・↑↓並び替え・🗑️削除 が出ます。終わったら「完了」を押します。`,pre:()=>{tH('rt');S.ed=1;render()},tg:()=>[$('[data-tu=edbar]'),$('#m .card.rt')]},
{ch:2,t:'ミニと取り消し',x:`「ミニ」は、気が乗らない日に小さな代替行動（ミニ目標）へ切り替えるボタンです（タイマーも2分に）。\n「↩」は、直近の達成を1回ぶん取り消します。押し間違いの修正に使えます（ToDoにも「↩ 取り消し」があります）。`,pre:()=>tH('rt'),tg:()=>qa('#m .card.rt').find(c=>[...c.querySelectorAll('.btn')].some(b=>b.textContent.trim()=='ミニ'))||$('#m .card.rt')},
{ch:3,t:'その日の木',x:`ルーティーンとToDoの達成率に応じて、その日の木が育ちます。\n20%で種 → 40%で若木 → 60%で成長 → 80%でつぼみ → 100%で満開。ルーティーン用とToDo用で1本ずつです。\n日中は暫定の表示で、日付が変わった時点の達成率で森に確定します。（各段階の見た目は設定で変えられます）`,pre:()=>{S.vw='tree';tH('rt')},tg:()=>$('[data-tu=daytree]')},
{ch:4,t:'計測：タイマー・ポモドーロ・ストップウォッチ',x:`ルーティーンの「▶」から計測を始めます（タイマー／ポモドーロ／ストップウォッチ）。ポモドーロは、始めるときに集中・休憩の長さを決めます。\n計測中は🔒ロック画面で木が育ち、BGM（作業用・休憩用）とループをその場で切り替えられます。\n完了すると森に木が植わって🪙+15。途中で中断すると🪵枯れ木になります。`,pre:()=>tH('rt'),tg:()=>qa('#m .card.rt .btn').find(b=>/^▶/.test(b.textContent.trim()))||$('#m .card.rt')},
{ch:4,t:'BGM・ループ・中断ペナルティ・コイン',x:`ポモドーロ設定では、作業用・休憩用BGMの初期値（ON/OFF）を決めます。ループは集中→休憩を自動で繰り返します。\n中断が今日3回目以降になると、タイマーが5分間ロックされます（🪙5で解除）。\nコインは、習慣の達成（+5）・集中の完了（+15）・日記（+5）などで貯まり、樹種の購入などに使えます。`,pre:()=>{S.tab='my';tAcc('p');render()},tg:()=>qa('#m details.acc').find(d=>/ポモドーロ/.test(d.firstElementChild.textContent))},
{ch:5,t:'探索：霧晴れの開拓日誌',x:`下のバーの「📖 探索」が、日記・読書記録・音読ディクテの入り口です。画面のタイトルは「霧晴れの開拓日誌」。4つのボタンから選びます。`,pre:()=>{S.xv='menu';S.tab='explore';render()},tg:()=>$('[data-tu=xmenu]')},
{ch:5,t:'日記を書く・これまでの日記',x:`「日記を書く」は、変化の記録・一日の流れ・感じたことのどれか1つ書けばOK。昨日の分の新規保存で🪙+5です（2日前以前は🪙10か過去日記チケット。書いた日記の編集は無料）。\n「これまでの日記」で、書いた日記を新しい順に見返せます。`,pre:()=>{S.xv='menu';S.tab='explore';render()},tg:()=>qa('[data-tu=xmenu] .xbtn').slice(0,2),pass:1},
{ch:6,t:'読書記録',x:`「📖 読書記録」から、読んだ本の記録画面に進みます。`,pre:()=>{S.xv='menu';S.tab='explore';render()},tg:()=>qa('[data-tu=xmenu] .xbtn')[2]},
{ch:6,t:'読書記録の画面',x:`本を登録して、要約・章ごとの要約・引用・考えを残す画面です。検索やフォルダ分けもできます。（今回は開くだけです）`,pre:()=>{openScreen('books')},tg:()=>$('#screen-container')},
{ch:7,t:'音読ディクテ',x:`「🎧 音読ディクテ」から、音読とディクテーションの練習に進みます。`,pre:()=>{S.xv='menu';S.tab='explore';render()},tg:()=>qa('[data-tu=xmenu] .xbtn')[3]},
{ch:7,t:'音読ディクテの画面',x:`教材（音声とテキスト）を登録して、文ごとに練習します。\n・音読：最後まで聞くと🪙5\n・ディクテーション：最後まで解くと🪙5、全問正解で🪙20（どちらも教材ごとに1日1回）\n教材の編集画面では、音声を上に固定したまま「✂ カット」で文ごとの区切りを順番に決められます。`,pre:()=>{openScreen('dictationList')},tg:()=>$('#screen-container')},
{ch:8,t:'チーム画面：メンバーと達成状況',x:`仲間の達成状況を見る画面です。上のカードで「今日の達成状況／過去の達成状況」を切り替えます（昨日以前のメッセージは過去に、日付ごとに並びます）。メンバーの名前（アイコン）をタップすると、その人の直近1週間のグラフと森が見られます。⚙からチームの作成・参加もできます（いまは一人用のデモ表示）。`,pre:()=>{S.tab='team';S.tdy='td';render()},tg:()=>qa('#m .card').find(c=>c.querySelector('select.s'))},
{ch:8,t:'チーム画面：投稿とスタンプ',x:`仲間の投稿が並びます。「👍 ❤️」でスタンプを送って応援できます。自分の投稿は「✏️ 編集」で書き直せます。`,pre:()=>{S.tab='team';S.tdy='td';render()},tg:()=>$('#m .post')},
{ch:8,t:'チーム画面：投稿・🤖報告bot・復習通知',x:`ここから達成報告を投稿できます（🪙+3）。「📚 学習報告として投稿」にチェックすると、🤖報告botが1・3・7・14・28日後に「復習のタイミングです」と、あなたの投稿への返信で知らせます。\n「継続」タグの習慣を完了したときも、報告botが自動で報告します。`,pre:()=>{S.tab='team';S.tdy='td';render()},tg:()=>$('#pt')&&$('#pt').closest('.card')},
{ch:9,t:'マイページの統計',x:`マイページの統計は3つのタブです。\n・月間：信号機カレンダー（緑＝全部達成、黄＝一部達成）と日ごとの内訳\n・週間：直近7日のルーティーン達成ランキング\n・累計：タグ別・種別の累計達成回数`,pre:()=>{S.tab='my';S.st='mo';S.selDay=null;render()},tg:()=>[$('#m .tabs'),qa('#m .card').find(c=>c.querySelector('.cal'))],pass:1},
{ch:10,t:'マイページの設定・連携',x:`設定・連携のまとめです。タップで開きます。\n・🔔通知：ルーティーンごとのリマインダー\n・🔗Google・GitHub連携：.ics出力、GitHubへの画像保存\n・💾バックアップ：JSON／ZIPの書き出しと復元\n・🌱樹種の追加（次のステップ）\n・⏱ポモドーロ設定`,pre:()=>{S.tab='my';tAcc(null);render()},tg:()=>qa('#m .card').find(c=>c.querySelector('details.acc'))},
{ch:10,t:'樹種の追加・成長段階の指定',x:`絵文字、または画像ファイルで、好きな樹種を追加できます（画像は96px四方に縮小して保存され、バックアップにも入ります）。\nその下で、樹種ごとに種・若木・成長・つぼみの見た目を、絵文字か画像で指定できます。5段階のプレビューを見ながら変更でき、ホーム・森・ロック画面・タイマーバーに反映されます。`,pre:()=>{S.tab='my';tAcc('t');render()},tg:()=>qa('#m details.acc').find(d=>/樹種/.test(d.firstElementChild.textContent))},
{ch:11,t:'育成・森：あなたの森',x:`あなたの森です。達成のたびに木が1本植わります。全期間／今月／7日間やタグで絞り込めて、木をタップすると、どのタスクで得た木かが分かります。🪵は途中で中断した枯れ木です。`,pre:()=>{S.tab='grow';render()},tg:()=>$('#m .card')},
{ch:11,t:'育成・森：コインと成長',x:`所持コインと、計測中の木の成長が出ます。計測が進むと、種→若木→成長→つぼみ→満開と育ちます。\nコインは、図鑑・ショップでの樹種の購入や、過去の日記の記録（🪙10）、タイマーのロック解除（🪙5）に使えます。`,pre:()=>{S.tab='grow';render()},tg:()=>{const r=$('#m > .row');return [r,r&&r.nextElementSibling]}},
{ch:11,t:'育成・森：樹種選択（図鑑・ショップ）',x:`コインで新しい樹種を手に入れて、タップで選びます。選んだ樹種が、以降に植わる木の見た目になります（所持済みの樹種はいつでも切り替えOK）。`,pre:()=>{S.tab='grow';render()},tg:()=>$('#m .shop')&&$('#m .shop').closest('.card')},
{ch:0,t:'チュートリアルはここまでです',x:`おつかれさまでした。いつでもマイページの「チュートリアルを見る」から見直せます。\n「完了」を押すと、操作前の状態に戻ります。`,pre:()=>{S.tab='my';render()}}
];
function tutCard(){const done=tutLS.get(TUT_KEY);
return `<div class="card" data-tu="tutcard"><div class="row"><span style="font-size:24px">🧭</span><div class="sp"><b>使い方ガイド</b><div class="sm">${done?'いつでもチュートリアルを見直せます':'✨ チュートリアルができました。主な機能をひと通りご案内します'}</div></div><button class="btn" onclick="tutBegin()">チュートリアルを見る</button></div>${!done?`<div class="row" style="margin-top:6px"><span class="sp sm">チュートリアル中の操作は保存されず、終わると元の状態に戻ります。</span><button class="btn g" onclick="tutLS.set(TUT_KEY,'notice');render()">案内を閉じる</button></div>`:''}</div>`}
function tutAuto(){if(tutLS.get(TUT_KEY))return;if(HAD&&tutLS.get(TUT_AUTO)!='1')return;   // 保存済みデータのある既存ユーザーには自動表示しない（マイページの案内のみ）
setTimeout(()=>{if(!TUT.on&&!TM&&!S.modal&&!SC.n&&!tutLS.get(TUT_KEY))tutBegin(1)},900)}
const tutEls=st=>{let t=null;try{t=st&&st.tg?st.tg():null}catch(e){}if(!t)return [];if(!Array.isArray(t))t=[t];return t.filter(e=>e&&e.getBoundingClientRect&&e.isConnected)};
function tutCloseScreen(){if(!SC.n)return;try{scLeave()}catch(e){}SC={n:null,p:null};const b=$('#sc');if(b){b.style.display='none';b.innerHTML=''}}
function tutReset(){tutCloseScreen();S.modal='';S.ed=0;S.rq=[];S.selDay=null;for(const k in ACC)delete ACC[k];Object.assign(ACC,TUT.acc0)}
const dcl=v=>Array.isArray(v)?v.map(dcl):(v&&typeof v=='object')?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,dcl(x)])):v;
function tutBegin(auto){if(TUT.on)return;
if(TM)return uiAlert('計測中はチュートリアルを始められません。計測を終えてからお試しください。');
if(S.modal||SC.n){S.modal='';tutCloseScreen()}
TUT.bk={};for(const k in S){if(TUT_HEAVY.includes(k))continue;TUT.bk[k]=dcl(S[k])}   // 操作前の状態を退避（終了時に戻す）。音源などの大きいデータは、開くだけなので退避しない
TUT.acc0=Object.assign({},ACC);TUT.on=1;TUTSB=true;if(auto)tutLS.set(TUT_AUTO,'1');
const d=document.createElement('div');d.id='tut';d.innerHTML='<div class="tutb"></div><div class="tutb"></div><div class="tutb"></div><div class="tutb"></div><div class="tuth" style="display:none"></div><div class="tutbub"></div>';document.body.appendChild(d);
document.addEventListener('click',tutClick,true);document.addEventListener('keydown',tutKey,true);window.addEventListener('resize',tutPlace);document.addEventListener('scroll',tutPlace,true);
TUT.iv=setInterval(tutPlace,250);tutGo(0)}
function tutGo(i){if(!TUT.on)return;if(i<0)i=0;if(i>=TUT_STEPS.length)return tutEnd('done');TUT.i=i;const my=++TUT.n,st=TUT_STEPS[i];tutReset();
try{st.pre&&st.pre()}catch(e){console.error(e)}
tutBubble();tutPlace();
setTimeout(()=>{if(!TUT.on||my!=TUT.n)return;const el=tutEls(st);if(el.length){try{el[0].scrollIntoView({block:'center',inline:'nearest'})}catch(e){}}tutPlace()},90)}
function tutBubble(){const st=TUT_STEPS[TUT.i],b=$('#tut .tutbub'),N=TUT_STEPS.length,last=TUT.i==N-1;if(!b||!st)return;
b.innerHTML=`<div class="tutarr" style="display:none"></div><div class="tuthd">${st.ch?`<span class="tutch">STEP ${st.ch}/${TUT_N}</span>`:''}<b>${esc(st.t)}</b></div><div class="tuttx">${esc(st.x)}</div>${st.tg?`<div class="tuthint">👆 光っている部分をタップ${st.pass?'（実際に操作）':''}しても進みます</div>`:''}<div class="tutbar"><i style="width:${Math.round(TUT.i/(N-1)*100)}%"></i></div><div class="tutbtns">${last?'':`<button class="btn g" onclick="tutEnd('skip')">スキップ</button>`}<span class="sp"></span>${TUT.i?`<button class="btn g" onclick="tutGo(TUT.i-1)">← 戻る</button>`:''}<button class="btn" onclick="${last?`tutEnd('done')`:`tutGo(TUT.i+1)`}">${last?'完了':'次へ'}</button></div>`}
function tutPlace(){if(!TUT.on)return;const root=$('#tut'),st=TUT_STEPS[TUT.i];if(!root||!st)return;
const vw=innerWidth,vh=innerHeight;let r=null;
tutEls(st).forEach(e=>{const b=e.getBoundingClientRect();if(b.width<2&&b.height<2)return;r=r?{l:Math.min(r.l,b.left),t:Math.min(r.t,b.top),r:Math.max(r.r,b.right),b:Math.max(r.b,b.bottom)}:{l:b.left,t:b.top,r:b.right,b:b.bottom}});
if(r){const P=6;r.l=Math.max(0,r.l-P);r.t=Math.max(0,r.t-P);r.r=Math.min(vw,r.r+P);r.b=Math.min(vh,r.b+P);if(r.r-r.l<8||r.b-r.t<8)r=null}
TUT.rect=r;const bl=root.querySelectorAll('.tutb'),hole=root.querySelector('.tuth'),set=(e,l,t,w,h)=>{e.style.left=l+'px';e.style.top=t+'px';e.style.width=Math.max(0,w)+'px';e.style.height=Math.max(0,h)+'px'};
if(!r){set(bl[0],0,0,vw,vh);for(let k=1;k<4;k++)set(bl[k],0,0,0,0);hole.style.display='none'}
else{set(bl[0],0,0,vw,r.t);set(bl[1],0,r.t,r.l,r.b-r.t);set(bl[2],r.r,r.t,vw-r.r,r.b-r.t);set(bl[3],0,r.b,vw,vh-r.b);hole.style.display='block';set(hole,r.l,r.t,r.r-r.l,r.b-r.t)}
tutBub(r)}
function tutBub(r){const b=$('#tut .tutbub');if(!b)return;const vw=innerWidth,vh=innerHeight,M=8,bw=b.offsetWidth,bh=b.offsetHeight,ar=b.querySelector('.tutarr');let l,t,mode='';
if(!r){l=(vw-bw)/2;t=(vh-bh)/2}
else{const below=vh-r.b-M-10,above=r.t-M-10;
if(below>=bh){t=r.b+10;mode='dn'}else if(above>=bh){t=r.t-bh-10;mode='up'}else{t=below>=above?vh-bh-M:M}   // どちらにも入らないときは、広い側に寄せて画面内に収める
l=(r.l+r.r)/2-bw/2}
l=Math.min(Math.max(M,l),vw-bw-M);t=Math.min(Math.max(M,t),vh-bh-M);b.style.left=l+'px';b.style.top=t+'px';
if(ar){if(mode&&r){ar.className='tutarr '+mode;ar.style.left=(Math.min(Math.max(16,(r.l+r.r)/2-l),bw-16)-7)+'px';ar.style.display='block'}else ar.style.display='none'}}
function tutClick(e){if(!TUT.on)return;const t=e.target;if(t&&t.closest&&(t.closest('#tut')||t.closest('#dg')))return;
const r=TUT.rect,st=TUT_STEPS[TUT.i],x=e.clientX,y=e.clientY;
if(!r||!st||!st.tg||!(x||y)||x<r.l||x>r.r||y<r.t||y>r.b){e.stopPropagation();e.preventDefault();return}   // 光っている部分の外・プログラム由来のクリックは無効
if(!st.pass){e.stopPropagation();e.preventDefault()}   // pass が無いステップは、操作は実行せず「進む」だけ
const i=TUT.i;setTimeout(()=>{if(TUT.on&&TUT.i==i)tutGo(i+1)},st.pass?500:0)}
function tutKey(e){if(TUT.on&&e.key=='Escape'){e.stopPropagation();tutEnd('skip')}}
function tutEnd(how){if(!TUT.on)return;TUT.on=0;TUT.n++;clearInterval(TUT.iv);
document.removeEventListener('click',tutClick,true);document.removeEventListener('keydown',tutKey,true);window.removeEventListener('resize',tutPlace);document.removeEventListener('scroll',tutPlace,true);
const d=$('#tut');if(d)d.remove();tutCloseScreen();
for(const k in TUT.bk)S[k]=TUT.bk[k];TUT.bk=null;S.modal='';S.ed=0;for(const k in ACC)delete ACC[k];Object.assign(ACC,TUT.acc0);   // 操作前の状態に戻す
TUTSB=false;tutLS.set(TUT_KEY,how=='done'?'done':'skip');tutLS.del(TUT_AUTO);
render();toast(how=='done'?'チュートリアルを完了しました（マイページからいつでも見直せます）':'チュートリアルを終了しました（マイページから見直せます）')}

