import {MeshBuilder, DEVICES, at, unit, W, H, CX, CY, F} from './mesh.js';
import {addArchitecture, roomCalibration} from './architecture.js';
import {addFixtures} from './fixtures.js';
import {addFurniture} from './furniture.js';
import {basis, lens, project, GLRoom} from './graphics.js';
import {SoftwareRoom} from './software.js';
import {dashboardPlate, tvTile} from './dashboard.js';
const limit = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a+(b-a)*t;
const camera = (pos, yaw = 0, pitch = 0, zoom = 1) => ({pos:[...pos], yaw, pitch, zoom});
export const views = [
{id:'reference', name:'Reference view', icon:'camera', cam:camera([0, 0, 0])},
{id:'fireside', name:'Fireside', icon:'fire', cam:camera([.31, .015, .69], .165, -.018, 1.36)},
{id:'window', name:'Window seat', icon:'shades', cam:camera([-.24, .02, .43], -.305, -.006, 1.30)},
{id:'reverse', name:'Entry wall', icon:'door', cam:camera([.12, .015, .22], -2.52, .015, 1)},
];
// A marker sits on the same physical plane as its device, and follows it through camera changes.
const {mediaDepth, glassDepth} = roomCalibration;
export const anchors = {pendant:at(721, 155, 4.64), cove:at(1090, 66, 6.14), lamp:at(79, 454, 6.20), shelves:at(1511, 455, mediaDepth(1511, 10700)), spots:at(1481, 29, 5.5), tv:at(1197, 304, mediaDepth(1197, 9988)), fire:at(1142, 585, mediaDepth(1142, 10336)), audio:at(438, 38, 6.13), shades:at(348, 377, glassDepth(348)), tablet:at(883, 696, 4.03)};
export const defaultPins = ['pendant', 'lamp', 'tv', 'fire', 'tablet'];
const keys = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(Error(`Missing ${file}`));
    img.src = `./assets/${file}`;
  });
}

