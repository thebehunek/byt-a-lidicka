// Virtuální prohlídka – modelový byt A, Lidická 1903/96, Břeclav.
// three.js 0.170.0 (lokální kopie), data z data.js (vygenerováno sestav.py). Žádné síťové zdroje.
//
// Souřadnice: scéna v mm (+X východ, +Y sever scény, Z nahoru, podlaha Z = 0) -> three.js v metrech
// relativně ke kameře: x = X, y = Z − z_kamery, z = −Y. Úhel yaw: 0° = +X, 90° = +Y (proti směru hodin).
import * as THREE from './three.module.min.js';
import DATA from './data.js';

window.__prohlidkaStart = true;

const RAD = Math.PI / 180;
const parametry = new URLSearchParams(location.search);
const TEST = parametry.get('test');
const mqPohyb = window.matchMedia('(prefers-reduced-motion: reduce)');
let omezitPohyb = mqPohyb.matches || parametry.get('pohyb') === 'omezit';
mqPohyb.addEventListener?.('change', (e) => { omezitPohyb = e.matches; });

const $ = (id) => document.getElementById(id);
const el = {
  koren: $('prohlidka'), pohled: $('pohled'), hotspoty: $('hotspoty'), mistnost: $('mistnost'), poradi: $('poradi'),
  minimapa: $('minimapa'), mmPlocha: $('mm-plocha'), mmObraz: $('mm-obraz'), mmKuzel: $('mm-kuzel'), mmUzly: $('mm-uzly'),
  mmJsteZde: $('mm-jste-zde'), seznam: $('mistnosti-seznam'), nacitani: $('nacitani'), nacitaniText: $('nacitani-text'),
  tip: $('tip'), zprava: $('zprava'), hlaseni: $('hlaseni'), napoveda: $('napoveda'),
  btnPudorys: $('btn-pudorys'), btnNapoveda: $('btn-napoveda'), btnNapovedaZavrit: $('btn-napoveda-zavrit'),
  btnCela: $('btn-cela'), btnCelaText: $('btn-cela-text'), btnPlus: $('btn-plus'), btnMinus: $('btn-minus'),
  btnMmVelikost: $('btn-mm-velikost'),
};

// ------------------------------------------------------------------------------------------- data
const UZLY = new Map(DATA.uzly.map((u, i) => [u.id, { ...u, poradi: i + 1 }]));
const PORADI = DATA.uzly.map((u) => u.id);
const HRANY_Z = new Map(PORADI.map((id) => [id, []]));
for (const h of DATA.hrany) HRANY_Z.get(h.od)?.push(h);
for (const seznam of HRANY_Z.values()) seznam.sort((a, b) => PORADI.indexOf(a.do) - PORADI.indexOf(b.do));   // pořadí Tab = čísla místností

/** Směr, vzdálenost a sklon šipky – počítá se z poloh kamery a šipky (mm), žádné uložené úhly. */
function geometrieHrany(h) {
  const a = UZLY.get(h.od);
  const dx = h.sipka[0] - a.x, dy = h.sipka[1] - a.y;
  const vzd = Math.hypot(dx, dy) / 1000;
  const vyska = -a.z / 1000;                       // podlaha leží o výšku kamery níž
  return {
    yaw: Math.atan2(dy, dx) / RAD,
    sklon: Math.atan2(vyska, vzd) / RAD,
    stred: new THREE.Vector3(dx / 1000, vyska, -dy / 1000),
  };
}
function smerMeziUzly(a, b) {
  return Math.atan2(b.y - a.y, b.x - a.x) / RAD;
}
const normUhel = (u) => ((u % 360) + 540) % 360 - 180;            // -> (-180, 180]
const omez = (v, a, b) => Math.min(b, Math.max(a, v));
const plynule = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const krok = (a, b, t) => omez((t - a) / (b - a), 0, 1);

// ------------------------------------------------------------------------------------------- renderer
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: !!TEST, powerPreference: 'high-performance' });
} catch (err) {
  zobrazChybu('Váš prohlížeč nepodporuje WebGL, které prohlídka potřebuje. Zkuste jiný prohlížeč nebo zapněte hardwarovou akceleraci.');
  throw err;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
el.pohled.appendChild(renderer.domElement);
renderer.domElement.setAttribute('aria-hidden', 'true');
renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); ukazZpravu('Grafika se přerušila – obnovuji…'); });
renderer.domElement.addEventListener('webglcontextrestored', () => { textury.clear(); nactiAZobraz(aktualni); });

const scena = new THREE.Scene();
const kamera = new THREE.PerspectiveCamera(75, 1, 0.05, 200);
const POLOMER = 20;
const geometrieKoule = new THREE.SphereGeometry(POLOMER, 128, 64);
geometrieKoule.scale(-1, 1, 1);
function vytvorKouli(poradi) {
  const m = new THREE.Mesh(geometrieKoule, new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false }));
  // u = 0,5 + (stred − yaw)/360  =>  otočení koule kolem svislé osy o π + stred (viz hlavička souboru)
  m.rotation.y = Math.PI + DATA.stred_obrazu_yaw_deg * RAD;
  m.renderOrder = poradi;
  m.visible = false;
  scena.add(m);
  return m;
}
const koule = vytvorKouli(0);      // aktuální uzel
const kouleDalsi = vytvorKouli(1); // přechod (prolnutí)

