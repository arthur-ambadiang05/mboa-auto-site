(() => {
  const $ = id => document.getElementById(id);
  const labels = { nouveau: 'Nouveau', contacte: 'Contacté', 'rendez-vous': 'Visite prévue', gagne: 'Vente conclue', perdu: 'Demande clôturée' };
  let clients = [], editing = null, saving = false;
  const esc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const active = c => !['gagne', 'perdu'].includes(c.status);
  const due = c => active(c) && c.followUp && Date.parse(c.followUp) <= Date.now();
  const upcoming = c => active(c) && c.appointment && Date.parse(c.appointment) >= Date.now();
  const date = s => new Date(s).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
  const localDate = s => { if (!s) return ''; const d = new Date(s); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
  function message(text, error = false) { $('message').textContent = text; $('message').className = 'notice' + (error ? ' error' : ''); }
  async function api(method = 'GET', body) {
    const r = await fetch('/.netlify/functions/admin-crm', { method, cache: 'no-store', ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
    if (r.status === 401) { location.href = '/admin/'; throw new Error('Connexion expirée.'); }
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Chargement impossible.');
    return data;
  }
  function render() {
    const q = $('search').value.toLocaleLowerCase('fr').trim(), f = $('filter').value;
    const shown = clients.filter(c => (!q || [c.name, c.phone, c.vehicle].join(' ').toLocaleLowerCase('fr').includes(q)) && (f === 'all' || (f === 'due' ? due(c) : f === 'appointments' ? upcoming(c) : c.status === f)));
    shown.sort((a, b) => { if (f === 'appointments') return Date.parse(a.appointment) - Date.parse(b.appointment); return Number(Boolean(due(b))) - Number(Boolean(due(a))) || (Date.parse(b.updatedAt) - Date.parse(a.updatedAt)); });
    $('clients').innerHTML = shown.map(c => {
      const phone = c.phone.replace(/\D/g, '');
      const wa = phone.startsWith('237') ? phone : phone.length === 9 ? '237' + phone : phone;
      return `<article class="card"><div class="client-top"><h2>${esc(c.name)}</h2><span class="badge">${labels[c.status] || esc(c.status)}</span></div><p>${esc(c.vehicle || 'Véhicule à préciser')}${c.budget ? ' · Budget : ' + esc(c.budget) + ' FCFA' : ''}</p>${c.phone ? '<p>' + esc(c.phone) + '</p>' : ''}${c.followUp ? '<div class="' + (due(c) ? 'due' : 'muted') + '">' + (due(c) ? 'Relance à faire : ' : 'Relance : ') + date(c.followUp) + '</div>' : ''}${c.appointment ? '<div>Rendez-vous : ' + date(c.appointment) + '</div>' : ''}${c.notes ? '<p class="details">' + esc(c.notes) + '</p>' : ''}<div class="actions"><button data-edit="${c.id}">Modifier</button>${phone ? '<a class="btn" href="tel:+' + wa + '">Appeler</a><a class="btn" href="https://wa.me/' + wa + '?text=' + encodeURIComponent('Bonjour ' + c.name + ', ici Mboa Auto. Je reviens vers vous concernant ' + (c.vehicle || 'votre recherche de véhicule') + '.') + '" target="_blank" rel="noopener noreferrer">WhatsApp</a>' : ''}</div></article>`;
    }).join('') || '<div class="panel">Aucun client dans cette sélection.</div>';
    message(shown.length + ' client' + (shown.length > 1 ? 's' : '') + ' · ' + clients.filter(due).length + ' relance(s) à faire');
  }
  async function load() {
    $('refresh').disabled = true; message('Chargement du carnet…');
    try { clients = (await api()).clients; render(); } catch (e) { message(e.message, true); } finally { $('refresh').disabled = false; }
  }
  function open(c = null) {
    editing = c; $('clientForm').reset(); $('formMessage').textContent = ''; $('editorTitle').textContent = c ? 'Modifier le client' : 'Ajouter un client';
    if (c) for (const key of ['name', 'phone', 'vehicle', 'budget', 'status', 'notes', 'followUp', 'appointment']) $('clientForm').elements[key].value = ['followUp', 'appointment'].includes(key) ? localDate(c[key]) : c[key] || '';
    $('editor').showModal();
  }
  $('newClient').onclick = () => open(); $('refresh').onclick = load;
  $('search').oninput = render; $('filter').onchange = render;
  $('clients').onclick = e => { const b = e.target.closest('[data-edit]'); if (b) open(clients.find(c => c.id === b.dataset.edit)); };
  for (const id of ['closeEditor', 'cancelEditor']) $(id).onclick = () => { if (!saving) $('editor').close(); };
  $('editor').addEventListener('cancel', e => { if (saving) e.preventDefault(); });
  $('clientForm').onsubmit = async e => {
    e.preventDefault(); if (saving) return; saving = true; $('saveClient').disabled = true; $('formMessage').textContent = 'Enregistrement…';
    const client = Object.fromEntries(new FormData(e.target));
    for (const key of ['followUp', 'appointment']) client[key] = client[key] ? new Date(client[key]).toISOString() : '';
    try { const data = await api('POST', { client, ...(editing ? { id: editing.id, revision: editing.revision } : {}) }); clients = clients.filter(c => c.id !== data.client.id); clients.push(data.client); $('editor').close(); render(); message('Fiche client enregistrée.'); }
    catch (err) { $('formMessage').textContent = err.message; }
    finally { saving = false; $('saveClient').disabled = false; }
  };
  async function init() {
    try { const s = await fetch('/.netlify/functions/admin-session', { cache: 'no-store' }); if (!s.ok) { location.href = '/admin/'; return; } $('loading').hidden = true; document.body.setAttribute('aria-busy', 'false'); await load();
      const r = await fetch('/.netlify/functions/admin-manage-vehicle', { cache: 'no-store' }); if (r.ok) { const { vehicles } = await r.json(); $('stock').replaceChildren(...vehicles.filter(v => v.status !== 'vendu').map(v => { const o = document.createElement('option'); o.value = v.name; return o; })); }
    } catch (e) { $('loading').textContent = 'Connexion indisponible. Actualisez la page.'; }
  }
  init();
})();
