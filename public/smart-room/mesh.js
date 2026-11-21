import { MATERIALS } from './materials.js';

export const W = 1672, H = 941, CX = 836, CY = 507, F = 1100;
export const DEVICES = ['', 'pendant', 'lamp', 'spots', 'cove', 'shelves', 'fire', 'tv', 'audio', 'shades', 'tablet'];
export const at = (u, v, depth) => [(u - CX) * depth / F, (CY - v) * depth / F, depth];
export const floorDepth = v => (1.48 * F) / (v - CY);
export const unit = p => {
  const d = Math.hypot(...p) || 1;
  return p.map(n => n / d);
};
const sub = (a, b) => a.map((n, i) => n-b[i]);
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const stride = 14;
// Captured swatch averages allow an explicit albedo to preserve the finish’s texture.
export const tileMeans = [[0.506, 0.4444, 0.3907], [0.4787, 0.3067, 0.1979], [0.5845, 0.3881, 0.234], [0.4587, 0.2744, 0.167], [0.6656, 0.5488, 0.4333], [0.7205, 0.6056, 0.4908], [0.6649, 0.5638, 0.4765], [0.3719, 0.3015, 0.2434], [0.8583, 0.7907, 0.6924], [0.7131, 0.6682, 0.6159], [0.6089, 0.5941, 0.579], [0.2424, 0.3297, 0.167], [0.3164, 0.2206, 0.1521], [0.6931, 0.6731, 0.6346], [0.8534, 0.84, 0.7834], [0.3487, 0.3936, 0.4093]];

// Each face carries its physical material as well as whether the source camera saw it.
// Clip planar concave outlines (curtains, upholstery, silhouettes) before uploading triangles.
function triangulate(points) {
  const n = points.length;
  if (n === 3) return [0, 1, 2];
  if (n === 4) return [0, 1, 2, 0, 2, 3];
  let normal = [0, 0, 0];
  for (let i = 0;i<n;i++) {
    const a = points[i], b = points[(i+1)%n];
    normal[0] += (a[1]-b[1])*(a[2]+b[2]);
    normal[1] += (a[2]-b[2])*(a[0]+b[0]);
    normal[2] += (a[0]-b[0])*(a[1]+b[1]);
  }
  const major = normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs)));
  const p = points.map(v => [v[(major+1)%3], v[(major+2)%3]]);
  const area = (a, b, c) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const orient = Math.sign(p.reduce((s, a, i) => {
    const b = p[(i+1)%n];
    return s+a[0]*b[1]-a[1]*b[0]
  }, 0)) || 1;
  const ring = Array.from({length:n}, (_, i) => i), result = [];
  let attempts = 0;
  while (ring.length>2 && attempts<ring.length) {
    const i = attempts, a = ring[(i+ring.length-1)%ring.length], b = ring[i], c = ring[(i+1)%ring.length];
    if (orient*area(p[a], p[b], p[c])>1e-9 && !ring.some(k => k !== a && k !== b && k !== c && orient*area(p[a], p[b], p[k])>1e-9 && orient*area(p[b], p[c], p[k])>1e-9 && orient*area(p[c], p[a], p[k])>1e-9)) {
      result.push(a, b, c);
      ring.splice(i, 1);
      attempts = 0;
    } else attempts++;
  }
  if (ring.length>2) for (let i = 1;i<ring.length-1;i++) result.push(ring[0], ring[i], ring[i+1]);
  return result;
}

