import {icon, decorateIcons} from './icons.js';
import {Room, views, anchors, defaultPins} from './room.js';
import {devices, scenes, colors, loadRoom, sceneState, persist, params, describe, setLevel, setHue, interpret} from './devices.js';
import {RoomAudio} from './audio.js';
import {setupVoiceControl} from './voice.js';

const $ = id => document.getElementById(id), byId = Object.fromEntries(devices.map(d => [d.id, d]));
const state = loadRoom(), audio = new RoomAudio();
const cache = {}, pinNodes = {}, sceneNodes = {};
let filter = 'All', expanded = '', selected = '', pins = true, peek = true, toastTimer = 0, dialogPage = '';
decorateIcons();
function notify(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}
function hintFor(d, n) {
  if (d.kind === 'shade')return n === 0?'closed':n === 100?'open':`${n}% open`;
  if (!n)return 'off';
  return d.kind === 'power'?'on':d.kind === 'volume'?`volume ${n}%`:`at ${n}%`;
}
function apply(id, n, message = true) {
  setLevel(state, id, n);
  if (id === 'audio')audio.set(n, true);
  update();
  if (message)notify(`${byId[id].name} ${hintFor(byId[id], state.levels[id])}`);
}
function toggle(id, message = true) {
  const n = state.levels[id], d = byId[id];
  if (!d)return;
  if (d.kind === 'shade')apply(id, n>0?0:100, message);else apply(id, n>0?0:(state.memory[id] || 100), message);
}
function applyScene(id, announce = true) {
  const s = scenes.find(s => s.id === id);
  if (!s)return;
  const next = sceneState(s);
  Object.assign(state, next, {temperature:state.temperature, armed:state.armed});
  audio.set(state.levels.audio, true);
  update();
  if (announce)notify(`${s.name} scene applied`);
}
function setFilter(name) {
  filter = name;
  for (const n of $('filters').children) {
    const on = n.dataset.filter === name;
    n.classList.toggle('active', on);
    n.setAttribute('aria-pressed', on);
  }
  for (const d of devices)cache[d.id].el.hidden = filter !== 'All' && d.group !== filter;
}
function setExpanded(id) {
  expanded = expanded === id?'':id;
  selected = expanded || id;
  peek = false;
  update(false);
  room.dirty = true;
  room.wake();
}
function chooseDevice(id) {
  if (id.startsWith('dashboard-')) {
    openDialog(id.slice(10));
    return;
  }
  if (id === 'tablet') {
    openDialog('tablet');
    return;
  }
  if (!byId[id])return;
  selected = id;
  peek = false;
  toggle(id);
}
function detailFor(d) {
  if (d.kind === 'power')return '';
  const isShade = d.kind === 'shade';
  const label = isShade?'Shade opening':d.kind === 'volume'?'Volume':'Brightness';
  const colorsHTML = d.kind === 'color'?`<div class="swatches" aria-label="Cove color">${Object.keys(colors).map(c => `<button type="button" class="swatch" data-color="${c}" style="background:rgb(${colors[c].map(n => Math.round(n*255)).join(',')})" title="${c}" aria-label="${c} cove lighting"></button>`).join('')}</div>`:'';
  return `<div class="range-label"><label for="level-${d.id}">${label}</label><output></output></div><input id="level-${d.id}" type="range" min="0" max="100" step="1" aria-label="${d.name} ${label.toLowerCase()}">${colorsHTML}`;
}
function initializeDevices() {
  for (const f of ['All', 'Lights', 'Media', 'Comfort']) {
    const el = document.createElement('button');
    el.type = 'button';
    el.dataset.filter = f;
    el.textContent = f;
    el.addEventListener('click', () => setFilter(f));
    $('filters').append(el);
  }
  for (const d of devices) {
    const el = document.createElement('div');
    el.className = 'device';
    const detail = detailFor(d);
    el.innerHTML = `<div class="device-row"><button type="button" class="device-main" ${detail?`aria-controls="extra-${d.id}" aria-expanded="false"`:''}><span class="device-input-icon">${icon(d.icon)}</span><span><span class="device-name">${d.name}</span><span class="device-state"></span></span></button><button class="device-toggle" type="button" role="switch"><span class="switch-track" aria-hidden="true"><i></i></span></button></div>${detail?`<div class="device-extra" id="extra-${d.id}" hidden>${detail}</div>`:''}`;
    const main = el.querySelector('.device-main'), power = el.querySelector('.device-toggle'), extra = el.querySelector('.device-extra'), range = el.querySelector('input'), out = el.querySelector('output');
    cache[d.id] = {el, main, power, extra, range, out, label:el.querySelector('.device-state')};
    main.addEventListener('click', () => {
      if (detail)setExpanded(d.id);else chooseDevice(d.id);
    });
    power.addEventListener('click', () => {
      selected = d.id;
      peek = false;
      toggle(d.id);
    });
    range?.addEventListener('input', () => apply(d.id, Number(range.value), false));
    range?.addEventListener('change', () => notify(`${d.name} ${hintFor(d, state.levels[d.id])}`));
    for (const b of el.querySelectorAll('[data-color]'))b.addEventListener('click', () => {
      setHue(state, b.dataset.color);
      update();
      notify(`Cove lighting set to ${state.hue.toLowerCase()}`);
    });
    $('deviceList').append(el);
  }
  for (const s of scenes) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'scene-card';
    el.style.setProperty('--sc', s.color);
    el.innerHTML = `${icon(s.icon)}<span class="scene-state" hidden>${icon('check')}</span><span class="scene-name">${s.name}</span><span class="scene-detail">${s.detail}</span>`;
    el.addEventListener('click', () => applyScene(s.id));
    $('sceneCards').append(el);
    sceneNodes[s.id] = el;
  }
  const pinIDs = [...new Set([...defaultPins, ...Object.keys(anchors)])];
  for (const id of pinIDs) {
    const label = byId[id]?.name || 'Tabletop remote', el = document.createElement('button');
    el.type = 'button';
    el.hidden = true;
    el.className = 'pin';
    el.innerHTML = `<span class="pin-core"></span><span class="pin-label">${label}</span>`;
    el.addEventListener('click', () => chooseDevice(id));
    $('markers').append(el);
    pinNodes[id] = el;
  }
  setFilter('All');
}
function update(save = true) {
  for (const d of devices) {
    const c = cache[d.id], level = state.levels[d.id];
    if (!c)continue;
    c.el.classList.toggle('off', level === 0);
    c.el.classList.toggle('expanded', expanded === d.id);
    c.label.textContent = describe(d, level, state);
    c.power.setAttribute('aria-checked', level>0);
    c.power.setAttribute('aria-label', `${d.name}${d.kind === 'shade'?' open':' power'}`);
    c.power.title = d.kind === 'shade'?(level?'Close window shade':'Open window shade'):`Turn ${d.name.toLowerCase()} ${level?'off':'on'}`;
    if (c.extra) {
      c.extra.hidden = expanded !== d.id;
      c.main.setAttribute('aria-expanded', expanded === d.id);
      c.range.value = level;
      c.out.value = `${level}%`;
      c.out.textContent = `${level}%`;
      for (const b of c.extra.querySelectorAll('[data-color]')) {
        const active = b.dataset.color === state.hue;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', active);
        b.innerHTML = active?icon('check'):'';
      }
    }
    c.main.title = c.extra?`Adjust ${d.name.toLowerCase()}`:c.power.title;
  }
  const current = scenes.find(s => s.id === state.scene);
  for (const s of scenes) {
    const on = state.scene === s.id, el = sceneNodes[s.id];
    el.classList.toggle('selected', on);
    el.setAttribute('aria-pressed', on);
    el.querySelector('.scene-state').hidden = !on;
  }
  $('currentScene').textContent = current?`${current.name} scene`:'Custom settings';
  $('deviceSummary').textContent = `${devices.length} simulated devices`;
  const active = devices.filter(d => state.levels[d.id]>0 && d.id !== 'shades').length;
  $('powerSummary').textContent = `${active} ${active === 1?'device':'devices'} powered on`;
  for (const [id, el] of Object.entries(pinNodes)) {
    const d = byId[id], n = state.levels[id];
    el.classList.toggle('off', n === 0);
    el.classList.toggle('peek', peek && id === 'fire');
    el.classList.toggle('focused', selected === id);
    el.setAttribute('aria-label', d?(d.kind === 'shade'?(n?'Close window shade':'Open window shade'):`Turn ${d.name.toLowerCase()} ${n?'off':'on'}`):'Open tabletop remote');
  }
  if (dialogPage === 'tablet')fillRemote();else if (systemPages[dialogPage])updateSystem();
  room.dashboard(state.temperature, state.armed);
  if (save)persist(state);
  room.setParams(params(state));
}
function syncView(id) {
  const v = views.find(v => v.id === id);
  $('viewName').textContent = v?.name || 'Free view';
  for (const el of $('viewOptions').children) {
    const active = el.dataset.view === id;
    el.classList.toggle('selected', active);
    el.setAttribute('aria-pressed', active);
    el.querySelector('.end').hidden = !active;
  }
}
function drawPins(proj, r) {
  for (const [id, el] of Object.entries(pinNodes)) {
    const show = pins && (defaultPins.includes(id) || selected === id), p = show?proj(anchors[id]):null;
    el.hidden = !p || p.z<.1 || p.x<9 || p.x>r.width-9 || p.y<15 || p.y>r.height-17;
    if (el.hidden)continue;
    el.style.left = `${p.x.toFixed(1)}px`;
    el.style.top = `${p.y.toFixed(1)}px`;
    el.classList.toggle('flip', p.x>r.width*.77);
  }
}
const systemPages = {lighting:{title:'Lighting', icon:'pendant'}, climate:{title:'Thermostat', icon:'temp'}, security:{title:'Room security', icon:'security'}, sound:{title:'Ceiling audio', icon:'audio'}, blinds:{title:'Window shade', icon:'shades'}, scenes:{title:'Room scenes', icon:'layers'}};
const room = new Room($('viewer'), {ready:() => {
  $('viewer').classList.add('ready');
  $('renderLabel').textContent = '3D view';
}, view:syncView, pick:chooseDevice, frame:drawPins}, params(state));
initializeDevices();
update(false);
for (const v of views) {
  const el = document.createElement('button');
  el.type = 'button';
  el.dataset.view = v.id;
  el.innerHTML = `${icon(v.icon)}<span>${v.name}</span><span class="end">${icon('check')}</span>`;
  el.addEventListener('click', () => {
    room.setView(v.id);
    cameraMenu(false);
    $('viewer').focus({preventScroll:true});
  });
  $('viewOptions').append(el);
}
syncView('reference');
function cameraMenu(on) {
  $('cameraMenu').hidden = !on;
  $('cameraBtn').setAttribute('aria-expanded', on);
}
$('cameraBtn').addEventListener('click', () => cameraMenu($('cameraMenu').hidden));
document.addEventListener('pointerdown', e => {
  if (!e.target.closest('.view-choice'))cameraMenu(false);
});
$('zoomIn').addEventListener('click', () => room.zoom(1.16));
$('zoomOut').addEventListener('click', () => room.zoom(1/1.16));
$('pinBtn').addEventListener('click', () => {
  pins = !pins;
  const text = pins?'Hide device markers':'Show device markers';
  $('pinBtn').setAttribute('aria-pressed', pins);
  $('pinBtn').setAttribute('aria-label', text);
  $('pinBtn').title = text;
  room.dirty = true;
  room.wake();
});
$('walkBtn').addEventListener('click', () => {
  const on = $('walkPad').hidden;
  $('walkPad').hidden = !on;
  $('walkBtn').setAttribute('aria-expanded', on);
  if (on)$('viewer').focus({preventScroll:true});
});
for (const el of $('walkPad').querySelectorAll('button')) {
  el.type = 'button';
  el.addEventListener('pointerdown', e => {
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    el.dataset.start = String(performance.now());
    room.hold(el.dataset.key, true);
  });
  for (const evt of ['pointerup', 'pointercancel', 'lostpointercapture'])el.addEventListener(evt, () => {
    const elapsed = performance.now()-Number(el.dataset.start || 0);
    if (evt === 'pointerup' && elapsed<140) {
      const k = el.dataset.key;
      room.advance(k === 'a'?-.16:k === 'd'?.16:0, k === 'w'?.16:k === 's'?-.16:0);
    }
    delete el.dataset.start;
    room.hold(el.dataset.key, false);
  });
  el.addEventListener('click', e => {
    if (e.detail === 0) {
      room.manual();
      const k = el.dataset.key;
      room.advance(k === 'a'?-.3:k === 'd'?.3:0, k === 'w'?.3:k === 's'?-.3:0);
    }
  });
}
const voice = setupVoiceControl(runCommand, () => audio.unlock());
let expandedWindow = false;
function fullUI() {
  voice.syncHost();
  const yes = !!document.fullscreenElement || expandedWindow;
  const button = $('expandBtn');
  button.innerHTML = icon(yes?'contract':'expand');
  button.title = yes?'Exit expanded view':'Expand room view';
  button.setAttribute('aria-label', button.title);
  room.dirty = true;
  room.wake();
}
$('expandBtn').addEventListener('click', async() => {
  const viewer = $('viewer');
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }
  if (expandedWindow) {
    expandedWindow = false;
    viewer.classList.remove('expanded-mode');
    fullUI();
    return;
  }
  try {
    if (!viewer.requestFullscreen)throw Error();
    await viewer.requestFullscreen();
  } catch{
    expandedWindow = true;
    viewer.classList.add('expanded-mode');
  }
  fullUI();
  showWalkInFullscreen();
  viewer.focus({preventScroll:true});
});
document.addEventListener('fullscreenchange', fullUI);
function showWalkInFullscreen() {
  const y = !!document.fullscreenElement || expandedWindow;
  if (y && window.matchMedia('(pointer:coarse)').matches) {
    $('walkPad').hidden = false;
    $('walkBtn').setAttribute('aria-expanded', 'true');
  }
}
document.addEventListener('fullscreenchange', showWalkInFullscreen);

