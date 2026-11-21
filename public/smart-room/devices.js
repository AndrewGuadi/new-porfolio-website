export const devices = [
{id:'pendant', name:'Ring pendant', icon:'pendant', group:'Lights', kind:'dimmer'},
{id:'cove', name:'Cove lighting', icon:'cove', group:'Lights', kind:'color'},
{id:'lamp', name:'Floor lamp', icon:'lamp', group:'Lights', kind:'dimmer'},
{id:'shelves', name:'Shelf lighting', icon:'shelf', group:'Lights', kind:'dimmer'},
{id:'spots', name:'Downlights', icon:'spot', group:'Lights', kind:'dimmer'},
{id:'tv', name:'Smart TV', icon:'tv', group:'Media', kind:'power'},
{id:'fire', name:'Fireplace', icon:'fire', group:'Comfort', kind:'power'},
{id:'audio', name:'Ceiling speakers', icon:'audio', group:'Media', kind:'volume'},
{id:'shades', name:'Window shade', icon:'shades', group:'Comfort', kind:'shade'},
];
export const colors = {Blue:[.29, .43, .98], Violet:[.68, .32, 1], Amber:[1, .56, .17], Mint:[.25, 1, .74], Rose:[1, .32, .48]};
export const scenes = [
{id:'evening', name:'Evening', detail:'Warm and welcoming', icon:'sunset', color:'#eab489', values:[100, 100, 100, 100, 100, 100, 100, 0, 100], hue:'Blue'},
{id:'movie', name:'Movie night', detail:'Low light, screen on', icon:'film', color:'#b5a5f7', values:[0, 40, 0, 12, 0, 100, 35, 0, 0], hue:'Violet'},
{id:'reading', name:'Reading', detail:'Bright task lighting', icon:'book', color:'#e2cb8b', values:[72, 22, 100, 55, 80, 0, 100, 0, 80], hue:'Amber'},
{id:'night', name:'Good night', detail:'Lights and media off', icon:'moon', color:'#a0b6e8', values:[0, 0, 0, 0, 0, 0, 0, 0, 0], hue:'Blue'},
];
const storageKey = 'my-smarter-homes.living-room.v1';
export const clampPct = n => Math.min(100, Math.max(0, Math.round(n)));
export function sceneState(scene) {
  const levels = {}, memory = {};
  devices.forEach((d, i) => {
    levels[d.id] = scene.values[i];
    memory[d.id] = scene.values[i] || (d.id === 'audio'?36:100)
  });
  return {levels, memory, hue:scene.hue, scene:scene.id, temperature:72, armed:false};
}
export function loadRoom() {
  const defaults = sceneState(scenes[0]);
  try {
    const data = JSON.parse(localStorage.getItem(storageKey));
    if (!data || !data.levels)return defaults;
    for (const d of devices) {
      const n = data.levels[d.id], m = data.memory?.[d.id];
      if (Number.isFinite(n))defaults.levels[d.id] = clampPct(n);
      if (Number.isFinite(m) && m>0)defaults.memory[d.id] = clampPct(m);
    }
    if (Object.hasOwn(colors, data.hue))defaults.hue = data.hue;
    if (Number.isInteger(data.temperature) && data.temperature>=60 && data.temperature<=85)defaults.temperature = data.temperature;
    defaults.armed = data.armed === true;
    defaults.scene = matchingScene(defaults);
    return defaults;
  } catch{
    return defaults;
  }
}
export function matchingScene(state) {
  return scenes.find(s => s.hue === state.hue && devices.every((d, i) => state.levels[d.id] === s.values[i]))?.id || '';
}
export function persist(state) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch{}
}
export function setLevel(state, id, value) {
  const n = clampPct(value);
  state.levels[id] = n;
  if (n>0)state.memory[id] = n;
  state.scene = matchingScene(state);
}
export function setHue(state, name) {
  state.hue = name;
  if (!state.levels.cove)setLevel(state, 'cove', state.memory.cove || 100);
  state.scene = matchingScene(state);
}
export function params(state) {
  const l = state.levels;
  return {lights:[l.pendant, l.lamp, l.spots, l.cove].map(x => x/100), other:[l.shelves, l.fire, l.tv, l.audio].map(x => x/100), hue:colors[state.hue], hueMix:state.hue === 'Blue'?0:1, closed:1-l.shades/100};
}
export function describe(d, n, state) {
  if (d.kind === 'shade')return n === 0?'Closed':n === 100?'Open':`${n}% open`;
  if (!n)return 'Off';
  if (d.kind === 'power')return 'On';
  if (d.kind === 'volume')return `Playing · ${n}%`;
  if (d.kind === 'color')return `${state.hue} · ${n}%`;
  return `On · ${n}%`;
}