export class MeshBuilder {
  constructor() {
    this.data = [];
    this.group = 'room';
    this.blockers = [];
    this.at = at;
    this.floorDepth = floorDepth;
  }
  face(points, material = 'wall', opts = {}) {
    if (points.length<3) return;
    const mat = MATERIALS[material] || MATERIALS.wall, tint = opts.color?opts.color.map((c, i) => c/Math.max(.035, tileMeans[mat.tile][i])):mat.color || [1, 1, 1];
    const dev = DEVICES.indexOf(opts.device || '');
    const packed = [mat.tile, opts.uvScale ?? mat.scale, Math.max(0, dev), opts.photo === false?0:1, ...tint, opts.shadeTop ?? 0];
    const idx = triangulate(points);
    for (let i = 0;i<idx.length;i += 3) {
      const a = points[idx[i]], b = points[idx[i+1]], c = points[idx[i+2]], normal = unit(cross(sub(b, a), sub(c, a)));
      if (![...a, ...b, ...c].every(Number.isFinite) || Math.hypot(...normal)<.1)continue;
      for (let j = 0;j<3;j++)this.data.push(...points[idx[i+j]], ...(opts.normals?.[idx[i+j]] || normal), ...packed);
      if (this.group === 'furniture' && Math.min(a[1], b[1], c[1])<-.22 && Math.max(a[1], b[1], c[1])> -1.06)this.blockers.push(a, b, c);
    }
  }
  patch(pixels, depth, mat, opts = {}) {
    this.face(pixels.map(([u, v]) => at(u, v, typeof depth === 'function'?depth(u, v):depth)), mat, opts);
  }
  box(center, size, mat = 'wall', opts = {}) {
    const co = Math.cos(opts.yaw || 0), si = Math.sin(opts.yaw || 0);
    const points = Array.from({length:8}, (_, i) => {
      const x = ((i&1)?1:-1)*size[0]/2, y = ((i&2)?1:-1)*size[1]/2, z = ((i&4)?1:-1)*size[2]/2;
      return [center[0]+co*x+si*z, center[1]+y, center[2]-si*x+co*z]
    });
    for (const face of [[0, 2, 3, 1], [5, 7, 6, 4], [1, 3, 7, 5], [4, 6, 2, 0], [2, 6, 7, 3], [4, 0, 1, 5]])this.face(face.map(i => points[i]), mat, opts);
  }
  ellipsoid(center, radii, mat = 'ceramic', opts = {}) {
    const sides = opts.segments || 16, rings = opts.rings || 8, co = Math.cos(opts.yaw || 0), si = Math.sin(opts.yaw || 0);
    const rot = ([x, y, z]) => [co*x+si*z, y, -si*x+co*z];
    const get = (i, j) => {
      const t = i*2*Math.PI/sides, v = (j/rings-.5)*Math.PI, d = [Math.cos(v)*Math.cos(t), Math.sin(v), Math.cos(v)*Math.sin(t)];
      return [rot(d.map((x, k) => x*radii[k])).map((x, k) => x+center[k]), unit(rot(d.map((x, k) => x/(radii[k] || 1))))]
    };
    for (let j = 0;j<rings;j++)for (let i = 0;i<sides;i++) {
      const q = [get(i, j), get(i, j+1), get(i+1, j+1), get(i+1, j)];
      this.face(q.map(v => v[0]), mat, {...opts, normals:q.map(v => v[1])});
    }
  }
  rod(a, b, r, mat = 'metal', opts = {}) {
    const dir = unit(sub(b, a)), seed = Math.abs(dir[1])>.9?[1, 0, 0]:[0, 1, 0], u = unit(cross(dir, seed)), v = cross(dir, u), sides = opts.segments || 10;
    const ring = i => u.map((x, k) => x*Math.cos(i*2*Math.PI/sides)+v[k]*Math.sin(i*2*Math.PI/sides));
    const rim = (p, n) => p.map((x, k) => x+r*n[k]);
    let first = [], last = [];
    for (let i = 0;i<sides;i++) {
      const n = ring(i), m = ring(i+1);
      first.push(rim(a, n));
      last.push(rim(b, n));
      this.face([rim(a, n), rim(a, m), rim(b, m), rim(b, n)], mat, {...opts, normals:[n, m, m, n]});
    }
    this.face(first.reverse(), mat, opts);
    this.face(last, mat, opts);
  }
  finish() {
    const vertices = new Float32Array(this.data);
    this.data = null;
    return {vertices, stride, walkGrid:makeWalkGrid(this.blockers)};
  }
}

function makeWalkGrid(triangles) {
  const step = .12, origin = -13, side = 220, grid = new Uint8Array(side*side);
  const cell = n => Math.floor((n-origin)/step);
  for (let i = 0;i<triangles.length;i += 3) {
    const [a, b, c] = triangles.slice(i, i+3);
    const ax = a[0], az = a[2], bx = b[0], bz = b[2], cx = c[0], cz = c[2];
    const denom = (bz-cz)*(ax-cx)+(cx-bx)*(az-cz);
    if (Math.abs(denom)<.0007)continue;
    for (let iz = Math.max(0, cell(Math.min(az, bz, cz)));iz<=Math.min(side-1, cell(Math.max(az, bz, cz)));iz++)for (let ix = Math.max(0, cell(Math.min(ax, bx, cx)));ix<=Math.min(side-1, cell(Math.max(ax, bx, cx)));ix++) {
      const x = origin+(ix+.5)*step, z = origin+(iz+.5)*step, s = ((bz-cz)*(x-cx)+(cx-bx)*(z-cz))/denom, t = ((cz-az)*(x-cx)+(ax-cx)*(z-cz))/denom;
      if (s>=0 && t>=0 && s+t<=1)grid[iz*side+ix] = 1;
    }
  }
  return (x, z) => {
    const ix = cell(x), iz = cell(z);
    return grid[iz*side+ix] === 1
  };
}