// ------------------------------------------------------------------------------------------- šipky na podlaze
// Značka na podlaze: kruh + šipka (chevron) mířící do sousední místnosti. Průměr = DATA.sipka.delka (stejný
// rozměr, se kterým sestav.py ověřil, že celá značka leží na volné a z kamery viditelné podlaze).
const R_SIPKY = Math.min(DATA.sipka.delka, DATA.sipka.sirka) / 2000;
function tvarChevronu() {
  const R = R_SIPKY;
  const body = [[0.56, 0], [-0.2, 0.6], [-0.42, 0.42], [0.14, 0], [-0.42, -0.42], [-0.2, -0.6]];
  const s = new THREE.Shape();
  body.forEach(([x, y], i) => (i ? s.lineTo(x * R + 0.03 * R, y * R) : s.moveTo(x * R + 0.03 * R, y * R)));
  s.closePath();
  return new THREE.ShapeGeometry(s).rotateX(-Math.PI / 2);   // tvar (x, y) -> (x, 0, −y) = osy scény X, Y
}
const texturaStinu = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 6, 64, 64, 64);
  r.addColorStop(0, 'rgba(0,0,0,0.5)');
  r.addColorStop(0.5, 'rgba(0,0,0,0.32)');
  r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
const geomStin = new THREE.PlaneGeometry(R_SIPKY * 3.1, R_SIPKY * 3.1).rotateX(-Math.PI / 2);
const geomDisk = new THREE.CircleGeometry(R_SIPKY * 0.9, 48).rotateX(-Math.PI / 2);
const geomKruh = new THREE.RingGeometry(R_SIPKY * 0.86, R_SIPKY, 64).rotateX(-Math.PI / 2);
const geomChevron = tvarChevronu();
const geomZasah = new THREE.CircleGeometry(R_SIPKY * 1.5, 24).rotateX(-Math.PI / 2);
const BARVA_SIPKY = new THREE.Color('#ffffff');
const BARVA_AKTIVNI = new THREE.Color('#f3b06b');
const skupinaSipek = new THREE.Group();
scena.add(skupinaSipek);

function vytvorSipku(h) {
  const g = geometrieHrany(h);
  const sk = new THREE.Group();
  sk.position.copy(g.stred);
  sk.position.y += 0.004;
  sk.rotation.y = g.yaw * RAD;                       // tvar míří po +X -> otočení o yaw
  const mat = (o) => new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false, ...o });
  const stin = new THREE.Mesh(geomStin, mat({ map: texturaStinu, opacity: 0.75 }));
  const disk = new THREE.Mesh(geomDisk, mat({ color: BARVA_SIPKY.clone(), opacity: 0.2 }));
  const kruh = new THREE.Mesh(geomKruh, mat({ color: BARVA_SIPKY.clone(), opacity: 0.95 }));
  const sipka = new THREE.Mesh(geomChevron, mat({ color: BARVA_SIPKY.clone(), opacity: 0.97 }));
  const zasah = new THREE.Mesh(geomZasah, mat({ opacity: 0, colorWrite: false }));
  stin.renderOrder = 5; disk.renderOrder = 6; kruh.renderOrder = 7; sipka.renderOrder = 8; zasah.renderOrder = 9;
  sk.add(stin, disk, kruh, sipka, zasah);
  sk.userData = { hrana: h, barevne: [disk, kruh, sipka], disk, zasah, geometrie: g };
  zasah.userData.skupina = sk;
  return sk;
}

// ------------------------------------------------------------------------------------------- stav pohledu
const pohled = { yaw: 0, sklon: -10, priblizeni: 1, vYaw: 0, vSklon: 0 };
const PRIBLIZENI = { min: 0.85, max: 2.8 };
function zakladniFov() {
  const a = kamera.aspect || 1;
  // na šířku 75° svisle; na výšku tak, aby vodorovně bylo vidět aspoň ~60°
  return a >= 1 ? 75 : omez((2 * Math.atan(Math.tan(30 * RAD) / a)) / RAD, 75, 105);
}
const aktualniFov = () => omez(zakladniFov() / pohled.priblizeni, 22, 112);
const vodorovnyFov = () => (2 * Math.atan(Math.tan((aktualniFov() * RAD) / 2) * kamera.aspect)) / RAD;
const smerPohledu = new THREE.Vector3();
function aktualizujKameru() {
  pohled.sklon = omez(pohled.sklon, -85, 85);
  pohled.yaw = normUhel(pohled.yaw);
  const s = pohled.sklon * RAD, y = pohled.yaw * RAD;
  smerPohledu.set(Math.cos(s) * Math.cos(y), Math.sin(s), -Math.cos(s) * Math.sin(y));
  kamera.lookAt(smerPohledu);
  kamera.fov = aktualniFov();
  kamera.updateProjectionMatrix();
}

let aktualni = null;
let prechod = false;
const animace = new Set();        // běžící animace: funkce(t_ms) -> true = pokračovat

