/* ---------- 5. 森の木 ⇔ 達成タスク ---------- */
function forestSvg(list,mem,idx,ti){const all=list||S.forest,F=all.slice(-36),off=all.length-F.length;let s='<svg viewBox="0 0 360 230" width="100%"><g>',i=0;const N=6;
for(let a=0;a<N;a++)for(let b=0;b<N;b++){const x=180+(a-b)*30,y=40+(a+b)*15,pts=`${x},${y} ${x+30},${y+15} ${x},${y+30} ${x-30},${y+15}`;
s+=`<polygon points="${pts}" fill="${(a+b)%2?'#7bc47f':'#6ab76f'}" stroke="#4e9a55"/>`;
if(F[i]){s+=`<g style="cursor:pointer" onclick="${mem?'memTree':'treeInfo'}(${idx?idx[off+i]:off+i})">${vSvg(fTok(F[i]),x,y,ti)}<polygon points="${pts}" fill="transparent"/></g>`}i++}
return s+'</g></svg>'}
const fTags=x=>x&&typeof x=='object'?(x.tags&&x.tags.length?x.tags:(x.tag?[x.tag]:['未分類'])):['未分類'];
const FPER=[['all','全期間'],['mo','今月'],['wk','7日間']];
function setFv(t){S.fv=t;save();render()}
function setFp(q){S.fp=q;save();render()}
function forestCard(){const lv=liveTrees(),all=S.forest.map((x,i)=>({x,i})).concat(lv.map((x,k)=>({x,i:S.forest.length+k}))),tc={};all.forEach(o=>fTags(o.x).forEach(t=>tc[t]=(tc[t]||0)+1));
const tags=Object.keys(tc).sort((a,b)=>tc[b]-tc[a]),tv=tc[S.fv]?S.fv:'',pr=['mo','wk'].includes(S.fp)?S.fp:'all';
const mo0=new Date(today.getFullYear(),today.getMonth(),1).getTime(),wk0=new Date(today.getFullYear(),today.getMonth(),today.getDate()).getTime()-6*864e5;
const inP=x=>{if(pr=='all')return true;const at=x&&typeof x=='object'?x.at:0;return !!at&&at>=(pr=='mo'?mo0:wk0)};
const sel=all.filter(o=>(!tv||fTags(o.x).includes(tv))&&inP(o.x)),list=sel.map(o=>o.x),idx=sel.map(o=>o.i),dead=list.filter(x=>x&&typeof x=='object'&&(x.kind=='abort'||x.e=='🪵')).length;
return `<div class="card"><div class="row"><b class="sp">🌳 ${tv?esc(tv)+'の森':'自分の森'}</b><div class="seg">${FPER.map(q=>`<button class="${pr==q[0]?'on':''}" onclick="setFp('${q[0]}')">${q[1]}</button>`).join('')}</div></div>
<div class="chips" style="margin-top:6px"><button class="chip ${tv?'':'on'}" onclick="setFv('')">🌳 すべて ${all.length}</button>${tags.map(t=>`<button class="chip ${tv==t?'on':''}" data-t="${esc(t)}" onclick="setFv(this.dataset.t)">#${esc(t)} ${tc[t]}</button>`).join('')}</div>
<div class="sm" style="margin:4px 0">${list.length}本${lv.length?'（今日の暫定の木を含む）':''}${dead?'（うち枯れ木'+dead+'本）':''} ・ 木をタップすると、達成したタスクがわかります${list.length>36?' ・ 最新36本を表示':''}</div>${list.length?forestSvg(list,0,idx):'<p class="sm" style="text-align:center;padding:30px 0">この条件の木はまだありません</p>'}</div>`}
function treeModal(x,back,ti){const o=typeof x=='object'&&x?x:null,dead=o?o.kind=='abort'||o.e=='🪵':x=='🪵',dt=o&&o.at?new Date(o.at):null,
ds=dt?`${dt.getFullYear()}/${dt.getMonth()+1}/${dt.getDate()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`:'';
const row=(a,b)=>`<div class="row" style="margin-top:8px"><span class="sm" style="width:84px">${a}</span><b class="sp">${b}</b></div>`;
const body=o&&o.kind=='daily'?row('種類',esc(o.tags[0]||''))+row('達成率',o.rate+'%')+row('段階',esc(DSTG[o.stg]||''))+row('状態',o.prov?'暫定（日付が変わると確定します）':'確定')+(dt?row(o.prov?'現在':'確定した日',`${dt.getFullYear()}/${dt.getMonth()+1}/${dt.getDate()}`+(o.prov?' '+pad(dt.getHours())+':'+pad(dt.getMinutes()):'')):''):o&&o.n?row(dead?'中断したタスク':'達成したタスク',esc(o.n))+(ds?row(dead?'中断日時':'達成日時',ds):'')+(o.kind?row('種類',dead?'中断（枯れ木になりました）':(o.kind=='task'?'タスク達成':'集中完了')):'')+(o.min?row('集中時間',o.min+'分'):'')+(o.tags&&o.tags.length?row('タグ',o.tags.map(t=>'#'+esc(t)).join(' ')):(o.tag?row('タグ','#'+esc(o.tag)):'')):`<p class="sm">この木は、タスクの記録機能ができる前に育ったため、どのタスクで得たかの情報がありません。</p>`;
return `<div class="modal"><div><div class="row"><b class="sp">🌳 この木について</b><button class="btn g" onclick="${back}">閉じる</button></div><div class="tree" style="margin:8px 0">${vHtml(fTok(x),null,ti)}</div>${body}</div></div>`}
function treeInfo(i){const x=i<S.forest.length?S.forest[i]:liveTrees()[i-S.forest.length];if(x==null)return;S.modal=treeModal(x,"S.modal='';render()");render()}
function memTree(i){const x=MEMV&&MEMV.forest[i];if(x==null)return;S.modal=treeModal(x,'memberReopen()',MEMV.ti);render()}

/* ---------- 累計（タグ別の累計達成回数。ルーティーン／ToDoの種別もタグの一種として表示） ---------- */
function cumHtml(){const f=['all','rt','tk'].includes(S.cuv)?S.cuv:'all',C=S.cum,src=f=='all'?['rt','tk']:[f],m={};
src.forEach(k=>Object.entries(C[k]||{}).forEach(([t,n])=>{if(n>0)m[t]=(m[t]||0)+n}));
const kr=src.map(k=>[CAT[k][0],C.n[k]||0,CAT[k][1],1]),tr=Object.entries(m).sort((a,b)=>b[1]-a[1]).map(([t,n])=>[t,n,'#7c8cf8',0]),
total=src.reduce((a,k)=>a+(C.n[k]||0),0),mx=Math.max(1,...kr.map(r=>r[1]),...tr.map(r=>r[1]));
const row=r=>`<div style="margin:8px 0"><div class="row"><span class="sp">${r[3]?'🏷 ':'#'}${esc(r[0])}${r[3]?' <span class="sm">（種別）</span>':''}</span><b>${r[1]}</b><span class="sm">回</span></div><div style="height:10px;border-radius:5px;background:var(--bd);overflow:hidden"><div style="height:100%;width:${Math.round(r[1]/mx*100)}%;background:${r[2]}"></div></div></div>`;
return `<div class="card"><div class="row"><b class="sp">📈 累計達成回数</b><div class="seg">${[['all','すべて'],['rt','ルーティーン'],['tk','ToDo']].map(t=>`<button class="${f==t[0]?'on':''}" onclick="S.cuv='${t[0]}';render()">${t[1]}</button>`).join('')}</div></div>
<div style="text-align:center;margin:10px 0"><span class="sm">合計</span><br><b style="font-size:34px">${total}</b> <span class="sm">回</span></div>
<div class="sm">種別</div>${kr.map(row).join('')}<div class="sm" style="margin-top:10px">タグ別</div>${tr.length?tr.map(row).join(''):'<p class="sm">まだ記録がありません</p>'}
<p class="sm" style="margin:8px 0 0">複数のタグが付いた項目は、付いているすべてのタグに1回ずつ数えます。ルーティーンの回数は過去の記録も含みます。ToDoはこの機能の追加以降の達成から数えます。</p></div>`}

