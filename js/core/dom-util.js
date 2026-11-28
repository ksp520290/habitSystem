const $=s=>document.querySelector(s);
const kd=d=>d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
const BASE_TREES=[['🌸','桜',0],['🍁','紅葉',0],['🌳','広葉樹',0],['💎','クリスタル',80],['🌲','杉',20],['🌴','ヤシ',30],['🎄','モミ',30],['🌵','サボテン',40],['🎋','竹',40],['🍎','りんご',50],['🍊','みかん',50],['🌻','ひまわり',60],['🍄','きのこ',60],['🪻','藤',70],['🌺','椿',70],['⭐','星の木',100]];
const STG=['🌰','🌱','🪴','🌷',null];
let today=new Date();
function seed(){const h={};for(let i=1;i<=60;i++){const d=new Date(today);d.setDate(d.getDate()-i);const r=(Math.sin(i*7.3)+1)/2;const t=6,n=Math.round(r*6);h[kd(d)]={d:n,t,m:n*12}}return h}