// ------------------------------------------------------------------------------------------- vykreslování na požádání
let rafId = 0;
// Headless Chrome s virtuálním časem (kontrolní skript) volá requestAnimationFrame až při snímku obrazovky ->
// v testu jistí běh animací záložní časovač; po dopsání výsledku (jenRaf) zase jen rAF, ať je plátno ve snímku.
let zalozni = 0, jenRaf = false;
function prekresli() {
  if (rafId) return;
  rafId = requestAnimationFrame(snimek);
  if (TEST && !jenRaf) {
    clearTimeout(zalozni);
    zalozni = setTimeout(() => {
      if (!rafId) return;
      cancelAnimationFrame(rafId);
      snimek();
    }, 40);
  }
}
let posledniCas = 0;
function snimek() {
  rafId = 0;
  clearTimeout(zalozni);
  const cas = performance.now();               // jeden zdroj času (časová značka rAF má jiný základ)
  const dt = posledniCas ? omez(cas - posledniCas, 0, 64) : 16;
  posledniCas = cas;
  let dal = false;
  // klávesnice: plynulé otáčení
  if (klavesy.size) {
    const rychlost = 70 / pohled.priblizeni;      // °/s
    if (klavesy.has('ArrowLeft')) pohled.yaw += (rychlost * dt) / 1000;
    if (klavesy.has('ArrowRight')) pohled.yaw -= (rychlost * dt) / 1000;
    if (klavesy.has('ArrowUp')) pohled.sklon += (rychlost * 0.7 * dt) / 1000;
    if (klavesy.has('ArrowDown')) pohled.sklon -= (rychlost * 0.7 * dt) / 1000;
    dal = true;
  }
  // setrvačnost po tažení
  if (!tazeni && (Math.abs(pohled.vYaw) > 0.002 || Math.abs(pohled.vSklon) > 0.002)) {
    pohled.yaw += pohled.vYaw * dt;
    pohled.sklon += pohled.vSklon * dt;
    const utlum = Math.exp(-dt / 260);
    pohled.vYaw *= utlum;
    pohled.vSklon *= utlum;
    dal = true;
  } else if (!tazeni) {
    pohled.vYaw = pohled.vSklon = 0;
  }
  for (const a of [...animace]) {
    if (a(cas)) dal = true; else animace.delete(a);
  }
  aktualizujKameru();
  renderer.render(scena, kamera);
  aktualizujPopisky();
  aktualizujMinimapu();
  if (dal) prekresli(); else posledniCas = 0;
}

/** Animace hodnoty v čase; vrací Promise po skončení. */
function animuj(trvani, krokFn) {
  return new Promise((hotovo) => {
    if (trvani <= 0) { krokFn(1); prekresli(); hotovo(); return; }
    let start = null;
    const fn = (cas) => {
      if (start === null) start = cas;
      const t = omez((cas - start) / trvani, 0, 1);
      krokFn(t);
      if (t >= 1) { hotovo(); return false; }
      return true;
    };
    animace.add(fn);
    prekresli();
  });
}
function otocNa(yaw, sklon, trvani = 420) {
  const y0 = pohled.yaw, s0 = pohled.sklon;
  const dy = normUhel(yaw - y0);
  pohled.vYaw = pohled.vSklon = 0;
  const t = omezitPohyb ? 0 : trvani * omez(Math.abs(dy) / 90, 0.45, 1.3);
  return animuj(t, (u) => {
    const e = plynule(u);
    pohled.yaw = y0 + dy * e;
    pohled.sklon = s0 + (sklon - s0) * e;
  });
}

// ------------------------------------------------------------------------------------------- textury panoramat
const textury = new Map();   // id -> Promise<Texture>
function textura(id) {
  if (textury.has(id)) return textury.get(id);
  const u = UZLY.get(id);
  const p = new Promise((hotovo, chyba) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = async () => {
      try { if (img.decode) await img.decode(); } catch (_) { /* dekódování proběhlo při načtení */ }
      let zdroj = img;
      const max = renderer.capabilities.maxTextureSize || 4096;
      if (img.naturalWidth > max) {      // slabší zařízení: zmenšit na nejvyšší podporovanou šířku
        const c = document.createElement('canvas');
        c.width = max; c.height = max / 2;
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        zdroj = c;
      }
      const t = new THREE.Texture(zdroj);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      t.generateMipmaps = true;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.needsUpdate = true;
      hotovo(t);
    };
    img.onerror = () => chyba(new Error('Panorama ' + id + ' se nepodařilo načíst (' + u.pano.soubor + ')'));
    img.src = u.pano.soubor;
  });
  p.catch(() => textury.delete(id));
  textury.set(id, p);
  return p;
}
/** Drží v paměti jen aktuální panoráma a sousedy (mobilní GPU). */
function uklidTextury() {
  if (TEST) return;   // test drží všechna panoramata (načtená během načítání stránky)
  const drzet = new Set([aktualni, ...(HRANY_Z.get(aktualni) || []).map((h) => h.do)]);
  for (const [id, p] of textury) {
    if (drzet.has(id)) continue;
    textury.delete(id);
    p.then((t) => t.dispose()).catch(() => {});
  }
}
function prednactiSousedy() {
  const sousede = (HRANY_Z.get(aktualni) || []).map((h) => h.do);
  let i = 0;
  const dalsi = () => { if (i < sousede.length) textura(sousede[i++]).then(dalsi, dalsi); };
  setTimeout(dalsi, 250);
}

