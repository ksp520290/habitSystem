/* diary：霧晴れの開拓日誌の「日記を書く」「これまでの日記」（探索タブ内のフル画面で表示） */
function dOpen(v,k){S.xv=v=='l'?'list':'write';if(k)S.dd=k;S.tab='explore';S.modal='';render()}
function dDate(v){if(!v)return;let k=unIso(v);if(!isOld(k)&&k!=ykey())k=ykey();S.dd=k;render()}
function diaryListHtml(){const ks=Object.keys(S.diary).filter(isRec).sort((a,b)=>iso(a)<iso(b)?1:-1);
return ks.length?ks.map(k=>{const e=S.diary[k];return `<div class="card"><div class="row"><b class="sp">${k.replace(/-/g,'/')}</b><button class="btn g" onclick="dOpen('w','${k}')">編集</button></div>${[['前日の変化記録',e.c],['一日の流れ',e.f],['感じたこと',e.e]].map(x=>x[1]?`<div class="sm" style="margin-top:6px">${x[0]}</div><div class="txt">${esc(x[1])}</div>`:'').join('')}</div>`}).join(''):'<p class="sm">まだ記録がありません</p>'}
function diaryFormHtml(){const k=S.dd||ykey(),e=S.diary[k]||{},rec=isRec(k),note=rec?'記録済み：編集は無料です':isOld(k)?(S.diaryTickets>0?'🎫 過去日記チケットを1枚使います（所持'+S.diaryTickets+'枚）':'⚠ 2日前以前の新規記録は保存時に🪙10枚を消費します'):'新規保存で🪙+5獲得';
return `<div class="card"><label class="sm">対象日（基本は昨日）</label><input type="date" id="dt" max="${iso(ykey())}" value="${iso(k)}" onchange="dDate(this.value)"><div class="sm" style="margin:4px 0">${note}（所持🪙${S.coins}）</div>
<label class="sm">前日の変化記録</label><textarea id="d1" rows="3" maxlength="400" placeholder="何ができるようになった？何が変わった？">${esc(e.c)}</textarea><label class="sm">一日の流れ</label><textarea id="d2" rows="3" maxlength="400" placeholder="どんな一日だった？">${esc(e.f)}</textarea><label class="sm">感じたこと</label><textarea id="d3" rows="3" maxlength="400">${esc(e.e)}</textarea>
<p class="sm">3つのうち1つでも書けば達成です。</p><button class="btn" style="width:100%;padding:10px" onclick="dSave()">保存する</button></div>`}
function dSave(){checkDay();const k=S.dd||ykey(),c=$('#d1').value.trim(),f=$('#d2').value.trim(),e=$('#d3').value.trim();
if(!c&&!f&&!e)return uiAlert('いずれか1つは記入してください');const nw=!isRec(k),cost=nw&&isOld(k);
const tk=cost&&S.diaryTickets>0;if(cost&&!tk&&S.coins<10)return uiAlert('コインが足りません（10枚必要）');
let msg='日記を更新しました';if(tk){S.diaryTickets--;msg='保存しました（🎫-1）'}else if(cost){S.coins-=10;msg='保存しました（🪙-10）'}else if(nw){S.coins+=5;msg='保存しました（🪙+5）'}
S.diary[k]={c:c.slice(0,400),f:f.slice(0,400),e:e.slice(0,400),at:kd(today)};const ck=diaryCheck();if(ck)msg+='・ルーティーン「日記」を達成にしました';save();S.xv='list';S.modal='';render();toast(msg)}
/* 日記を書いたら、名前に「日記」を含む今日のルーティーン（例：一言日記）に自動でチェックを付ける */
function diaryCheck(){const L=S.R.filter(r=>/日記/.test(r.n||'')&&isDue(r,today)&&!r.done);if(!L.length)return 0;
L.forEach(r=>{r.c=(r.c||0)+1;r.done=1;r.st++;S.coins+=5;actInc('rt');cumAdd('rt',r,1)});syncToday();return L.length}
