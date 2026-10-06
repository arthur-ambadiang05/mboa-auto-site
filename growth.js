(() => {
  const esc = (v) => String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const latestGrid = document.getElementById("latestGrid");
  if (latestGrid) {
    fetch("/data/vehicules.json", { cache: "no-store" })
      .then(r => r.ok ? r.json() : Promise.reject(new Error("Catalogue indisponible")))
      .then(vehicles => {
        const latest = Array.isArray(vehicles)
          ? vehicles.filter(v => v.status === "disponible").slice().reverse().slice(0, 3)
          : [];

        latestGrid.innerHTML = latest.map(vehicle => {
          const detailUrl = vehicle.detail_url || "/vehicules/annonce-" + encodeURIComponent(vehicle.slug) + ".html";
          return '<article class="card latest-card">' +
            '<a class="card-photo" href="' + detailUrl + '">' +
              '<img src="/assets/cars/' + esc(vehicle.slug) + '/' + esc(vehicle.cover || "01.jpg") + '" alt="' + esc(vehicle.name) + '" loading="lazy">' +
              '<span class="tag new-tag">NOUVEAU</span>' +
              '<span class="photo-count">' + esc(vehicle.photos) + ' photos</span>' +
            '</a>' +
            '<div class="card-body">' +
              '<p class="card-brand">' + esc(vehicle.brand) + '</p>' +
              '<h3><a href="' + detailUrl + '">' + esc(vehicle.name) + '</a></h3>' +
              '<div class="price">' + esc(vehicle.price_display) + '</div>' +
              '<div class="specs">' + esc(vehicle.specs) + '</div>' +
              '<div class="card-actions"><a class="details" href="' + detailUrl + '">Voir le véhicule</a>' +
              '<a class="wa" href="https://wa.me/237691650428?text=' +
              encodeURIComponent("Bonjour Mboa Auto, je souhaite avoir des informations sur " + vehicle.name + " affiché à " + vehicle.price_display + ". Est-il toujours disponible ?\nLien de l’annonce : " + new URL(detailUrl, "https://mboaauto.com").href) +
              '" target="_blank" rel="noopener noreferrer">WhatsApp</a></div>' +
            '</div></article>';
        }).join("");
      })
      .catch(err => console.error("Derniers arrivages:", err));
  }

  const sellForm = document.getElementById("sellCarForm");
  if (sellForm) sellForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = [
      "Bonjour Mboa Auto, je souhaite vendre mon véhicule.",
      "Nom : " + document.getElementById("sellName").value.trim(),
      "Téléphone / WhatsApp : " + document.getElementById("sellPhone").value.trim(),
      "Véhicule : " + document.getElementById("sellVehicle").value.trim(),
      "Année : " + (document.getElementById("sellYear").value || "Non précisée"),
      "Prix souhaité : " + (document.getElementById("sellPrice").value || "À discuter") + " FCFA",
      "Détails : " + (document.getElementById("sellDetails").value.trim() || "Non précisés"),
      "Je peux envoyer les photos ici."
    ].join("\n");
    window.open("https://wa.me/237691650428?text=" + encodeURIComponent(text), "_blank", "noopener,noreferrer");
  });

  const findForm = document.getElementById("findCarForm");
  if (findForm) findForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = [
      "Bonjour Mboa Auto, je recherche un véhicule.",
      "Nom : " + document.getElementById("findName").value.trim(),
      "Téléphone / WhatsApp : " + document.getElementById("findPhone").value.trim(),
      "Modèle recherché : " + document.getElementById("findVehicle").value.trim(),
      "Année souhaitée : " + (document.getElementById("findYear").value.trim() || "Flexible"),
      "Budget maximum : " + (document.getElementById("findBudget").value || "À discuter") + " FCFA",
      "Critères : " + (document.getElementById("findDetails").value.trim() || "Aucun critère supplémentaire")
    ].join("\n");
    window.open("https://wa.me/237691650428?text=" + encodeURIComponent(text), "_blank", "noopener,noreferrer");
  });
})();