function openDialog(page) {
  cameraMenu(false);
  const dialog = $('dialog');
  const parent = document.fullscreenElement === $('viewer')?$('viewer'):document.body;
  if (dialog.parentElement !== parent)parent.append(dialog);
  dialogPage = page;
  $('dialogIcon').innerHTML = icon(page === 'tablet'?'tablet':systemPages[page]?.icon || 'guide');
  if (page === 'tablet')fillRemote();else if (systemPages[page])fillSystem(page);else fillGuide();
  if (!dialog.open)dialog.showModal();
  dialog.setAttribute('aria-labelledby', 'dialogTitle');
}
function closeDialog() {
  $('dialog').close();
}
$('guideBtn').addEventListener('click', () => openDialog('guide'));
$('closeDialog').addEventListener('click', closeDialog);
$('dialog').addEventListener('close', () => {
  dialogPage = '';
  if ($('dialog').parentElement !== document.body)document.body.append($('dialog'));
});
$('dialog').addEventListener('click', e => {
  if (e.target === $('dialog')) {
    const r = e.target.getBoundingClientRect();
    if (e.clientX<r.left || e.clientX>r.right || e.clientY<r.top || e.clientY>r.bottom)closeDialog();
  }
});
function fillGuide() {
  $('dialogBody').innerHTML = `<h2 id="dialogTitle">Room guide</h2><p class="dialog-intro">Select a mint marker to switch a device. The tablet opens the remote. Select a dashboard tile on the TV to adjust that system, or use the camera menu to change viewpoint.</p><dl class="guide-list"><div><dt>Look around</dt><dd>Drag or swipe</dd></div><div><dt>Walk through the room</dt><dd><kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or Walk controls</dd></div><div><dt>Turn left or right</dt><dd><kbd>←</kbd> <kbd>→</kbd></dd></div><div><dt>Zoom</dt><dd>Scroll, pinch, or use + / −</dd></div><div><dt>Return to the photo angle</dt><dd><kbd>Home</kbd> in the viewport</dd></div><div><dt>Voice commands</dt><dd><kbd>V</kbd></dd></div></dl><p class="guide-note">The starting angle follows the reference photograph. Unseen surfaces and dimensions are reconstructed. All switches control this simulated room.</p>`;
}
function fillRemote() {
  const body = $('dialogBody');
  body.innerHTML = `<h2 id="dialogTitle">Tabletop remote</h2><p class="dialog-intro">Control the living room from the coffee table.</p><div class="remote-grid system-links"><button class="remote-tile" type="button" data-system="climate">${icon('temp')}<span>Thermostat<span class="device-state">${state.temperature}°F setpoint</span></span></button><button class="remote-tile" type="button" data-system="security">${icon('security')}<span>Security<span class="device-state">${state.armed?'Armed':'Disarmed'}</span></span></button></div><h3>Room scenes</h3><div class="remote-grid">${scenes.map(s => `<button class="remote-tile" type="button" data-scene="${s.id}" aria-pressed="${state.scene === s.id}">${icon(s.icon)}${s.name}</button>`).join('')}</div><h3>Quick controls</h3><div class="remote-grid">${['pendant', 'tv', 'fire', 'shades', 'audio', 'lamp'].map(id => `<button class="remote-tile" type="button" data-device="${id}" aria-pressed="${state.levels[id]>0}">${icon(byId[id].icon)}<span>${byId[id].name}<span class="device-state">${describe(byId[id], state.levels[id], state)}</span></span></button>`).join('')}</div>`;
  for (const n of body.querySelectorAll('[data-system]'))n.addEventListener('click', () => openDialog(n.dataset.system));
  for (const n of body.querySelectorAll('[data-scene]'))n.addEventListener('click', () => {
    applyScene(n.dataset.scene);
    body.querySelector(`[data-scene="${n.dataset.scene}"]`)?.focus();
  });
  for (const n of body.querySelectorAll('[data-device]'))n.addEventListener('click', () => {
    toggle(n.dataset.device);
    body.querySelector(`[data-device="${n.dataset.device}"]`)?.focus();
  });
}
function fillSystem(page) {
  const body = $('dialogBody'), s = systemPages[page];
  let content = '';
  if (page === 'climate')content = `<p class="dialog-intro">Set the room temperature shown on the TV and tabletop display.</p><div class="setpoint"><button type="button" class="minor-btn" id="tempDown" aria-label="Lower temperature">${icon('minus')}</button><output id="tempReadout" aria-live="polite"></output><button type="button" class="minor-btn" id="tempUp" aria-label="Raise temperature">${icon('plus')}</button></div><p class="guide-note">Setpoint range 60–85°F.</p>`;
  if (page === 'security')content = `<p class="dialog-intro">Arm or disarm the simulated room alarm.</p><button class="remote-tile system-power" type="button" id="securityPower">${icon('security')}<span id="securityStatus"></span></button>`;
  if (page === 'scenes')content = `<p class="dialog-intro">Apply a lighting, shade and entertainment preset.</p><div class="remote-grid">${scenes.map(s => `<button class="remote-tile" data-preset="${s.id}">${icon(s.icon)}${s.name}</button>`).join('')}</div>`;
  if (page === 'lighting' || page === 'sound' || page === 'blinds') {
    const ds = devices.filter(d => page === 'lighting'?d.group === 'Lights':d.id === (page === 'sound'?'audio':'shades'));
    content = `<p class="dialog-intro">${page === 'lighting'?'Switch a lighting zone.':page === 'sound'?'Control the room’s speakers and volume.':'Open, close or position the roller shade.'}</p><div class="remote-grid">${ds.map(d => `<button class="remote-tile" data-pick="${d.id}">${icon(d.icon)}<span>${d.name}<span class="device-state"></span></span></button>`).join('')}</div>`;
    if (ds.length === 1)content += `<label class="system-range">${page === 'sound'?'Volume':'Shade opening'} <output id="systemLevel"></output><input type="range" min="0" max="100" step="1" id="systemSlider" data-level="${ds[0].id}"></label>`;
  }
  body.innerHTML = `<h2 id="dialogTitle">${s.title}</h2>${content}<button type="button" class="back-remote minor-btn" id="backRemote">${icon('tablet')}Tabletop remote</button>`;
  $('backRemote').addEventListener('click', () => openDialog('tablet'));
  if (page === 'climate') {
    for (const [id, step] of [['tempDown', -1], ['tempUp', 1]])$(id).addEventListener('click', () => {
      state.temperature = Math.max(60, Math.min(85, state.temperature+step));
      update();
    });
  }
  if (page === 'security')$('securityPower').addEventListener('click', () => {
    state.armed = !state.armed;
    update();
  });
  for (const b of body.querySelectorAll('[data-preset]'))b.addEventListener('click', () => applyScene(b.dataset.preset));
  for (const b of body.querySelectorAll('[data-pick]'))b.addEventListener('click', () => toggle(b.dataset.pick));
  const range = $('systemSlider');
  range?.addEventListener('input', () => apply(range.dataset.level, +range.value, false));
  updateSystem();
}
function updateSystem() {
  const b = $('dialogBody');
  if ($('tempReadout')) {
    $('tempReadout').textContent = `${state.temperature}°F`;
    $('tempDown').disabled = state.temperature<=60;
    $('tempUp').disabled = state.temperature>=85;
  }
  if ($('securityPower')) {
    $('securityPower').setAttribute('aria-pressed', state.armed);
    $('securityStatus').textContent = state.armed?'Armed · Tap to disarm':'Disarmed · Tap to arm';
  }
  for (const el of b.querySelectorAll('[data-preset]'))el.setAttribute('aria-pressed', el.dataset.preset === state.scene);
  for (const el of b.querySelectorAll('[data-pick]')) {
    const d = byId[el.dataset.pick];
    el.setAttribute('aria-pressed', state.levels[d.id]>0);
    el.querySelector('.device-state').textContent = describe(d, state.levels[d.id], state);
  }
  if ($('systemSlider')) {
    const n = state.levels[$('systemSlider').dataset.level];
    $('systemSlider').value = n;
    $('systemLevel').value = n+'%';
  }
}
function runCommand(text) {
  const commands = text.split(/\s+and\s+(?=(?:turn|switch|set|dim|open|close|raise|lower|play|stop|mute|start|enable|activate)\b)/i);
  const messages = [];
  for (const phrase of commands) {
    const result = interpret(phrase, state);
    if (!result) {
      messages.push(`Unrecognized command “${phrase.trim()}”.`);
      continue;
    }
    if (result.message) {
      messages.push(result.message);
    } else if (result.temperature !== undefined) {
      state.temperature = result.temperature;
      update();
      messages.push(`Thermostat set to ${state.temperature}°F.`);
    } else if (result.armed !== undefined) {
      state.armed = result.armed;
      update();
      messages.push(`Room security ${state.armed?'armed':'disarmed'}.`);
    } else if (result.scene) {
      applyScene(result.scene, false);
      messages.push(`${scenes.find(s => s.id === result.scene).name} scene applied.`);
    } else if (result.hue) {
      setHue(state, result.hue);
      if (result.level !== null && result.level !== undefined)setLevel(state, 'cove', result.level);
      update();
      messages.push(`Cove lighting set to ${result.hue.toLowerCase()}.`);
    } else {
      const entries = Object.entries(result.values);
      for (const [id, n] of entries) {
        setLevel(state, id, n);
        if (id === 'audio')audio.set(n, true);
      }
      update();
      if (entries.length === 1) {
        const [id, n] = entries[0];
        messages.push(`${byId[id].name} ${hintFor(byId[id], n)}.`);
      } else messages.push(`${entries.length} devices updated.`);
    }
  }
  return messages.join(' ');
}
window.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    cameraMenu(false);
    if (expandedWindow && !$('dialog').open && !voice.modalOpen && !e.defaultPrevented) {
      expandedWindow = false;
      $('viewer').classList.remove('expanded-mode');
      fullUI();
    }
  }
  if (e.key.toLowerCase() === 'v' && !e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey && !$('dialog').open && !voice.modalOpen && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
    e.preventDefault();
    voice.open();
  }
});
// Restore speaker volume after a browser gesture when last session left music on.
if (state.levels.audio>0) {
  const resume = () => {
    if (state.levels.audio>0)audio.set(state.levels.audio, true);
  };
  window.addEventListener('pointerdown', resume, {once:true});
  window.addEventListener('keydown', resume, {once:true});
}
room.init().catch (err => {
  console.error('Room startup:', err);
  $('renderLabel').textContent = '3D unavailable';
  notify('The 3D room could not load. Refresh to retry.');
});
