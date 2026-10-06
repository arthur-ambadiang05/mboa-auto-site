(() => {
  const root = document.getElementById("vehicleDynamic");
  if (!root) return;

  const slug = new URLSearchParams(location.search).get("slug") || location.pathname.match(/\/annonce-([a-z0-9-]+)(?:\.html)?$/)?.[1];
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    root.innerHTML = "<p>Véhicule introuvable.</p>";
    return;
  }

  const esc = (v) => String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  fetch("/data/vehicules.json", { cache: "no-store" })
    .then(r => r.ok ? r.json() : Promise.reject(new Error("Catalogue indisponible")))
    .then(vehicles => {
      const v = Array.isArray(vehicles) ? vehicles.find(x => x.slug === slug) : null;
      if (!v) throw new Error("Véhicule introuvable");

      const model = v.name + (String(v.name).includes(String(v.year)) ? "" : " " + v.year);
      document.title = model + " à " + v.location + " | Mboa Auto";
      const desc = document.querySelector('meta[name="description"]');
      if (desc) desc.setAttribute("content", model + " à vendre à " + v.location + ", Cameroun. " + v.fuel + " · " + v.type + ". Prix : " + v.price_display + ". Photos et contact direct avec Mboa Auto.");

      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.appendChild(canonical);
      }
      canonical.href = location.origin + (v.detail_url || "/vehicules/annonce-" + encodeURIComponent(slug) + ".html");

      if (root.querySelector(".vehicle-info")) return;

      const files = Array.isArray(v.photo_files) && v.photo_files.length
        ? v.photo_files
        : Array.from({length: Number(v.photos || 1)}, (_, i) => String(i + 1).padStart(2, "0") + ".jpg");

      const coverFile = files.includes(v.cover) ? v.cover : files[0];
      const orderedFiles = [coverFile, ...files.filter(name => name !== coverFile)];
      const photos = orderedFiles.map(name => "/assets/cars/" + slug + "/" + name);

      const thumbs = photos.map((src, i) =>
        '<button class="detail-thumb" data-src="' + src + '">' +
          '<img src="' + src + '" alt="' + esc(v.name) + ' photo ' + (i + 1) + '" loading="lazy">' +
        '</button>'
      ).join("");

      const wa = encodeURIComponent(
        "Bonjour Mboa Auto, je suis intéressé par " + v.name +
        " affiché à " + v.price_display + ". Est-il toujours disponible ?\nLien de l’annonce : " + new URL(v.detail_url || "/vehicules/annonce-" + encodeURIComponent(slug) + ".html", "https://mboaauto.com").href
      );

      root.innerHTML =
        '<div class="breadcrumbs"><a href="/">Accueil</a><span>›</span><a href="/#vehicules">Véhicules</a><span>›</span><span>' + esc(v.name) + '</span></div>' +
        '<section class="vehicle-detail">' +
          '<div class="detail-gallery">' +
            '<div class="detail-main"><img id="mainVehicleImage" src="' + photos[0] + '" alt="' + esc(v.name) + ' à vendre à ' + esc(v.location) + '"></div>' +
            '<div class="detail-thumbs">' + thumbs + '</div>' +
          '</div>' +
          '<aside class="vehicle-info">' +
            '<p class="eyebrow">' + esc(v.brand) + ' • ' + esc(v.year) + '</p>' +
            '<h1>' + esc(v.name) + '</h1>' +
            '<div class="detail-price">' + esc(v.price_display) + '</div>' +
            (v.price_words ? '<p class="price-words" style="margin-top:-8px;color:#9ca3af;font-size:14px">' + esc(v.price_words) + '</p>' : '') +
            '<p class="detail-desc">' + esc(v.description) + '</p>' +
            '<div class="fact-grid">' +
              '<span><small>Année</small><strong>' + esc(v.year) + '</strong></span>' +
              '<span><small>Carburant</small><strong>' + esc(v.fuel) + '</strong></span>' +
              '<span><small>Type</small><strong>' + esc(v.type) + '</strong></span>' +
              '<span><small>Localisation</small><strong>' + esc(v.location) + '</strong></span>' +
            '</div>' +
            '<div class="detail-spec"><strong>Caractéristiques</strong><p>' + esc(v.specs) + '</p></div>' +
            '<a class="btn wa-big" href="https://wa.me/237691650428?text=' + wa + '" target="_blank" rel="noopener noreferrer">Demander sur WhatsApp</a>' +
            '<a class="back-stock" href="/#vehicules">← Retour aux véhicules</a>' +
            '<a class="back-stock" href="/acheter-depuis-etranger.html">Acheter depuis l’étranger →</a>' +
          '</aside>' +
        '</section>';

      document.querySelectorAll(".detail-thumb").forEach(btn => {
        btn.addEventListener("click", () => {
          const main = document.getElementById("mainVehicleImage");
          if (main) main.src = btn.dataset.src;
        });
      });
    })
    .catch(err => {
      if (root.querySelector(".vehicle-info")) return;
      root.innerHTML = '<div class="breadcrumbs"><a href="/">Accueil</a><span>›</span><span>Véhicule introuvable</span></div><p style="padding:40px 0">' + esc(err.message) + '.</p>';
    });
})();