// ------------------------------------------------------------------------------------------- hotspoty (DOM popisky + 3D šipky)
let hotspoty = [];   // { hrana, skupina, tlacitko, geometrie }
const IKONA_SIPKY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5 M6 11l6-6 6 6"/></svg>';
function postavHotspoty() {
  for (const h of hotspoty) { skupinaSipek.remove(h.skupina); h.skupina.traverse((o) => o.material?.dispose?.()); h.tlacitko.remove(); }
  hotspoty = [];
  for (const hrana of HRANY_Z.get(aktualni) || []) {
    const cil = UZLY.get(hrana.do);
    const skupina = vytvorSipku(hrana);
    skupinaSipek.add(skupina);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hotspot';
    b.dataset.cil = cil.id;
    b.setAttribute('aria-label', `Přejít do místnosti ${cil.nazev} (${cil.poradi})`);
    b.innerHTML = `<span class="hs-ikona">${IKONA_SIPKY}</span><span class="hs-text"></span>`;
    b.querySelector('.hs-text').textContent = cil.nazev;
    const hs = { hrana, skupina, tlacitko: b, geometrie: skupina.userData.geometrie };
    b.addEventListener('click', () => vejdi(hs));
    b.addEventListener('focus', () => {
      zvyrazni(hs, true);
      if (!prechod && b.matches(':focus-visible')) otocNa(hs.geometrie.yaw, omez(hs.geometrie.sklon * 0.5, -28, -8));
    });
    b.addEventListener('blur', () => zvyrazni(hs, false));
    b.addEventListener('pointerenter', () => zvyrazni(hs, true));
    b.addEventListener('pointerleave', () => { if (document.activeElement !== b) zvyrazni(hs, false); });
    el.hotspoty.appendChild(b);
    hotspoty.push(hs);
  }
}
function zvyrazni(hs, ano) {
  hs.zvyrazneno = ano;
  hs.tlacitko.classList.toggle('aktivni', ano);
  for (const m of hs.skupina.userData.barevne) m.material.color.copy(ano ? BARVA_AKTIVNI : BARVA_SIPKY);
  hs.skupina.userData.disk.material.opacity = ano ? 0.38 : 0.2;
  hs.skupina.scale.setScalar(ano ? 1.12 : 1);
  prekresli();
}
const vProjekce = new THREE.Vector3();
function aktualizujPopisky() {
  const W = el.koren.clientWidth, H = el.koren.clientHeight;
  const dole = H - (W <= 700 ? 150 : 120);         // nad seznamem místností / minimapou
  for (const hs of hotspoty) {
    vProjekce.copy(hs.skupina.position);
    const predKamerou = vProjekce.clone().normalize().dot(smerPohledu) > 0.05;
    vProjekce.project(kamera);
    const b = hs.tlacitko;
    const w = b.offsetWidth || 120, h = b.offsetHeight || 36;
    let x = (vProjekce.x * 0.5 + 0.5) * W;
    let y = (-vProjekce.y * 0.5 + 0.5) * H - 34;
    const vidno = predKamerou && x > -w * 0.25 && x < W + w * 0.25 && y > -h;
    let pod = false;
    if (y > dole) { y = dole; pod = true; }
    b.classList.toggle('mimo', !vidno);
    b.classList.toggle('pod', vidno && pod);
    x = omez(x, w / 2 + 6, W - w / 2 - 6);
    b.style.transform = `translate3d(${Math.round(x - w / 2)}px, ${Math.round(y - h)}px, 0)`;
  }
}

// ------------------------------------------------------------------------------------------- přechod mezi uzly
function vejdi(hs) {
  if (prechod) return;
  jdiNa(hs.hrana.do, { zpusob: 'sipka', hrana: hs.hrana });
}
async function jdiNa(cilId, { zpusob = 'skok', hrana = null } = {}) {
  if (prechod || !UZLY.has(cilId)) return false;
  if (cilId === aktualni) { ohlas(`Už jste v místnosti ${UZLY.get(cilId).nazev}.`); return false; }
  prechod = true;
  skryjTip();
  const fokusVHotspotu = el.hotspoty.contains(document.activeElement);   // přišel z klávesnice (Tab + Enter)
  const zdroj = UZLY.get(aktualni), cil = UZLY.get(cilId);
  const casovac = setTimeout(() => ukazZpravu('Načítám panoráma…', 0), 250);
  let tex;
  try {
    tex = await textura(cilId);
  } catch (err) {
    clearTimeout(casovac);
    ukazZpravu('Panoráma se nepodařilo načíst. Zkuste to prosím znovu.');
    console.error(err.message);
    prechod = false;
    return false;
  }
  clearTimeout(casovac);
  skryjZpravu();
  const smer = hrana ? geometrieHrany(hrana).yaw : smerMeziUzly(zdroj, cil);
  if (zpusob === 'sipka') await otocNa(smer, omez(pohled.sklon, -14, 6), 380);
  el.hotspoty.classList.add('skryte');
  skupinaSipek.visible = false;
  kouleDalsi.material.map = tex;
  kouleDalsi.material.opacity = 0;
  kouleDalsi.material.needsUpdate = true;
  kouleDalsi.visible = true;
  const cesta = new THREE.Vector3((cil.x - zdroj.x) / 1000, 0, -(cil.y - zdroj.y) / 1000);
  const D = cesta.length();
  cesta.normalize();
  const posun = omezitPohyb ? 0 : Math.min(D, 3.4) * (zpusob === 'sipka' ? 1 : 0.55);
  const trvani = omezitPohyb ? 200 : zpusob === 'sipka' ? 950 : 750;
  const y0 = pohled.yaw, dYaw = zpusob === 'sipka' || omezitPohyb ? 0 : normUhel(smer - y0);
  if (omezitPohyb && zpusob !== 'sipka') pohled.yaw = smer;
  await animuj(trvani, (t) => {
    const e = plynule(t);
    koule.position.copy(cesta).multiplyScalar(-posun * e);
    kouleDalsi.position.copy(cesta).multiplyScalar(posun * (1 - e));
    kouleDalsi.material.opacity = krok(0.08, 0.85, t);
    if (dYaw) pohled.yaw = y0 + dYaw * e;
  });
  koule.material.map = tex;
  koule.material.needsUpdate = true;
  koule.position.set(0, 0, 0);
  kouleDalsi.visible = false;
  kouleDalsi.position.set(0, 0, 0);
  kouleDalsi.material.map = null;
  nastavUzel(cilId);
  if (fokusVHotspotu) el.pohled.focus({ preventScroll: true });   // tlačítko zmizelo; další Tab = hotspoty nového uzlu
  skupinaSipek.visible = true;
  el.hotspoty.classList.remove('skryte');
  prechod = false;
  prekresli();
  return true;
}