const names = {pendant:/\b(?:pendants?|rings?|chandeliers?|overhead)\b/, cove:/\b(?:cove|accent|led|strip|perimeter|rgb)\b/, lamp:/\b(?:lamps?|standing light|reading light)\b/, shelves:/\b(?:shelves|shelf|shelving|bookcase|built ins?)\b/, spots:/\b(?:downlights?|down lights?|spots?|spotlights?|recessed)\b/, tv:/\b(?:tv|t v|television|screen|telly)\b/, fire:/\b(?:fireplace|fire place|fire|hearth|flames?)\b/, audio:/\b(?:speakers?|audio|music|sound|volume)\b/, shades:/\b(?:shades?|blinds?|curtains?)\b/};
const numberWords = {zero:0, ten:10, twenty:20, thirty:30, forty:40, fifty:50, sixty:60, seventy:70, eighty:80, ninety:90, half:50, halfway:50, quarter:25, full:100};
function amount(q) {
  if (/\b(?:one hundred|a hundred)\b/.test(q))return 100;
  const number = q.match(/\b(\d{1,3})\b/);
  if (number)return clampPct(+number[1]);
  const single = {one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9};
  for (const [word, n] of Object.entries(numberWords)) {
    const m = q.match(new RegExp(`\\b${word}(?:[ -](one|two|three|four|five|six|seven|eight|nine))?\\b`));
    if (m)return clampPct(n+(single[m[1]] || 0));
  }
  return null;
}
export function interpret(command, state) {
  const q = String(command).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9% -]/g, ' ').replace(/\s+/g, ' ').trim();
  if (/\b(thermostat|temperature|climate|warmer|cooler)\b/.test(q)) {
    const words = {sixty:60, seventy:70, eighty:80};
    let value = amount(q);
    if (value === null) {
      for (const [word, n] of Object.entries(words))if (q.includes(word))value = n;
    }
    if (value === null && /\b(warmer|raise|increase)\b/.test(q))value = state.temperature+2;
    if (value === null && /\b(cooler|lower|decrease)\b/.test(q))value = state.temperature-2;
    if (value !== null)return value>=60 && value<=85?{temperature:value}:{message:'Choose a thermostat setpoint from 60 to 85°F.'};
    return null;
  }
  if (/\b(security|alarm|arm the room|disarm the room)\b/.test(q)) {
    if (/\b(disarm|off|disable)\b/.test(q))return {armed:false};
    if (/\b(arm|on|enable)\b/.test(q))return {armed:true};
    return null;
  }
  const preset = /\b(movie night|movie mode|cinema|movie scene|movie time)\b/.test(q)?'movie':/\b(good ?night|bedtime|night mode|night scene)\b/.test(q)?'night':/\b(reading mode|reading scene|reading time|time to read)\b/.test(q) || q === 'reading'?'reading':/\b(evening|welcome home)\b/.test(q)?'evening':null;
  if (preset && !/\b(turn off|disable)\b/.test(q))return {scene:preset};
  let ids = Object.keys(names).filter(k => names[k].test(q));
  const lightsOnly = /\b(lights?|lighting)\b/.test(q), all = /\b(everything|all devices|the whole room)\b/.test(q);
  if (!ids.length && lightsOnly)ids = devices.filter(d => d.group === 'Lights').map(d => d.id);
  if (all)ids = devices.filter(d => d.id !== 'shades').map(d => d.id);
  const hueNames = {blue:'Blue', violet:'Violet', purple:'Violet', lavender:'Violet', amber:'Amber', orange:'Amber', gold:'Amber', warm:'Amber', mint:'Mint', green:'Mint', teal:'Mint', rose:'Rose', pink:'Rose', red:'Rose'};
  const match = Object.keys(hueNames).find(c => new RegExp(`\\b${c}\\b`).test(q));
  if (match && (!ids.length || ids.includes('cove')) && !/\b(off|disable)\b/.test(q))return {hue:hueNames[match], level:amount(q)};
  if (!ids.length)return null;
  const number = amount(q);
  const off = /\b(off|stop|pause|mute|disable|extinguish|silence|shut down)\b/.test(q), on = /\b(on|play|start|enable|unmute|ignite|light up)\b/.test(q);
  if (ids.length === 1 && ids[0] === 'shades') {
    const close = /\b(close|shut|lower|down|closed)\b/.test(q), open = /\b(open|raise|up|opened)\b/.test(q);
    if (number !== null || close || open)return {values:{shades:number !== null?(close?100-number:number):(close?0:100)}};
    return null;
  }
  const dim = /\b(dim|lower|quieter|softer|decrease|darken)\b/.test(q), bright = /\b(brighten|raise|louder|increase)\b/.test(q);
  if (!on && !off && number === null && !dim && !bright && !/\btoggle\b/.test(q))return null;
  const values = {};
  for (const id of ids) {
    const old = state.levels[id], kind = devices.find(d => d.id === id).kind;
    let next = off?0:number !== null?number:dim?Math.max(0, old-25):bright?Math.min(100, old+25):on?(state.memory[id] || 100):(old?0:state.memory[id] || 100);
    if (kind === 'power')next = next>0?100:0;
    values[id] = next;
  }
  return {values};
}
