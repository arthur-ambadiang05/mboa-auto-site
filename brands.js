(() => {
  const BRANDS = [
    "Acura","Alfa Romeo","Aston Martin","Audi","BAIC","Bentley","BMW","Buick","BYD",
    "Cadillac","Changan","Chery","Chevrolet","Chrysler","Citroën","Cupra","Dacia","Daewoo",
    "Daihatsu","Dodge","Dongfeng","DS Automobiles","Ferrari","Fiat","Ford","Foton","Geely",
    "Genesis","GMC","Great Wall","Haval","Honda","Hongqi","Hyundai","Infiniti","Isuzu","Iveco",
    "JAC","Jaguar","Jeep","Jetour","Kia","Lamborghini","Land Rover","Lexus","Lincoln","Maserati",
    "Mazda","McLaren","Mercedes-Benz","Mercedes-AMG","MG","MINI","Mitsubishi","Nissan","Opel","Peugeot","Porsche",
    "RAM","Renault","Rolls-Royce","SEAT","Škoda","Smart","Subaru","Suzuki","Tata","Tesla",
    "Toyota","Volkswagen","Volvo","Wuling","Zeekr"
  ];

  const POPULAR = [
    "Toyota","Mercedes-Benz","Hyundai","Kia","Nissan","Lexus",
    "BMW","Ford","Mitsubishi","Honda","Peugeot","Renault"
  ];

  window.MBOA_BRANDS = BRANDS;

  const brandSelect = document.getElementById("brandFilter");
  if (brandSelect) {
    const current = brandSelect.value;
    brandSelect.innerHTML = '<option value="">Toutes les marques</option>' +
      BRANDS.map(b => '<option value="' + b.replace(/"/g, "&quot;") + '">' + b + '</option>').join("");
    brandSelect.value = current;
  }

  document.querySelectorAll("datalist[data-brand-list]").forEach(list => {
    list.innerHTML = BRANDS.map(b => '<option value="' + b.replace(/"/g, "&quot;") + '"></option>').join("");
  });

  const popularWrap = document.getElementById("popularBrands");
  if (popularWrap) {
    popularWrap.innerHTML = POPULAR.map(b =>
      '<button class="brand-chip" type="button" data-brand="' + b.replace(/"/g, "&quot;") + '">' + b + '</button>'
    ).join("");
  }

  const allWrap = document.getElementById("allBrands");
  if (allWrap) {
    allWrap.innerHTML = BRANDS.map(b =>
      '<button class="brand-chip" type="button" data-brand="' + b.replace(/"/g, "&quot;") + '">' + b + '</button>'
    ).join("");
  }

  function applyBrand(brand) {
    const select = document.getElementById("brandFilter");
    if (select) select.value = brand;
    document.getElementById("searchBtn")?.click();
    document.getElementById("vehicules")?.scrollIntoView({behavior:"smooth", block:"start"});
  }

  document.addEventListener("click", e => {
    const brandButton = e.target.closest(".brand-chip[data-brand]");
    if (brandButton) applyBrand(brandButton.dataset.brand || "");

    const typeButton = e.target.closest("[data-type-filter]");
    if (typeButton) {
      const select = document.getElementById("typeFilter");
      if (select) select.value = typeButton.dataset.typeFilter || "";
      document.getElementById("searchBtn")?.click();
      document.getElementById("vehicules")?.scrollIntoView({behavior:"smooth", block:"start"});
    }
  });
})();