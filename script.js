const menu=document.querySelector('.menu'),nav=document.querySelector('.nav');
if(menu&&nav){menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'✕':'☰'});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.textContent='☰'}));}
const searchBtn=document.querySelector('#searchBtn'),resetBtn=document.querySelector('#resetBtn'),status=document.querySelector('#filterStatus');
function applyVehicleFilters(){
  const keyword=(document.querySelector('#keywordFilter')?.value||'').trim().toLowerCase();
  const brand=document.querySelector('#brandFilter')?.value||'';
  const type=document.querySelector('#typeFilter')?.value||'';
  const fuel=document.querySelector('#fuelFilter')?.value||'';
  const yearMin=Number(document.querySelector('#yearMinFilter')?.value||0);
  const priceMax=Number(document.querySelector('#priceMaxFilter')?.value||0);
  let count=0;
  document.querySelectorAll('#vehicleGrid .card').forEach(card=>{
    const text=(card.dataset.search||card.textContent||'').toLowerCase();
    const year=Number(card.dataset.year||0);
    const price=Number(card.dataset.price||0);
    const show=(!keyword||text.includes(keyword))&&(!brand||card.dataset.brand===brand)&&(!type||card.dataset.type===type)&&(!fuel||card.dataset.fuel===fuel)&&(!yearMin||year>=yearMin)&&(!priceMax||price<=priceMax);
    card.hidden=!show;
    if(show)count++;
  });
  if(status)status.textContent=count?`${count} véhicule${count>1?'s':''} correspondant${count>1?'s':''} à votre recherche.`:'Aucun véhicule ne correspond à ces critères. Vous pouvez nous confier une recherche personnalisée.';
}
if(searchBtn)searchBtn.addEventListener('click',applyVehicleFilters);
if(resetBtn)resetBtn.addEventListener('click',()=>{
  ['keywordFilter','brandFilter','typeFilter','fuelFilter','yearMinFilter','priceMaxFilter'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  applyVehicleFilters();
});
const lead=document.querySelector('#leadForm');if(lead)lead.addEventListener('submit',e=>{e.preventDefault();const n=document.querySelector('#name').value.trim(),p=document.querySelector('#phone').value.trim(),need=document.querySelector('#need').value,m=document.querySelector('#message').value.trim();const text=`Bonjour Mboa Auto, je suis ${n}.\nTéléphone : ${p}\nBesoin : ${need}\n${m}`;window.open('https://wa.me/237691650428?text='+encodeURIComponent(text),'_blank','noopener,noreferrer')});
const main=document.querySelector('#mainVehicleImage');document.querySelectorAll('.detail-thumb').forEach(b=>b.addEventListener('click',()=>{if(main){main.src=b.dataset.src;main.alt=b.querySelector('img')?.alt||main.alt;document.querySelectorAll('.detail-thumb').forEach(x=>x.classList.remove('active'));b.classList.add('active');main.scrollIntoView({behavior:'smooth',block:'center'})}}));

// Include the exact vehicle listing in every vehicle WhatsApp enquiry.
(() => {
  const publicOrigin = 'https://mboaauto.com';
  function listingUrl(href) {
    const url = new URL(href, publicOrigin);
    if (url.origin !== publicOrigin) return null;
    url.hash = '';
    // Retain the vehicle identifier, but omit advertising/tracking parameters.
    const slug = url.searchParams.get('slug');
    url.search = '';
    if (slug) url.searchParams.set('slug', slug);
    return url.href;
  }
  function updateLink(link, name, price, href) {
    const listing = listingUrl(href);
    if (!name || !listing) return;
    const wa = new URL(link.href);
    const message = `Bonjour Mboa Auto, j'ai trouvé votre annonce sur mboaauto.com.\nJe souhaite avoir plus d'informations sur ${name}${price ? ' affiché à ' + price : ''}. Est-il toujours disponible ?\nLien de l'annonce : ${listing}`;
    if (wa.searchParams.get('text') === message) return;
    wa.searchParams.set('text', message);
    link.href = wa.href;
  }
  function updateVehicleLinks() {
    document.querySelectorAll('.card').forEach(card => {
      const detail = card.querySelector('h3 a') || card.querySelector('a.details');
      if (!detail) return;
      const name = card.querySelector('h3')?.textContent.trim();
      const price = card.querySelector('.price')?.textContent.trim();
      card.querySelectorAll('a[href*="wa.me/"]').forEach(link => {
        updateLink(link, name, price, detail.getAttribute('href'));
      });
    });
    const info = document.querySelector('.vehicle-info');
    if (info && location.pathname.startsWith('/vehicules/')) {
      const name = info.querySelector('h1')?.textContent.trim();
      const price = info.querySelector('.detail-price')?.textContent.trim();
      document.querySelectorAll('a[href*="wa.me/"]').forEach(link => {
        updateLink(link, name, price, location.pathname + location.search);
      });
    }
  }
  updateVehicleLinks();
  // Catalogue and vehicle content are also loaded asynchronously from the admin.
  ['vehicleGrid', 'latestGrid', 'vehicleDynamic'].forEach(id => {
    const root = document.getElementById(id);
    if (root) new MutationObserver(updateVehicleLinks).observe(root, { childList: true, subtree: true });
  });
})();

// Explicit WhatsApp click tracking.
// Some mobile browsers open the WhatsApp app before GA4 Enhanced Measurement records the outbound click.
// Sending the GA4 "click" event ourselves preserves the existing custom event rule:
// click + link_url contains wa.me => whatsapp_click.
document.addEventListener('click',e=>{
  const link=e.target.closest('a[href*="wa.me"]');
  if(!link) return;
  if(typeof window.gtag==='function'){
    window.gtag('event','click',{
      link_url:link.href,
      link_domain:'wa.me',
      outbound:true,
      transport_type:'beacon'
    });
  }
},{capture:true});
