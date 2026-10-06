(() => {
  const form = document.getElementById('diasporaForm');
  if (!form) return;
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const value = id => document.getElementById(id).value.trim();
    const message = [
      'Bonjour Mboa Auto, je souhaite préparer un achat de voiture au Cameroun depuis l’étranger.',
      'Nom : ' + value('diasporaName'),
      'Pays de résidence : ' + value('diasporaCountry'),
      'Ville au Cameroun : ' + value('diasporaCity'),
      'Véhicule recherché : ' + value('diasporaVehicle'),
      'Budget total maximum : ' + Number(value('diasporaBudget')).toLocaleString('fr-FR') + ' FCFA',
      'Période souhaitée : ' + (value('diasporaTiming') || 'À préciser'),
      'Personne sur place : ' + value('diasporaLocal'),
      'Précisions : ' + (value('diasporaDetails') || 'À discuter')
    ].join('\n');
    window.location.assign('https://wa.me/237691650428?text=' + encodeURIComponent(message));
  });
})();
