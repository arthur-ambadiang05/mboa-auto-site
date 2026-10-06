const menu=document.querySelector('.menu'),nav=document.querySelector('.nav');
if(menu&&nav){menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'✕':'☰'});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.textContent='☰'}));}
const searchBtn=document.querySelector('#searchBtn'),resetBtn=document.querySelector('#resetBtn'),status=document.querySelector('#filterStatus');
function applyVehicleFilters(){
  const normalize = value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const keyword=normalize((document.querySelector('#keywordFilter')?.value||'').trim());
  const brand=document.querySelector('#brandFilter')?.value||'';
  const type=document.querySelector('#typeFilter')?.value||'';
  const fuel=document.querySelector('#fuelFilter')?.value||'';
  const yearMin=Number(document.querySelector('#yearMinFilter')?.value||0);
  const priceMax=Number(document.querySelector('#priceMaxFilter')?.value||0);
  const grid=document.getElementById('vehicleGrid');
  if (!grid) return;
  const cards=[...grid.querySelectorAll('.card')];
  let count=0;
  cards.forEach((card, i)=>{
    if (!card.dataset.catalogOrder) card.dataset.catalogOrder=String(i+1);
    const text=normalize(card.dataset.search||card.textContent||'');
    const year=Number(card.dataset.year||0);
    const price=Number(card.dataset.price||card.querySelector('.price')?.textContent.replace(/[^0-9]/g,'')||0);
    const matchesType = !type || (type==='SUV' ? card.dataset.type?.startsWith('SUV') : type==='4x4' ? /4[×x]4|4matic|awd/i.test(text) : card.dataset.type===type);
    const show=(!keyword||keyword.split(/\s+/).every(word=>text.includes(word)||text.replace(/\s/g,'').includes(word)))&&(!brand||card.dataset.brand===brand)&&matchesType&&(!fuel||card.dataset.fuel===fuel)&&(!yearMin||year>=yearMin)&&(!priceMax||(price>0&&price<=priceMax));
    card.hidden=!show;
    if(show)count++;
  });
  const sort=document.getElementById('sortFilter')?.value||'newest';
  const priceOf=card=>Number(card.dataset.price||card.querySelector('.price')?.textContent.replace(/[^0-9]/g,'')||0);
  const sorted=cards.slice().sort((a,b)=>{
    const latest=Number(b.dataset.catalogOrder)-Number(a.dataset.catalogOrder);
    if(sort==='newest') return latest;
    const pa=priceOf(a),pb=priceOf(b);
    if(!pa||!pb) return (!pa)-(!pb)||latest;
    return (sort==='price-asc'?pa-pb:pb-pa)||latest;
  });
  if(sorted.some((card,i)=>card!==cards[i])) grid.append(...sorted);
  if(status)status.textContent=count?`${count} véhicule${count>1?'s':''} correspondant${count>1?'s':''} à votre recherche.`:'Aucun véhicule ne correspond à ces critères. Essayez un budget plus large ou effacez les filtres.';
  const activeCount=[brand,type,fuel,yearMin].filter(Boolean).length;
  const badge=document.getElementById('activeFilterCount');
  if(badge)badge.textContent=activeCount?'('+activeCount+')':'';
}
if(searchBtn)searchBtn.addEventListener('click',()=>{
  applyVehicleFilters();
  document.getElementById('vehicules')?.scrollIntoView({behavior:'smooth',block:'start'});
});
if(resetBtn)resetBtn.addEventListener('click',()=>{
  ['keywordFilter','brandFilter','typeFilter','fuelFilter','yearMinFilter','priceMaxFilter'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  applyVehicleFilters();
});
let vehicleFilterTimer;
['keywordFilter','priceMaxFilter','yearMinFilter'].forEach(id=>{
  const el=document.getElementById(id);
  el?.addEventListener('input',()=>{clearTimeout(vehicleFilterTimer);vehicleFilterTimer=setTimeout(applyVehicleFilters,200);});
  el?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchBtn?.click();}});
});
['brandFilter','typeFilter','fuelFilter','sortFilter'].forEach(id=>document.getElementById(id)?.addEventListener('change',applyVehicleFilters));
applyVehicleFilters();
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
        updateLink(link, name, price, document.querySelector('link[rel="canonical"]')?.href || location.pathname + location.search);
      });
    }
  }
  updateVehicleLinks();
  // Refresh immediately before navigation, including asynchronously cloned mobile buttons.
  document.addEventListener('click', event => {
    if (event.target.closest('a[href*="wa.me/"]')) updateVehicleLinks();
  }, true);
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

