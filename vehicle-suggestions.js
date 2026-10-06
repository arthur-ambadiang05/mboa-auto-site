(() => {
  if (!location.pathname.startsWith('/vehicules/')) return;
  const esc = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  fetch('/data/vehicules.json', {cache: 'no-store'})
    .then(response => response.ok ? response.json() : Promise.reject())
    .then(vehicles => {
      if (!Array.isArray(vehicles)) return;
      const slug = new URLSearchParams(location.search).get('slug') || location.pathname.split('/').pop().replace(/^annonce-/, '').replace(/\.html$/, '');
      const current = vehicles.find(v => v.slug === slug || v.detail_url === location.pathname);
      if (!current) return;
      const score = v => (v.type === current.type ? 2 : 0) + (v.brand === current.brand ? 1 : 0);
      const suggestions = vehicles.filter(v => v.slug !== current.slug && v.status === 'disponible')
        .sort((a,b) => score(b) - score(a) || Math.abs(a.price-current.price) - Math.abs(b.price-current.price)).slice(0,3);
      if (!suggestions.length) return;
      const section = document.createElement('section');
      section.className = 'section vehicle-suggestions';
      section.setAttribute('aria-labelledby', 'suggestionsTitle');
      section.innerHTML = '<div class="section-head"><div><p class="eyebrow">POUR CONTINUER VOTRE RECHERCHE</p><h2 id="suggestionsTitle">À découvrir aussi</h2><p>D’autres véhicules disponibles chez Mboa Auto.</p></div><a class="text-link" href="/#vehicules">Tout le catalogue →</a></div><div class="cards">' + suggestions.map(v => {
        const href = esc(v.detail_url || '/vehicules/annonce-' + encodeURIComponent(v.slug) + '.html');
        return '<article class="card"><a class="card-photo" href="'+href+'"><img src="/assets/cars/'+esc(v.slug)+'/'+esc(v.cover || '01.jpg')+'" alt="'+esc(v.name)+'" loading="lazy"><span class="tag">'+esc(v.type)+'</span></a><div class="card-body"><p class="card-brand">'+esc(v.brand)+' · '+esc(v.year)+'</p><h3><a href="'+href+'">'+esc(v.name)+'</a></h3><div class="price">'+esc(v.price_display)+'</div><p class="suggestion-meta">'+esc(v.fuel)+' · '+esc(v.location)+'</p><a class="details" href="'+href+'">Découvrir le véhicule →</a></div></article>';
      }).join('')+'</div>';
      const footer = document.querySelector('footer');
      if (footer) footer.before(section);
    }).catch(() => { /* The vehicle remains usable if suggestions cannot load. */ });
})();
