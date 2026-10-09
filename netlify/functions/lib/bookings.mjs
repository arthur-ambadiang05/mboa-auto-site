import crypto from 'node:crypto';
export const money = n => Number.isSafeInteger(n) && n >= 0 && n <= 1000000000;
export function authenticated(request) {
 const secret=process.env.MBOA_ADMIN_SESSION_SECRET;
 const cookie=(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('mboa_admin_session='));
 const [expires,sig,extra]=(cookie?.slice(19)||'').split('.');
 if(!secret||extra||!/^\d+$/.test(expires)||Number(expires)<=Date.now()/1000||!/^[a-f0-9]{64}$/.test(sig||''))return false;
 const expected=crypto.createHmac('sha256',secret).update(expires).digest('hex');
 return crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected));
}
export function dates(start,end,now=new Date()) {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start||'')||!/^\d{4}-\d{2}-\d{2}$/.test(end||''))throw Error('Choisissez les dates de départ et de retour.');
 const a=Date.parse(start+'T00:00:00Z'),b=Date.parse(end+'T00:00:00Z');
 const today=new Date(now.getTime()+3600000).toISOString().slice(0,10);
 if(!Number.isFinite(a)||!Number.isFinite(b)||new Date(a).toISOString().slice(0,10)!==start||new Date(b).toISOString().slice(0,10)!==end||start<today||b<=a||b-a>366*86400000)throw Error('Dates invalides : le retour doit suivre le départ, dans une limite de 366 jours.');
 return (b-a)/86400000;
}
export function overlaps(a,b){return a.start<b.end&&b.start<a.end;}
export function quote(config,start,end,now){const days=dates(start,end,now);return {days,dailyRate:config.dailyRate,fee:config.fee,total:days*config.dailyRate+config.fee,deposit:Math.ceil((days*config.dailyRate+config.fee)*config.depositPercent/100)};}
export function conflict(bookings,candidate) {
 return bookings.some(b=>b.id!==candidate.id&&['confirmed','completed'].includes(b.status)&&(b.kind==='purchase'||candidate.kind==='purchase'||overlaps(b,candidate)));
}
export function publicBooking(b){const {name,phone,notes,tokenHash,writeId,...safe}=b;return safe;}
export function tokenHash(token){return crypto.createHash('sha256').update(token).digest('hex');}
export const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function catalogue(){const r=await fetch('https://mboaauto.com/data/vehicules.json',{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Catalogue indisponible');return r.json();}
export async function mutate(store,key,fn) {
 for(let attempt=0;attempt<4;attempt++){
  const old=await store.getWithMetadata(key,{type:'json'});
  const data=fn(old?.data||{config:{enabled:false,dailyRate:0,fee:0,depositPercent:0,seats:0},bookings:[]});
  const result=await store.setJSON(key,data,old?{onlyIfMatch:old.etag}:{onlyIfNew:true});
  if(result.modified)return data;
 }
 const e=Error('Une modification simultanée a eu lieu. Actualisez puis réessayez.');e.status=409;throw e;
}
