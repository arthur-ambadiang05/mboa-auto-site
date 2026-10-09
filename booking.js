(() => {
 const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),cash=n=>Number(n).toLocaleString('fr-FR')+' FCFA';
 const labels={pending:'Demande reçue — à confirmer',confirmed:'Réservation confirmée',cancelled:'Annulée',completed:'Terminée'};
 let vehicles=[],availability=[],busy=false,submitted=false;
 const requestKey=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
 function saved(){try{return JSON.parse(localStorage.getItem('mboa-requests')||'[]').filter(x=>/^[a-f0-9]{64}$/.test(x.token)&&/^[a-z0-9-]+$/.test(x.slug));}catch{return [];}}
 function remember(entry){try{localStorage.setItem('mboa-requests',JSON.stringify([...saved().filter(x=>x.token!==entry.token),entry]));}catch{}}
 async function api(body){const r=await fetch('/.netlify/functions/bookings',{method:body?'POST':'GET',cache:'no-store',...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});const d=await r.json();if(!r.ok)throw Error(d.error||'Service indisponible.');return d;}
 function follow(slug,token){return location.origin+'/mes-demandes.html#'+new URLSearchParams({slug,token});}
 function selected(){return vehicles.find(v=>v.slug===$('bookingVehicle').value);}
 function update(){
  const v=selected(),a=availability.find(x=>x.slug===v?.slug),rental=$('bookingKind').value==='rental';
  $('startField').hidden=$('endField').hidden=!rental;$('bookingStart').required=$('bookingEnd').required=rental;
  const option=$('bookingKind').querySelector('[value=rental]');option.disabled=!a?.config.enabled;
  if(rental&&!a?.config.enabled){$('bookingQuote').textContent='La location n’est pas encore proposée pour ce véhicule. Choisissez un autre véhicule ou contactez Arthur.';$('bookingAvailability').textContent='';$('bookingSubmit').disabled=true;return;}
  let text=v?'Prix affiché : '+v.price_display:'';let blocked=!v||v.status!=='disponible'||a?.purchaseBlocked;
  if(rental){
   text='Tarif : '+cash(a.config.dailyRate)+' / jour. Frais fixes : '+cash(a.config.fee)+'.';
   const start=$('bookingStart').value,end=$('bookingEnd').value,days=(Date.parse(end)-Date.parse(start))/86400000;
   if(start&&end&&days>0&&days<=366){const total=days*a.config.dailyRate+a.config.fee;text+='\n'+days+' jour(s) · Total : '+cash(total)+' · Acompte prévu : '+cash(Math.ceil(total*a.config.depositPercent/100));blocked ||=a.blocked.some(b=>start<b.end&&b.start<end);}
   else blocked=true;
   $('bookingAvailability').textContent=a.blocked.length?'Périodes déjà réservées : '+a.blocked.map(b=>b.start+' → '+b.end).join(' ; ')+'. Le jour de retour est exclu du calcul.':'Aucune période confirmée dans le planning. Dates et conditions à confirmer avec Arthur.';
  }else $('bookingAvailability').textContent=blocked?'Véhicule indisponible pour une nouvelle demande.':'Arthur vérifie le véhicule avec son propriétaire avant de confirmer la réservation.';
  $('bookingQuote').textContent=text;$('bookingSubmit').disabled=blocked||busy;
 }
 async function initForm(){try{
  const [r,a]=await Promise.all([fetch('/data/vehicules.json',{cache:'no-store'}),api()]);if(!r.ok)throw Error('Catalogue indisponible.');vehicles=await r.json();availability=a.vehicles;
  $('bookingVehicle').innerHTML='<option value="">Choisissez un véhicule</option>'+vehicles.filter(v=>v.status==='disponible').map(v=>'<option value="'+esc(v.slug)+'">'+esc(v.name)+' — '+esc(v.price_display)+'</option>').join('');
  const params=new URLSearchParams(location.search);$('bookingVehicle').value=params.get('slug')||'';if(params.get('kind')==='rental')$('bookingKind').value='rental';
  const today=new Date(Date.now()+3600000).toISOString().slice(0,10);$('bookingStart').min=$('bookingEnd').min=today;
  ['bookingVehicle','bookingKind','bookingStart','bookingEnd'].forEach(id=>$(id).onchange=update);update();
 }catch(e){$('bookingResult').textContent=e.message;}}
 if($('bookingForm')){
  initForm();$('bookingForm').onsubmit=async e=>{
   e.preventDefault();if(busy||submitted)return;busy=true;update();$('bookingResult').textContent='Enregistrement…';
   try{const body={...Object.fromEntries(new FormData(e.target)),action:'request',requestKey},d=await api(body);remember({slug:body.slug,token:d.token});const url=follow(body.slug,d.token);
    $('bookingResult').className='booking-notice booking-success';$('bookingResult').textContent='Demande enregistrée. Référence : '+d.booking.id.slice(0,8)+'. Conservez votre lien de suivi. Arthur doit encore confirmer.';
    $('bookingFollow').innerHTML='<a class="btn primary" href="'+esc(url)+'">Suivre ma demande</a><a class="btn" target="_blank" rel="noopener" href="https://wa.me/237691650428?text='+encodeURIComponent('Bonjour Arthur, ma demande '+d.booking.id.slice(0,8)+' concerne '+selected().name+'.\nAnnonce : https://mboaauto.com'+(selected().detail_url||'/vehicules/annonce-'+body.slug+'.html'))+'">Prévenir Arthur sur WhatsApp</a>';
    submitted=true;$('bookingSubmit').hidden=true;
   }catch(err){$('bookingResult').className='booking-notice booking-error';$('bookingResult').textContent=err.message;}
   finally{busy=false;update();}
  };
 }
 async function loadMine(){
  const hash=new URLSearchParams(location.hash.slice(1));if(hash.get('token'))remember({slug:hash.get('slug')||'',token:hash.get('token')});
  const entries=saved();$('myBookings').textContent=entries.length?'Chargement…':'Aucune demande enregistrée sur cet appareil. Utilisez votre lien personnel de suivi ou créez une nouvelle demande.';
  const nodes=await Promise.all(entries.map(async entry=>{const wrap=document.createElement('article');wrap.className='booking-card';try{
   const {booking:b}=await api({...entry,action:'track'});
   wrap.innerHTML='<h2>'+esc(b.vehicle)+' · '+esc(b.kind==='rental'?'Location':'Achat')+' · '+esc(b.id.slice(0,8))+'</h2><strong>'+esc(labels[b.status])+'</strong><p>'+(b.kind==='rental'?esc(b.start+' → '+b.end)+' · '+b.days+' jour(s)<br>':'')+'Montant : '+cash(b.total)+'<br>Paiement enregistré : '+cash(b.paid)+'<br>Solde : '+cash(b.total-b.paid)+'</p><a href="'+esc(follow(entry.slug,entry.token))+'">Lien personnel de suivi</a>';
   if(b.status==='pending'){const button=document.createElement('button');button.textContent='Annuler ma demande';button.onclick=async()=>{if(!confirm('Annuler cette demande ?'))return;button.disabled=true;try{await api({...entry,action:'cancel'});await loadMine();}catch(e){button.disabled=false;const p=document.createElement('p');p.textContent=e.message;wrap.append(p);}};wrap.append(button);}
  }catch(e){wrap.textContent=e.message;}return wrap;}));if(entries.length)$('myBookings').replaceChildren(...nodes);
 }
 if($('myBookings'))loadMine();
})();