// Mobile vehicle browsing: photo viewer, readable specifications and contact bar.
(() => {
  if (!location.pathname.startsWith('/vehicules/')) return;
  const make = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  };
  function enhanceVehicle() {
    const info = document.querySelector('.vehicle-info');
    const main = document.getElementById('mainVehicleImage');
    if (!info || !main || info.dataset.enhanced) return;
    info.dataset.enhanced = 'true';
    document.body.classList.add('vehicle-enhanced');
    const name = info.querySelector('h1').textContent.trim();
    const specs = info.querySelector('.detail-spec p')?.textContent || '';
    const facts = info.querySelector('.fact-grid');
    if (facts) {
      const knownLabels = [...facts.querySelectorAll('small')].map(el => el.textContent.trim());
      const text = specs + ' ' + (info.querySelector('.detail-desc')?.textContent || '');
      const gearbox = /manuelle/i.test(text) ? 'Manuelle' : /automatique|9G-TRONIC/i.test(text) ? 'Automatique' : 'Non renseignée';
      const mileage = text.match(/\b\d[\d\s\u202f.,]*\s*(?:km|miles)\b/i)?.[0].trim() || 'Non renseigné';
      [['Boîte', gearbox], ['Kilométrage', mileage]].forEach(([label, value]) => {
        if (knownLabels.includes(label)) return;
        const item = make('span');
        item.append(make('small', '', label), make('strong', '', value));
        facts.append(item);
      });
      const title = make('h2', 'vehicle-facts-title', 'En un coup d’œil');
      const description = info.querySelector('.detail-desc');
      if (description) description.before(title, facts);
      else facts.before(title);
    }
    info.querySelectorAll('.detail-spec p, p.detail-desc').forEach(p => {
      const items = p.textContent.split('•').map(s => s.trim()).filter(Boolean);
      if (items.length < 2) return;
      const list = make('ul', 'vehicle-spec-list' + (p.classList.contains('detail-desc') ? ' detail-desc' : ''));
      items.forEach(item => list.append(make('li', '', item)));
      p.replaceWith(list);
    });

    const contact = make('nav', 'vehicle-contact-bar');
    contact.setAttribute('aria-label', 'Contacter Mboa Auto pour ce véhicule');
    const wa = info.querySelector('a[href*="wa.me/"]');
    if (wa) {
      const link = wa.cloneNode(false);
      link.className = 'vehicle-contact-whatsapp';
      link.textContent = 'WhatsApp';
      contact.append(link);
      // Keep the enquiry button available on desktop; mobile uses the fixed bar.
    }
    const call = make('a', 'vehicle-contact-call', 'Appeler');
    call.href = 'tel:+237691650428';
    contact.append(call);
    document.body.append(contact);

    const thumbs = [...document.querySelectorAll('.detail-thumb')];
    const photos = thumbs.length ? thumbs.map(btn => ({src: btn.dataset.src, alt: btn.querySelector('img')?.alt || name})) : [{src: main.getAttribute('src'), alt: name}];
    let index = Math.max(0, photos.findIndex(p => new URL(p.src, location.href).href === main.src));
    let lastSwipe = 0;
    const gallery = main.closest('.detail-main');
    const controls = make('div', 'gallery-controls');
    const previous = make('button', 'gallery-arrow', '‹');
    const next = make('button', 'gallery-arrow', '›');
    previous.type = next.type = 'button';
    previous.setAttribute('aria-label', 'Photo précédente');
    next.setAttribute('aria-label', 'Photo suivante');
    const expand = make('button', 'gallery-expand');
    expand.type = 'button';
    expand.setAttribute('aria-label', 'Voir les photos en plein écran');
    controls.append(previous, expand, next);
    gallery.append(controls);
    previous.hidden = next.hidden = photos.length < 2;
    main.setAttribute('role', 'button');
    main.setAttribute('tabindex', '0');
    main.setAttribute('aria-label', 'Agrandir la photo de ' + name);
    main.setAttribute('aria-haspopup', 'dialog');

    const viewer = make('dialog', 'vehicle-photo-viewer');
    viewer.setAttribute('aria-label', 'Photos de ' + name);
    const viewerHeader = make('div', 'viewer-header');
    const title = make('span', 'viewer-title', name);
    const close = make('button', 'viewer-close', 'Fermer ✕');
    close.type = 'button';
    viewerHeader.append(title, close);
    const image = make('img', 'viewer-image');
    const viewerControls = make('div', 'viewer-controls');
    const viewerPrev = previous.cloneNode(true);
    const viewerNext = next.cloneNode(true);
    const count = make('span', 'viewer-count');
    count.setAttribute('aria-live', 'polite');
    viewerControls.append(viewerPrev, count, viewerNext);
    viewer.append(viewerHeader, image, viewerControls);
    document.body.append(viewer);
    let previousOverflow;
    let returnFocus;
    function showPhoto(newIndex) {
      index = (newIndex + photos.length) % photos.length;
      main.src = image.src = photos[index].src;
      main.alt = image.alt = photos[index].alt;
      expand.textContent = `${index + 1} / ${photos.length} · Agrandir`;
      count.textContent = `Photo ${index + 1} sur ${photos.length}`;
      thumbs.forEach((btn, i) => {
        btn.classList.toggle('active', i === index);
        btn.setAttribute('aria-label', `Voir la photo ${i + 1} de ${name}`);
        btn.setAttribute('aria-pressed', String(i === index));
      });
    }
    function openViewer() {
      if (Date.now() - lastSwipe < 350 || viewer.open) return;
      returnFocus = document.activeElement;
      previousOverflow = document.body.style.overflow;
      viewer.showModal();
      document.body.style.overflow = 'hidden';
      close.focus();
    }
    close.addEventListener('click', () => viewer.close());
    viewer.addEventListener('close', () => {
      document.body.style.overflow = previousOverflow || '';
      returnFocus?.focus();
    });
    main.addEventListener('click', openViewer);
    main.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openViewer(); }
    });
    expand.addEventListener('click', openViewer);
    previous.addEventListener('click', () => showPhoto(index - 1));
    next.addEventListener('click', () => showPhoto(index + 1));
    viewerPrev.addEventListener('click', () => showPhoto(index - 1));
    viewerNext.addEventListener('click', () => showPhoto(index + 1));
    viewer.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault(); showPhoto(index + (e.key === 'ArrowLeft' ? -1 : 1));
      }
    });
    thumbs.forEach((btn, i) => btn.addEventListener('click', () => showPhoto(i)));
    [main, image].forEach(el => {
      let start;
      el.addEventListener('touchstart', e => {
        start = e.touches.length === 1 ? {x:e.touches[0].clientX, y:e.touches[0].clientY} : null;
      }, {passive:true});
      el.addEventListener('touchend', e => {
        if (!start || !e.changedTouches[0]) return;
        const dx = e.changedTouches[0].clientX - start.x;
        const dy = e.changedTouches[0].clientY - start.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          lastSwipe = Date.now(); showPhoto(index + (dx < 0 ? 1 : -1));
        }
        start = null;
      }, {passive:true});
      el.addEventListener('touchcancel', () => {start = null;}, {passive:true});
    });
    showPhoto(index);
  }
  enhanceVehicle();
  const root = document.getElementById('vehicleDynamic');
  if (root) new MutationObserver(enhanceVehicle).observe(root, {childList:true});
})();
