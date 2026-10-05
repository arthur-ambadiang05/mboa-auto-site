(() => {
  const grid = document.getElementById("vehicleGrid");
  if (!grid) return;

  const esc = (v) => String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  fetch("/data/vehicules.json", { cache: "no-store" })
    .then(r => {
      if (!r.ok) throw new Error("Catalogue indisponible");
      return r.json();
    })
    .then(vehicles => {
      if (!Array.isArray(vehicles)) return;

      const available = vehicles.filter(v => v.status === "disponible");

      grid.innerHTML = available.map((vehicle, index) => {
        const detailUrl = vehicle.detail_url || ("/vehicules/vehicle.html?slug=" + encodeURIComponent(vehicle.slug));
        const waText = encodeURIComponent(
          "Bonjour Mboa Auto, je souhaite avoir des informations sur " +
          vehicle.name + " affiché à " + vehicle.price_display + "."
        );

        return '<article class="card" data-catalog-order="' + (index + 1) + '" data-brand="' + esc(vehicle.brand) +
          '" data-type="' + esc(vehicle.type) +
          '" data-year="' + esc(vehicle.year) +
          '" data-fuel="' + esc(vehicle.fuel) +
          '" data-price="' + esc(vehicle.price) +
          '" data-search="' + esc((vehicle.brand||"") + " " + (vehicle.name||"") + " " + (vehicle.specs||"")) + '">' +
          '<a class="card-photo" href="' + detailUrl + '">' +
          '<img src="/assets/cars/' + esc(vehicle.slug) + '/' + esc(vehicle.cover || "01.jpg") +
          '" alt="' + esc(vehicle.name) + ' à vendre à ' + esc(vehicle.location) + '" loading="lazy">' +
          '<span class="tag">' + esc(vehicle.type) + '</span>' +
          '<span class="photo-count">' + esc(vehicle.photos) + ' photos</span></a>' +
          '<div class="card-body"><p class="card-brand">' + esc(vehicle.brand) + '</p>' +
          '<h3><a href="' + detailUrl + '">' + esc(vehicle.name) + '</a></h3>' +
          '<div class="price">' + esc(vehicle.price_display) + '</div>' +
          '<div class="specs">' + esc(vehicle.specs) + '</div>' +
          '<div class="card-actions"><a class="details" href="' + detailUrl + '">Voir le véhicule</a>' +
          '<a class="wa" href="https://wa.me/237691650428?text=' + waText +
          '" target="_blank" rel="noopener noreferrer">WhatsApp</a></div></div></article>';
      }).join("");

      if (typeof applyVehicleFilters === 'function') applyVehicleFilters();

      const countEl = document.querySelector(".inventory-count");
      if (countEl) countEl.textContent = available.length + " véhicule" + (available.length > 1 ? "s" : "");
    })
    .catch(err => console.error("Catalogue dynamique:", err));
})();