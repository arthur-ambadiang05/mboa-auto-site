(() => {
  const form = document.getElementById('repairForm');
  const service = document.getElementById('repairService');
  if (!form || !service) return;
  document.querySelectorAll('[data-repair-service]').forEach(link => {
    link.addEventListener('click', () => { service.value = link.dataset.repairService; });
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const value = id => document.getElementById(id).value.trim();
    const message = [
      'Bonjour Mboa Auto, je souhaite une mise en relation pour un service automobile.',
      'Nom : ' + value('repairName'),
      'Service : ' + service.value,
      'Véhicule : ' + value('repairVehicle'),
      'Année : ' + (value('repairYear') || 'Non précisée'),
      'Ville / quartier : ' + value('repairCity'),
      'Mon besoin : ' + value('repairDetails')
    ].join('\n');
    window.location.assign('https://wa.me/237691650428?text=' + encodeURIComponent(message));
  });
})();
