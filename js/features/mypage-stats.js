/* timer */
/* team */
/* my page */
function dayIds(k,h){if(h.ids)return h.ids;const hs=id=>{let x=0;for(const c of k+id)x=(x*31+c.charCodeAt(0))%1009;return x};return [...S.R].sort((a,b)=>hs(a.id)-hs(b.id)).slice(0,h.d).map(r=>r.id)}
function weekRank(){const cnt={};for(let i=0;i<7;i++){const d=new Date(today);d.setDate(d.getDate()-i);const k=kd(d),h=S.hist[k];(i?(h?dayIds(k,h):[]):S.R.filter(r=>r.done).map(r=>r.id)).forEach(id=>cnt[id]=(cnt[id]||0)+1)}
const L=S.R.map(r=>({r,n:cnt[r.id]||0})).filter(x=>x.n>0).sort((a,b)=>b.n-a.n||b.r.st-a.r.st);
return `<div class="card"><b>🏆 週間ルーティーン ランキング</b> <span class="sm">直近7日</span>${L.length?L.map((x,i)=>`<div class="row" style="margin:10px 0"><span style="font-size:${i<3?26:14}px;width:40px;text-align:center">${['🥇','🥈','🥉'][i]||(i+1)+'位'}</span><div class="sp"><b>${esc(x.r.n)}</b><div class="sm">#${esc(x.r.tag)}</div></div><div style="text-align:right"><b>${x.n}回</b><div class="sm">🔥 ${x.r.st}日連続</div></div></div>`).join(''):'<p class="sm">まだ達成したルーティーンがありません</p>'}</div>`}
