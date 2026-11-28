/* =====================================================================
   「探索」タブ：霧晴れの開拓日誌（フル画面）
   これまでポップアップだった内容を、タブ内の画面として表示する。
   ボタン4つ：日記を書く／これまでの日記／読書記録／音読ディクテ
   ===================================================================== */
function xvGo(v){S.xv=v;if(v=='write')S.dd=ykey();S.modal='';render()}
function explore(){const v=['write','list'].includes(S.xv)?S.xv:'menu';
if(v=='menu'){const yr=isRec(ykey()),dn=Object.keys(S.diary).filter(isRec).length;
return `<div class="xhd"><span style="font-size:34px">📖</span><div class="sp"><h2 style="margin:0">霧晴れの開拓日誌</h2><div class="sm">${yr?'昨日の記録：済み ✔':'昨日の記録がまだです（保存で+5🪙）'} ・ 日記 ${dn}日分</div></div></div>
<div class="xgrid" data-tu="xmenu">
<button class="xbtn" onclick="xvGo('write')"><span>✍️</span>日記を書く</button>
<button class="xbtn" onclick="xvGo('list')"><span>📚</span>これまでの日記</button>
<button class="xbtn" onclick="openScreen('books')"><span>📖</span>読書記録</button>
<button class="xbtn" onclick="openScreen('dictationList')"><span>🎧</span>音読ディクテ</button></div>`}
return `<div class="row" style="margin-bottom:6px"><button class="btn g" onclick="xvGo('menu')">← 霧晴れの開拓日誌</button><span class="sp"></span></div>
<div class="tabs"><button class="${v=='write'?'on':''}" onclick="xvGo('write')">日記を書く</button><button class="${v=='list'?'on':''}" onclick="xvGo('list')">これまでの日記</button></div>`+(v=='write'?diaryFormHtml():diaryListHtml())}
