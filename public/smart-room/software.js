import {W, H, F, CX, CY, tileMeans, at} from './mesh.js';
import {basis, lens, sourcePosition, project} from './graphics.js';
import {TILE_GRID} from './materials.js';
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const mix = (a, b, t) => a+(b-a)*t;
function pixels(image, w = image.width, h = image.height) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', {willReadFrequently:true});
  g.drawImage(image, 0, 0, w, h);
  return {data:g.getImageData(0, 0, w, h).data, w, h, canvas:c, g};
}

// A software triangle rasterizer keeps camera translation, occlusion and device controls
// available on machines where the browser disables WebGL. Only redraw on interaction.
export class SoftwareRoom{
  constructor(canvas, mesh, assets) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', {alpha:false});
    this.mesh = mesh;
    this.renderer = 'software';
    const w = 1254, h = Math.round(w*H/W);
    this.src = pixels(assets.photo, w, h);
    this.lit = pixels(assets.photo, w, h);
    this.basePhoto = assets.photo;
    this.plate = this.src.canvas;
    this.platePixels = this.src.data;
    this.masks = [assets.sources, assets.spill, assets.media].map(im => pixels(im, w, h).data);
    this.atlas = pixels(assets.atlas);
    this.repairs = pixels(assets.repairs);
    this.zw = 760;
    this.zh = Math.round(this.zw*H/W);
    this.ref = new Float32Array(this.zw*this.zh);
    this.ref.fill(Infinity);
    this.raster(sourcePosition, this.zw, this.zh, null, this.ref, null);
    // The color-registered mask catches thin photographed leaves that fall between mesh edges.
    const fg = pixels(assets.foreground);
    for (let j = 0;j<this.zh;j++)for (let i = 0;i<this.zw;i++) {
      const k = (Math.floor((j+.5)*fg.h/this.zh)*fg.w+Math.floor((i+.5)*fg.w/this.zw))*4, confidence = fg.data[k+2]/255;
      if (confidence>.12) {
        const at = j*this.zw+i, old = this.ref[at], d = (fg.data[k]*256+fg.data[k+1])*.001+.19+(1-confidence)*.53, t = clamp((confidence-.12)/.58);
        this.ref[at] = Number.isFinite(old)?mix(old, Math.min(old, d), t):d;
      }
    }

  }
  setPhoto(source) {
    this.basePhoto = source;
    this.src = pixels(source, this.src.w, this.src.h);
    this.key = null;
  }
  setPanorama(color, depth) {
    this.panorama = pixels(color);
    this.panoDepth = pixels(depth);
  }
  light(p) {
    const key = [...p.lights, ...p.other, p.hueMix, ...p.hue].map(v => Math.round(v*100)).join('/');
    if (key === this.key)return;
    this.key = key;
    const [l, g, s, c] = p.lights, [sh, fi, tv] = p.other;
    if (l+g+s+c+sh+fi+tv>6.998 && !p.hueMix) {
      this.plate = this.basePhoto;
      this.platePixels = this.src.data;
      return;
    }
    const w = this.src.w, h = this.src.h, source = this.src.data, out = this.lit.data, [ms, sp, me] = this.masks;
    const ambient = .63+.37*(.26*l+.14*g+.24*s+.07*c+.20*sh+.09*fi), inv = 1/255;
    for (let j = 0;j<h;j++)for (let i = 0;i<w;i++) {
      const k = (j*w+i)*4, x = i*W/w, y = j*H/h, exterior = x>24 && x<549 && y>225+x*.142 && y<572-x*.015;
      const a = exterior?.96+.04*ambient:ambient;
      const f = a*clamp(1-(sp[k]*(1-l)*.36+sp[k+1]*(1-g)*.44+sp[k+2]*(1-s)*.37+me[k]*(1-sh)*.57+me[k+1]*(1-fi)*.32)*inv, .26, 1)*(1-.27*clamp((sp[k+3]-128)/127)*(1-c))*(1-.13*me[k+2]*inv*(1-tv));
      const b0 = source[k], b1 = source[k+1], b2 = source[k+2], lum = (b0*.27+b1*.52+b2*.21)*inv;
      let r = b0*f, b = b2*f, gr = b1*f;
      const src0 = ms[k]*inv*(1-l), src1 = ms[k+1]*inv*(1-g), src2 = ms[k+2]*inv*(1-s), src3 = clamp((ms[k+3]-128)/127)*(1-c), sr4 = clamp((me[k+3]-128)/127)*(1-sh);
      if (src0) {
        const v = 255*(.38+.62*lum)*a;
        r = mix(r, v*.25, src0);
        gr = mix(gr, v*.2, src0);
        b = mix(b, v*.16, src0);
      }
      if (src1) {
        const v = 255*(.56+.44*lum)*a;
        r = mix(r, v*.56, src1);
        gr = mix(gr, v*.46, src1);
        b = mix(b, v*.35, src1);
      }
      if (src2) {
        const v = 255*(.5+.5*lum)*a;
        r = mix(r, v*.38, src2);
        gr = mix(gr, v*.32, src2);
        b = mix(b, v*.28, src2);
      }
      if (src3 || c<1) {
        const t = clamp(clamp((ms[k+3]-128)/127)+clamp((sp[k+3]-128)/127)*.52)*(1-c);
        r = mix(r, b0*.82*a, t);
        gr = mix(gr, b0*.68*a, t);
        b = mix(b, b0*.58*a, t);
      }
      if (sr4) {
        const v = 255*(.48+.52*lum)*a;
        r = mix(r, v*.33, sr4);
        gr = mix(gr, v*.24, sr4);
        b = mix(b, v*.18, sr4);
      }
      if (p.hueMix && c) {
        const t = clamp((ms[k+3]-128)/127)*p.hueMix*c*.9, glow = 255*clamp((sp[k+3]-128)/127)*.16*p.hueMix*c, br = .33+.56*lum;
        r = mix(r, (p.hue[0]*br+.07)*255, t)+glow*(p.hue[0]-.29);
        gr = mix(gr, (p.hue[1]*br+.07)*255, t)+glow*(p.hue[1]-.43);
        b = mix(b, (p.hue[2]*br+.07)*255, t)+glow*(p.hue[2]-.98);
      }
      if (x>934 && x<1329 && y>249-.213*(x-934) && y<458-.044*(x-934)) {
        r = mix(13, b0, tv);
        gr = mix(16, b1, tv);
        b = mix(18, b2, tv);
      }
      if (x>1002 && x<1271 && y>529+.014*(x-1002) && y<620+.055*(x-1002)) {
        const e = clamp((y-606-.055*(x-1002))/15)*.092;
        r = mix(15+e*b0, b0, fi);
        gr = mix(12+e*b1, b1, fi);
        b = mix(10+e*b2, b2, fi);
      }
      if (x>841-(y-655)*.24 && x<946-(y-665)*.23 && y>655+(x-841)*.079 && y<736+(x-824)*.115) {
        r = b0;
        gr = b1;
        b = b2;
      }
      out[k] = r;
      out[k+1] = gr;
      out[k+2] = b;
      out[k+3] = 255;
    }
    this.lit.g.putImageData(new ImageData(out, w, h), 0, 0);
    this.plate = this.lit.canvas;
    this.platePixels = out;
  }
  render(cam, p, time, moving = false) {
    this.light(p);
    const rect = this.canvas.getBoundingClientRect();
    const stationary = Math.hypot(...cam.pos)<.0001 && Math.abs(cam.yaw)+Math.abs(cam.pitch)<.0001 && p.closed<.003;
    let w, h;
    if (stationary) {
      const d = Math.min(devicePixelRatio || 1, 1.5);
      w = Math.max(2, Math.round(rect.width*d));
      h = Math.max(2, Math.round(rect.height*d));
    } else {
      w = Math.max(2, Math.min(moving?560:1000, Math.round(rect.width)));
      h = Math.max(2, Math.round(w*rect.height/rect.width));
    }
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    if (stationary && cam.zoom>=1) {
      this.viewDepth = null;
      const sw = (W*h/H)*cam.zoom, sh = h*cam.zoom;
      this.ctx.drawImage(this.plate, (w-sw)*.5, h*CY/H-sh*CY/H, sw, sh);
      return;
    }
    const image = this.ctx.createImageData(w, h), depth = new Float32Array(w*h);
    depth.fill(Infinity);
    const packed = new Uint32Array(image.data.buffer);
    packed.fill(0xff20201e);
    this.raster(cam, w, h, p, depth, packed);
    this.viewDepth = depth;
    this.ctx.putImageData(image, 0, 0);
  }
  flicker(cam, params, time) {
    if (params.other[1]<.02)return;
    const canvas = this.canvas, w = canvas.width, h = canvas.height, g = this.ctx, src = this.plate;
    const point = (u, v) => project(at(u, v, 10336/(u+270)), cam, w, h);
    const center = point(1134, 587);
    if (center.z<.05 || center.x<-.15*w || center.x>1.15*w || center.y<-.12*h || center.y>1.12*h)return;
    const columns = 12, rows = 3, points = [];
    for (let j = 0;j<=rows;j++) {
      const t = j/rows, row = [];
      for (let i = 0;i<=columns;i++) {
        const s = i/columns, u = 1004+s*264, top = 535+.014*(u-1004), bottom = 617+.059*(u-1004), v = mix(top, bottom, t), pt = point(u, v);
        const wave = Math.sin(Math.PI*t)*Math.sin(Math.PI*s), dx = .86*Math.sin(time*2.7+s*23+t*3.2)*wave, dy = 3.3*Math.sin(time*3.8+s*28.5)*wave;
        row.push([pt.x, pt.y, pt.z, (u+dx)*src.width/W, (v+dy)*src.height/H]);
      }
      points.push(row);
    }
    const tri = (a, b, c) => {
      if (Math.min(a[2], b[2], c[2])<.03)return;
      const x = (a[0]+b[0]+c[0])/3, y = (a[1]+b[1]+c[1])/3;
      if (x<0 || x>=w || y<0 || y>=h)return;
      if (this.viewDepth && (a[2]+b[2]+c[2])/3>this.viewDepth[(y|0)*w+(x|0)]+.16)return;
      const ux = b[3]-a[3], uy = b[4]-a[4], vx = c[3]-a[3], vy = c[4]-a[4], det = ux*vy-uy*vx;
      if (Math.abs(det)<.001)return;
      const ex = b[0]-a[0], ey = b[1]-a[1], fx = c[0]-a[0], fy = c[1]-a[1], m0 = (ex*vy-fx*uy)/det, m1 = (ey*vy-fy*uy)/det, m2 = (fx*ux-ex*vx)/det, m3 = (fy*ux-ey*vx)/det;
      g.save();
      g.beginPath();
      g.moveTo(a[0], a[1]);
      g.lineTo(b[0], b[1]);
      g.lineTo(c[0], c[1]);
      g.closePath();
      g.clip();
      g.transform(m0, m1, m2, m3, a[0]-m0*a[3]-m2*a[4], a[1]-m1*a[3]-m3*a[4]);
      const sx = Math.floor(Math.min(a[3], b[3], c[3]))-1, sy = Math.floor(Math.min(a[4], b[4], c[4]))-1, sw = Math.ceil(Math.max(a[3], b[3], c[3]))-sx+1, sh = Math.ceil(Math.max(a[4], b[4], c[4]))-sy+1;
      g.drawImage(src, sx, sy, sw, sh, sx, sy, sw, sh);
      g.restore();
    };
    for (let j = 0;j<rows;j++)for (let i = 0;i<columns;i++) {
      const a = points[j][i], b = points[j][i+1], c = points[j+1][i+1], d = points[j+1][i];
      tri(a, b, c);
      tri(a, c, d);
    }
  }
  raster(cam, w, h, p, zbuf, target) {
    const v = this.mesh.vertices, {right, up, forward} = basis(cam), f = lens(w, h, cam.zoom), pos = cam.pos, near = .028, onlyDepth = !target;
    const src = this.platePixels, sw = this.src.w, sh = this.src.h, atlas = this.atlas, az = atlas.w/TILE_GRID;
    const indirect = p?.lights?.reduce((s, n, i) => s+n*[.26, .1, .14, .07][i], .33)+.14*(p?.other[0] ?? 1)+.06*(p?.other[1] ?? 1);
    const shift = Math.min(1, Math.hypot(...pos)), repairs = this.repairs, panorama = this.panorama, panoZ = this.panoDepth;
    const general = .37+.63*clamp((indirect-.33)/.77), panoLight = .29+.71*clamp((indirect-.33)/.77);
    const closedShade = p ? .25+.26*p.lights[0]+.10*p.lights[1]+.21*p.lights[2]+.10*p.other[0]+.06*p.lights[3] : 1;
    const current = new Float64Array(6*8), clipped = new Float64Array(6*8);
    const tri = (a, b, c, k, dev) => {
      const projected = (j) => {
        const i = j*8, iz = 1/clipped[i+5];
        clipped[i+6] = (clipped[i+3]*f[0]*iz+1)*w*.5;
        clipped[i+7] = (1-f[2]-clipped[i+4]*f[1]*iz)*h*.5;
      };
      projected(a);
      projected(b);
      projected(c);
      a *= 8;
      b *= 8;
      c *= 8;
      const ax = clipped[a+6], ay = clipped[a+7], bx = clipped[b+6], by = clipped[b+7], cx = clipped[c+6], cy = clipped[c+7];
      const x0 = Math.max(0, Math.ceil(Math.min(ax, bx, cx)-.5)), x1 = Math.min(w-1, Math.floor(Math.max(ax, bx, cx)-.5)), y0 = Math.max(0, Math.ceil(Math.min(ay, by, cy)-.5)), y1 = Math.min(h-1, Math.floor(Math.max(ay, by, cy)-.5));
      if (x0>x1 || y0>y1)return;
      const d = (by-cy)*(ax-cx)+(cx-bx)*(ay-cy);
      if (Math.abs(d)<.0002)return;
      const dsx = (by-cy)/d, dsy = (cx-bx)/d, dtx = (cy-ay)/d, dty = (ax-cx)/d;
      const ia = 1/clipped[a+5], ib = 1/clipped[b+5], ic = 1/clipped[c+5], tile = v[k+6], scale = v[k+7], photo = v[k+9], nx = Math.abs(v[k+3]), ny = Math.abs(v[k+4]), nz = Math.abs(v[k+5]);
      const ta = (tile%TILE_GRID)*az, tb = Math.floor(tile/TILE_GRID)*az, matLight = dev === 9?closedShade:indirect*(.74+.18*ny+.08*nx);
      const tileMean = tileMeans[tile], fieldW = repairs.w/TILE_GRID, fieldH = repairs.h/TILE_GRID, fieldX = (tile%TILE_GRID)*fieldW, fieldY = Math.floor(tile/TILE_GRID)*fieldH;
      const sa = (x0+.5-cx)*dsx+(y0+.5-cy)*dsy, ta0 = (x0+.5-cx)*dtx+(y0+.5-cy)*dty;
      for (let y = y0;y<=y1;y++) {
        let s = sa+(y-y0)*dsy, t = ta0+(y-y0)*dty;
        let at = y*w+x0;
        for (let x = x0;x<=x1;x++, at++, s += dsx, t += dtx) {
          const u = 1-s-t;
          if (s<-.000002 || t<-.000002 || u<-.000002)continue;
          const aa = s*ia, bb = t*ib, cc = u*ic, zd = 1/(aa+bb+cc);
          if (zd>zbuf[at]+.00001)continue;
          zbuf[at] = zd;
          if (onlyDepth)continue;
          const wx = (aa*clipped[a]+bb*clipped[b]+cc*clipped[c])*zd, wy = (aa*clipped[a+1]+bb*clipped[b+1]+cc*clipped[c+1])*zd, wz = (aa*clipped[a+2]+bb*clipped[b+2]+cc*clipped[c+2])*zd;
          const pu = (CX+F*wx/wz)/W, pv = (CY-F*wy/wz)/H;
          let r = 0, g = 0, bl = 0, coverage = 0;
          if (photo && wz>.025 && pu>=0 && pu<1 && pv>=0 && pv<1) {
            const gap = wz-this.ref[Math.floor(pv*this.zh)*this.zw+Math.floor(pu*this.zw)], tol = .041+wz*.014;
            coverage = mix(1, clamp(1-(gap-tol)/(tol*1.4)), clamp((shift-.008)/.152));
            if (shift) {
              const angle = Math.abs(v[k+3]*wx+v[k+4]*wy+v[k+5]*wz)/(Math.hypot(wx, wy, wz) || 1);
              coverage *= mix(1, clamp((angle-.016)/.11), shift);
              coverage *= mix(1, clamp(Math.min(pu*W, (1-pu)*W, pv*H, (1-pv)*H)/10), shift);
            }
            if (coverage>.001) {
              const qx = clamp(pu*sw-.5, 0, sw-1.00001), qy = clamp(pv*sh-.5, 0, sh-1.00001), tx = qx|0, ty = qy|0, xx = qx-tx, yy = qy-ty, i = (ty*sw+tx)*4, j = i+sw*4;
              const wa = (1-xx)*(1-yy), wb = xx*(1-yy), wc = (1-xx)*yy, wd = xx*yy;
              r = src[i]*wa+src[i+4]*wb+src[j]*wc+src[j+4]*wd;
              g = src[i+1]*wa+src[i+5]*wb+src[j+1]*wc+src[j+5]*wd;
              bl = src[i+2]*wa+src[i+6]*wb+src[j+2]*wc+src[j+6]*wd;
            }
          }
          if (coverage<.999) {
            const uu = (ny>Math.max(nx, nz)?wx:(nx>nz?wz:wx))*scale, vv = (ny>Math.max(nx, nz)?wz:-wy)*scale;
            const ai = ((tb+clamp(Math.floor((vv-Math.floor(vv))*az), 0, az-1))*atlas.w+ta+clamp(Math.floor((uu-Math.floor(uu))*az), 0, az-1))*4;
            const rr = atlas.data[ai], gg = atlas.data[ai+1], bb = atlas.data[ai+2];
            let mr = rr*matLight*v[k+10], mg = gg*matLight*v[k+11], mb = bb*matLight*v[k+12];
            if (panorama && dev !== 9) {
              const rad = Math.hypot(wx, wy, wz), u = clamp(.5+Math.atan2(wx, wz)/(2*Math.PI), 0, .999999), vv = clamp(.5-Math.asin(clamp(wy/rad, -1, 1))/Math.PI, 0, .999999);
              const zi = (Math.floor(vv*panoZ.h)*panoZ.w+Math.floor(u*panoZ.w))*4, ref = (panoZ.data[zi]*256+panoZ.data[zi+1])*.001;
              const hit = .96*clamp(1-(rad-ref-.05-ref*.008)/(.08+ref*.014));
              if (hit>0) {
                const ci = (Math.floor(vv*panorama.h)*panorama.w+Math.floor(u*panorama.w))*4;
                mr = mix(mr, panorama.data[ci]*panoLight, hit);
                mg = mix(mg, panorama.data[ci+1]*panoLight, hit);
                mb = mix(mb, panorama.data[ci+2]*panoLight, hit);
              }
            }
            if (photo && wz>.12 && dev === 0) {
              const sx = pu*W, sy = pv*H, clx = clamp(sx, 1, W-1);
              const ratio = (nx*.705+nz*.709)>.65 && v[k+3]*v[k+5]>0?(clx+270)/Math.max(50, sx+270):1;
              const field = clamp(1-Math.max(-sx/320, (sx-W)/320, -sy/180, (sy-H)/180))*.81;
              if (field>0) {
                const fix = (fieldX+Math.floor(clamp(clx/W, .003, .997)*fieldW)+(fieldY+Math.floor(clamp((507+(sy-507)*ratio)/H, .003, .997)*fieldH))*repairs.w)*4;
                mr = mix(mr, repairs.data[fix]*clamp(rr/(255*tileMean[0]), .48, 1.8)*general, field);
                mg = mix(mg, repairs.data[fix+1]*clamp(gg/(255*tileMean[1]), .48, 1.8)*general, field);
                mb = mix(mb, repairs.data[fix+2]*clamp(bb/(255*tileMean[2]), .48, 1.8)*general, field);
              }
            }
            if (dev === 1) {
              mr = mix(rr*.22, 246, p.lights[0]);
              mg = mix(gg*.22, 203, p.lights[0]);
              mb = mix(bb*.22, 146, p.lights[0]);
            }
            if (dev === 2) {
              mr = rr*(.52+.94*p.lights[1]);
              mg = gg*(.52+.73*p.lights[1]);
              mb = bb*(.48+.45*p.lights[1]);
            }
            if (dev === 3) {
              mr = mix(rr*.29, 255, p.lights[2]);
              mg = mix(gg*.29, 227, p.lights[2]);
              mb = mix(bb*.29, 186, p.lights[2]);
            }
            if (dev === 4) {
              mr = mix(rr*.49, (.12+p.hue[0]*.8)*255, p.lights[3]);
              mg = mix(gg*.49, (.12+p.hue[1]*.8)*255, p.lights[3]);
              mb = mix(bb*.49, (.12+p.hue[2]*.8)*255, p.lights[3]);
            }
            if (dev === 5) {
              mr = mix(rr*.35, 255, p.other[0]);
              mg = mix(gg*.35, 207, p.other[0]);
              mb = mix(bb*.35, 140, p.other[0]);
            }
            r = mix(mr, r, coverage);
            g = mix(mg, g, coverage);
            bl = mix(mb, bl, coverage);
          }
          r = clamp(r, 0, 255);
          g = clamp(g, 0, 255);
          bl = clamp(bl, 0, 255);
          target[at] = (255<<24)|(bl<<16)|(g<<8)|r;
        }
      }
    };
    for (let k = 0;k<v.length;k += 42) {
      const dev = Math.round(v[k+8]);
      if (dev === 9 && (onlyDepth || p.closed<.003))continue;
      let allNear = true, allIn = true;
      for (let j = 0;j<3;j++) {
        const i = k+j*14, l = j*8;
        const x = v[i], y = dev === 9?mix(v[i+13], v[i+1], p.closed):v[i+1], z = v[i+2];
        current[l] = x;
        current[l+1] = y;
        current[l+2] = z;
        const dx = x-pos[0], dy = y-pos[1], dz = z-pos[2];
        current[l+3] = right[0]*dx+right[1]*dy+right[2]*dz;
        current[l+4] = up[0]*dx+up[1]*dy+up[2]*dz;
        current[l+5] = forward[0]*dx+forward[1]*dy+forward[2]*dz;
        if (current[l+5]>=near)allNear = false;else allIn = false;
      }
      if (allNear)continue;
      let count = 0;
      if (allIn) {
        clipped.set(current.subarray(0, 24));
        count = 3;
      } else {
        for (let j = 0;j<3;j++) {
          const ia = j*8, ib = ((j+1)%3)*8, da = current[ia+5], db = current[ib+5];
          if (da>=near) {
            for (let m = 0;m<6;m++)clipped[count*8+m] = current[ia+m];
            count++;
          }
          if ((da>=near) !== (db>=near)) {
            const t = (near-da)/(db-da);
            for (let m = 0;m<6;m++)clipped[count*8+m] = mix(current[ia+m], current[ib+m], t);
            count++;
          }
        }
      }
      for (let j = 1;j<count-1;j++)tri(0, j, j+1, k, dev);
    }
  }
}
