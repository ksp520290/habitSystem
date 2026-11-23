/* 習慣の森 Service Worker：音源(in/out/task/rest/勉強用/off.mp3)と画面(HTML)をキャッシュしてオフラインでも動かす。
   https:// または http://localhost で配信したときだけ有効（file:// では登録されません）。 */
const V='shukan-v1',AUDIO=['in.mp3','out.mp3','task.mp3','rest.mp3','勉強用.mp3','off.mp3'];
self.addEventListener('install',e=>{e.waitUntil((async()=>{const c=await caches.open(V);
await Promise.allSettled(AUDIO.map(u=>c.add(new Request(u,{cache:'reload'}))));await self.skipWaiting()})())});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==V&&k.startsWith('shukan-'))await caches.delete(k);await self.clients.claim()})())});
function ranged(req,res){const h=req.headers.get('range');if(!h)return res;const m=/bytes=(\d*)-(\d*)/.exec(h);if(!m)return res;
return res.blob().then(b=>{let s,e;if(m[1]===''){s=Math.max(0,b.size-(+m[2]||0));e=b.size-1}else{s=+m[1];e=m[2]===''?b.size-1:Math.min(+m[2],b.size-1)}
return new Response(b.slice(s,e+1),{status:206,statusText:'Partial Content',headers:{'Content-Type':res.headers.get('Content-Type')||'audio/mpeg','Content-Range':`bytes ${s}-${e}/${b.size}`,'Content-Length':String(e-s+1)}})})}
self.addEventListener('fetch',e=>{const q=e.request;if(q.method!=='GET')return;const u=new URL(q.url);if(u.origin!==location.origin)return;
if(/\.(mp3|m4a|wav|ogg)$/i.test(u.pathname)){            // 音源：キャッシュ優先＋裏で更新
e.respondWith((async()=>{const c=await caches.open(V),hit=await c.match(u.href);
const fresh=fetch(u.href,{cache:'no-cache'}).then(r=>{if(r.status===200)c.put(u.href,r.clone());return r}).catch(()=>null);
if(hit){e.waitUntil(fresh);return ranged(q,hit)}const r=await fresh;return r?ranged(q,r):Response.error()})());return}
if(q.mode==='navigate'||u.pathname.endsWith('.html')){    // 画面：ネット優先、オフライン時はキャッシュ
e.respondWith((async()=>{const c=await caches.open(V);try{const r=await fetch(q);if(r.ok)c.put(q,r.clone());return r}
catch(err){const h=await c.match(q,{ignoreSearch:true});return h||Response.error()}})())}});
