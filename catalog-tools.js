(() => {
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let vehicles=[],availability=[],selection=[];try{selection=JSON.parse(localStorage.getItem('mboa-compare')||'[]').filter(s=>typeof s==='string').slice(0,3);}catch{}
 const href=v=>v.detail_url||'/vehicules/annonce-'+v.slug+'.html';
 const transmission=v=>v.transmission||(/automatique/i.test(v.specs)?'Automatique':/manuelle/i.test(v.specs)?'Manuelle':'À préciser');
 function save(){try{localStorage.setItem('mboa-compare',JSON.stringify(selection));}catch{}renderBar();renderComparison();}
 function renderBar(){
  if(document.getElementById('comparison'))return;
  let bar=document.getElementById('compareBar');if(!bar){bar=document.createElement('aside');bar.id='compareBar';bar.className='compare-bar';bar.setAttribute('aria-live','polite');document.body.append(bar);}
  bar.hidden=!selection.length;bar.innerHTML='<span>'+selection.length+' / 3 sélectionné(s)</span><a href="/comparer.html">Comparer →</a>';
  document.querySelectorAll('[data-compare]').forEach(b=>{const yes=selection.includes(b.dataset.compare);b.setAttribute('aria-pressed',String(yes));b.textContent=yes?'✓ Sélectionné pour comparaison':'＋ Comparer';});
 }
 function renderComparison(){
  const root=document.getElementById('comparison');if(!root)return;
  const chosen=selection.map(s=>vehicles.find(v=>v.slug===s)).filter(Boolean);
  if(!chosen.length){root.innerHTML='<p>Choisissez jusqu’à trois véhicules dans le <a href="/#vehicules">catalogue</a> avec le bouton « Comparer ».</p>';return;}
  const rows=[['Prix',v=>v.price_display],['Année',v=>v.year],['Marque',v=>v.brand],['Catégorie',v=>v.type],['Carburant',v=>v.fuel],['Transmission',transmission],['Places',v=>availability.find(x=>x.slug===v.slug)?.config.seats||v.seats||'À préciser'],['Ville',v=>v.location],['Caractéristiques',v=>v.specs]];
  root.innerHTML='<table class="compare-table"><thead><tr><th scope="col">Critère</th>'+chosen.map(v=>'<th scope="col"><img src="/assets/cars/'+esc(v.slug)+'/'+esc(v.cover||'01.jpg')+'" alt="'+esc(v.name)+'"><p>'+esc(v.name)+'</p><button data-remove="'+esc(v.slug)+'">Retirer</button></th>').join('')+'</tr></thead><tbody>'+rows.map(([label,value])=>'<tr><th scope="row">'+label+'</th>'+chosen.map(v=>'<td>'+esc(value(v))+'</td>').join('')+'</tr>').join('')+'<tr><th scope="row">Détails</th>'+chosen.map(v=>'<td><a href="'+esc(href(v))+'">Voir la fiche →</a></td>').join('')+'</tr></tbody></table>';
 }
 function decorate(){
  document.querySelectorAll('#vehicleGrid .card').forEach(card=>{
   const link=card.querySelector('h3 a');const v=vehicles.find(v=>link&&new URL(link.href).pathname+new URL(link.href).search===href(v));if(!v)return;
   const live=availability.find(x=>x.slug===v.slug);card.dataset.rental=String(Boolean(live?.config.enabled));card.dataset.blocked=JSON.stringify(live?.blocked||[]);card.dataset.purchaseBlocked=String(Boolean(live?.purchaseBlocked));
   card.dataset.transmission=transmission(v);card.dataset.seats=String(availability.find(x=>x.slug===v.slug)?.config.seats||v.seats||0);
   if(card.querySelector('[data-compare]'))return;
   const box=card.querySelector('.card-body')||card;const b=document.createElement('button');b.type='button';b.className='compare-action';b.dataset.compare=v.slug;box.append(b);
   const a=document.createElement('a');a.className='compare-action';a.style.display='block';a.style.textAlign='center';a.href='/reservation.html?slug='+encodeURIComponent(v.slug);a.textContent='Demander une réservation';box.append(a);
  });
  const info=document.querySelector('.vehicle-info');if(info&&!info.querySelector('[data-booking-link]')){
   const path=location.pathname,slug=new URLSearchParams(location.search).get('slug');const v=vehicles.find(v=>v.slug===slug||href(v)===path);if(v){const a=document.createElement('a');a.dataset.bookingLink='true';a.className='btn primary';a.href='/reservation.html?slug='+encodeURIComponent(v.slug);a.textContent='Demander une réservation';info.append(a);}
  }
  renderBar();
 }
 document.addEventListener('click',e=>{
  const b=e.target.closest('[data-compare],[data-remove]');if(!b)return;const slug=b.dataset.compare||b.dataset.remove;
  if(selection.includes(slug))selection=selection.filter(x=>x!==slug);else if(selection.length<3)selection.push(slug);else{alert('Vous pouvez comparer trois véhicules. Retirez-en un pour changer votre sélection.');return;}save();
 });
 document.getElementById('clearComparison')?.addEventListener('click',()=>{selection=[];save();});
 Promise.all([fetch('/data/vehicules.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Catalogue indisponible.');return r.json();}),fetch('/.netlify/functions/bookings',{cache:'no-store'}).then(r=>r.ok?r.json():{vehicles:[]}).catch(()=>({vehicles:[]}))]).then(([v,a])=>{
  vehicles=v;availability=a.vehicles;selection=selection.filter(s=>vehicles.some(v=>v.slug===s));decorate();renderComparison();
  for(const id of ['vehicleGrid','vehicleDynamic']){const root=document.getElementById(id);if(root)new MutationObserver(()=>{if(root.querySelector('.card:not(:has([data-compare]))')||root.querySelector('.vehicle-info:not(:has([data-booking-link]))'))decorate();}).observe(root,{childList:true,subtree:true});}
  if(typeof applyVehicleFilters==='function')applyVehicleFilters();
  setInterval(async()=>{if(document.hidden)return;try{const r=await fetch('/.netlify/functions/bookings',{cache:'no-store'});if(r.ok){availability=(await r.json()).vehicles;decorate();if(typeof applyVehicleFilters==='function')applyVehicleFilters();}}catch{}},60000);
 }).catch(e=>{const r=document.getElementById('comparison');if(r)r.textContent=e.message;});
})();
