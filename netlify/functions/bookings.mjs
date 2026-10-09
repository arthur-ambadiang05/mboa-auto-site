import crypto from 'node:crypto';
import {getStore} from '@netlify/blobs';
import {authenticated,money,quote,conflict,publicBooking,tokenHash,reply,catalogue,mutate} from './lib/bookings.mjs';
export function createHandler(storeFactory=getStore,loadCatalogue=catalogue){return async request=>{
 const url=new URL(request.url),admin=authenticated(request);
 if(!['GET','POST'].includes(request.method))return reply(405,{error:'Méthode non autorisée.'});
 if(request.method==='POST'&&request.headers.get('origin')!=='https://mboaauto.com')return reply(403,{error:'Origine non autorisée.'});
 try{
  const store=storeFactory({name:'mboa-reservations',consistency:'strong'});
  const vehicles=await loadCatalogue();
  if(request.method==='GET'){
   if(url.searchParams.has('admin')){
    if(!admin)return reply(401,{error:'Connectez-vous à votre espace privé.'});
    const items=await Promise.all(vehicles.map(async v=>({slug:v.slug,name:v.name,status:v.status,...(await store.get('vehicle/'+v.slug,{type:'json'})||{config:{enabled:false,dailyRate:0,fee:0,depositPercent:0,seats:0},bookings:[]})})));
    return reply(200,{vehicles:items});
   }
   return reply(200,{vehicles:await Promise.all(vehicles.map(async v=>{
    const data=await store.get('vehicle/'+v.slug,{type:'json'});
    return {slug:v.slug,status:v.status,config:data?.config||{enabled:false,seats:0},purchaseBlocked:(data?.bookings||[]).some(b=>b.kind==='purchase'&&['confirmed','completed'].includes(b.status)),blocked:(data?.bookings||[]).filter(b=>b.kind==='rental'&&['confirmed','completed'].includes(b.status)).map(b=>({start:b.start,end:b.end}))};
   }))});
  }
  const raw=await request.text();if(raw.length>6000)return reply(413,{error:'Demande trop volumineuse.'});
  let body;try{body=JSON.parse(raw);}catch{return reply(400,{error:'Demande invalide.'});}
  const v=vehicles.find(v=>v.slug===body.slug);if(!v)return reply(404,{error:'Véhicule introuvable.'});
  const key='vehicle/'+v.slug;
  if(['config','update'].includes(body.action)){
   if(!admin)return reply(401,{error:'Connectez-vous à votre espace privé.'});
   if(body.action==='config'){
    const c=body.config||{};
    if(typeof c.enabled!=='boolean'||!money(c.dailyRate)||!money(c.fee)||!Number.isInteger(c.depositPercent)||c.depositPercent<0||c.depositPercent>100||!Number.isInteger(c.seats)||c.seats<0||c.seats>60||(c.enabled&&c.dailyRate<1))return reply(400,{error:'Tarif, acompte ou nombre de places invalide.'});
    await mutate(store,key,d=>({...d,config:{enabled:c.enabled,dailyRate:c.dailyRate,fee:c.fee,depositPercent:c.depositPercent,seats:c.seats}}));return reply(200,{saved:true});
   }
   const data=await mutate(store,key,d=>{
    const old=d.bookings.find(b=>b.id===body.id);if(!old){const e=Error('Demande introuvable.');e.status=404;throw e;}
    if(body.revision!==old.revision){const e=Error('Cette demande a changé. Actualisez la liste.');e.status=409;throw e;}
    if(!['pending','confirmed','cancelled','completed'].includes(body.status)||!money(body.paid)||body.paid>old.total||!['none','cash','mobile-money','bank'].includes(body.paymentMethod))throw Error('Statut ou paiement invalide.');
    if(old.status==='cancelled'&&body.status!=='cancelled')throw Error('Une demande annulée ne peut pas être réactivée.');
    if(body.status==='completed'&&!['confirmed','completed'].includes(old.status))throw Error('Confirmez la demande avant de la terminer.');
    const updated={...old,status:body.status,paid:body.paid,paymentMethod:body.paymentMethod,revision:crypto.randomUUID(),updatedAt:new Date().toISOString()};
    if(['confirmed','completed'].includes(updated.status)){
     if(v.status!=='disponible')throw Error('Le véhicule doit être disponible pour confirmer.');
     if(conflict(d.bookings,updated)){const e=Error('Ce véhicule est déjà réservé pour cette période.');e.status=409;throw e;}
    }
    return {...d,bookings:d.bookings.map(b=>b.id===old.id?updated:b)};
   });return reply(200,{booking:data.bookings.find(b=>b.id===body.id)});
  }
  if(body.action==='track'||body.action==='cancel'){
   if(typeof body.token!=='string'||!/^[a-f0-9]{64}$/.test(body.token))return reply(404,{error:'Lien de suivi invalide.'});
   const data=await store.get(key,{type:'json'}),old=data?.bookings.find(b=>b.tokenHash===tokenHash(body.token));
   if(!old)return reply(404,{error:'Demande introuvable.'});
   if(body.action==='track')return reply(200,{booking:publicBooking(old)});
   if(old.status!=='pending')return reply(409,{error:'Contactez Mboa Auto pour modifier une réservation confirmée.'});
   const changed=await mutate(store,key,d=>{
    const current=d.bookings.find(b=>b.id===old.id);if(current.status!=='pending'){const e=Error('La demande vient d’être traitée. Contactez Mboa Auto.');e.status=409;throw e;}
    return {...d,bookings:d.bookings.map(b=>b.id===old.id?{...b,status:'cancelled',revision:crypto.randomUUID(),updatedAt:new Date().toISOString()}:b)};
   });return reply(200,{booking:publicBooking(changed.bookings.find(b=>b.id===old.id))});
  }
  if(body.action!=='request')return reply(400,{error:'Action invalide.'});
  if(body.website)return reply(400,{error:'Demande invalide.'});
  if(!['purchase','rental'].includes(body.kind)||typeof body.name!=='string'||body.name.trim().length<2||body.name.length>120||typeof body.phone!=='string'||!/^\+?[\d\s().-]{9,30}$/.test(body.phone)||typeof body.notes!=='string'||body.notes.length>1000)return reply(400,{error:'Renseignez un nom et un téléphone valides.'});
  if(v.status!=='disponible')return reply(409,{error:'Ce véhicule n’est plus disponible.'});
  // Per-IP fixed window, stored atomically across function instances.
  const ip=request.headers.get('x-nf-client-connection-ip')||'unknown';
  const rateKey='rate/'+tokenHash(ip)+'/'+Math.floor(Date.now()/3600000);
  await mutate(store,rateKey,d=>{if((d.count||0)>=10){const e=Error('Trop de demandes. Contactez Mboa Auto par WhatsApp.');e.status=429;throw e;}return {count:(d.count||0)+1};});
  if(body.requestKey!==undefined&&!/^[a-f0-9]{64}$/.test(body.requestKey))return reply(400,{error:'Demande invalide.'});
  const token=body.requestKey||crypto.randomBytes(32).toString('hex'),id=crypto.randomUUID(),now=new Date().toISOString();
  const data=await mutate(store,key,d=>{
   if(d.bookings.some(b=>b.tokenHash===tokenHash(token)))return d;
   if(d.bookings.length>=1000)throw Error('Contactez Mboa Auto pour réserver ce véhicule.');
   if(body.kind==='rental'&&!d.config.enabled)throw Error('La location n’est pas proposée pour ce véhicule.');
   const cost=body.kind==='rental'?quote(d.config,body.start,body.end):{days:0,total:v.price,deposit:0,dailyRate:0,fee:0};
   if(!money(cost.total))throw Error('Prix indisponible. Contactez Mboa Auto.');
   const candidate={id,kind:body.kind,start:body.kind==='rental'?body.start:'',end:body.kind==='rental'?body.end:'',...cost};
   if(conflict(d.bookings,candidate)){const e=Error('Ce véhicule est déjà réservé. Choisissez une autre période.');e.status=409;throw e;}
   const b={...candidate,vehicle:v.name,name:body.name.trim(),phone:body.phone.trim(),notes:body.notes.trim(),tokenHash:tokenHash(token),status:'pending',paid:0,paymentMethod:'none',revision:crypto.randomUUID(),createdAt:now,updatedAt:now};
   return {...d,bookings:[...d.bookings,b]};
  });return reply(201,{booking:publicBooking(data.bookings.find(b=>b.tokenHash===tokenHash(token))),token});
 }catch(e){return reply(e.status||503,{error:e.status?e.message: 'La demande n’a pas été enregistrée : '+(/^(Dates|Choisissez|La location|Prix|Tarif|Statut|Confirmez|Une demande|Le véhicule|Contactez)/.test(e.message)?e.message:'service indisponible, réessayez plus tard.')});}
};}
export default createHandler();
