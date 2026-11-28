/* ===== 起動 ===== */
async function boot(){$('#m').innerHTML='<p class="sm" style="text-align:center;margin-top:40px">読み込み中…</p>';
try{await loadState()}catch(e){console.error(e);ensure()}
pomoLoadLS();pomoSaveLS();ready=true;checkDay();rvSyncTodos();render();rvCheck();flush();tutAuto();NTFUI.boot();NTFUI.afterSW(null);
setTimeout(()=>{Assets.preload();SWreg()},800);if(teamOn())setTimeout(teamPush,2500);
setInterval(penTick,1000);setInterval(()=>{if(teamOn()&&S.tab=='team'&&!document.hidden)teamPull()},15000);
setInterval(()=>{if(checkDay()&&!S.modal&&!SC.n)render();remind();rvCheck()},30000);
document.addEventListener('visibilitychange',()=>{if(document.hidden)flush();else{rvCheck();NTFUI.tick();if(checkDay()&&!S.modal&&!SC.n)render()}});
addEventListener('beforeunload',()=>{flush()});
addEventListener('pagehide',()=>{flush()})}
boot();
