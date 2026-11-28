/* ===== ⑥ 設定・連携（アコーディオン） ===== */
const ACC={};
function settingsHtml(){const g=AssetManager.getGithubConfig(),pm=window.Notification?{granted:'許可済み',denied:'ブロック中（ブラウザ設定で変更）',default:'未設定'}[Notification.permission]:'このブラウザは未対応';
const a=(k,t,b)=>`<details class="acc" ${ACC[k]?'open':''} ontoggle="ACC.${k}=this.open"><summary>${t}</summary><div class="accb">${b}</div></details>`;
return `<div class="card"><b>⚙ 設定・連携</b><div style="margin-top:6px">`
+a('p','⏱ ポモドーロ設定',`<p class="sm" style="margin:0">集中・休憩の時間は、ポモドーロのルーティーンの「▶」を押したときに設定します。</p>
<div class="row" style="margin:10px 0"><span class="sp">🎵 作業用BGM（集中中）</span><input type="checkbox" style="width:auto" ${S.pomo.bgmWork?'checked':''} onchange="setBgmDef('work',this.checked)"></div>
<div class="row" style="margin:10px 0"><span class="sp">🎵 休憩用BGM（休憩中）</span><input type="checkbox" style="width:auto" ${S.pomo.bgmRest?'checked':''} onchange="setBgmDef('rest',this.checked)"></div>
<p class="sm" style="margin:0">ここでの設定が計測のはじめの既定値です。計測中は🔒画面の「BGM」ボタンで、いま流れている段階（集中／休憩）の分だけ切り替えられます（その計測中のみ）。OFFのときは off.mp3 を流します。</p>
<div class="row" style="margin:10px 0"><span class="sp">🔁 ループ（集中→休憩を自動で繰り返す）</span><input type="checkbox" style="width:auto" ${S.pomo.loop?'checked':''} onchange="setPomo({loop:this.checked});render()"></div>
<p class="sm">時間は習慣ごとに前回の設定を覚えています。<br>今日の途中停止：${stopToday()}回（${PEN_FREE+1}回目以降は${PEN_MIN}分間タイマーをロック／${PEN_COST}🪙で解除）</p>`)
+a('n','🔔 通知設定',ntfSettingsHtml())
+a('c','🔗 連携（Google・GitHub）',`<div class="row"><button class="btn g sp" onclick="uiAlert('Googleカレンダーとの直接連携にはOAuth設定（クライアントID）が必要です。現在は「.ics出力」をGoogleカレンダーの「インポート」で取り込めます。')">Googleカレンダー連携</button><button class="btn g sp" onclick="ics()">.ics出力</button></div>
<div class="sm" style="margin:10px 0 4px"><b>GitHub連携</b>（画像を assets/img/ に自動保存）</div><label class="sm">owner</label><input id="gho" value="${esc(g.owner)}" autocapitalize="off"><label class="sm">repo</label><input id="ghr" value="${esc(g.repo)}" autocapitalize="off"><label class="sm">branch</label><input id="ghb" value="${esc(g.branch||'main')}" autocapitalize="off"><label class="sm">token（Personal Access Token）</label><input id="ght" type="password" value="${esc(g.token)}" autocomplete="off">
<p class="sm">トークンはこの端末内にのみ保存され、バックアップ（JSON/ZIP）には含まれません。未設定の場合、画像は端末内に保存されます。</p><button class="btn" style="width:100%" onclick="saveGh()">GitHub設定を保存</button>`)
+a('b','💾 バックアップの入力と出力（JSON・ZIP）',`<div class="sm"><b>JSON</b>（音源は含まれません）</div><textarea id="js" rows="3" placeholder="JSONバックアップ" style="margin-top:4px"></textarea>
<div class="row" style="margin-top:6px"><button class="btn sp" onclick="$('#js').value=JSON.stringify(snapExport())">書き出し</button><button class="btn g sp" onclick="restore($('#js').value)">復元</button></div>
<div class="row" style="margin-top:6px"><button class="btn sp" onclick="dl('habit-forest-'+iso(kd(new Date()))+'.json',JSON.stringify(snapExport(),null,1),'application/json')">⬇ JSONファイル保存</button><button class="btn g sp" onclick="$('#jf').click()">⬆ JSONファイル読込</button><input type="file" id="jf" accept=".json,application/json" hidden onchange="rdAny(this)"></div>
<div class="sm" style="margin-top:12px"><b>ZIP</b>（音読ディクテーションの音源・読書記録・日記・ルーティーン・森・設定をすべて含む）</div>
<div class="row" style="margin-top:6px"><button class="btn sp" onclick="exportZip()">⬇ ZIPで出力</button><button class="btn g sp" onclick="$('#zf').click()">⬆ ZIPから復元</button><input type="file" id="zf" accept=".zip,application/zip,.json,application/json" hidden onchange="rdAny(this)"></div>`)
+a('t','🌱 樹種の追加・成長段階の指定',`<div class="sm"><b>樹種を追加</b>（絵文字、または画像ファイル）</div><label class="sm">絵文字（画像を選んだ場合は「代替絵文字」。チームへ共有しきれないときなどに使われます）</label>${icPickerHtml('te','','tepv',8)}<label class="sm">樹種名</label><input id="tn" placeholder="シダ" maxlength="12"><label class="sm">必要コイン数（0で無料）</label><input id="tc" type="number" min="0" value="0"><button class="btn" style="width:100%;margin-top:8px" onclick="addTree()">樹種を追加</button><p class="sm">追加した樹種は「育成・森」の図鑑・ショップに並びます（現在 ${S.customTrees.length} 件）。画像は96px四方に縮小して端末内に保存され、バックアップ（JSON/ZIP）にも含まれます。</p>${stageDesignerHtml()}<p class="sm">📤 チームへの共有：森の画像は容量を抑えるため、1枚あたり約10KB以下・合計約26KB以下・最大8種までを画像のまま共有し、それを超える分は代替絵文字（段階の画像は共通の絵文字）で表示されます。</p>`)
+a('k','🎫 さぼり許容チケット',skipInfoHtml())
+`</div></div>`}
function saveGh(){AssetManager.setGithubConfig({owner:$('#gho').value,repo:$('#ghr').value,branch:$('#ghb').value,token:$('#ght').value});toast('GitHub設定を保存しました')}
function addTree(){const e=emojiClean($('#te').value),n=$('#tn').value.trim().slice(0,12),c=Math.max(0,Math.floor(+$('#tc').value||0)),img=ICV.tepv||'';
if(!n)return uiAlert('樹種名を入力してください');
if(img){if(!isDataImg(img))return uiAlert('画像を読み込み直してください');const id='img:'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);S.customTrees.push([id,n,c,img,e||'🌳'])}   // 画像の樹種
else{if(!e)return uiAlert('絵文字か画像ファイルを指定してください');if(trees().some(t=>t[0]==e))return uiAlert('その絵文字はすでに登録されています');S.customTrees.push([e,n,c])}
ICV.tepv='';save();render();toast('樹種「'+n+'」を追加しました')}
/* ---- 成長段階（種・若木・成長・つぼみ）の見た目を樹種ごとに指定。未指定は共通の絵文字 ---- */
const STGUI={tr:null};
function stageDesignerHtml(){const all=trees();let tr=STGUI.tr;if(!all.some(t=>t[0]==tr))tr=STGUI.tr=S.sel;const set=(S.stageSet||{})[tr]||[];
return `<div class="sm" style="margin-top:14px"><b>成長段階の見た目を指定</b></div><p class="sm" style="margin:4px 0">種・若木・成長・つぼみを、樹種ごとに好きな絵文字または画像に変えられます。未指定の段階は共通の絵文字（${STG.slice(0,4).join('')}）です。満開は、その樹種の見た目になります。</p>
<label class="sm">樹種</label><select onchange="stPick(this.value)">${all.map(t=>`<option value="${esc(t[0])}" ${t[0]==tr?'selected':''}>${esc(t[1])}${isTreeTok(t[0])?'（画像）':' '+esc(t[0])}</option>`).join('')}</select>
<div class="row" style="margin:8px 0" data-tu="stgprev">${[0,1,2,3,4].map(i=>`<div class="stp"><div class="tv">${vHtml(treeEm(i,tr))}</div><div class="sm">${DSTG[i]}</div></div>`).join('')}</div>
${[0,1,2,3].map(i=>{const u=set[i]||'',im=isDataImg(u);return `<div class="stg-row"><b style="width:44px">${DSTG[i]}</b><input class="stem" placeholder="${STG[i]}" maxlength="8" value="${esc(im?'':u)}" onchange="stEmoji(${i},this.value)"><span style="font-size:22px">${im?vHtml(u,26):''}</span><button type="button" class="btn g" onclick="this.nextElementSibling.click()">🖼 画像</button><input type="file" accept="image/*" style="display:none" onchange="stImg(this,${i})"><button type="button" class="btn g" onclick="stSet(${i},'')">戻す</button></div>`}).join('')}
<button type="button" class="btn g" style="width:100%;margin-top:6px" onclick="stResetAll()">この樹種の指定をすべて戻す</button>`}
function stSet(i,v){const tr=STGUI.tr||S.sel;if(!S.stageSet||typeof S.stageSet!='object')S.stageSet={};const a=(S.stageSet[tr]||['','','','']).slice(0,4);while(a.length<4)a.push('');a[i]=v||'';
if(a.every(x=>!x))delete S.stageSet[tr];else S.stageSet[tr]=a;save();render()}
function stEmoji(i,v){stSet(i,emojiClean(v))}
function stImg(inp,i){const f=inp.files&&inp.files[0];inp.value='';if(!f)return;imgToTreeImg(f).then(u=>stSet(i,u)).catch(e=>uiAlert(e.message))}
function stPick(tr){STGUI.tr=tr;render()}
async function stResetAll(){const tr=STGUI.tr||S.sel;if(!(S.stageSet||{})[tr])return;if(!await uiConfirm('この樹種の段階の指定をすべて元の絵文字に戻しますか？','戻す'))return;delete S.stageSet[tr];save();render()}