export class Room{
  constructor(viewer, callbacks, initial) {
    this.viewer = viewer;
    this.canvas = viewer.querySelector('canvas');
    this.cb = callbacks;
    this.cam = camera([0, 0, 0]);
    this.keys = new Set();
    this.pointers = new Map();
    this.dirty = true;
    this.params = structuredClone(initial);
    this.targetParams = structuredClone(initial);
    this.useMotion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.activeView = 'reference';
    this.bindInput();
  }
  async init() {
    const [photo, atlas, sources, spill, media, repairs, foreground] = await Promise.all(['living-room.webp', 'materials.webp', 'light-sources.png', 'light-spill.png', 'media-light.png', 'surface-light.webp', 'foreground-depth.png'].map(loadImage));
    this.sourcePhoto = photo;
    const assets = {photo, atlas, sources, spill, media, repairs, foreground}, builder = new MeshBuilder();
    addArchitecture(builder);
    addFixtures(builder);
    builder.group = 'furniture';
    addFurniture(builder);
    this.mesh = builder.finish();
    const gl = this.canvas.getContext('webgl', {alpha:false, antialias:true, powerPreference:'high-performance', preserveDrawingBuffer:false});
    if (gl) {
      try {
        this.engine = new GLRoom(gl, this.mesh, assets);
      } catch (e) {
        console.warn('Switching to software 3D:', e.message);
      }
    }
    if (!this.engine) {
      if (gl) {
        const copy = this.canvas.cloneNode(false);
        this.canvas.replaceWith(copy);
        this.canvas = copy;
      }
      this.engine = new SoftwareRoom(this.canvas, this.mesh, assets);
    }
    this.canvas.addEventListener('webglcontextlost', e => {
      e.preventDefault();
      const c = this.canvas.cloneNode(false);
      this.canvas.replaceWith(c);
      this.canvas = c;
      this.engine = new SoftwareRoom(c, this.mesh, assets);
      if (this.panorama)this.engine.setPanorama(...this.panorama);
      this.updateReadouts(true);
      this.dirty = true;
      this.wake();
    });
    const loadPano = async() => {
      try {
        const pair = await Promise.all(['room-panorama.webp', 'panorama-depth.png'].map(loadImage));
        this.panorama = pair;
        this.engine.setPanorama(...pair);
        this.dirty = true;
        this.wake();
      } catch (e) {
        console.warn('Secondary room lighting is unavailable:', e.message);
      }
    };
    new ResizeObserver(() => {
      this.dirty = true;
      this.wake();
    }).observe(this.viewer);
    this.updateReadouts(true);
    this.render(0, false);
    this.cb.ready(this.engine.renderer);
    this.wake();
    loadPano();
  }
  dashboard(temperature, armed) {
    if (this.temperature === temperature && this.armed === armed)return;
    this.temperature = temperature;
    this.armed = armed;
    this.updateReadouts();
  }
  updateReadouts(force = false) {
    if (!this.engine || !this.sourcePhoto)return;
    const neutral = this.temperature === 72 && !this.armed;
    if (!force || !neutral) {
      this.engine.setPhoto(dashboardPlate(this.sourcePhoto, this.temperature ?? 72, !!this.armed));
      this.dirty = true;
      this.wake();
    }
  }
  setParams(p) {
    const previousClosure = this.params.closed;
    if (this.useMotion && this.engine?.renderer === 'software' && p.closed !== this.targetParams.closed) {
      this.shadeMotion = { start: performance.now(), from: previousClosure, to: p.closed };
    }
    this.targetParams = structuredClone(p);
    if (!this.useMotion || this.engine?.renderer === 'software') {
      this.params = structuredClone(p);
      if (this.shadeMotion) this.params.closed = previousClosure;
    }
    this.dirty = true;
    this.wake();
  }
  setView(id) {
    const v = views.find(v => v.id === id);
    if (!v)return;
    this.activeView = id;
    const from = camera(this.cam.pos, this.cam.yaw, this.cam.pitch, this.cam.zoom), to = camera(v.cam.pos, v.cam.yaw, v.cam.pitch, v.cam.zoom);
    let diff = to.yaw-from.yaw;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    to.yaw = from.yaw+diff;
    this.flight = this.useMotion?{from, to, start:performance.now(), duration:this.engine?.renderer === 'software'?460:730}:null;
    if (!this.flight)this.cam = to;
    this.cb.view(id);
    this.dirty = true;
    this.wake();
  }
  manual() {
    this.flight = null;
    if (this.activeView !== 'custom') {
      this.activeView = 'custom';
      this.cb.view('custom');
    }
    this.dirty = true;
    this.wake();
  }
  zoom(factor) {
    this.manual();
    this.cam.zoom = limit(this.cam.zoom*factor, .75, 2.65);
  }
  advance(dx, dz) {
    const c = this.cam, co = Math.cos(c.yaw), si = Math.sin(c.yaw), x = c.pos[0]+dx*co+dz*si, z = c.pos[2]-dx*si+dz*co;
    const {S, W} = roomCalibration;
    const can = (xx, zz) => {
      const a = xx*S[0]+zz*S[2], b = xx*W[0]+zz*W[2];
      return a>-2.53 && a<6.03 && b>-2.25 && b<8.72;
    };
    const isBlocked = this.mesh?.walkGrid || (() => false), inside = isBlocked(c.pos[0], c.pos[2]);
    const clear = (u, v) => can(u, v) && (inside || !isBlocked(u, v));
    if (clear(x, z)) {
      c.pos[0] = x;
      c.pos[2] = z;
    } else if (clear(x, c.pos[2]))c.pos[0] = x;else if (clear(c.pos[0], z))c.pos[2] = z;
  }
  hold(key, down) {
    if (down) {
      this.manual();
      this.keys.add(key);
    } else {
      this.keys.delete(key);
      this.dirty = true;
    }
    this.wake();
  }
  bindInput() {
    const stage = this.viewer, target = e => e.target.tagName === 'CANVAS' || e.target.classList.contains('stage-poster');
    stage.addEventListener('pointerdown', e => {
      if (!target(e) || e.button>0)return;
      e.preventDefault();
      stage.focus({preventScroll:true});
      stage.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, {x:e.clientX, y:e.clientY, sx:e.clientX, sy:e.clientY});
      this.wasGesture = this.pointers.size>1;
      this.pinch = null;
      stage.classList.add('dragging');
    });
    stage.addEventListener('pointermove', e => {
      const p = this.pointers.get(e.pointerId);
      if (!p)return;
      const dx = e.clientX-p.x, dy = e.clientY-p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (this.pointers.size>1) {
        const [a, b] = [...this.pointers.values()];
        const gap = Math.hypot(a.x-b.x, a.y-b.y);
        if (this.pinch && gap>0)this.zoom(gap/this.pinch);
        this.pinch = gap;
        this.wasGesture = true;
        return;
      }
      if (Math.abs(e.clientX-p.sx)+Math.abs(e.clientY-p.sy)>4)this.wasGesture = true;
      if (this.wasGesture) {
        this.manual();
        const k = .00285/Math.sqrt(this.cam.zoom);
        this.cam.yaw -= dx*k;
        this.cam.pitch = limit(this.cam.pitch+dy*k, -1.19, 1.19);
      }
    });
    const release = (e, cancel = false) => {
      const p = this.pointers.get(e.pointerId);
      if (!p)return;
      this.pointers.delete(e.pointerId);
      if (!this.pointers.size) {
        stage.classList.remove('dragging');
        if (!this.wasGesture && !cancel && this.mesh) {
          const r = stage.getBoundingClientRect(), found = this.pick(e.clientX-r.left, e.clientY-r.top, r.width, r.height);
          if (found)this.cb.pick(found);
        }
        this.pinch = null;
      }
      this.dirty = true;
      this.wake();
    };
    stage.addEventListener('pointerup', e => release(e));
    stage.addEventListener('pointercancel', e => release(e, true));
    stage.addEventListener('lostpointercapture', e => release(e, true));
    stage.addEventListener('wheel', e => {
      if (e.ctrlKey || target(e)) {
        e.preventDefault();
        this.zoom(Math.exp(-limit(e.deltaY, -140, 140)*.0018));
      }
    }, {passive:false});
    stage.addEventListener('keydown', e => {
      if (e.target !== stage)return;
      const key = e.key.toLowerCase();
      if (keys.includes(key)) {
        e.preventDefault();
        this.hold(key, true);
      } else if (key === 'home') {
        e.preventDefault();
        this.setView('reference');
      } else if (key === '+' || key === '=') {
        e.preventDefault();
        this.zoom(1.12);
      } else if (key === '-') {
        e.preventDefault();
        this.zoom(1/1.12);
      }
    });
    window.addEventListener('keyup', e => {
      const k = e.key.toLowerCase();
      if (this.keys.has(k))this.hold(k, false);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.pointers.clear();
      stage.classList.remove('dragging');
    });
    document.addEventListener('visibilitychange', () => {
      this.keys.clear();
      if (!document.hidden) {
        this.dirty = true;
        this.wake();
      }
    });
  }
  pick(x, y, w, h) {
    const a = lens(w, h, this.cam.zoom), b = basis(this.cam), ox = (2*x/w-1)/a[0], oy = (1-2*y/h-a[2])/a[1];
    const d = unit(b.forward.map((n, i) => n+ox*b.right[i]+oy*b.up[i])), o = this.cam.pos, v = this.mesh.vertices;
    let best = 100, device = 0;
    for (let k = 0;k<v.length;k += 42) {
      const id = Math.round(v[k+8]), shade = id === 9;
      if (shade && this.params.closed<.006)continue;
      const ay = shade?lerp(v[k+13], v[k+1], this.params.closed):v[k+1], by = shade?lerp(v[k+27], v[k+15], this.params.closed):v[k+15], cy = shade?lerp(v[k+41], v[k+29], this.params.closed):v[k+29];
      const ax = v[k], az = v[k+2], ex = v[k+14]-ax, ey = by-ay, ez = v[k+16]-az, fx = v[k+28]-ax, fy = cy-ay, fz = v[k+30]-az;
      const px = d[1]*fz-d[2]*fy, py = d[2]*fx-d[0]*fz, pz = d[0]*fy-d[1]*fx, det = ex*px+ey*py+ez*pz;
      if (Math.abs(det)<1e-8)continue;
      const inv = 1/det, tx = o[0]-ax, ty = o[1]-ay, tz = o[2]-az, bu = (tx*px+ty*py+tz*pz)*inv;
      if (bu<0 || bu>1)continue;
      const qx = ty*ez-tz*ey, qy = tz*ex-tx*ez, qz = tx*ey-ty*ex, bv = (d[0]*qx+d[1]*qy+d[2]*qz)*inv;
      if (bv<0 || bv+bu>1)continue;
      const t = (fx*qx+fy*qy+fz*qz)*inv;
      if (t>.025 && t<best) {
        best = t;
        device = id;
      }
    }
    if (best>=100)return null;
    // Trim and an unlit diffuser can share a housing. Resolve a click on that physical housing.
    const hit = d.map((a, i) => o[i]+a*best), u = CX+F*hit[0]/hit[2], vv = CY-F*hit[1]/hit[2];
    if (device === 7 && this.params.other[2]>.5) {
      const tile = tvTile(u, vv);
      if (tile)return 'dashboard-'+tile;
    }
    if (device>0)return DEVICES[device];
    for (const [id, left, top, right, bottom, distance] of [['tablet', 807, 643, 960, 760, 1.0], ['pendant', 479, 62, 828, 215, 1.0], ['lamp', 0, 395, 158, 573, 1.2], ['fire', 984, 516, 1286, 654, .9], ['tv', 929, 157, 1338, 466, .65], ['audio', 393, 17, 482, 55, .9], ['shades', 30, 226, 540, 555, 8]])if (u>left && u<right && vv>top && vv<bottom && Math.abs(hit[2]-anchors[id][2])<distance)return id;
    return null;
  }
  wake() {
    if (!this.alive && this.engine && !document.hidden) {
      this.alive = true;
      requestAnimationFrame(t => this.frame(t));
    }
  }
  frame(t) {
    this.alive = false;
    if (document.hidden)return;
    const dt = Math.min(.07, (t-(this.last || t))/1000);
    this.last = t;
    let motion = this.keys.size>0 || !!this.flight || this.pointers.size>0;
    if (this.keys.size) {
      let x = (this.keys.has('d')?1:0)-(this.keys.has('a')?1:0), z = (this.keys.has('w') || this.keys.has('arrowup')?1:0)-(this.keys.has('s') || this.keys.has('arrowdown')?1:0);
      const n = Math.hypot(x, z) || 1;
      this.advance(x/n*dt*1.45, z/n*dt*1.45);
      if (this.keys.has('arrowleft'))this.cam.yaw -= dt*1.25;
      if (this.keys.has('arrowright'))this.cam.yaw += dt*1.25;
      this.dirty = true;
    }
    if (this.flight) {
      const f = this.flight, k = limit((t-f.start)/f.duration, 0, 1), s = k*k*(3-2*k);
      for (let i = 0;i<3;i++)this.cam.pos[i] = lerp(f.from.pos[i], f.to.pos[i], s);
      for (const key of ['yaw', 'pitch', 'zoom'])this.cam[key] = lerp(f.from[key], f.to[key], s);
      this.dirty = true;
      if (k>=1) {
        this.flight = null;
        motion = this.keys.size>0 || this.pointers.size>0;
      }
    }
    let changing = false;
    const rate = 1-Math.exp(-Math.max(dt, 1/100)*9);
    for (const k of ['lights', 'other', 'hue'])for (let i = 0;i<this.params[k].length;i++) {
      const target = this.targetParams[k][i], v = this.params[k][i];
      if (Math.abs(target-v)>.002) {
        this.params[k][i] = lerp(v, target, rate);
        changing = true;
      } else this.params[k][i] = target;
    }
    for (const k of ['closed', 'hueMix']) {
      if (k === 'closed' && this.shadeMotion) continue;
      const v = this.params[k], to = this.targetParams[k];
      if (Math.abs(to-v)>.002) {
        this.params[k] = lerp(v, to, k === 'closed'?Math.min(1, rate*.60):rate);
        changing = true;
      } else this.params[k] = to;
    }
    if (this.shadeMotion) {
      const shutter = this.shadeMotion;
      const phase = limit((t - shutter.start) / 850, 0, 1);
      this.params.closed = lerp(shutter.from, shutter.to, phase * phase * (3 - 2 * phase));
      if (phase < 1) changing = true;
      else { this.shadeMotion = null; this.dirty = true; }
    }
    if (this.wasChanging && !changing) this.dirty = true;
    this.wasChanging = changing;
    const idleFlame = this.params.other[1]>.02 && this.useMotion;
    if (this.dirty || changing) {
      this.render(this.useMotion ? t/1000 : 0, motion || !!this.shadeMotion);
      this.dirty = false;
      this.lastDraw = t;
    } else if (idleFlame && t-(this.lastDraw || 0)>85) {
      if (this.engine.flicker)this.engine.flicker(this.cam, this.params, t/1000);else this.render(t/1000, false);
      this.lastDraw = t;
    }
    if (motion || changing || this.dirty)this.wake();else if (idleFlame && !this.idleTimer)this.idleTimer = setTimeout(() => {
      this.idleTimer = 0;
      this.wake();
    }, 92);
  }
  render(t, moving) {
    this.engine.render(this.cam, this.params, t, moving);
    const r = this.viewer.getBoundingClientRect();
    this.cb.frame(p => project(p, this.cam, r.width, r.height), r);
  }
}
