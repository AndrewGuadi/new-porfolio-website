import { H, W, CX, CY, F, tileMeans } from './mesh.js';
import { TILE_GRID } from './materials.js';

export function basis(camera) {
  const sy = Math.sin(camera.yaw), cy = Math.cos(camera.yaw), sp = Math.sin(camera.pitch), cp = Math.cos(camera.pitch);
  return {right:[cy, 0, -sy], up:[-sy*sp, cp, -cy*sp], forward:[sy*cp, sp, cy*cp]};
}
export function lens(w, h, zoom = 1) {
  return [2*F*h/(H*w)*zoom, 2*F/H*zoom, 1-2*CY/H];
}
export function project(p, camera, w, h) {
  const b = basis(camera), a = lens(w, h, camera.zoom), d = p.map((x, i) => x-camera.pos[i]);
  const dot = v => v[0]*d[0]+v[1]*d[1]+v[2]*d[2], z = dot(b.forward);
  return {x:(dot(b.right)*a[0]/z+1)*w/2, y:(1-a[2]-dot(b.up)*a[1]/z)*h/2, z};
}
export const sourcePosition = {pos:[0, 0, 0], yaw:0, pitch:0, zoom:1};

const vertex = `
precision highp float;
attribute vec3 pos, normal, tint;
attribute vec4 surface;
attribute float shadeTop;
uniform vec3 eye, right, up, forward, lens;
uniform float closed;
varying vec3 wp, n, dye;
varying vec4 m;
void main(){
  wp=pos; n=normal; m=surface; dye=tint;
  if(abs(surface.z-9.)<.25)wp.y=mix(shadeTop,pos.y,closed);
  vec3 delta=wp-eye;
  float d=dot(delta,forward);
  gl_Position=vec4(dot(delta,right)*lens.x, dot(delta,up)*lens.y+lens.z*d,1.00071454*d-.05001786,d);
}`;
const depth = `
precision highp float;
varying vec3 wp; varying vec4 m;
uniform sampler2D foreground;
void main(){
  if(abs(m.z-9.)<.25)discard;
  vec2 q=vec2((836.+1100.*wp.x/wp.z)/1672.,(507.-1100.*wp.y/wp.z)/941.);
  vec3 fg=texture2D(foreground,q).rgb;float limitZ=(fg.r*65280.+fg.g*255.)*.001;
  float d=mix(wp.z,min(wp.z,limitZ+.19+(1.-fg.b)*.53),smoothstep(.12,.70,fg.b));
  vec3 v=fract(d/70.*vec3(1.,255.,65025.));v-=v.yzz*vec3(1./255.,1./255.,0.);
  gl_FragColor=vec4(v,1.);
}`;
const fragment = `
precision highp float;
varying vec3 wp, n, dye; varying vec4 m;
uniform sampler2D photo, atlas, zmap, sources, ambience, repairs, panorama, panoDepth;
uniform float hasPano;
uniform vec4 lights, other;
uniform vec3 hue, eye;
uniform float hueMix, closed, clock;
const float atlasGrid=${TILE_GRID.toFixed(1)};
vec3 meanTile(float id){${tileMeans.map((rgb, i) => `if(abs(id-${i}.0)<.2)return vec3(${rgb.map(v => v.toFixed(4)).join(',')});`).join('')}return vec3(.5);}
vec2 panoUV(vec3 p){return vec2(.5+atan(p.x,p.z)/6.28318530718,.5-asin(clamp(p.y/length(p),-1.,1.))/3.14159265359);}

float unAlpha(float a){return clamp((a*255.-128.)/127.,0.,1.);}
vec2 photoUV(vec3 p){return vec2((836.+1100.*p.x/p.z)/1672.,(507.-1100.*p.y/p.z)/941.);}
float stoneDepth(vec2 uv){return 70.*dot(texture2D(zmap,vec2(uv.x,1.-uv.y)).rgb,vec3(1.,1./255.,1./65025.));}
vec3 atlasSample(vec2 raw){vec2 cell=vec2(mod(m.x,atlasGrid),floor(m.x/atlasGrid));return texture2D(atlas,(cell+.004+fract(raw*m.y)*.992)/atlasGrid).rgb;}
float inWindow(vec2 p){return (1.-smoothstep(540.,555.,p.x))*smoothstep(23.,37.,p.x)*smoothstep(221.+p.x*.142,231.+p.x*.142,p.y)*(1.-smoothstep(564.-p.x*.015,580.-p.x*.015,p.y));}
vec3 shadeMaterial(vec3 normalV){
  vec3 nn=abs(normalize(normalV));vec2 uv=nn.y>max(nn.x,nn.z)?vec2(wp.x,wp.z):(nn.x>nn.z?vec2(wp.z,-wp.y):vec2(wp.x,-wp.y));
  vec3 swatch=atlasSample(uv);vec3 tex=swatch*dye;
  vec3 emit=vec3(-.75,1.45,4.28), ldir=normalize(emit-wp);
  float orient=.72+.25*abs(dot(normalize(normalV),ldir));
  float indirect=.33+.26*lights.r+.10*lights.g+.14*lights.b+.07*lights.a+.14*other.r+.06*other.g;
  float floorBounce=.92+.08*clamp((wp.y+1.48)*.9,0.,1.);
  vec3 c=tex*orient*indirect*floorBounce;
  c+=tex*vec3(.05,.021,.005)*other.g/(.4+distance(wp,vec3(1.9,-.55,7.3))*.7);
  if(hasPano>.5 && abs(m.z-9.)>.25){
    vec2 e=panoUV(wp);vec2 dd=texture2D(panoDepth,e).rg;float radial=(dd.r*65280.+dd.g*255.)*.001;
    float gap=length(wp)-radial;
    float exposure=1.-smoothstep(.05+radial*.008,.13+radial*.022,gap);
    c=mix(c,texture2D(panorama,e).rgb*(.29+.71*clamp((indirect-.33)/.77,0.,1.)),exposure*.96);
  }
  if(wp.z>.12 && m.w>.5 && m.z<.25){
    vec2 pix=photoUV(wp)*vec2(1672.,941.);float clampedX=clamp(pix.x,1.,1671.);
    float ratio=dot(nn,vec3(.705,0.,.709))>.65 && normalV.x*normalV.z>0.? (clampedX+270.)/max(50.,pix.x+270.):1.;
    vec2 donor=clamp(vec2(clampedX,507.+(pix.y-507.)*ratio)/vec2(1672.,941.),.003,.997);
    vec2 cell=vec2(mod(m.x,atlasGrid),floor(m.x/atlasGrid));vec3 field=texture2D(repairs,(cell+donor)/atlasGrid).rgb;
    float edge=max(max(-pix.x,pix.x-1672.)/320.,max(-pix.y,pix.y-941.)/180.);
    float nearRef=1.-smoothstep(-.05,1.,edge);
    vec3 patch=field*clamp(swatch/max(meanTile(m.x),vec3(.05)),.48,1.8)*(.37+.63*clamp((indirect-.33)/.77,0.,1.));
    c=mix(c,patch,nearRef*.81);
  }
  if(abs(m.z-9.)<.25){float rib=.94+.06*smoothstep(-.85,.85,sin(wp.y*720.));c=tex*(.25+.26*lights.r+.10*lights.g+.21*lights.b+.10*other.r+.06*lights.a)*rib;}
  if(abs(m.z-1.)<.25)c=mix(tex*.22,vec3(1.,.81,.58)*(.78+.22*tex.r),lights.r);
  if(abs(m.z-2.)<.25)c=mix(tex*.58,tex*vec3(1.40,1.21,.93)+vec3(.15,.09,.025),lights.g);
  if(abs(m.z-3.)<.25)c=mix(tex*.29,vec3(1.,.89,.73),lights.b);
  if(abs(m.z-4.)<.25)c=mix(tex*.49,hue*.80+vec3(.12),lights.a);
  if(abs(m.z-5.)<.25)c=mix(tex*.35,vec3(1.,.81,.55),other.r);
  return c;
}
vec3 relight(vec3 base,vec2 uv){
  vec4 ls=texture2D(sources,uv),sp=texture2D(ambience,vec2(uv.x,uv.y*.5)),me=texture2D(ambience,vec2(uv.x,.5+uv.y*.5));
  ls.a=unAlpha(ls.a);sp.a=unAlpha(sp.a);me.a=unAlpha(me.a);
  vec4 off=1.-lights;vec2 p=uv*vec2(1672.,941.);float outdoors=inWindow(p);
  float active=dot(lights,vec4(.26,.14,.24,.07))+.20*other.r+.09*other.g;
  float amb=mix(.63+.37*active,1.,outdoors*.94);
  float warmLoss=dot(sp.rgb,off.rgb*vec3(.36,.44,.37))+.57*me.r*(1.-other.r)+.32*me.g*(1.-other.g);
  vec3 c=base*amb*clamp(1.-warmLoss,.26,1.)*(1.-.27*sp.a*off.a)*(1.-.13*me.b*(1.-other.b));
  float lum=dot(base,vec3(.27,.52,.21));
  c=mix(c,vec3(.25,.20,.16)*(.38+.62*lum)*amb,ls.r*off.r);
  c=mix(c,vec3(.56,.46,.35)*(.56+.44*lum)*amb,ls.g*off.g);
  c=mix(c,vec3(.38,.32,.28)*(.5+.5*lum)*amb,ls.b*off.b);
  c=mix(c,vec3(base.r*.82,base.r*.68,base.r*.58)*amb,clamp(ls.a+sp.a*.52,0.,1.)*off.a);
  c=mix(c,vec3(.33,.24,.18)*(.48+.52*lum)*amb,me.a*(1.-other.r));
  float h=hueMix*lights.a;
  c=mix(c, hue*(.33+.56*lum)+vec3(.07),h*ls.a*.90);
  c+=h*sp.a*.16*(hue-vec3(.29,.43,.98));
  return c;
}
void main(){
  if(abs(m.z-9.)<.25&&closed<.004)discard;
  vec3 normalV=normalize(n),c=shadeMaterial(normalV); vec2 uv=photoUV(wp);
  vec2 px=uv*vec2(1672.,941.);
  float coverage=0.;
  if(wp.z>.02 && min(min(uv.x,uv.y),min(1.-uv.x,1.-uv.y))>=0. && m.w>.5){
    float refZ=stoneDepth(uv),gap=wp.z-refZ;
    float tol=.036+wp.z*.012;
    coverage=mix(1.,1.-smoothstep(tol,tol*2.2,gap),smoothstep(.008,.16,length(eye)));
    // Blend away grazing-angle projection on newly exposed faces after a lateral move.
    float translation=clamp(length(eye)*.9,0.,1.);
    coverage*=mix(1.,smoothstep(.011,.13,abs(dot(normalV,normalize(wp)))),translation);
    float edge=min(min(px.x,1672.-px.x),min(px.y,941.-px.y));coverage*=mix(1.,smoothstep(0.,9.,edge),translation);
    if(coverage>.001){
      vec2 sampleUV=uv;
      bool flame=px.x>1004.&&px.x<1269.&&px.y>540.&&px.y<619.+.062*(px.x-1004.);
      if(flame && other.g>.001){float height=clamp((621.+.055*(px.x-1004.)-px.y)/65.,0.,1.);float t=clock;sampleUV+=vec2(sin(px.y*.071+t*2.7+px.x*.051)*.00065,sin(t*3.8+px.x*.088)*.0021)*height;}
      vec3 base=texture2D(photo,sampleUV).rgb;
      vec3 lit=relight(base,uv);
      bool tv=px.x>934.&&px.x<1329.&&px.y>249.-.213*(px.x-934.)&&px.y<458.-.044*(px.x-934.);
      bool fire=px.x>1002.&&px.x<1271.&&px.y>529.+.014*(px.x-1002.)&&px.y<620.+.055*(px.x-1002.);
      if(tv)lit=mix(vec3(.031,.043,.051)+.024*(1.-uv.y)+vec3(.014,.013,.014)*pow(max(0.,1.-uv.x),1.4),base,other.b);
      if(fire){float embers=smoothstep(606.+.055*(px.x-1002.),621.+.055*(px.x-1002.),px.y);vec3 cold=vec3(.075,.060,.049)*(.60+.35*uv.y)+embers*base*.092;lit=mix(cold,base,other.g);}
      if(abs(m.z-10.)<.25 && m.x>14.5)lit=base;
      c=mix(c,lit,coverage);
    }
  }
  if(abs(m.z-7.)<.25&&coverage<.99)c=mix(c,mix(vec3(.045,.053,.063),vec3(.12,.19,.31),other.b),1.-coverage);
  if(abs(m.z-6.)<.25&&coverage<.99)c=mix(c,vec3(.11,.076,.055)*(1.+.45*other.g),1.-coverage);
  gl_FragColor=vec4(clamp(c,0.,1.),1.);
}`;