function nastavUzel(id) {
  aktualni = id;
  const u = UZLY.get(id);
  el.mistnost.textContent = u.nazev;
  el.poradi.textContent = `${u.poradi} / ${PORADI.length}`;
  document.title = `${u.nazev} – virtuální prohlídka bytu A`;
  for (const b of el.seznam.querySelectorAll('button')) {
    const je = b.dataset.uzel === id;
    b.setAttribute('aria-current', String(je));
    if (je) {      // seznam místností na telefonu roluje: aktuální místnost do zorného pole
      const ol = el.seznam, l = b.offsetLeft, r = l + b.offsetWidth;
      if (l < ol.scrollLeft || r > ol.scrollLeft + ol.clientWidth) {
        ol.scrollTo({ left: Math.max(0, l - (ol.clientWidth - b.offsetWidth) / 2), behavior: omezitPohyb || TEST ? 'auto' : 'smooth' });
      }
    }
  }
  for (const b of el.mmUzly.querySelectorAll('button')) {
    const je = b.dataset.uzel === id;
    b.classList.toggle('aktualni', je);
    b.setAttribute('aria-current', String(je));
  }
  postavHotspoty();
  const sousede = (HRANY_Z.get(id) || []).map((h) => UZLY.get(h.do).nazev);
  ohlas(`${u.nazev}. Průchody: ${sousede.join(', ')}.`);
  if (!TEST) { try { history.replaceState(null, '', '#' + id); } catch (_) { /* file:// v některých prohlížečích */ } }
  uklidTextury();
  prednactiSousedy();
}

async function nactiAZobraz(id) {
  const tex = await textura(id);
  koule.material.map = tex;
  koule.material.needsUpdate = true;
  koule.visible = true;
  nastavUzel(id);
  prekresli();
}

// ------------------------------------------------------------------------------------------- minimapa
const MM = DATA.minimapa;
const mmX = (x) => ((x - MM.x0) / (MM.x1 - MM.x0)) * MM.sirka_px;
const mmY = (y) => ((MM.y1 - y) / (MM.y1 - MM.y0)) * MM.vyska_px;
function postavMinimapu() {
  el.mmObraz.src = MM.soubor;
  el.mmObraz.width = MM.sirka_px;
  el.mmObraz.height = MM.vyska_px;
  el.mmKuzel.setAttribute('viewBox', `0 0 ${MM.sirka_px} ${MM.vyska_px}`);
  el.mmKuzel.innerHTML = '<path class="kuzel" d=""/>';
  for (const u of UZLY.values()) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mm-uzel';
    b.dataset.uzel = u.id;
    b.textContent = String(u.poradi);
    b.title = `${u.poradi} · ${u.nazev}`;
    b.setAttribute('aria-label', `${u.nazev} (${u.poradi}) – přejít sem`);
    b.style.left = `${(mmX(u.x) / MM.sirka_px) * 100}%`;
    b.style.top = `${(mmY(u.y) / MM.vyska_px) * 100}%`;
    b.addEventListener('click', () => jdiNa(u.id, { zpusob: 'skok' }));
    el.mmUzly.appendChild(b);
  }
  for (const u of UZLY.values()) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.uzel = u.id;
    b.innerHTML = `<span class="cislo" aria-hidden="true">${u.poradi}</span><span></span>`;
    b.lastChild.textContent = u.nazev;
    b.setAttribute('aria-label', `${u.nazev} (klávesa ${u.poradi})`);
    b.addEventListener('click', () => jdiNa(u.id, { zpusob: 'skok' }));
    li.appendChild(b);
    el.seznam.appendChild(li);
  }
}
let posledniKuzel = '';
function aktualizujMinimapu() {
  if (!aktualni) return;
  const u = UZLY.get(aktualni);
  const cx = mmX(u.x), cy = mmY(u.y);
  const pul = Math.min(vodorovnyFov(), 170) / 2;
  const r = 1900 / ((MM.x1 - MM.x0) / MM.sirka_px);        // 1,9 m v pixelech minimapy
  const bod = (uhel) => `${(cx + r * Math.cos(uhel * RAD)).toFixed(1)},${(cy - r * Math.sin(uhel * RAD)).toFixed(1)}`;
  const d = `M${cx.toFixed(1)},${cy.toFixed(1)} L${bod(pohled.yaw + pul)} A${r.toFixed(1)},${r.toFixed(1)} 0 0 1 ${bod(pohled.yaw - pul)} Z`;
  if (d !== posledniKuzel) {
    el.mmKuzel.firstChild.setAttribute('d', d);
    posledniKuzel = d;
  }
  el.mmJsteZde.style.left = `${(cx / MM.sirka_px) * 100}%`;
  el.mmJsteZde.style.top = `${(cy / MM.vyska_px) * 100}%`;
}

