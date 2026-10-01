

(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const biomes = JSON.parse($('biomeData').textContent);
  const cultures = JSON.parse($('cultureData').textContent);
  const groups = { biome: biomes, culture: cultures };
  const galleries = { biome: $('gallery'), culture: $('cultureGallery') };
  const positions = { biome: 0, culture: 0 };
  const storageKey = 'wildguardians.newGameMenu.v2';
  const artDialog = $('artDialog'), helpDialog = $('helpDialog');
  const bgLayers = [$('backdropA'), $('backdropB')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let step = 'biome';
  let hasConfirmedBiome = false;
  let bgLayer = 0, bgSequence = 0, backdropKey = '';
  let toastTimer = null, announceTimer = null;
  let focusBeforeDialog = null, lastPointer = null;
  let launching = false, simulationComplete = false, launchToken = 0;
  let launchTimers = [], lastLaunch = null;

  // La persistencia es opcional. No se necesita permiso de almacenamiento para jugar con el lab.
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved && typeof saved === 'object') {
      for (const type of ['biome', 'culture']) {
        const found = groups[type].findIndex(item => item.id === saved[type + 'Id']);
        if (found >= 0) positions[type] = found;
      }
    } else {
      const legacy = JSON.parse(localStorage.getItem('wildguardians.biomeMenu.v1') || 'null');
      const found = biomes.findIndex(b => b.id === legacy?.selected);
      if (found >= 0) positions.biome = found;
    }
  } catch (_) { /* file://, content:// y modo privado: continuar sin persistencia. */ }

  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        biomeId: biomes[positions.biome].id,
        cultureId: cultures[positions.culture].id
      }));
    } catch (_) { /* Sin efectos sobre el menú si el navegador lo bloquea. */ }
  }
  function itemFor(type = step) { return groups[type][positions[type]]; }
  function detailFor(type) {
    const item = itemFor(type);
    return { id: item.id, name: item.name, index: positions[type] };
  }
  function getSelection() {
    return { biome: detailFor('biome'), culture: detailFor('culture') };
  }
  function emit(name, detail, cancelable = false) {
    return window.dispatchEvent(new CustomEvent(name, { detail, cancelable }));
  }
  const icon = (id, extra = '') => `<svg class="icon ${extra}" aria-hidden="true"><use href="#${id}"/></svg>`;
  const cards = {};
  for (const type of ['biome', 'culture']) {
    cards[type] = groups[type].map((item, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'biome-card' + (type === 'culture' ? ' culture-card' : '');
      button.id = `${type}-${item.id}`;
      button.dataset[type] = item.id;
      button.dataset.index = String(i);
      button.dataset.kind = type;
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', 'false');
      button.setAttribute('aria-label', `${item.name}. ${item.description}`);
      button.tabIndex = -1;
      button.style.setProperty('--order', i);
      // El marcado es fijo y los datos están incrustados en este mismo archivo.
      button.innerHTML = `<span class="card-window"><img class="card-art" alt="" draggable="false" decoding="async"><span class="card-vignette"></span><span class="card-number" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><span class="card-caption"><span><span class="card-name"></span><span class="card-tag"></span></span>${icon('i-arrow','card-arrow')}</span><span class="selection-seal" aria-hidden="true">${icon('i-check')}</span></span><span class="frame-corners" aria-hidden="true"></span>`;
      button.querySelector('.card-name').textContent = item.name;
      button.querySelector('.card-tag').textContent = item.tag;
      const img = button.querySelector('img');
      img.addEventListener('error', () => showToast(`No se pudo mostrar la ilustración de ${item.name}.`));
      img.src = item.src;
      button.addEventListener('click', () => select(type, i, { announce: true }));
      button.addEventListener('dblclick', () => { select(type, i); openArtwork(); });
      galleries[type].append(button);
      return button;
    });
  }

  function changeBackdrop(item, initial = false) {
    if (!initial && backdropKey === item.src) return;
    backdropKey = item.src;
    const sequence = ++bgSequence;
    if (initial) {
      bgLayer = 0;
      bgLayers[0].src = item.src;
      bgLayers[0].classList.add('visible');
      bgLayers[1].classList.remove('visible');
      return;
    }
    const next = 1 - bgLayer;
    const img = bgLayers[next];
    img.src = item.src;
    const reveal = () => {
      if (sequence !== bgSequence) return;
      bgLayers[bgLayer].classList.remove('visible');
      img.classList.add('visible');
      bgLayer = next;
    };
    if (typeof img.decode === 'function') img.decode().then(reveal).catch(reveal);
    else if (img.complete) reveal();
    else img.onload = reveal;
  }

  function render({ initial = false, announce = false } = {}) {
    const isCulture = step === 'culture';
    const item = itemFor();
    const biome = itemFor('biome');
    $('app').dataset.step = step;
    for (const type of ['biome', 'culture']) {
      galleries[type].hidden = type !== step;
      cards[type].forEach((card, i) => {
        const chosen = i === positions[type];
        card.setAttribute('aria-checked', String(chosen));
        card.tabIndex = chosen ? 0 : -1;
      });
    }
    $('pageTitle').textContent = isCulture ? 'Elige tu cultura' : 'Elige tu territorio';
    $('pageSubtitle').textContent = isCulture
      ? `Tu poblado en ${biome.name}. Elige su arquitectura.`
      : 'Seis paisajes. Un nuevo comienzo.';
    $('backButton').hidden = !isCulture;
    $('biomeStep').classList.toggle('complete', isCulture);
    $('biomeStepLabel').textContent = isCulture ? biome.name : 'Bioma';
    $('biomeStepNumber').textContent = isCulture ? '✓' : '1';
    $('biomeStep').setAttribute('aria-label', isCulture ? `Volver al bioma: ${biome.name}` : 'Paso 1: elegir bioma');
    $('cultureStep').disabled = !hasConfirmedBiome;
    $('biomeStep').removeAttribute('aria-current');
    $('cultureStep').removeAttribute('aria-current');
    $(isCulture ? 'cultureStep' : 'biomeStep').setAttribute('aria-current', 'step');
    document.documentElement.style.setProperty('--accent', item.accent);
    $('selectionName').textContent = item.name;
    $('selectionDescription').textContent = item.description;
    $('selectionKicker').textContent = isCulture ? `Tu poblado en ${biome.name}` : 'Tu próximo territorio';
    $('confirmLabel').textContent = isCulture ? 'Comenzar partida' : 'Continuar';
    $('confirmIcon').setAttribute('href', '#i-arrow');
    $('confirmButton').setAttribute('aria-label', isCulture
      ? `Comenzar partida simulada en ${biome.name} con cultura ${item.name}`
      : `Elegir ${item.name} y continuar al selector de cultura`);
    $('viewButton').setAttribute('aria-label', `Ver la ilustración completa de ${item.name}`);
    $('enterHint').textContent = isCulture ? 'Comenzar' : 'Continuar';
    $('footerLabel').textContent = isCulture
      ? '05 culturas · Todas combinables con tu bioma'
      : '06 territorios · Una historia por empezar';
    $('selectionHint').textContent = isCulture
      ? 'Selecciona una cultura y pulsa Comenzar partida para iniciar la simulación. Puedes volver al bioma sin perder tus elecciones.'
      : 'Selecciona un bioma y pulsa Continuar. Después elegirás la cultura. Usa las flechas para cambiar e Intro para continuar.';
    changeBackdrop(item, initial);
    if (artDialog.open) updateViewer();
    if (announce) announceSelection(`${item.name}. ${item.description}`);
  }
  function announceSelection(text) {
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => { $('selectionAnnouncement').textContent = text; }, 160);
  }
  function select(type, nextIndex, { focus = false, announce = false } = {}) {
    if (launching || simulationComplete || !groups[type] || !Number.isInteger(nextIndex)) return false;
    const items = groups[type];
    const next = ((nextIndex % items.length) + items.length) % items.length;
    const changed = next !== positions[type];
    positions[type] = next;
    if (changed) {
      clearTimeout(toastTimer);
      $('toast').classList.remove('show');
      render({ announce });
      persist();
      emit(`wildguardians:${type}-preview`, detailFor(type));
    }
    if (focus && step === type) cards[type][next].focus({ preventScroll: true });
    return true;
  }
  function animatePage() {
    const workspace = $('workspace');
    workspace.classList.remove('page-enter');
    if (!reduceMotion.matches) {
      void workspace.offsetWidth;
      workspace.classList.add('page-enter');
    }
  }
  function goToStep(nextStep, { focus = true } = {}) {
    if (!groups[nextStep] || (nextStep === 'culture' && !hasConfirmedBiome)) return false;
    if (artDialog.open) dismissDialog(artDialog, false);
    if (helpDialog.open) dismissDialog(helpDialog, false);
    cancelTimers();
    launching = false;
    simulationComplete = false;
    $('launchScreen').hidden = true;
    $('app').hidden = false;
    step = nextStep;
    render();
    animatePage();
    if (focus) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      $('pageTitle').focus({ preventScroll: true });
    }
    return true;
  }
  function continueToCulture() {
    if (launching || simulationComplete) return false;
    hasConfirmedBiome = true;
    persist();
    const detail = detailFor('biome');
    goToStep('culture');
    emit('wildguardians:biome-selected', detail);
    return detail;
  }
  function confirm() { return step === 'biome' ? continueToCulture() : startGame(); }
  function showToast(message) {
    clearTimeout(toastTimer);
    $('toastText').textContent = message;
    $('toast').classList.add('show');
    toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3000);
  }

  function updateViewer() {
    const item = itemFor();
    const isCulture = step === 'culture';
    $('viewerTitle').textContent = item.name;
    $('viewerKicker').textContent = isCulture ? 'Poblados de Wild Guardians' : 'Atlas de Wild Guardians';
    $('viewerImage').src = item.src;
    $('viewerImage').alt = item.alt;
    $('viewerCount').textContent = `${String(positions[step]+1).padStart(2,'0')} / ${String(groups[step].length).padStart(2,'0')}`;
    $('viewerConfirmLabel').textContent = isCulture ? `Elegir ${item.name}` : `Continuar con ${item.name}`;
    $('viewerConfirmIcon').setAttribute('href', isCulture ? '#i-check' : '#i-arrow');
    $('previousArt').setAttribute('aria-label', isCulture ? 'Cultura anterior' : 'Bioma anterior');
    $('nextArt').setAttribute('aria-label', isCulture ? 'Cultura siguiente' : 'Bioma siguiente');
  }
  function showDialog(dialog) {
    focusBeforeDialog = document.activeElement;
    document.body.classList.add('dialog-open');
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else {
      dialog.setAttribute('open', '');
      Object.assign(dialog.style, { position: 'fixed', inset: '0', zIndex: '50', margin: 'auto' });
    }
  }
  function dismissDialog(dialog, restoreFocus = true) {
    if (!dialog.open) return;
    if (!restoreFocus) focusBeforeDialog = null;
    if (typeof dialog.close === 'function') dialog.close();
    else { dialog.removeAttribute('open'); afterDialogClosed(); }
    if (!artDialog.open && !helpDialog.open) document.body.classList.remove('dialog-open');
  }
  function afterDialogClosed() {
    if (artDialog.open || helpDialog.open) return;
    document.body.classList.remove('dialog-open');
    const target = focusBeforeDialog;
    focusBeforeDialog = null;
    if (target && target.isConnected && target.getClientRects().length) target.focus({ preventScroll: true });
  }
  function openArtwork() {
    if (artDialog.open || helpDialog.open || launching || simulationComplete) return;
    updateViewer();
    showDialog(artDialog);
    $('closeViewer').focus({ preventScroll: true });
  }
  function closeArtwork() { dismissDialog(artDialog); }
  [artDialog, helpDialog].forEach(dialog => {
    dialog.addEventListener('close', afterDialogClosed);
    dialog.addEventListener('click', e => {
      if (e.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dismissDialog(dialog);
    });
  });

  // Una sola acción después de la cultura. No existe un tercer paso de configuración.
  function cancelTimers() {
    launchToken++;
    launchTimers.forEach(clearTimeout);
    launchTimers = [];
  }
  function setProgress(value, text) {
    $('progressFill').style.width = `${value}%`;
    $('launchProgress').setAttribute('aria-valuenow', String(value));
    $('launchStatus').textContent = text;
  }
  function startGame() {
    if (step !== 'culture' || !hasConfirmedBiome || launching || simulationComplete) return false;
    launching = true; // También protege frente a doble clic o Intro mantenido.
    cancelTimers();
    const thisLaunch = launchToken;
    const selection = getSelection();
    const payload = Object.freeze({
      version: 2,
      simulation: true,
      biome: Object.freeze(selection.biome),
      culture: Object.freeze(selection.culture)
    });
    persist();
    emit('wildguardians:culture-selected', detailFor('culture'));
    // Una integración real puede cancelar el evento y hacerse cargo del inicio.
    if (!emit('wildguardians:new-game', payload, true)) { launching = false; return payload; }
    if (thisLaunch !== launchToken) { launching = false; return false; }
    lastLaunch = payload;
    dismissDialog(artDialog, false);
    dismissDialog(helpDialog, false);
    clearTimeout(announceTimer);
    clearTimeout(toastTimer);
    $('toast').classList.remove('show');
    $('launchScreen').classList.remove('complete');
    $('launchActions').hidden = true;
    $('simulationNote').hidden = true;
    $('cancelLaunch').hidden = false;
    $('launchProgress').hidden = false;
    $('launchStatus').hidden = false;
    $('launchBiomeImage').src = itemFor('biome').src;
    $('launchBiomeImage').alt = itemFor('biome').alt;
    $('launchCultureImage').src = itemFor('culture').src;
    $('launchCultureImage').alt = itemFor('culture').alt;
    $('launchBiomeName').textContent = payload.biome.name;
    $('launchCultureName').textContent = payload.culture.name;
    $('launchEyebrow').textContent = 'Nueva partida · Preparando el inicio';
    $('launchHeading').textContent = 'Un nuevo comienzo';
    $('launchSubtitle').textContent = `${payload.biome.name} · Cultura ${payload.culture.name}`;
    setProgress(8, 'Preparando el inicio simulado…');
    $('app').hidden = true;
    $('launchScreen').hidden = false;
    window.scrollTo({ top: 0, behavior: 'instant' });
    $('launchHeading').focus({ preventScroll: true });
    const later = (delay, callback) => launchTimers.push(setTimeout(() => {
      if (thisLaunch === launchToken && launching) callback();
    }, delay));
    if (!reduceMotion.matches) {
      later(430, () => setProgress(35, `Bioma elegido: ${payload.biome.name}.`));
      later(990, () => setProgress(71, `Cultura elegida: ${payload.culture.name}.`));
      later(1580, () => setProgress(100, 'Configuración lista. Iniciando la simulación…'));
    }
    later(reduceMotion.matches ? 350 : 2120, () => {
      launching = false;
      simulationComplete = true;
      $('launchScreen').classList.add('complete');
      $('launchEyebrow').textContent = 'Partida iniciada · Simulación';
      $('launchHeading').textContent = 'Tu aventura comienza';
      $('launchSubtitle').textContent = `${payload.biome.name} · Cultura ${payload.culture.name}`;
      $('launchProgress').hidden = true;
      $('launchStatus').hidden = true;
      $('cancelLaunch').hidden = true;
      $('launchActions').hidden = false;
      $('simulationNote').hidden = false;
      $('newGameButton').focus({ preventScroll: true });
      announceSelection(`Partida simulada iniciada en ${payload.biome.name} con cultura ${payload.culture.name}.`);
      emit('wildguardians:game-started', payload);
    });
    return payload;
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else showToast('Este navegador no admite pantalla completa.');
    } catch (_) { showToast('El navegador no ha permitido abrir la pantalla completa.'); }
  }
  $('fullscreenButton').hidden = !document.fullscreenEnabled;
  document.addEventListener('fullscreenchange', () => {
    const active = !!document.fullscreenElement;
    $('fullscreenIcon').setAttribute('href', active ? '#i-restore' : '#i-fullscreen');
    $('fullscreenButton').setAttribute('aria-label', active ? 'Salir de pantalla completa' : 'Pantalla completa');
    $('fullscreenButton').title = active ? 'Salir de pantalla completa (F)' : 'Pantalla completa (F)';
  });
  $('fullscreenButton').addEventListener('click', toggleFullscreen);
  $('confirmButton').addEventListener('click', confirm);
  $('backButton').addEventListener('click', () => goToStep('biome'));
  $('biomeStep').addEventListener('click', () => goToStep('biome'));
  $('cultureStep').addEventListener('click', continueToCulture);
  $('viewerConfirm').addEventListener('click', () => {
    if (step === 'biome') continueToCulture();
    else {
      // En el visor se elige la cultura; el inicio es siempre el botón explícito del menú.
      dismissDialog(artDialog, false);
      persist();
      render();
      $('confirmButton').focus({ preventScroll: true });
    }
  });
  $('viewButton').addEventListener('click', openArtwork);
  $('closeViewer').addEventListener('click', closeArtwork);
  $('previousArt').addEventListener('click', () => select(step, positions[step]-1, { announce: true }));
  $('nextArt').addEventListener('click', () => select(step, positions[step]+1, { announce: true }));
  $('helpButton').addEventListener('click', () => {
    if (helpDialog.open || artDialog.open) return;
    showDialog(helpDialog);
    $('closeHelp').focus({ preventScroll: true });
  });
  $('closeHelp').addEventListener('click', () => dismissDialog(helpDialog));
  $('cancelLaunch').addEventListener('click', () => goToStep('culture'));
  $('newGameButton').addEventListener('click', () => goToStep('biome'));
  $('changeCultureButton').addEventListener('click', () => goToStep('culture'));

  // Deslizar en el visor cambia de obra y respeta los gestos verticales y el zoom.
  $('viewerViewport').addEventListener('pointerdown', e => {
    if (!e.isPrimary) { lastPointer = null; return; }
    lastPointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
  });
  $('viewerViewport').addEventListener('pointerup', e => {
    if (!lastPointer || e.pointerId !== lastPointer.id) return;
    const dx = e.clientX-lastPointer.x, dy = e.clientY-lastPointer.y;
    lastPointer = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)*1.6)
      select(step, positions[step]+(dx < 0 ? 1 : -1), { announce: true });
  });
  $('viewerViewport').addEventListener('pointercancel', () => { lastPointer = null; });

  // Vecinos visuales, no columnas CSS: también funciona con la fila centrada de 5 culturas.
  function verticalNeighbour(direction) {
    const centers = cards[step].map((card, i) => {
      const r = card.getBoundingClientRect();
      return { i, x: r.left+r.width/2, y: r.top+r.height/2 };
    });
    const current = centers[positions[step]];
    let candidates = centers.filter(c => direction*(c.y-current.y) > 5);
    if (!candidates.length) {
      const targetY = direction > 0 ? Math.min(...centers.map(c => c.y)) : Math.max(...centers.map(c => c.y));
      candidates = centers.filter(c => Math.abs(c.y-targetY) < 5);
    } else {
      const distance = Math.min(...candidates.map(c => Math.abs(c.y-current.y)));
      candidates = candidates.filter(c => Math.abs(c.y-current.y) < distance+5);
    }
    candidates.sort((a,b) => Math.abs(a.x-current.x)-Math.abs(b.x-current.x) || a.i-b.i);
    return candidates[0]?.i ?? positions[step];
  }
  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.isComposing) return;
    if (e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))) return;
    if (helpDialog.open) return;
    if (e.key.toLowerCase() === 'f') { e.preventDefault(); toggleFullscreen(); return; }
    if (e.key === 'Escape') {
      if (artDialog.open) { e.preventDefault(); closeArtwork(); }
      else if (launching || simulationComplete) { e.preventDefault(); goToStep('culture'); }
      else if (step === 'culture') { e.preventDefault(); goToStep('biome'); }
      return;
    }
    if (launching || simulationComplete) return;
    const arrows = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'];
    if (arrows.includes(e.key)) {
      if (artDialog.open && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) return;
      e.preventDefault();
      const next = e.key === 'ArrowLeft' ? positions[step]-1
        : e.key === 'ArrowRight' ? positions[step]+1
        : verticalNeighbour(e.key === 'ArrowDown' ? 1 : -1);
      select(step, next, { focus: !artDialog.open, announce: true });
      if (!artDialog.open) cards[step][positions[step]].scrollIntoView({ block: 'nearest', inline: 'nearest' });
      return;
    }
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      select(step, e.key === 'Home' ? 0 : groups[step].length-1, { focus: !artDialog.open, announce: true });
      return;
    }
    if (e.key.toLowerCase() === 'v') { e.preventDefault(); if (artDialog.open) closeArtwork(); else openArtwork(); return; }
    if (e.key === 'Enter' && e.repeat) { e.preventDefault(); return; }
    // Los botones conservan su acción nativa. Intro en una tarjeta confirma.
    if (e.key === 'Enter' && !artDialog.open && (e.target === document.body || e.target.id === 'pageTitle' || e.target.classList?.contains('biome-card'))) {
      e.preventDefault(); confirm();
    }
  });

  function selectById(type, id) {
    const index = groups[type].findIndex(item => item.id === id);
    return index >= 0 ? select(type, index, { announce: type === step }) : false;
  }
  // API pública para la integración futura. No se envían datos fuera del documento.
  window.WildGuardiansNewGameMenu = Object.freeze({
    getSelection,
    getState: () => ({ step: launching ? 'loading' : simulationComplete ? 'started' : step, ...getSelection(), simulation: true }),
    getLastLaunch: () => lastLaunch ? JSON.parse(JSON.stringify(lastLaunch)) : null,
    selectBiome: id => selectById('biome', id),
    selectCulture: id => selectById('culture', id),
    goTo: target => target === 'culture' ? ((launching || simulationComplete) ? goToStep('culture') : continueToCulture()) : target === 'biome' ? goToStep('biome') : false,
    continue: confirm,
    start: startGame,
    cancel: () => goToStep('culture'),
    openArtwork,
    closeArtwork
  });
  // Compatibilidad con el nombre de API del selector V1.
  window.WildGuardiansBiomeMenu = Object.freeze({
    getSelection: () => detailFor('biome'),
    select: id => selectById('biome', id),
    confirm: continueToCulture,
    openArtwork,
    closeArtwork
  });
  window.WildGuardiansCultureMenu = Object.freeze({
    getSelection: () => detailFor('culture'),
    select: id => selectById('culture', id),
    confirm: startGame,
    openArtwork,
    closeArtwork
  });
  render({ initial: true });
})();

