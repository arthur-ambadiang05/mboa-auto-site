window.initAdminShare = () => {
  const origin = 'https://mboaauto.com';
  const style = document.createElement('style');
  style.textContent = `
    .mboa-share-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:10px 16px;border:1px solid #d5dce1;border-radius:10px;background:#fff;color:#10212c;font:600 14px/1.4 system-ui;cursor:pointer;text-decoration:none}
    .mboa-share-button:hover{background:#eef2f5}.mboa-share-button:focus-visible{outline:3px solid #ed3349;outline-offset:3px}
    .mboa-share-dialog{width:min(420px,calc(100% - 32px));max-height:85vh;overflow:auto;padding:24px;border:0;border-radius:18px;background:#fff;color:#10212c;box-sizing:border-box;box-shadow:0 20px 80px #0005}
    .mboa-share-dialog::backdrop{background:#0009}.mboa-share-dialog h2{margin:0 0 12px;font:700 22px/1.3 system-ui}.mboa-share-dialog p{overflow-wrap:anywhere}
    .mboa-share-options{display:grid;gap:10px}.mboa-share-options [hidden]{display:none}.mboa-share-options a{color:#10212c}.mboa-share-dialog input{width:100%;box-sizing:border-box;padding:12px;margin:12px 0;border:1px solid #aeb8c0;border-radius:8px;font:14px system-ui}.mboa-share-feedback{min-height:24px;font:14px system-ui}
  `;
  document.head.append(style);
  const dialog = document.createElement('dialog');
  dialog.className = 'mboa-share-dialog';
  dialog.setAttribute('aria-labelledby', 'mboaShareTitle');
  dialog.innerHTML = '<h2 id="mboaShareTitle">Partager</h2><p class="mboa-share-summary"></p><div class="mboa-share-options"><a class="mboa-share-button" data-channel="whatsapp" target="_blank" rel="noopener noreferrer">WhatsApp</a><a class="mboa-share-button" data-channel="facebook" target="_blank" rel="noopener noreferrer">Facebook</a><button type="button" class="mboa-share-button" data-channel="native">Autres applications…</button></div><input aria-label="Lien à partager" readonly><button type="button" class="mboa-share-button" data-channel="copy">Copier le lien</button><p class="mboa-share-feedback" role="status" aria-live="polite"></p><button type="button" class="mboa-share-button" data-channel="close">Fermer</button>';
  document.body.append(dialog);
  let active;
  let opener;
  const input = dialog.querySelector('input');
  const feedback = dialog.querySelector('.mboa-share-feedback');
  dialog.querySelector('[data-channel="close"]').onclick = () => dialog.close();
  dialog.addEventListener('close', () => opener?.focus());
  input.onclick = () => input.select();
  dialog.querySelector('[data-channel="copy"]').onclick = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(active.url);
      feedback.textContent = 'Lien copié. Collez-le dans votre message.';
    } catch (_) {
      input.focus();
      input.select();
      feedback.textContent = 'Maintenez le lien sélectionné, puis choisissez « Copier ».';
    }
  };
  dialog.querySelector('[data-channel="native"]').onclick = async () => {
    try { await navigator.share(active); }
    catch (error) { if (error.name !== 'AbortError') feedback.textContent = 'Choisissez WhatsApp, Facebook ou copiez le lien.'; }
  };
  function button(label, getData) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mboa-share-button';
    btn.textContent = '↗ ' + label;
    btn.onclick = () => {
      active = getData();
      opener = btn;
      dialog.querySelector('.mboa-share-summary').textContent = active.text;
      input.value = active.url;
      feedback.textContent = '';
      dialog.querySelector('[data-channel="whatsapp"]').href = 'https://wa.me/?text=' + encodeURIComponent(active.text + '\n' + active.url);
      dialog.querySelector('[data-channel="facebook"]').href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(active.url);
      dialog.querySelector('[data-channel="native"]').hidden = typeof navigator.share !== 'function';
      dialog.showModal();
    };
    return btn;
  }
  return {
    site: () => button('Partager le site', () => ({
      title: 'Mboa Auto',
      text: 'Découvrez les véhicules disponibles chez Mboa Auto à Yaoundé.',
      url: origin + '/'
    })),
    vehicle: vehicle => button('Partager le véhicule', () => ({
      title: vehicle.name + ' | Mboa Auto',
      text: vehicle.name + (vehicle.price_display ? ' — ' + vehicle.price_display : '') + ' | Mboa Auto',
      url: new URL('/vehicules/annonce-' + encodeURIComponent(vehicle.slug) + '.html', origin).href
    }))
  };
};