function compile(gl, vs, fs) {
  const shaders = [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]].map(([type, src]) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));
    return s
  });
  const p = gl.createProgram();
  for (const s of shaders)gl.attachShader(p, s);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
  for (const s of shaders)gl.deleteShader(s);
  const locations = {};
  for (const name of ['eye', 'right', 'up', 'forward', 'lens', 'closed', 'lights', 'other', 'hue', 'hueMix', 'clock', 'photo', 'atlas', 'zmap', 'sources', 'ambience', 'repairs', 'panorama', 'panoDepth', 'hasPano', 'foreground'])locations[name] = gl.getUniformLocation(p, name);
  return {p, locations};
}
export class GLRoom {
  constructor(gl, mesh, assets) {
    this.gl = gl;
    this.canvas = gl.canvas;
    this.mesh = mesh;
    this.renderer = 'WebGL';
    this.main = compile(gl, vertex, fragment);
    this.depth = compile(gl, vertex, depth);
    this.buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    gl.disable(gl.DITHER);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    const tex = (img, nearest = false) => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, nearest?gl.NEAREST:gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, nearest?gl.NEAREST:gl.LINEAR);
      for (const wrap of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D, wrap, gl.CLAMP_TO_EDGE);
      if (img)gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      return t;
    };
    const zmap = tex(null, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const packed = document.createElement('canvas');
    packed.width = assets.spill.width;
    packed.height = assets.spill.height*2;
    const pg = packed.getContext('2d');
    pg.drawImage(assets.spill, 0, 0);
    pg.drawImage(assets.media, 0, assets.spill.height);
    const blank = document.createElement('canvas');
    blank.width = blank.height = 1;
    this.textures = [tex(assets.photo), tex(assets.atlas), zmap, tex(assets.sources), tex(packed), tex(assets.repairs), tex(blank), tex(blank, true)];
    const frame = gl.createFramebuffer(), z = gl.createRenderbuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, frame);
    gl.bindRenderbuffer(gl.RENDERBUFFER, z);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, W, H);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, z);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, zmap, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)throw Error('Reference depth buffer is unavailable');
    gl.activeTexture(gl.TEXTURE0);
    const foreground = tex(assets.foreground, true);
    gl.viewport(0, 0, W, H);
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    this.bind(this.depth);
    gl.uniform1i(this.depth.locations.foreground, 0);
    this.camera(this.depth, sourcePosition, W, H);
    gl.uniform1f(this.depth.locations.closed, 0);
    gl.drawArrays(gl.TRIANGLES, 0, mesh.vertices.length/14);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(frame);
    gl.deleteRenderbuffer(z);
    gl.deleteTexture(foreground);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    this.bind(this.main);
    this.textures.forEach((t, i) => {
      gl.activeTexture(gl.TEXTURE0+i);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.uniform1i(this.main.locations[['photo', 'atlas', 'zmap', 'sources', 'ambience', 'repairs', 'panorama', 'panoDepth'][i]], i)
    });
  }
  setPhoto(img) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures[0]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  }
  setPanorama(color, z) {
    const gl = this.gl;
    for (const [unit, img] of [[6, color], [7, z]]) {
      gl.activeTexture(gl.TEXTURE0+unit);
      gl.bindTexture(gl.TEXTURE_2D, this.textures[unit]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    }
    gl.uniform1f(this.main.locations.hasPano, 1);
  }
  bind(program) {
    const gl = this.gl;
    gl.useProgram(program.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    for (const [name, len, off] of [['pos', 3, 0], ['normal', 3, 3], ['surface', 4, 6], ['tint', 3, 10], ['shadeTop', 1, 13]]) {
      const i = gl.getAttribLocation(program.p, name);
      if (i === -1)continue;
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, len, gl.FLOAT, false, 56, off*4);
    }
  }
  camera(program, cam, w, h) {
    const gl = this.gl, loc = program.locations, b = basis(cam);
    gl.uniform3fv(loc.eye, cam.pos);
    for (const k of ['right', 'up', 'forward'])gl.uniform3fv(loc[k], b[k]);
    gl.uniform3fv(loc.lens, lens(w, h, cam.zoom));
  }
  render(cam, params, time) {
    const gl = this.gl, canvas = this.canvas;
    const rect = canvas.getBoundingClientRect(), ratio = Math.min(devicePixelRatio || 1, 1.6, Math.sqrt(1900000/(rect.width*rect.height || 1)));
    const w = Math.max(2, Math.round(rect.width*ratio)), h = Math.max(2, Math.round(rect.height*ratio));
    if (w !== canvas.width || h !== canvas.height) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.clearColor(.092, .10, .10, 1);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    this.camera(this.main, cam, w, h);
    const l = this.main.locations;
    gl.uniform4fv(l.lights, params.lights);
    gl.uniform4fv(l.other, params.other);
    gl.uniform3fv(l.hue, params.hue);
    gl.uniform1f(l.hueMix, params.hueMix);
    gl.uniform1f(l.closed, params.closed);
    gl.uniform1f(l.clock, time);
    gl.drawArrays(gl.TRIANGLES, 0, this.mesh.vertices.length/14);
  }
}
