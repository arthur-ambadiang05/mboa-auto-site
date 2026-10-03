(() => {
  const grid = document.getElementById("vehicleGrid");
  if (!grid) return;

  const esc = (v) => String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const existingSlugs = new Set(
    Array.from(grid.querySelectorAll('a[href^="/vehicules/"]'))
      .map(a => (a.getAttribute("href") || "").split("/").pop().replace(".html",""))
      .filter(Boolean)
  );

  fetch("/data/vehicules.json", { cache: "no-store" })
    .then(r => {
      if (!r.ok) throw new Error("Catalogue indisponible");
      return r.json();
    })
    .then(vehicles => {
      if (!Array.isArray(vehicles)) return;

      for (const vehicle of vehicles) {
        if (vehicle.status !== "disponible" || existingSlugs.has(vehicle.slug)) continue;

        const detailUrl = "/vehicules/vehicle.html?slug=" + encodeURIComponent(vehicle.slug);
        const waText = encodeURIComponent(
          "Bonjour Mboa Auto, je souhaite avoir des informations sur " +
          vehicle.name + " affiché à " + vehicle.price_display + "."
        );

        const article = document.createElement("article");
        article.className = "card";
        article.dataset.brand = vehicle.brand || "";
        article.dataset.type = vehicle.type || "";
        article.dataset.year = vehicle.year || "";
        article.dataset.fuel = vehicle.fuel || "";

        article.innerHTML =
          '<a class="card-photo" href="' + detailUrl + '">' +
            '<img src="/assets/cars/' + esc(vehicle.slug) + '/' + esc(vehicle.cover || "01.jpg") + '" alt="' + esc(vehicle.name) + ' à vendre à ' + esc(vehicle.location) + '" loading="lazy">' +
            '<span class="tag">' + esc(vehicle.type) + '</span>' +
            '<span class="photo-count">' + esc(vehicle.photos) + ' photos</span>' +
          '</a>' +
          '<div class="card-body">' +
            '<p class="card-brand">' + esc(vehicle.brand) + '</p>' +
            '<h3><a href="' + detailUrl + '">' + esc(vehicle.name) + '</a></h3>' +
            '<div class="price">' + esc(vehicle.price_display) + '</div>' +
            '<div class="specs">' + esc(vehicle.specs) + '</div>' +
            '<div class="card-actions">' +
              '<a class="details" href="' + detailUrl + '">Voir le véhicule</a>' +
              '<a class="wa" href="https://wa.me/237691650428?text=' + waText + '" target="_blank" rel="noopener noreferrer">WhatsApp</a>' +
            '</div>' +
          '</div>';

        grid.appendChild(article);
        existingSlugs.add(vehicle.slug);
      }

      const count = vehicles.filter(v => v.status === "disponible").length;
      const countEl = document.querySelector(".inventory-count");
      if (countEl) countEl.textContent = count + " véhicule" + (count > 1 ? "s" : "");
    })
    .catch(err => console.error("Catalogue dynamique:", err));
})();