// ------------------------------------------------------------------------------------------- ovládání: myš, prst, kolečko
let tazeni = null;               // { id, x, y, t, posun }
const ukazatele = new Map();     // pointerId -> {x, y}
let stipnuti = null;             // { vzdalenost, priblizeni }
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function zasahSipky(clientX, clientY) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(ndc, kamera);
  const cile = hotspoty.map((h) => h.skupina.userData.zasah);
  const z = raycaster.intersectObjects(cile, false)[0];
  return z ? hotspoty.find((h) => h.skupina === z.object.userData.skupina) : null;
}
el.pohled.addEventListener('pointerdown', (e) => {
  if (e.button !== undefined && e.button > 0) return;
  skryjTip();
  ukazatele.set(e.pointerId, { x: e.clientX, y: e.clientY });
  try { el.pohled.setPointerCapture(e.pointerId); } catch (_) { /* syntetické události */ }
  if (ukazatele.size === 2) {
    const [a, b] = [...ukazatele.values()];
    stipnuti = { vzdalenost: Math.hypot(a.x - b.x, a.y - b.y) || 1, priblizeni: pohled.priblizeni };
    tazeni = null;
    return;
  }
  tazeni = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now(), posun: 0 };
  pohled.vYaw = pohled.vSklon = 0;
  el.pohled.classList.add('tazeni');
});
el.pohled.addEventListener('pointermove', (e) => {
  if (ukazatele.has(e.pointerId)) ukazatele.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (stipnuti && ukazatele.size >= 2) {
    const [a, b] = [...ukazatele.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    pohled.priblizeni = omez(stipnuti.priblizeni * (d / stipnuti.vzdalenost), PRIBLIZENI.min, PRIBLIZENI.max);
    prekresli();
    return;
  }
  if (!tazeni || tazeni.id !== e.pointerId) {
    if (e.pointerType === 'mouse' && !prechod) {
      const hs = zasahSipky(e.clientX, e.clientY);
      el.pohled.classList.toggle('nad-sipkou', !!hs);
      for (const h of hotspoty) if ((h === hs) !== !!h.zvyrazneno && document.activeElement !== h.tlacitko) zvyrazni(h, h === hs);
    }
    return;
  }
  const nyni = performance.now();
  const dx = e.clientX - tazeni.x, dy = e.clientY - tazeni.y;
  const naPixel = aktualniFov() / el.koren.clientHeight;      // stupně na pixel (obraz jde s prstem)
  pohled.yaw += dx * naPixel;
  pohled.sklon += dy * naPixel;
  const dt = Math.max(1, nyni - tazeni.t);
  const vy = (dx * naPixel) / dt, vs = (dy * naPixel) / dt;
  const VMAX = 0.5;                                              // °/ms – strop rychlosti dobíhání
  pohled.vYaw = omez(pohled.vYaw * 0.6 + vy * 0.4, -VMAX, VMAX);
  pohled.vSklon = omez(pohled.vSklon * 0.6 + vs * 0.4, -VMAX, VMAX);
  tazeni.posun += Math.abs(dx) + Math.abs(dy);
  tazeni.x = e.clientX; tazeni.y = e.clientY; tazeni.t = nyni;
  prekresli();
});
function konecTazeni(e) {
  ukazatele.delete(e.pointerId);
  if (ukazatele.size < 2) stipnuti = null;
  if (!tazeni || tazeni.id !== e.pointerId) return;
  const klik = tazeni.posun < 7 && e.type === 'pointerup';
  const odDaleka = performance.now() - tazeni.t > 90;     // prst se před puštěním zastavil -> bez setrvačnosti
  tazeni = null;
  el.pohled.classList.remove('tazeni');
  if (klik) {
    pohled.vYaw = pohled.vSklon = 0;
    const hs = zasahSipky(e.clientX, e.clientY);
    if (hs) vejdi(hs);
    return;
  }
  if (omezitPohyb || odDaleka) pohled.vYaw = pohled.vSklon = 0;
  prekresli();
}
el.pohled.addEventListener('pointerup', konecTazeni);
el.pohled.addEventListener('pointercancel', konecTazeni);
el.pohled.addEventListener('wheel', (e) => {
  e.preventDefault();
  skryjTip();
  const d = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
  pohled.priblizeni = omez(pohled.priblizeni * Math.exp(-d * 0.0016), PRIBLIZENI.min, PRIBLIZENI.max);
  prekresli();
}, { passive: false });
for (const t of ['gesturestart', 'gesturechange']) el.pohled.addEventListener(t, (e) => e.preventDefault());

function priblizKrokem(nasobek) {
  const z0 = pohled.priblizeni, z1 = omez(z0 * nasobek, PRIBLIZENI.min, PRIBLIZENI.max);
  return animuj(omezitPohyb ? 0 : 220, (t) => { pohled.priblizeni = z0 + (z1 - z0) * plynule(t); });
}
el.btnPlus.addEventListener('click', () => priblizKrokem(1.3));
el.btnMinus.addEventListener('click', () => priblizKrokem(1 / 1.3));

// ------------------------------------------------------------------------------------------- klávesnice
const klavesy = new Set();
const SIPKY = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
document.addEventListener('keydown', (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const k = e.key;
  if (k === 'Escape' && !el.napoveda.hidden) { prepniNapovedu(false); el.btnNapoveda.focus(); return; }
  if (SIPKY.has(k)) {
    e.preventDefault();
    skryjTip();
    pohled.vYaw = pohled.vSklon = 0;
    klavesy.add(k);
    prekresli();
    return;
  }
  if (e.repeat) return;
  if (k === '+' || k === '=' || k === 'Add') { priblizKrokem(1.3); return; }
  if (k === '-' || k === '_' || k === 'Subtract' || k === '−') { priblizKrokem(1 / 1.3); return; }
  if (/^[1-9]$/.test(k)) {
    const id = PORADI[Number(k) - 1];
    if (id) { e.preventDefault(); jdiNa(id, { zpusob: 'skok' }); }
    return;
  }
  if ((k === 'f' || k === 'F') && !el.btnCela.hidden) { prepniCelouObrazovku(); return; }
  if (k === '?' || k === 'h' || k === 'H') { prepniNapovedu(); }
});
document.addEventListener('keyup', (e) => { klavesy.delete(e.key); });
window.addEventListener('blur', () => klavesy.clear());

// ------------------------------------------------------------------------------------------- tlačítka, celá obrazovka, nápověda
const celaPodpora = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
el.btnCela.hidden = !celaPodpora;
function jeCela() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
async function prepniCelouObrazovku() {
  try {
    if (jeCela()) {
      await (document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen());
    } else {
      const c = document.documentElement;
      const r = c.requestFullscreen ? c.requestFullscreen({ navigationUI: 'hide' }) : c.webkitRequestFullscreen();
      if (r && r.then) await r;
    }
  } catch (_) {
    ukazZpravu('Celá obrazovka teď není dostupná (např. ve vloženém okně).');
  }
}
function poZmeneCele() {
  const ano = jeCela();
  el.btnCela.classList.toggle('aktivni', ano);
  el.btnCelaText.textContent = ano ? 'Ukončit celou obrazovku' : 'Celá obrazovka';
  el.btnCela.title = ano ? 'Ukončit celou obrazovku (F)' : 'Celá obrazovka (klávesa F)';
}
document.addEventListener('fullscreenchange', poZmeneCele);
document.addEventListener('webkitfullscreenchange', poZmeneCele);
el.btnCela.addEventListener('click', prepniCelouObrazovku);

function prepniNapovedu(stav) {
  const otevrit = stav === undefined ? el.napoveda.hidden : stav;
  el.napoveda.hidden = !otevrit;
  el.btnNapoveda.setAttribute('aria-expanded', String(otevrit));
  if (otevrit) { skryjTip(); el.btnNapovedaZavrit.focus(); }
}
el.btnNapoveda.addEventListener('click', () => prepniNapovedu());
el.btnNapovedaZavrit.addEventListener('click', () => { prepniNapovedu(false); el.btnNapoveda.focus(); });

function prepniPudorys(stav) {
  const zobrazit = stav === undefined ? el.minimapa.hidden : stav;
  el.minimapa.hidden = !zobrazit;
  el.btnPudorys.setAttribute('aria-expanded', String(zobrazit));
  prekresli();
}
el.btnPudorys.addEventListener('click', () => prepniPudorys());
el.btnMmVelikost.addEventListener('click', () => {
  const velka = el.minimapa.classList.toggle('velka');
  el.btnMmVelikost.setAttribute('aria-pressed', String(velka));
  el.btnMmVelikost.title = velka ? 'Zmenšit půdorys' : 'Zvětšit půdorys';
  el.btnMmVelikost.querySelector('.sr-only').textContent = velka ? 'Zmenšit půdorys' : 'Zvětšit půdorys';
});

// ------------------------------------------------------------------------------------------- zprávy, tip, chyby
let casZpravy = 0;
function ukazZpravu(text, trvani = 3200) {
  el.zprava.textContent = text;
  el.zprava.classList.add('viditelna');
  clearTimeout(casZpravy);
  if (trvani) casZpravy = setTimeout(skryjZpravu, trvani);
}
function skryjZpravu() { el.zprava.classList.remove('viditelna'); }
function ohlas(text) { el.hlaseni.textContent = text; }
let tipZobrazen = false;
function ukazTip() {
  if (TEST) return;
  el.tip.hidden = false;
  tipZobrazen = true;
  setTimeout(skryjTip, 8000);
}
function skryjTip() {
  if (!tipZobrazen) return;
  tipZobrazen = false;
  el.tip.classList.add('mizi');
  setTimeout(() => { el.tip.hidden = true; }, 600);
}
function zobrazChybu(text) {
  el.nacitani.classList.remove('hotovo');
  el.nacitani.classList.add('chyba');
  el.nacitaniText.textContent = text;
}

// ------------------------------------------------------------------------------------------- velikost okna
function zmenaVelikosti() {
  const w = el.koren.clientWidth, h = el.koren.clientHeight;
  renderer.setSize(w, h, false);
  kamera.aspect = w / Math.max(1, h);
  prekresli();
}
new ResizeObserver(zmenaVelikosti).observe(el.koren);
zmenaVelikosti();

// ------------------------------------------------------------------------------------------- start
function startovniPohled(id) {
  const u = UZLY.get(id);
  if (id === DATA.start.uzel) {
    pohled.yaw = smerMeziUzly(u, { x: DATA.start.pohled[0], y: DATA.start.pohled[1] });
  } else {
    const h = (HRANY_Z.get(id) || [])[0];
    pohled.yaw = h ? geometrieHrany(h).yaw : 90;
  }
  pohled.sklon = DATA.start.sklon;
}

async function start() {
  // Kontrolní skript běží ve virtuálním čase, který čeká jen na zdroje načítané během načítání stránky:
  // v testu se proto všechna panoramata začnou načítat hned.
  if (TEST === 'interakce') for (const id of PORADI) textura(id).catch(() => {});
  postavMinimapu();
  const zHashe = decodeURIComponent((location.hash || '').slice(1));
  let id = parametry.get('uzel') || (UZLY.has(zHashe) ? zHashe : DATA.start.uzel);
  if (!UZLY.has(id)) id = DATA.start.uzel;
  startovniPohled(id);
  if (parametry.has('yaw')) pohled.yaw = Number(parametry.get('yaw'));
  if (parametry.has('sklon')) pohled.sklon = Number(parametry.get('sklon'));
  if (parametry.has('priblizeni')) pohled.priblizeni = omez(Number(parametry.get('priblizeni')), PRIBLIZENI.min, PRIBLIZENI.max);
  try {
    await nactiAZobraz(id);
  } catch (err) {
    zobrazChybu(location.protocol === 'file:'
      ? 'Panoráma nejde načíst přímo ze souboru na disku. Otevřete prohlídku přes webovou stránku.'
      : 'Panoráma se nepodařilo načíst. Zkuste stránku načíst znovu.');
    console.error(err.message || err);
    return;
  }
  el.nacitani.classList.add('hotovo');
  setTimeout(() => { el.nacitani.hidden = true; }, 700);
  ukazTip();
  if (TEST) spustTest();
}

// ------------------------------------------------------------------------------------------- testovací rozhraní (jen ?test=…)
function testApi() {
  return {
    data: DATA,
    stav: () => ({ uzel: aktualni, yaw: pohled.yaw, sklon: pohled.sklon, fov: aktualniFov(), hfov: vodorovnyFov(),
      priblizeni: pohled.priblizeni, prechod, omezitPohyb, vYaw: pohled.vYaw }),
    jdiNa, otocNa, geometrieHrany, priblizeni: PRIBLIZENI,
    nastavPohled: (yaw, sklon) => { pohled.yaw = yaw; pohled.sklon = sklon; pohled.vYaw = pohled.vSklon = 0; prekresli(); },
    hotspoty: () => hotspoty.map((h) => ({ cil: h.hrana.do, tlacitko: h.tlacitko, yaw: h.geometrie.yaw, sklon: h.geometrie.sklon })),
    platno: renderer.domElement,
    pockej: (ms) => new Promise((r) => setTimeout(r, ms)),
    snimek: () => new Promise((r) => { prekresli(); setTimeout(r, 60); }),
    textura,
  };
}
async function spustTest() {
  window.__prohlidka = testApi();
  const vysledek = document.createElement('pre');
  vysledek.id = 'test-vysledek';
  vysledek.hidden = true;
  let out;
  try {
    if (TEST === 'snimek') {
      if (parametry.get('fokus')) {          // snímek viditelného zaměření (klávesnice)
        const b = el.hotspoty.querySelector(`.hotspot[data-cil="${parametry.get('fokus')}"]`);
        if (b) b.focus({ preventScroll: true });
        await new Promise((r) => setTimeout(r, 700));
      }
      await window.__prohlidka.snimek();
      await new Promise((r) => setTimeout(r, 300));
      await window.__prohlidka.snimek();
      out = {
        test: 'snimek', uzel: aktualni, yaw: +pohled.yaw.toFixed(1), sklon: +pohled.sklon.toFixed(1),
        hotspoty: hotspoty.map((h) => ({ cil: h.hrana.do, yaw: +h.geometrie.yaw.toFixed(1), sklon: +h.geometrie.sklon.toFixed(1),
          viditelny: !h.tlacitko.classList.contains('mimo'), pod: h.tlacitko.classList.contains('pod') })),
      };
    } else {
      const m = await import('./test/test.js');
      out = await m.spust(window.__prohlidka);
    }
  } catch (err) {
    out = { test: TEST, vyjimka: String(err && err.stack || err) };
  }
  out.viewport = `${window.innerWidth}×${window.innerHeight}`;
  out.chyby_konzole = (window.__chyby || []).slice();
  out.varovani_konzole = (window.__varovani || []).slice();
  out.ok = !out.vyjimka && out.chyby_konzole.length === 0 && (out.kontroly ? out.kontroly.every((k) => k.ok) : true);
  vysledek.textContent = JSON.stringify(out);
  document.body.appendChild(vysledek);
  if (window.parent !== window) window.parent.postMessage({ prohlidkaTest: vysledek.textContent }, '*');   // test/mobil.html
  jenRaf = true;
  prekresli();
}

start();
