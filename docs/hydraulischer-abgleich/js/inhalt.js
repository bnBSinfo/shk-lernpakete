/* =====================================================================
   IM GLEICHGEWICHT – Hydraulischer Abgleich (Version 0.2)
   Spielmodus: Haus-Simulator. Räume zusammenstellen, Heizflächen wählen,
   Thermostate drehen, Voreinstellung und Pumpe einstellen, Abgleich prüfen.

   Rechenmodell (vereinfacht, für den Unterricht – fachlich von der Lehrkraft prüfen):
   - Pumpe Δp-konstant: Förderhöhe H (1 m ≙ 100 mbar) liegt an jedem Raumzweig an.
   - Zweigwiderstand R = R_Ventil + R_Heizfläche + R_Rohr; Δp = R · V²  (mbar, l/h).
     R_Ventil = 1 / (1000 · (kv · Hub)²), kv aus der Voreinstellung 1 … 6 / N.
     Rohrnetz passend zur Heizlast bemessen: bei Soll-Volumenstrom 32 mbar je 6 m Leitungsweg.
     FBH: ein Heizkreis je angefangene 12 m², alle Kreise mit gleicher Einstellung parallel.
   - Heizlast Q = Fläche · 60 W/m² · (θi − θe)/(20 − θe), θe = −12 °C.
   - Soll-Volumenstrom V = Q / (1,163 · ΔT); ΔT: Heizkörper 55/45, FBH 35/30.
   - Wärmeabgabe in Abhängigkeit vom Volumenstrom: q(x) = (1 − e^(−a·x)) / (1 − e^(−a)).
   - Thermostat als P-Regler: Hub 100 % bei 0,5 K unter Soll, 0 % bei 1 K über Soll.
   ===================================================================== */

var HY = (function () {
  var TA = -12, Q_SPEZ = 60, DP_WEG = 32;   // Rohrnetz: Druckverlust bei Soll-Volumenstrom je Wegeinheit (mbar)
  var WEG = [1, 2, 3, 4, 5, 6, 8, 10];           // Leitungsweg je Platz (EG 0–3, OG 4–7), × 6 m
  var ARTEN = {
    wohn: { name: 'Wohnzimmer', sym: '🛋️', t: 20, a: 30 }, kueche: { name: 'Küche', sym: '🍳', t: 20, a: 14 },
    schlaf: { name: 'Schlafzimmer', sym: '🛏️', t: 20, a: 16 }, kind: { name: 'Kinderzimmer', sym: '🧸', t: 20, a: 14 },
    bad: { name: 'Bad', sym: '🛁', t: 24, a: 9 }, buero: { name: 'Büro', sym: '💻', t: 20, a: 12 }, flur: { name: 'Flur', sym: '🚪', t: 16, a: 10 } };
  var HEIZ = {
    hk: { name: 'Heizkörper', kurz: 'HK', vl: 55, rl: 45, re: 3.4e-4, a: 3.5 },
    bhk: { name: 'Badheizkörper', kurz: 'BHK', vl: 55, rl: 45, re: 8.5e-4, a: 3.5 },
    fbh: { name: 'Fußbodenheizung', kurz: 'FBH', vl: 35, rl: 30, re: 8.5e-3, a: 2.5 } };
  var KV = [0.031, 0.054, 0.084, 0.13, 0.19, 0.29, 0.61];   // Voreinstellung 1 … 6, 7 = N (Übungsventil)
  function begrenze(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function kv(v) { v = begrenze(v, 1, 7); var i = Math.min(5, Math.floor(v) - 1), f = v - 1 - i; return KV[i] * Math.pow(KV[i + 1] / KV[i], f); }
  function vorAus(k) { if (k <= KV[0]) return 1; if (k >= KV[6]) return 7; for (var i = 0; i < 6; i++) if (k <= KV[i + 1]) return 1 + i + Math.log(k / KV[i]) / Math.log(KV[i + 1] / KV[i]); return 7; }
  function solltemp(s) { return s < 1 ? 6 : 12 + (s - 1) * 4; }
  function heizlast(r) { var A = ARTEN[r.art]; return Math.round(r.flaeche * Q_SPEZ * (A.t - TA) / (20 - TA) / 10) * 10; }
  function spreizung(r) { var H = HEIZ[r.heiz]; return H.vl - H.rl; }
  function vsoll(r) { return heizlast(r) / (1.163 * spreizung(r)); }
  function kreise(r) { return r.heiz === 'fbh' ? Math.max(1, Math.ceil(r.flaeche / 12)) : 1; }   // FBH: ein Heizkreis je angefangene 12 m²
  function rHeiz(r) { return HEIZ[r.heiz].re / Math.pow(kreise(r), 2); }
  function rRohr(r, platz) { return DP_WEG * WEG[platz] / Math.pow(vsoll(r), 2); }   // Rohr passend zur Heizlast bemessen
  function rVentil(r, hub) { return hub < 0.001 ? Infinity : 1 / (1000 * Math.pow(kv(r.vor) * hub * kreise(r), 2)); }
  function qr(x, a) { return x <= 0 ? 0 : (1 - Math.exp(-a * x)) / (1 - Math.exp(-a)); }
  function zweig(r, platz, H, koepfeAb) {
    var Td = ARTEN[r.art].t, T = Td, h = 1, V = 0, rv = Infinity, x = 0, vs = vsoll(r), Tn = Td;
    function schritt(Tr) {   // Temperatur, die sich bei Raumtemperatur Tr einstellen würde
      h = koepfeAb ? 1 : begrenze((solltemp(r.thermo) + 1 - Tr) / 1.5, 0, 1);
      rv = rVentil(r, h);
      var R = rv + rHeiz(r) + rRohr(r, platz);
      V = isFinite(R) ? Math.sqrt(H / R) : 0;
      x = V / vs;
      return TA + (Td - TA) * qr(x, HEIZ[r.heiz].a);
    }
    if (koepfeAb) T = schritt(Td);
    else {   // Gleichgewicht Thermostat ↔ Raum: Intervallhalbierung (f(T) = schritt(T) − T fällt monoton)
      var lo = TA, hi = Td + 6;
      for (var it = 0; it < 40; it++) { T = (lo + hi) / 2; Tn = schritt(T); if (Tn > T) lo = T; else hi = T; }
      T = (lo + hi) / 2; schritt(T);
    }
    var dpv = isFinite(rv) ? V * V * rv : H;
    return { V: V, vs: vs, x: x, h: h, T: T, Td: Td, dpv: dpv, pfeift: !koepfeAb && h < 0.35 && dpv > 150 };
  }
  function rechne(haus, koepfeAb) {
    var H = haus.pumpe * 100, Vt = 0;
    var raeume = haus.plaetze.map(function (r, i) { if (!r) return null; var e = zweig(r, i, H, koepfeAb); Vt += e.V; return e; });
    return { raeume: raeume, H: H, V: Vt, watt: Vt ? Math.round(3 + H * 100 * Vt / 3.6e6 / 0.3) : 0 };
  }
  function noetigePumpe(haus) {
    var n = 0;
    haus.plaetze.forEach(function (r, i) { if (r) n = Math.max(n, Math.pow(vsoll(r), 2) * (1 / (1000 * Math.pow(KV[6] * kreise(r), 2)) + rHeiz(r) + rRohr(r, i))); });
    return begrenze(Math.ceil(n / 50) / 2, 1, 6);
  }
  // Musterlösung: Pumpe so klein wie möglich, dann Voreinstellungen (Raster 0,25)
  function automatik(haus) {
    haus.pumpe = noetigePumpe(haus);
    var H = haus.pumpe * 100;
    haus.plaetze.forEach(function (r, i) {
      if (!r) return;
      var Rv = H / Math.pow(vsoll(r), 2) - rHeiz(r) - rRohr(r, i);
      r.vor = Rv <= 0 ? 7 : begrenze(Math.round(vorAus(1 / Math.sqrt(1000 * Rv) / kreise(r)) * 4) / 4, 1, 7);
    });
    return haus;
  }
  return { ARTEN: ARTEN, HEIZ: HEIZ, WEG: WEG, DP_WEG: DP_WEG, kreise: kreise, kv: kv, solltemp: solltemp, heizlast: heizlast, spreizung: spreizung, vsoll: vsoll, rechne: rechne, automatik: automatik, noetigePumpe: noetigePumpe, begrenze: begrenze };
})();

/* ---------- Satzanfänge (P16) – als HTML in Mitdenken- und Reflexionstexten ---------- */
function SATZ(liste, einfach) {
  return '<div class="st-satz"><b>' + (einfach ? 'So kannst du anfangen:' : 'Satzanfänge, wenn du sie brauchst:') + '</b><ul>' + liste.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div>';
}

/* ---------- Häuser ---------- */
function raum(art, flaeche, heiz, thermo, name) { return { art: art, flaeche: flaeche, heiz: heiz, thermo: thermo == null ? (art === 'bad' ? 4 : art === 'flur' ? 2 : 3) : thermo, vor: 7, name: name || null }; }
function hausYilmaz() {
  return { pumpe: 2, plaetze: [raum('wohn', 30, 'hk'), raum('kueche', 14, 'hk'), raum('flur', 10, 'hk'), raum('buero', 12, 'hk'),
    raum('schlaf', 16, 'hk'), raum('bad', 9, 'bhk'), raum('kind', 12, 'hk', 3, 'Kinderzimmer Mia'), raum('kind', 16, 'hk', 3, 'Kinderzimmer Can')] };
}
function hausFrei() {
  return { pumpe: 3, plaetze: [raum('wohn', 28, 'fbh'), raum('kueche', 12, 'fbh'), raum('flur', 8, 'hk'), null,
    raum('schlaf', 14, 'hk'), raum('bad', 8, 'bhk'), raum('kind', 12, 'hk'), null] };
}

/* ---------- Stil der Simulation ---------- */
(function () {
  var css = '' +
  '.hy{display:flex;flex-direction:column;gap:10px;padding:12px;font-size:.95rem}' +
  '.hy-tabs{display:flex;gap:6px;flex-wrap:wrap}.hy-tabs button{min-height:44px;font-weight:700}.hy-tabs button[aria-pressed="true"]{background:var(--accent-soft);border-color:var(--accent);color:var(--ink)}' +
  '.hy-hinweis{display:flex;gap:10px;align-items:center;background:var(--card);border:2px solid var(--accent);border-radius:12px;padding:8px 12px;min-height:56px}' +
  '.hy-hinweis .hy-fig{width:52px;flex:none}.hy-hinweis p{margin:0}' +
  '.hy-leiste{display:flex;flex-wrap:wrap;gap:8px;align-items:center}' +
  '.hy-leiste .hy-gruppe{display:flex;gap:4px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:4px 8px}' +
  '.hy-leiste button{min-height:42px;min-width:42px}.hy-leiste button[aria-pressed="true"]{background:var(--accent-soft);border-color:var(--accent);font-weight:700}' +
  '.hy-wert{font-weight:700;min-width:3.6em;text-align:center;font-variant-numeric:tabular-nums}' +
  '.hy-main{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:12px;align-items:start}' +
  '@media (max-width:860px){.hy-main{grid-template-columns:1fr}}' +
  '.hy-haus{position:relative;border-radius:12px;overflow:hidden;background:linear-gradient(#93c5fd,#dbeafe 45%,#eff6ff);padding:12px 12px 0}' +
  '.hy-wolke{position:absolute;top:10px;width:70px;height:22px;border-radius:20px;background:#fff;opacity:.85;box-shadow:24px -8px 0 -2px #fff}' +
  '.hy-dachz{position:relative;height:66px;margin:0 -8px}' +
  '.hy-dachz .flaeche{position:absolute;inset:0;clip-path:polygon(0 100%,50% 0,100% 100%);background:repeating-linear-gradient(0deg,#7c2d12 0 2px,transparent 2px 10px),repeating-linear-gradient(90deg,rgba(124,45,18,.55) 0 1px,transparent 1px 13px),linear-gradient(#dc6b2f,#9a3412)}' +
  '.hy-dachz .kamin{position:absolute;left:70%;top:4px;width:22px;height:38px;background:repeating-linear-gradient(0deg,#7f1d1d 0 1px,#b45348 1px 7px);border-top:4px solid #44403c}' +
  '.hy-dachz .luke{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);width:30px;height:24px;border-radius:15px 15px 2px 2px;background:linear-gradient(135deg,#e0f2fe,#7dd3fc);border:3px solid #fff;box-shadow:0 0 0 2px #78350f}' +
  '.hy-geb{background:repeating-linear-gradient(45deg,#a8a29e 0 2px,#e7e5e4 2px 7px);padding:0 10px;border-left:2px solid #57534e;border-right:2px solid #57534e}' +
  '.hy-stock{display:grid;grid-template-columns:22px repeat(4,minmax(0,1fr));gap:6px;padding:6px 0}' +
  '.hy-strang{position:relative;background:linear-gradient(90deg,transparent 3px,#dc2626 3px 8px,transparent 8px 12px,#2563eb 12px 17px,transparent 17px)}' +
  '.hy-strang .hy-et{position:absolute;top:2px;left:-6px;right:-6px;text-align:center;font-size:.68rem;font-weight:800;background:#fff;border:1px solid #57534e;border-radius:6px;color:#44403c}' +
  '.hy-decke{display:grid;grid-template-columns:22px 1fr;gap:6px;height:16px;margin:0 -10px;padding:0 10px;background:radial-gradient(#6b7280 1px,transparent 1.5px) 0 0/6px 6px,#9ca3af;border-top:1px solid #4b5563;border-bottom:1px solid #4b5563}' +
  '.hy-decke span:first-child{background:linear-gradient(90deg,transparent 3px,#dc2626 3px 8px,transparent 8px 12px,#2563eb 12px 17px,transparent 17px)}' +
  '.hy-decke span:last-child{background:linear-gradient(transparent 3px,#dc2626 3px 7px,transparent 7px 9px,#2563eb 9px 13px,transparent 13px)}' +
  '.hy-gras{height:10px;margin:0 -12px;background:linear-gradient(#84cc16,#4d7c0f);position:relative;z-index:1}' +
  '.hy-erde{margin:0 -12px;padding:0 22px 12px;background:radial-gradient(#78350f 1.5px,transparent 2px) 0 0/9px 9px,radial-gradient(#b45309 1px,transparent 1.5px) 4px 5px/11px 11px,#a16207}' +
  '.hy-keller{display:grid;grid-template-columns:22px auto 1fr;gap:6px;align-items:end;padding:0 10px 10px;background:repeating-linear-gradient(45deg,#78716c 0 2px,#d6d3d1 2px 7px);border:2px solid #44403c;border-top:none}' +
  '.hy-keller .innen{grid-column:2 / 4;display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;background:#e7e5e4;padding:4px 8px;border-radius:0 0 6px 6px}' +
  '.hy-keller .hy-strang{align-self:stretch;min-height:96px}' +
  '.hy-keller svg{display:block;width:250px;max-width:100%;height:auto}' +
  '.hy-keller .hy-ger{background:#fff;border:1px solid #9ca3af;border-radius:8px;padding:3px 8px;font-weight:700;color:#1f2937;font-size:.85rem}' +
  '.hy-raum{position:relative;display:flex;flex-direction:column;justify-content:space-between;min-height:172px;padding:0;border-radius:3px;border:3px solid #a8a29e;overflow:hidden;color:#1f2937;font:inherit;text-align:left;cursor:pointer;min-width:0;background:var(--wand,#fdf6e3)}' +
  '.hy-raum:hover{filter:brightness(1.03)}.hy-raum:focus-visible{outline:4px solid var(--accent);outline-offset:2px}' +
  '.hy-w-wohn{--wand:#fef3c7}.hy-w-kueche{--wand:linear-gradient(#f8fafc,#f8fafc) 0 0/100% 55% no-repeat,repeating-linear-gradient(0deg,#d1fae5 0 13px,#a7f3d0 13px 14px),repeating-linear-gradient(90deg,transparent 0 13px,#a7f3d0 13px 14px)}' +
  '.hy-w-schlaf{--wand:#ede9fe}.hy-w-kind{--wand:#fef9c3}.hy-w-buero{--wand:#f1f5f9}.hy-w-flur{--wand:#f5f5f4}' +
  '.hy-w-bad{--wand:repeating-linear-gradient(0deg,#e0f2fe 0 13px,#bae6fd 13px 14px),#e0f2fe}' +
  '.hy-raum.hy-w-bad{background:repeating-linear-gradient(90deg,transparent 0 13px,#bae6fd 13px 14px),repeating-linear-gradient(0deg,#f0f9ff 0 13px,#bae6fd 13px 14px)}' +
  '.hy-raum.hy-w-kueche{background:linear-gradient(#fffbeb,#fffbeb) top/100% 50% no-repeat,repeating-linear-gradient(90deg,transparent 0 13px,#a7f3d0 13px 14px),repeating-linear-gradient(0deg,#ecfdf5 0 13px,#a7f3d0 13px 14px)}' +
  '.hy-raum.hy-gewaehlt{outline:4px solid var(--accent);outline-offset:2px}' +
  '.hy-raum.hy-leer{align-items:center;justify-content:center;color:#57534e;border:3px dashed #a8a29e;background:repeating-linear-gradient(45deg,#f5f5f4 0 8px,#e7e5e4 8px 16px);font-weight:700}' +
  '.hy-info{position:relative;z-index:2;margin:5px 5px 0;padding:4px 6px;border-radius:8px;background:rgba(255,255,255,.9);display:flex;flex-direction:column;align-items:stretch;gap:2px;box-shadow:0 1px 3px rgba(0,0,0,.15);border:0;font:inherit;color:#1f2937;text-align:left;cursor:pointer;min-height:0}' +
  '.hy-th{position:absolute;left:30px;bottom:12px;z-index:3;display:flex;align-items:center;gap:1px}.hy-th.bhk{left:30px;bottom:16px}.hy-th.wand{left:50%;transform:translateX(-50%);bottom:14px;background:rgba(255,255,255,.7);border-radius:24px;padding:1px}' +
  '.hy-stapel{display:flex;flex-direction:column;gap:2px}.hy-stapel button{min-width:28px;width:28px;min-height:21px;height:21px;padding:0;font-size:.95rem;font-weight:800;border-radius:6px;line-height:1}' +
  '.hy-vt{position:absolute;right:4px;bottom:12px;z-index:3;display:flex;align-items:center;gap:1px}.hy-vt .ring{display:block;width:40px;height:40px;cursor:ns-resize;border-radius:50%}.hy-vt.aktiv .ring{box-shadow:0 0 0 3px var(--accent)}' +
  '.hy-th .knopf{display:block;width:44px;height:44px;cursor:ns-resize}' +
  '.hy-th .ab{font-size:.65rem;font-weight:700;background:#e5e7eb;border:1px solid #9ca3af;border-radius:6px;padding:2px 4px;color:#374151}' +
  '.hy-raum .hy-rk{font-weight:700;font-size:.78rem;line-height:1.15;padding-right:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
  '.hy-raum .hy-gr{font-size:1.25rem;font-weight:800;font-variant-numeric:tabular-nums;line-height:1.1}' +
  '.hy-raum .hy-kl{font-size:.7rem;color:#374151;line-height:1.2}' +
  '.hy-stat{align-self:flex-start;font-size:.68rem;font-weight:800;padding:1px 6px;border-radius:9px;background:#e5e7eb;color:#1f2937}' +
  '.hy-raum.hy-kalt,.hy-raum.hy-zuwenig{border-color:#2563eb;box-shadow:inset 0 0 0 999px rgba(59,130,246,.16)}.hy-raum.hy-zuwenig{border-color:#dc2626;box-shadow:inset 0 0 0 999px rgba(220,38,38,.12)}' +
  '.hy-raum.hy-warm,.hy-raum.hy-zuviel{border-color:#ea580c;box-shadow:inset 0 0 0 999px rgba(249,115,22,.16)}.hy-raum.hy-gut{border-color:#16a34a}' +
  '.hy-kalt .hy-stat{background:#2563eb;color:#fff}.hy-zuwenig .hy-stat{background:#dc2626;color:#fff}.hy-warm .hy-stat,.hy-zuviel .hy-stat{background:#c2410c;color:#fff}.hy-gut .hy-stat{background:#15803d;color:#fff}' +
  '.hy-raum .hy-pf{position:absolute;right:4px;top:3px;font-size:.95rem}' +
  '.hy-szene{position:relative;height:76px;flex:none}' +
  '.hy-fen{position:absolute;left:6px;top:2px}.hy-hz{position:absolute;left:6px;bottom:9px}.hy-moebel{position:absolute;right:6px;bottom:8px;font-size:1.7rem;line-height:1;filter:drop-shadow(0 1px 1px rgba(0,0,0,.25))}' +
  '.hy-bod{position:absolute;left:0;right:0;bottom:0;height:9px;background:repeating-linear-gradient(90deg,#c2803a 0 22px,#92400e 22px 23px),#c2803a}' +
  '.hy-bod.fliese{background:repeating-linear-gradient(90deg,#e5e7eb 0 13px,#9ca3af 13px 14px)}' +
  '.hy-bod svg{position:absolute;inset:0;width:100%;height:100%}' +
  '@media (max-width:560px){.hy-fen,.hy-moebel,.hy-m2,.hy-raum .hy-kl{display:none}.hy-raum{min-height:132px}.hy-szene{height:48px}.hy-hz{transform:scale(.8);transform-origin:left bottom}.hy-raum .hy-gr{font-size:.95rem}.hy-th{left:2px;bottom:10px}.hy-th.wand{left:50%}.hy-th .knopf{width:34px;height:34px}.hy-th .knopf svg{width:34px;height:34px}.hy-stapel{display:none}.hy-th{left:2px}.hy-vt{right:2px}.hy-vt .ring,.hy-vt .ring svg{width:30px;height:30px}.hy-raum .hy-rk{font-size:.7rem;padding-right:10px}.hy-stat{font-size:.6rem;padding:1px 4px}.hy-info{margin:3px 3px 0;padding:3px 4px}.hy-geb{padding:0 5px}.hy-stock{grid-template-columns:16px repeat(4,minmax(0,1fr));gap:4px}.hy-decke{grid-template-columns:16px 1fr;gap:4px;margin:0 -5px;padding:0 5px}.hy-keller svg{width:180px}}' +
  '.hy-balken{position:relative;height:12px;border-radius:6px;background:#e5e7eb;overflow:hidden}' +
  '.hy-balken i{position:absolute;left:0;top:0;bottom:0;background:#475569}.hy-balken b{position:absolute;top:0;bottom:0;left:45%;width:10%;background:rgba(22,163,74,.45);border-left:2px solid #16a34a;border-right:2px solid #16a34a}' +
  '.hy-panel{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:8px}' +
  '.hy-panel h4{margin:0;font-size:1.05rem}.hy-panel .hy-regel{display:flex;align-items:center;gap:6px;flex-wrap:wrap}' +
  '.hy-panel .hy-regel button{min-width:44px;min-height:44px;font-size:1.1rem;font-weight:700}' +
  '.hy-panel .hy-kl{font-size:.8rem;color:var(--ink-soft)}.hy-panel .hy-regel .hy-kl{flex-basis:100%}' +
  '.hy-knopf{width:60px;height:60px;flex:none;display:block}' +
  '.hy-tab{width:100%;border-collapse:collapse;font-size:.85rem}.hy-tab td{padding:2px 4px;border-bottom:1px solid var(--line)}.hy-tab td:last-child{text-align:right;font-weight:700;font-variant-numeric:tabular-nums}' +
  '.hy-wahl{display:flex;flex-wrap:wrap;gap:4px}.hy-wahl button{min-height:40px;font-size:.85rem}.hy-wahl button[aria-pressed="true"]{background:var(--accent-soft);border-color:var(--accent);font-weight:700}' +
  '.hy-meldung{min-height:1.4em;padding:6px 10px;border-radius:8px;background:var(--card2)}.hy-meldung:empty{display:none}.hy-meldung.ok{background:var(--ok-soft)}.hy-meldung.bad{background:var(--bad-soft)}.hy-meldung.warn{background:var(--warn-soft)}' +
  '.hy-prot{background:var(--card);border:2px solid var(--line);border-radius:12px;padding:10px 12px;overflow-x:auto}.hy-prot table{width:100%;border-collapse:collapse;font-size:.85rem}.hy-prot th,.hy-prot td{padding:3px 5px;border-bottom:1px solid var(--line);text-align:right}.hy-prot th:first-child,.hy-prot td:first-child{text-align:left}' +
  '.hy-prot .hy-ja{color:var(--ok);font-weight:700}.hy-prot .hy-nein{color:var(--bad);font-weight:700}' +
  '.hy-soll input{width:6em;min-height:40px;font:inherit}' +
  '.hy-legende{font-size:.78rem;color:var(--ink-soft);margin-top:4px}';
  var s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
})();

/* ---------- Schullogo: In diesem Projekt Staatliche Berufsschule Kaufbeuren (Datei bilder/logo-bsinfo.png, Pfad fest in engine.js/pdf.js) ---------- */
(function () {
  var st = document.createElement('style');
  st.textContent = '.kopf .logo .schullogo{flex:none}.kopf .logo .schullogo img{height:44px;width:auto;max-width:none}@media (max-width:560px){.kopf .logo .schullogo img{height:30px}}' +
    '[data-thema="technik"][data-thema]{--kopf-a:#2f3b66;--kopf-b:#586bac;--accent-soft:#e3e7f3;--bg:#f3f4f8}';   // Blau der BS Kaufbeuren
  document.head.appendChild(st);
  function alt() { document.querySelectorAll('img[alt="BS Info München"]').forEach(function (i) { i.alt = 'Staatliche Berufsschule Kaufbeuren'; }); }
  document.addEventListener('DOMContentLoaded', alt);
  if (window.MutationObserver) new MutationObserver(alt).observe(document.documentElement, { childList: true, subtree: true });
})();

/* ---------- Hilfen für Anzeige ---------- */
function hyZahl(x, n) { n = n || 0; return (Math.round(x * Math.pow(10, n)) / Math.pow(10, n)).toLocaleString('de-DE', { minimumFractionDigits: n, maximumFractionDigits: n }); }
function hyVor(v) { return v >= 7 ? 'N' : String(v).replace('.', ','); }
function hyThermo(s) { return s < 1 ? '✱' : String(s).replace('.', ','); }
function hyName(r) { return r.name || HY.ARTEN[r.art].name; }
function hyHeizSvg(heiz) {
  if (heiz === 'fbh') return '<svg viewBox="0 0 60 14" width="48" height="12" aria-hidden="true"><path d="M2 7 h6 v-5 h6 v10 h6 v-10 h6 v10 h6 v-10 h6 v10 h6 v-5 h8" fill="none" stroke="#dc2626" stroke-width="2"/></svg>';
  if (heiz === 'bhk') return '<svg viewBox="0 0 30 22" width="22" height="16" aria-hidden="true"><rect x="4" y="1" width="3" height="20" fill="#6b7280"/><rect x="23" y="1" width="3" height="20" fill="#6b7280"/>' + [4, 8, 12, 16].map(function (y) { return '<rect x="4" y="' + y + '" width="22" height="2" fill="#6b7280"/>'; }).join('') + '</svg>';
  return '<svg viewBox="0 0 44 22" width="32" height="16" aria-hidden="true"><rect x="1" y="2" width="42" height="18" rx="2" fill="#f3f4f6" stroke="#6b7280"/>' + [6, 12, 18, 24, 30, 36].map(function (x) { return '<line x1="' + x + '" y1="4" x2="' + x + '" y2="18" stroke="#6b7280"/>'; }).join('') + '</svg>';
}
function hyKnopfSvg(stufe, aus) {
  var w = (stufe < 1 ? 0 : (stufe - 1) / 4) * 270 - 135;
  return '<svg class="hy-knopf" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29" fill="' + (aus ? '#e5e7eb' : '#f8fafc') + '" stroke="#64748b" stroke-width="3"/>' +
    (aus ? '<text x="32" y="37" text-anchor="middle" font-size="13" fill="#374151">ab</text>' :
    '<g transform="rotate(' + w + ' 32 32)"><rect x="29" y="5" width="6" height="14" rx="3" fill="var(--accent)"/></g><text x="32" y="40" text-anchor="middle" font-size="17" font-weight="700" fill="#1f2937">' + hyThermo(stufe) + '</text>') + '</svg>';
}

function hyMisch(w) {   // grau (kalt) → rot (heiß)
  var k = [209, 213, 219], h = [239, 68, 68];
  return 'rgb(' + k.map(function (c, j) { return Math.round(c + (h[j] - c) * w); }).join(',') + ')';
}
function hyThermoKnopf(stufe) {
  var marken = ['✱', '1', '2', '3', '4', '5'], w = (stufe < 1 ? 0 : (stufe - 1) / 4) * 240 - 120;
  return '<svg viewBox="0 0 44 44" width="44" height="44" aria-hidden="true"><circle cx="22" cy="22" r="20" fill="#f8fafc" stroke="#475569" stroke-width="2"/>' +
    '<circle cx="22" cy="22" r="13" fill="#e2e8f0" stroke="#94a3b8"/>' +
    marken.map(function (m, j) { var a = ((j === 0 ? -150 : -120 + (j - 1) * 60) - 90) * Math.PI / 180; return '<text x="' + (22 + 16.5 * Math.cos(a)).toFixed(1) + '" y="' + (24.5 + 16.5 * Math.sin(a)).toFixed(1) + '" font-size="6" text-anchor="middle" fill="#334155" font-weight="700">' + m + '</text>'; }).join('') +
    '<g transform="rotate(' + w + ' 22 22)"><rect x="20.5" y="10" width="3" height="10" rx="1.5" fill="#dc2626"/></g><text x="22" y="26" font-size="8" text-anchor="middle" fill="#0f172a" font-weight="800">' + hyThermo(stufe) + '</text></svg>';
}
function hyVentilRing(vor, fbh) {
  var marken = ['1', '2', '3', '4', '5', '6', 'N'], w = (vor - 1) / 6 * 270 - 135;
  return '<svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="' + (fbh ? '#e0e7ff' : '#fef3c7') + '" stroke="#78716c" stroke-width="2"/>' +
    marken.map(function (m, j) { var a = (-135 + j * 45 - 90) * Math.PI / 180; return '<text x="' + (20 + 14 * Math.cos(a)).toFixed(1) + '" y="' + (22 + 14 * Math.sin(a)).toFixed(1) + '" font-size="5.5" text-anchor="middle" fill="#57534e" font-weight="700">' + m + '</text>'; }).join('') +
    '<circle cx="20" cy="20" r="8.5" fill="#d6d3d1" stroke="#78716c"/><g transform="rotate(' + w + ' 20 20)"><rect x="19" y="5" width="2" height="8" fill="#1d4ed8"/></g>' +
    '<text x="20" y="22.5" font-size="6.5" text-anchor="middle" fill="#0f172a" font-weight="800">' + hyVor(vor).replace(',25', '¼').replace(',5', '½').replace(',75', '¾') + '</text></svg>';
}
function hyFenster() {
  return '<svg class="hy-fen" width="34" height="26" viewBox="0 0 34 26"><rect x="1" y="1" width="32" height="24" rx="1" fill="#fff" stroke="#78716c"/><rect x="3.5" y="3.5" width="12.5" height="19" fill="#bae6fd"/><rect x="18" y="3.5" width="12.5" height="19" fill="#bae6fd"/><path d="M5 6 l6 -0 M20 6 l5 0" stroke="#fff" stroke-width="1.5" opacity=".8"/></svg>';
}
function hyHeizflaeche(r, w, kopfAb) {
  var f = hyMisch(w), kopf = '<rect x="44" y="15" width="7" height="6" fill="#9ca3af" stroke="#6b7280" stroke-width=".5"/>';   // Ventilunterteil; der Kopf ist das Bedienelement
  if (r.heiz === 'fbh') return '';   // Heizung im Boden, Raumthermostat an der Wand (Bedienelement)
  if (r.heiz === 'bhk')
    return '<svg class="hy-hz" width="58" height="46" viewBox="0 0 58 46"><rect x="8" y="2" width="4" height="36" fill="' + f + '" stroke="#6b7280" stroke-width=".6"/><rect x="34" y="2" width="4" height="36" fill="' + f + '" stroke="#6b7280" stroke-width=".6"/>' +
      [5, 11, 17, 23, 29, 35].map(function (y) { return '<rect x="8" y="' + y + '" width="30" height="3" fill="' + f + '" stroke="#6b7280" stroke-width=".4"/>'; }).join('') +
      '<path d="M10 38 v8" stroke="#dc2626" stroke-width="2"/><path d="M36 38 v8" stroke="#2563eb" stroke-width="2"/>' + kopf.replace(/x="44"/, 'x="40"').replace(/x="48"/, 'x="44"').replace(/x="45"/, 'x="41"') + '</svg>';
  return '<svg class="hy-hz" width="58" height="40" viewBox="0 0 58 40"><rect x="2" y="6" width="42" height="24" rx="2" fill="' + f + '" stroke="#6b7280"/>' +
    [7, 12, 17, 22, 27, 32, 37].map(function (x) { return '<line x1="' + x + '" y1="8" x2="' + x + '" y2="28" stroke="rgba(0,0,0,.18)"/>'; }).join('') +
    '<path d="M44 18 h4 v22" fill="none" stroke="#dc2626" stroke-width="2"/><path d="M6 30 v10" stroke="#2563eb" stroke-width="2"/>' + kopf + '</svg>';
}
function hyBoden(r, w) {
  var fliese = r.art === 'bad' || r.art === 'kueche' || r.art === 'flur';
  var fbh = r.heiz === 'fbh' ? '<svg viewBox="0 0 120 9" preserveAspectRatio="none"><rect width="120" height="9" fill="#d6d3d1"/><path d="M2 2 H118 V7 H2" fill="none" stroke="' + hyMisch(w) + '" stroke-width="1.6"/><path d="M2 4.5 H114" fill="none" stroke="' + hyMisch(w * 0.8) + '" stroke-width="1.6"/></svg>' : '';
  return '<span class="hy-bod' + (fliese ? ' fliese' : '') + '">' + fbh + '</span>';
}
function hyKellerSvg(pumpe, V) {
  return '<svg viewBox="0 0 250 92" role="img" aria-label="Heizraum mit Kessel, Pumpe und Ausdehnungsgefäß">' +
    '<path d="M0 22 H150" stroke="#dc2626" stroke-width="5"/><path d="M0 34 H130 V70" stroke="#2563eb" stroke-width="5" fill="none"/><path d="M150 22 V30" stroke="#dc2626" stroke-width="5"/>' +
    '<circle cx="60" cy="22" r="11" fill="#1f2937"/><circle cx="60" cy="22" r="7" fill="#22c55e"/><path d="M55 22 h8 l-3 -3 M63 22 l-3 3" stroke="#fff" stroke-width="1.6" fill="none"/>' +
    '<text x="60" y="49" font-size="9" text-anchor="middle" fill="#1f2937" font-weight="700">' + L('Pumpe', 'Pumpe') + ' ' + hyZahl(pumpe, 1) + ' m</text>' +
    '<rect x="96" y="40" width="18" height="34" rx="9" fill="#dc2626"/><path d="M105 40 v-6" stroke="#2563eb" stroke-width="3"/><text x="105" y="86" font-size="8" text-anchor="middle" fill="#1f2937">MAG</text>' +
    '<rect x="138" y="28" width="52" height="58" rx="4" fill="#f8fafc" stroke="#6b7280" stroke-width="1.5"/><rect x="146" y="36" width="36" height="14" rx="2" fill="#0f172a"/><text x="164" y="46" font-size="9" text-anchor="middle" fill="#4ade80" font-family="monospace">55°C</text>' +
    '<path d="M164 74 c-7 -6 -3 -12 0 -16 c1 5 6 7 3 12 c2 -1 3 -3 3 -4 c3 5 0 9 -6 8z" fill="#f97316"/>' +
    '<text x="215" y="50" font-size="9" fill="#1f2937" font-weight="700">' + L('Kessel', 'Kessel') + '</text><text x="215" y="62" font-size="8" fill="#374151">' + hyZahl(V) + ' l/h</text></svg>';
}

/* ---------- Die Simulation (Spiel, Übung, Nachweis nutzen sie) ---------- */
// o: { haus, bauen, profi, stumm, kopf, beiAenderung(was, i, sim), nachZeichnen(sim), ziel(auswertung, sim) }
function hausSimulator(box, api, o) {
  var E = KIT.el, haus = o.haus, modus = 'betrieb', wahl = null, bauenOffen = false, profiBekannt = {}, letzte = null;
  var wurzel = E('div', { class: 'hy' }), hinweis = E('div', { class: 'hy-hinweis', 'aria-live': 'polite' }), leiste = E('div', { class: 'hy-leiste' }),
    main = E('div', { class: 'hy-main' }), hausBox = E('div', { class: 'hy-haus' }), panel = E('div', { class: 'hy-panel', 'aria-live': 'polite' }),
    meldung = E('div', { class: 'hy-meldung', 'aria-live': 'polite' }), prot = E('div', { class: 'hy-prot', hidden: true });
  if (o.kopf) wurzel.appendChild(o.kopf);
  if (!o.stumm) wurzel.appendChild(hinweis);
  wurzel.appendChild(leiste);
  if (!o.stumm) wurzel.appendChild(meldung);
  main.appendChild(hausBox); main.appendChild(panel); wurzel.appendChild(main);
  wurzel.appendChild(prot);
  box.appendChild(wurzel);

  function sag(text, art) { if (o.stumm) return; meldung.className = 'hy-meldung ' + (art || ''); meldung.innerHTML = text || ''; }
  function bekannt(i) { return !o.profi || !!profiBekannt[i]; }
  function aenderung(was, i) { prot.hidden = true; zeichne(); if (o.beiAenderung) o.beiAenderung(was, i, sim); }

  function zeichneLeiste(erg) {
    leiste.innerHTML = '';
    leiste.appendChild(E('div', { class: 'hy-gruppe', role: 'group', 'aria-label': L('Ansicht', 'Ansicht') }, [
      E('button', { type: 'button', 'aria-pressed': String(modus === 'betrieb'), text: L('🌡️ Betrieb', '🌡️ Heizen'), onclick: function () { modus = 'betrieb'; aenderung('modus'); } }),
      E('button', { type: 'button', 'aria-pressed': String(modus === 'messung'), text: L('🔧 Messung: Köpfe ab', '🔧 Messen: Köpfe ab'), onclick: function () { modus = 'messung'; aenderung('modus'); } })]));
    leiste.appendChild(E('div', { class: 'hy-gruppe', role: 'group', 'aria-label': L('Pumpe', 'Pumpe') }, [E('span', { text: '⚙️ ' + L('Pumpe', 'Pumpe') }),
      E('button', { type: 'button', 'aria-label': L('Förderhöhe senken', 'Pumpe kleiner'), text: '−', disabled: o.pumpeFest || haus.pumpe <= 1, onclick: function () { haus.pumpe = Math.max(1, haus.pumpe - 0.5); aenderung('pumpe'); } }),
      E('span', { class: 'hy-wert', text: hyZahl(haus.pumpe, 1) + ' m' }),
      E('button', { type: 'button', 'aria-label': L('Förderhöhe erhöhen', 'Pumpe größer'), text: '+', disabled: o.pumpeFest || haus.pumpe >= 6, onclick: function () { haus.pumpe = Math.min(6, haus.pumpe + 0.5); aenderung('pumpe'); } }),
      E('span', { text: '≈ ' + erg.watt + ' W' })]));
    if (!o.stumm) leiste.appendChild(E('button', { type: 'button', text: L('📋 Abgleich prüfen', '📋 Prüfen'), onclick: function () { pruefe(true); } }));
  }

  function raumKlasse(i, e) {
    if (modus === 'messung') return !bekannt(i) ? '' : e.x < 0.9 ? 'hy-zuwenig' : e.x > 1.1 ? 'hy-zuviel' : 'hy-gut';
    return e.T < e.Td - 0.6 ? 'hy-kalt' : e.T > e.Td + 0.8 ? 'hy-warm' : 'hy-gut';
  }
  function zeichneHaus(erg) {
    hausBox.innerHTML = '<span class="hy-wolke" style="left:8%" aria-hidden="true"></span><span class="hy-wolke" style="left:78%;top:26px" aria-hidden="true"></span>' +
      '<div class="hy-dachz" aria-hidden="true"><span class="kamin"></span><span class="flaeche"></span><span class="luke"></span></div>';
    var geb = E('div', { class: 'hy-geb' });
    [['OG', [4, 5, 6, 7]], ['EG', [0, 1, 2, 3]]].forEach(function (st, n) {
      var reihe = E('div', { class: 'hy-stock' }, [E('div', { class: 'hy-strang', 'aria-hidden': 'true' }, [E('span', { class: 'hy-et', text: st[0] })])]);
      st[1].forEach(function (i) {
        var r = haus.plaetze[i], e = erg.raeume[i];
        if (!r) {
          reihe.appendChild(E('button', { type: 'button', class: 'hy-raum hy-leer', 'aria-pressed': String(wahl === i), disabled: !o.bauen, text: o.bauen ? L('+ Raum', '+ Raum') : '–',
            'aria-label': o.bauen ? L('Leerer Platz, Raum hinzufügen', 'Leer. Raum dazu.') : L('leer', 'leer'), onclick: function () { wahl = i; bauenOffen = true; zeichne(); } }));
          return;
        }
        var A = HY.ARTEN[r.art], klasse = raumKlasse(i, e), gross, klein, status;
        if (modus === 'messung') {
          gross = bekannt(i) ? hyZahl(e.x * 100) + ' %' : hyZahl(e.V) + ' l/h';
          klein = bekannt(i) ? hyZahl(e.V) + ' / ' + hyZahl(e.vs) + ' l/h' : L('Soll? Erst berechnen', 'Soll? Erst rechnen');
          if (r.heiz === 'fbh') klein += '<br>' + L('Verteiler: ', 'Verteiler: ') + hyZahl(e.V / HY.kreise(r) / 60, 2) + ' l/min × ' + HY.kreise(r);
          status = klasse === 'hy-zuwenig' ? L('zu wenig Wasser', 'zu wenig') : klasse === 'hy-zuviel' ? L('zu viel Wasser', 'zu viel') : klasse === 'hy-gut' ? L('passt', 'passt') : '';
        } else {
          gross = hyZahl(e.T, 1) + ' °C';
          klein = L('Soll ', 'Soll ') + A.t + ' °C · ' + L('Hub ', 'offen ') + hyZahl(e.h * 100) + ' %';
          status = klasse === 'hy-kalt' ? L('zu kalt', 'zu kalt') : klasse === 'hy-warm' ? L('zu warm', 'zu warm') : L('angenehm', 'gut warm');
        }
        var waerme = HY.begrenze(e.V / e.vs / 1.1, 0, 1);
        var kn = E('div', { class: 'hy-raum hy-w-' + r.art + ' ' + klasse + (wahl === i ? ' hy-gewaehlt' : ''), role: 'group', 'aria-label': hyName(r),
          onclick: function (ev) { if (ev.target.closest('.hy-th, .hy-vt')) return; wahl = i; bauenOffen = false; aenderung('wahl', i); } });
        var info = E('button', { type: 'button', class: 'hy-info', 'aria-pressed': String(wahl === i),
          'aria-label': hyName(r) + ', ' + HY.HEIZ[r.heiz].name + ', ' + gross + (status ? ', ' + status : '') + (e.pfeift ? ', ' + L('Ventil pfeift', 'Ventil pfeift') : '') });
        info.innerHTML = '<span class="hy-rk">' + A.sym + ' ' + KIT.esc(hyName(r)) + '<span class="hy-m2"> · ' + r.flaeche + ' m²</span></span><span class="hy-gr">' + gross + '</span>' +
          (modus === 'messung' && bekannt(i) ? '<span class="hy-balken" aria-hidden="true"><i style="width:' + Math.min(100, e.x * 50) + '%"></i><b></b></span>' : '') +
          '<span class="hy-kl">' + klein + '</span>' + (status ? '<span class="hy-stat">' + status + '</span>' : '') +
          (e.pfeift ? '<span class="hy-pf" aria-hidden="true">🔊</span>' : '');
        kn.appendChild(info);
        var szene = E('div', { class: 'hy-szene' });
        szene.innerHTML = '<span aria-hidden="true">' + hyFenster() + hyHeizflaeche(r, waerme, modus === 'messung') + hyBoden(r, waerme) + '</span>';
        szene.appendChild(thermostatImRaum(r, i, modus === 'messung'));
        szene.appendChild(ventilImRaum(r, i, modus === 'messung'));
        kn.appendChild(szene);
        reihe.appendChild(kn);
      });
      geb.appendChild(reihe);
      geb.appendChild(E('div', { class: 'hy-decke', 'aria-hidden': 'true' }, [E('span'), E('span')]));
    });
    hausBox.appendChild(geb);
    hausBox.appendChild(E('div', { class: 'hy-gras', 'aria-hidden': 'true' }));
    var keller = E('div', { class: 'hy-keller' }, [E('div', { class: 'hy-strang', 'aria-hidden': 'true' }, [E('span', { class: 'hy-et', text: 'KG' })])]);
    var innen = E('div', { class: 'innen' });
    innen.innerHTML = hyKellerSvg(haus.pumpe, erg.V);
    innen.appendChild(E('span', { class: 'hy-ger', text: '🔥 ' + L('Kessel, Vorlauf 55 °C', 'Kessel 55 °C') }));
    innen.appendChild(E('span', { class: 'hy-ger', text: '⚙️ ' + L('Pumpe ', 'Pumpe ') + hyZahl(haus.pumpe, 1) + ' m · ' + hyZahl(erg.V) + ' l/h' }));
    keller.appendChild(innen);
    hausBox.appendChild(E('div', { class: 'hy-erde' }, [keller]));
    hausBox.appendChild(E('div', { class: 'hy-legende', html: modus === 'messung'
      ? L('Messung mit abgenommenen Thermostatköpfen: Nur die Voreinstellung bremst – stell sie am <b>gelben Ring am Ventil</b> (1–6, N; bei FBH violett = Verteiler) mit + und − oder dem Mausrad ein. Grünes Feld im Balken = 90–110 % vom Soll.', 'Köpfe ab: Nur der <b>gelbe Ring am Ventil</b> bremst. Dreh mit + und −. Grün = 90 bis 110 %.')
      : L('<b>Weißer Knopf</b> = Thermostat (✱–5) · <b>gelber Ring</b> = Voreinstellung am Ventil (1–6, N) · Rahmen blau = zu kalt · grün = angenehm · orange = zu warm · 🔊 Ventil pfeift · Heizfläche rot = viel heißes Wasser, grau = wenig · rot/blau = Vor- und Rücklauf', '<b>Weißer Knopf</b> = Thermostat · <b>gelber Ring</b> = Ventil · Blau = zu kalt · Grün = gut · Orange = zu warm · 🔊 Ventil pfeift · rote Heizung = viel Wasser') }));
  }

  function dreheThermo(r, i, d) {
    var alt = r.thermo;
    r.thermo = d > 0 ? (r.thermo < 1 ? 1 : Math.min(5, r.thermo + 0.5)) : (r.thermo <= 1 ? 0 : r.thermo - 0.5);
    if (r.thermo !== alt) { wahl = i; bauenOffen = false; aenderung('thermo', i); var k = hausBox.querySelector('[data-th="' + i + '"] .' + (d > 0 ? 'auf' : 'zu')); if (k && !k.disabled) k.focus(); }
  }
  function stapel(auf, zu) { return E('span', { class: 'hy-stapel' }, [auf, zu]); }
  function dreheVor(r, i, d) {
    var alt = r.vor;
    r.vor = HY.begrenze(r.vor + d * 0.25, 1, 7);
    if (r.vor !== alt) { wahl = i; bauenOffen = false; aenderung('vor', i); var k = hausBox.querySelector('[data-vt="' + i + '"] .' + (d > 0 ? 'auf' : 'zu')); if (k && !k.disabled) k.focus(); }
  }
  function thermostatImRaum(r, i, aus) {
    var w = E('div', { class: 'hy-th' + (r.heiz === 'fbh' ? ' wand' : r.heiz === 'bhk' ? ' bhk' : ''), 'data-th': String(i), role: 'group', 'aria-label': L('Thermostat ', 'Thermostat ') + hyName(r) });
    if (aus) { w.appendChild(E('span', { class: 'ab', text: L('Kopf ab', 'Kopf ab') })); return w; }
    var knopf = E('span', { class: 'knopf', title: L('Thermostat · Mausrad: drehen', 'Thermostat'), html: hyThermoKnopf(r.thermo) });
    knopf.addEventListener('click', function () { wahl = i; bauenOffen = false; aenderung('wahl', i); });
    knopf.addEventListener('wheel', function (ev) { ev.preventDefault(); dreheThermo(r, i, ev.deltaY < 0 ? 1 : -1); }, { passive: false });
    w.appendChild(knopf);
    w.appendChild(stapel(
      E('button', { type: 'button', class: 'auf', text: '+', disabled: r.thermo >= 5, 'aria-label': L('Thermostat ' + hyName(r) + ' aufdrehen', 'Thermostat ' + hyName(r) + ' größer'), onclick: function () { dreheThermo(r, i, 1); } }),
      E('button', { type: 'button', class: 'zu', text: '−', disabled: r.thermo <= 0, 'aria-label': L('Thermostat ' + hyName(r) + ' zudrehen', 'Thermostat ' + hyName(r) + ' kleiner'), onclick: function () { dreheThermo(r, i, -1); } })));
    return w;
  }
  function ventilImRaum(r, i, aktiv) {
    var w = E('div', { class: 'hy-vt' + (aktiv ? ' aktiv' : ''), 'data-vt': String(i), role: 'group', 'aria-label': (r.heiz === 'fbh' ? L('Ventil am Verteiler ', 'Ventil am Verteiler ') : L('Voreinstellung ', 'Voreinstellung ')) + hyName(r) });
    var ring = E('span', { class: 'ring', title: L('Voreinstellung · Mausrad: drehen', 'Voreinstellung'), html: hyVentilRing(r.vor, r.heiz === 'fbh') });
    ring.addEventListener('click', function () { wahl = i; bauenOffen = false; aenderung('wahl', i); });
    ring.addEventListener('wheel', function (ev) { ev.preventDefault(); dreheVor(r, i, ev.deltaY < 0 ? 1 : -1); }, { passive: false });
    w.appendChild(stapel(
      E('button', { type: 'button', class: 'auf', text: '+', disabled: r.vor >= 7, 'aria-label': L('Voreinstellung ' + hyName(r) + ' öffnen', 'Ventil ' + hyName(r) + ': mehr Wasser'), onclick: function () { dreheVor(r, i, 1); } }),
      E('button', { type: 'button', class: 'zu', text: '−', disabled: r.vor <= 1, 'aria-label': L('Voreinstellung ' + hyName(r) + ' drosseln', 'Ventil ' + hyName(r) + ': weniger Wasser'), onclick: function () { dreheVor(r, i, -1); } })));
    w.appendChild(ring);
    return w;
  }

  function zeichnePanel(erg) {
    panel.innerHTML = '';
    if (wahl == null) { panel.appendChild(E('p', { html: L('👆 Tippe einen Raum an. Hier stellst du dann <b>Thermostat</b> und <b>Voreinstellung</b> ein.', '👆 Tippe auf einen Raum.') + (o.bauen ? L(' Leere Plätze kannst du mit einem neuen Raum belegen.', ' Leere Plätze: neuer Raum.') : '') })); return; }
    var r = haus.plaetze[wahl], i = wahl;
    if (!r || bauenOffen) { if (o.bauen) zeichneBauen(i); return; }
    var e = erg.raeume[i], A = HY.ARTEN[r.art], Hz = HY.HEIZ[r.heiz], aus = modus === 'messung';
    panel.appendChild(E('h4', { text: A.sym + ' ' + hyName(r) }));
    panel.appendChild(E('div', { class: 'hy-kl', html: r.flaeche + ' m² · ' + Hz.name + ' ' + Hz.vl + '/' + Hz.rl + ' °C · ' + L('Leitungsweg ', 'Weg ') + HY.WEG[i] * 6 + ' m' }));
    panel.appendChild(E('div', { class: 'hy-regel', role: 'group', 'aria-label': L('Thermostat', 'Thermostat') }, [
      E('span', { html: hyKnopfSvg(r.thermo, aus) }),
      E('button', { type: 'button', text: '−', disabled: aus || r.thermo <= 0, 'aria-label': L('Thermostat zudrehen', 'Thermostat kleiner'), onclick: function () { dreheThermo(r, i, -1); } }),
      E('button', { type: 'button', text: '+', disabled: aus || r.thermo >= 5, 'aria-label': L('Thermostat aufdrehen', 'Thermostat größer'), onclick: function () { dreheThermo(r, i, 1); } }),
      E('span', { html: aus ? L('Thermostatkopf<br>abgenommen', 'Kopf ist ab') : L('Thermostat ', 'Thermostat ') + hyThermo(r.thermo) + '<br>≈ ' + HY.solltemp(r.thermo) + ' °C' })]));
    panel.appendChild(E('div', { class: 'hy-regel', role: 'group', 'aria-label': L('Voreinstellung', 'Voreinstellung') }, [
      E('span', { text: L('Voreinstellung', 'Voreinstellung') }),
      E('button', { type: 'button', text: '−', disabled: r.vor <= 1, 'aria-label': L('Voreinstellung kleiner, drosseln', 'weniger Wasser'), onclick: function () { dreheVor(r, i, -1); } }),
      E('span', { class: 'hy-wert', style: { fontSize: '1.3rem' }, text: hyVor(r.vor) }),
      E('button', { type: 'button', text: '+', disabled: r.vor >= 7, 'aria-label': L('Voreinstellung größer, öffnen', 'mehr Wasser'), onclick: function () { dreheVor(r, i, 1); } }),
      E('span', { class: 'hy-kl', text: L('1 = stark gedrosselt · 6¾ → N = ganz offen', '1 = wenig · N = ganz offen') })]));
    var q = HY.heizlast(r), dt = HY.spreizung(r);
    if (!bekannt(i)) {
      var id = 'hy-soll-' + i, inp = E('input', { id: id, type: 'text', inputmode: 'decimal', autocomplete: 'off' });
      panel.appendChild(STUFEN.profiBand(L('Soll-Volumenstrom selbst berechnen', 'Soll selbst rechnen')));
      panel.appendChild(E('div', { class: 'hy-soll' }, [E('label', { for: id, html: L('Heizlast ' + q + ' W, Spreizung ' + dt + ' K → V<sub>soll</sub> in l/h:', 'Heizlast ' + q + ' W. Spreizung ' + dt + ' K. V<sub>soll</sub> in l/h:') }), ' ', inp, ' ',
        E('button', { type: 'button', text: L('Prüfen', 'Prüfen'), onclick: function () {
          var w = parseFloat(String(inp.value).replace(',', '.')), soll = HY.vsoll(r);
          if (Math.abs(w - soll) <= soll * 0.03) { profiBekannt[i] = true; zeichne(); if (o.beiProfi) o.beiProfi(profiBekannt, sim, i); sag(L('✔ Richtig: ' + q + ' W / (1,163 · ' + dt + ' K) = ' + hyZahl(soll) + ' l/h.', '✔ Richtig: ' + hyZahl(soll) + ' l/h.'), 'ok'); }
          else if (Math.abs(w - q / dt) <= q / dt * 0.03) sag(L('Fast: Du hast durch die Spreizung geteilt, aber den Faktor 1,163 Wh/(kg·K) für Wasser vergessen.', 'Fast. Teile auch durch 1,163.'), 'warn');
          else if (Math.abs(w - q / 1.163) <= q / 1.163 * 0.03) sag(L('Da fehlt die Spreizung: Teile zusätzlich durch ' + dt + ' K.', 'Teile auch durch ' + dt + ' K.'), 'warn');
          else sag(L('Noch nicht. Formel: V = Q / (1,163 · ΔT) mit Q in W und ΔT in K ergibt l/h.', 'Noch nicht. Rechne: Q / (1,163 · ΔT).'), 'bad');
        } })]));
    }
    var t = [[L('Heizlast', 'Heizlast'), q + ' W'], [L('Spreizung ΔT', 'Spreizung'), dt + ' K'], [L('Soll-Volumenstrom', 'Soll'), bekannt(i) ? hyZahl(e.vs) + ' l/h' : '?'],
      [aus ? L('Ist (Köpfe ab)', 'Ist (Köpfe ab)') : L('Ist im Betrieb', 'Ist'), hyZahl(e.V) + ' l/h'],
      [L('Ventilhub', 'Ventil offen'), hyZahl(e.h * 100) + ' %'], [L('Differenzdruck am Ventil', 'Druck am Ventil'), hyZahl(e.dpv) + ' mbar'],
      [L('Raumtemperatur', 'Raum'), hyZahl(e.T, 1) + ' °C']];
    if (r.heiz === 'fbh') t.splice(4, 0, [L('Heizkreise am Verteiler', 'Heizkreise'), String(HY.kreise(r))], [L('Durchflussmesser je Kreis', 'Anzeige je Kreis'), hyZahl(e.V / HY.kreise(r) / 60, 2) + ' l/min']);
    panel.appendChild(E('table', { class: 'hy-tab' }, t.map(function (z) { return E('tr', {}, [E('td', { text: z[0] }), E('td', { text: z[1] })]); })));
    if (o.bauen) panel.appendChild(E('button', { type: 'button', text: L('🏗️ Raum ändern', '🏗️ Raum ändern'), onclick: function () { bauenOffen = true; zeichne(); } }));
  }

  function zeichneBauen(i) {
    var r = haus.plaetze[i];
    panel.appendChild(E('h4', { text: (r ? L('Raum ändern', 'Raum ändern') : L('Neuer Raum', 'Neuer Raum')) + ' · ' + (i < 4 ? 'EG' : 'OG') + ' ' + (i % 4 + 1) }));
    panel.appendChild(E('div', { class: 'hy-kl', text: L('Leitungsweg vom Heizraum: ', 'Weg zum Keller: ') + HY.WEG[i] * 6 + ' m' }));
    panel.appendChild(E('div', { class: 'hy-wahl', role: 'group', 'aria-label': L('Raumart', 'Raumart') }, Object.keys(HY.ARTEN).map(function (k) {
      var A = HY.ARTEN[k];
      return E('button', { type: 'button', 'aria-pressed': String(!!r && r.art === k), text: A.sym + ' ' + A.name, onclick: function () {
        if (!r) haus.plaetze[i] = raum(k, A.a, k === 'bad' ? 'bhk' : 'hk'); else { r.art = k; r.name = null; r.thermo = k === 'bad' ? 4 : k === 'flur' ? 2 : 3; }
        aenderung('bauen', i); } });
    })));
    if (!r) return;
    panel.appendChild(E('div', { class: 'hy-wahl', role: 'group', 'aria-label': L('Heizfläche', 'Heizung') }, Object.keys(HY.HEIZ).map(function (k) {
      return E('button', { type: 'button', 'aria-pressed': String(r.heiz === k), html: hyHeizSvg(k) + ' ' + HY.HEIZ[k].name, onclick: function () { r.heiz = k; r.vor = 7; aenderung('bauen', i); } });
    })));
    panel.appendChild(E('div', { class: 'hy-regel' }, [E('span', { text: L('Fläche', 'Fläche') }),
      E('button', { type: 'button', text: '−', 'aria-label': L('Fläche kleiner', 'kleiner'), disabled: r.flaeche <= 4, onclick: function () { r.flaeche -= 2; aenderung('bauen', i); } }),
      E('span', { class: 'hy-wert', text: r.flaeche + ' m²' }),
      E('button', { type: 'button', text: '+', 'aria-label': L('Fläche größer', 'größer'), disabled: r.flaeche >= 40, onclick: function () { r.flaeche += 2; aenderung('bauen', i); } })]));
    panel.appendChild(E('div', { class: 'hy-kl', html: L('Heizlast ', 'Heizlast ') + HY.heizlast(r) + ' W · ' + HY.HEIZ[r.heiz].vl + '/' + HY.HEIZ[r.heiz].rl + ' °C' + (bekannt(i) ? ' · V<sub>soll</sub> ' + hyZahl(HY.vsoll(r)) + ' l/h' : '') }));
    panel.appendChild(E('div', { class: 'hy-regel' }, [
      E('button', { type: 'button', text: L('✔ Fertig', '✔ Fertig'), onclick: function () { bauenOffen = false; zeichne(); } }),
      E('button', { type: 'button', text: L('🗑️ Raum entfernen', '🗑️ Raum weg'), onclick: function () { haus.plaetze[i] = null; bauenOffen = false; aenderung('bauen', i); } })]));
  }

  function zeichne() {
    letzte = HY.rechne(haus, modus === 'messung');
    zeichneLeiste(letzte); zeichneHaus(letzte); zeichnePanel(letzte);
    if (o.nachZeichnen) o.nachZeichnen(sim);
  }

  // Abgleich-Protokoll (immer mit abgenommenen Köpfen gemessen)
  function auswertung() {
    var m = HY.rechne(haus, true), b = HY.rechne(haus, false), zeilen = [];
    haus.plaetze.forEach(function (r, i) { if (r) zeilen.push({ i: i, r: r, m: m.raeume[i], b: b.raeume[i], ok: m.raeume[i].x >= 0.9 && m.raeume[i].x <= 1.1 }); });
    return { zeilen: zeilen, alle: zeilen.length > 0 && zeilen.every(function (z) { return z.ok; }), pfeift: zeilen.some(function (z) { return z.b.pfeift; }),
      kalt: zeilen.filter(function (z) { return z.b.T < z.b.Td - 0.6; }), watt: m.watt, pumpe: haus.pumpe, noetig: HY.noetigePumpe(haus) };
  }
  function protokollHtml(a) {
    return '<table><thead><tr><th>' + L('Raum', 'Raum') + '</th><th>Q</th><th>ΔT</th><th>V<sub>soll</sub></th><th>' + L('Vorein.', 'Vor.') + '</th><th>V<sub>ist</sub></th><th>%</th><th></th></tr></thead><tbody>' +
      a.zeilen.map(function (z) { return '<tr><td>' + HY.ARTEN[z.r.art].sym + ' ' + KIT.esc(hyName(z.r)) + ' (' + HY.HEIZ[z.r.heiz].kurz + ')</td><td>' + HY.heizlast(z.r) + ' W</td><td>' + HY.spreizung(z.r) + ' K</td><td>' + hyZahl(z.m.vs) + '</td><td>' + hyVor(z.r.vor) + '</td><td>' + hyZahl(z.m.V) + '</td><td>' + hyZahl(z.m.x * 100) + '</td><td class="' + (z.ok ? 'hy-ja">✔' : 'hy-nein">✘') + '</td></tr>'; }).join('') +
      '</tbody></table><p style="margin:6px 0 0">' + L('Pumpe Δp-konstant: ', 'Pumpe: ') + hyZahl(a.pumpe, 1) + ' m · ≈ ' + a.watt + ' W</p>';
  }
  function pruefe(zeigen) {
    var a = auswertung();
    if (zeigen && !o.stumm) {
      prot.hidden = false;
      prot.innerHTML = '<h4 style="margin:0 0 6px">📋 ' + L('Abgleich-Protokoll (gemessen mit abgenommenen Köpfen)', 'Protokoll (Köpfe ab)') + '</h4>' + protokollHtml(a);
      if (o.ziel) o.ziel(a, sim);
      if (prot.scrollIntoView) prot.scrollIntoView({ block: 'nearest' });
    }
    return a;
  }
  var sim = {
    haus: function () { return haus; }, zeichne: zeichne, sag: sag, pruefe: pruefe, auswertung: auswertung, protokollHtml: protokollHtml,
    modus: function (m) { if (m) { modus = m; zeichne(); } return modus; },
    hinweis: function (html, ausdruck) { hinweis.innerHTML = ''; hinweis.appendChild(E('div', { class: 'hy-fig', html: KIT.figur(PAKET.figur.aussehen, { ausdruck: ausdruck || 'froh' }) })); hinweis.appendChild(typeof html === 'string' ? E('p', { html: html }) : html); },
    wahl: function (i) { wahl = i; bauenOffen = false; zeichne(); },
    bekannt: function () { return profiBekannt; },
    profiAlle: function () { haus.plaetze.forEach(function (r, i) { if (r) profiBekannt[i] = true; }); zeichne(); }
  };
  zeichne();
  return sim;
}

/* ---------- Spielstand (klein, für suspend_data) ---------- */
function hausCode(h) { return h.pumpe + '|' + h.plaetze.map(function (r) { return r ? r.vor + ':' + r.thermo : '-'; }).join(','); }
function hausAusCode(h, c) {
  try {
    var t = String(c).split('|'), p = t[1].split(',');
    h.pumpe = HY.begrenze(parseFloat(t[0]) || 2, 1, 6);
    p.forEach(function (x, i) { if (h.plaetze[i] && x !== '-') { var y = x.split(':'); h.plaetze[i].vor = HY.begrenze(parseFloat(y[0]) || 7, 1, 7); h.plaetze[i].thermo = HY.begrenze(parseFloat(y[1]) || 0, 0, 5); } });
  } catch (e) { /* alter oder leerer Stand: Ausgangshaus */ }
  return h;
}

/* ---------- Weitere Häuser (Level 3, Übungen, Nachweis) ---------- */
function hausOkafor() {
  return { pumpe: 4, plaetze: [raum('wohn', 32, 'fbh'), raum('kueche', 14, 'fbh'), raum('flur', 10, 'fbh'), raum('buero', 12, 'hk', 3, 'Arbeitszimmer'),
    raum('schlaf', 16, 'hk'), raum('bad', 9, 'fbh'), raum('kind', 14, 'hk', 3, 'Kinderzimmer Ada'), raum('kind', 12, 'hk', 3, 'Kinderzimmer Obi')] };
}
function hausKita() {
  return { pumpe: 4, plaetze: [raum('wohn', 34, 'hk', 3, 'Gruppenraum Bären'), raum('kueche', 12, 'hk'), raum('bad', 10, 'bhk', 4, 'Waschraum'), raum('flur', 14, 'hk', 2, 'Garderobe'),
    raum('wohn', 30, 'hk', 3, 'Gruppenraum Füchse'), raum('schlaf', 20, 'hk', 3, 'Ruheraum'), raum('buero', 12, 'hk', 3, 'Leitung'), raum('wohn', 26, 'hk', 3, 'Gruppenraum Eulen')] };
}
function hausFewo() {
  return { pumpe: 3, plaetze: [null, null, null, null,
    raum('wohn', 24, 'hk', 3, 'Wohnküche'), raum('bad', 7, 'fbh'), raum('schlaf', 15, 'hk'), raum('flur', 8, 'hk')] };
}
function hausPraxis() {
  return { pumpe: 5, plaetze: [raum('wohn', 26, 'fbh', 3, 'Wartezimmer'), raum('buero', 14, 'fbh', 3, 'Empfang'), raum('bad', 6, 'bhk', 4, 'WC'), raum('buero', 16, 'hk', 3, 'Behandlung 1'),
    raum('buero', 16, 'hk', 3, 'Behandlung 2'), raum('buero', 12, 'hk', 3, 'Labor'), null, raum('buero', 18, 'hk', 3, 'Büro Dr. Okonkwo')] };
}
function hausBerger() {
  return { pumpe: 4.5, plaetze: [raum('wohn', 28, 'fbh'), raum('kueche', 12, 'hk'), raum('flur', 8, 'hk'), raum('bad', 6, 'bhk', 4, 'Gäste-WC'),
    raum('schlaf', 18, 'hk'), raum('bad', 10, 'bhk'), raum('buero', 12, 'hk'), raum('kind', 16, 'hk', 3, 'Kinderzimmer Lou')] };
}

/* ---------- Hauptspiel: drei Aufträge + freies Haus ---------- */
var LEVEL = [
  { id: 'S1', nr: 1, name: 'Haus Yilmaz', haus: hausYilmaz, ok: function (a) { return a.alle; } },
  { id: 'S2', nr: 2, name: 'Pumpe bei Yilmaz', haus: null, ok: function (a) { return a.alle && a.pumpe <= a.noetig; } },
  { id: 'S3', nr: 3, name: 'Neubau Okafor', haus: hausOkafor, ok: function (a) { return a.alle && a.pumpe <= a.noetig + 0.5; } }
];
function abgleichSpiel(box, api) {
  var E = KIT.el, ansicht = 0, sim = null, tut = api.geschafft('S1') ? 99 : (api.speicher('t') || 0), haeuser = [], frei = hausFrei();
  function hausFuer(n) {
    if (haeuser[n]) return haeuser[n];
    var code = api.speicher('h' + (n + 1)), h;
    if (n === 1) {   // Level 2 startet mit dem eigenen Abgleich aus Level 1 – Herr Yilmaz hat die Pumpe hochgedreht
      h = api.speicher('h1') && api.geschafft('S1') ? hausAusCode(hausYilmaz(), api.speicher('h1')) : HY.automatik(hausYilmaz());
      h.plaetze.forEach(function (r) { r.thermo = r.art === 'bad' ? 4 : r.art === 'flur' ? 2 : 3; });
      h.pumpe = 5;
      if (code) h = hausAusCode(h, code);
    } else h = code ? hausAusCode(LEVEL[n].haus(), code) : LEVEL[n].haus();
    haeuser[n] = h; return h;
  }
  function offen(n) { return n === 0 || api.geschafft(LEVEL[n - 1].id); }
  function kopf() {
    var k = E('div', {});
    k.appendChild(E('div', { class: 'hy-tabs', role: 'group', 'aria-label': L('Auftrag wählen', 'Auftrag wählen') }, LEVEL.map(function (lv, n) {
      return E('button', { type: 'button', 'aria-pressed': String(ansicht === n), disabled: !offen(n),
        text: (api.geschafft(lv.id) ? '✔ ' : offen(n) ? '' : '🔒 ') + lv.nr + ' · ' + lv.name, onclick: function () { ansicht = n; start(); } });
    }).concat([
      E('button', { type: 'button', 'aria-pressed': String(ansicht === 'frei'), text: L('🏗️ Eigenes Haus planen', '🏗️ Eigenes Haus'), onclick: function () { ansicht = 'frei'; start(); } }),
      ansicht !== 'frei' ? E('button', { type: 'button', text: L('↺ Auftrag neu', '↺ Neu'), onclick: function () { api.speicher('h' + (ansicht + 1), ''); haeuser[ansicht] = null; start(); } }) : null])));
    var e = api.speicher('e'), name = e === 'profi' ? '🚀 Profi' : '⛰️ Basis';
    STUFEN.pfadwahl(k, { text: e ? L('Empfehlung nach deiner Einstufung: ' + name + '. Im Profi-Weg berechnest du den Soll-Volumenstrom jedes Raums selbst. Du kannst jederzeit wechseln.', 'Wir empfehlen: ' + name + '. Profi: Du rechnest das Soll selbst. Du kannst wechseln.')
      : L('Profi: Den Soll-Volumenstrom jedes Raums rechnest du selbst aus. Du kannst jederzeit wechseln.', 'Profi: Du rechnest das Soll selbst. Du kannst wechseln.') });
    return k;
  }
  function einstufen() {
    box.innerHTML = '';
    var w = E('div', { class: 'hy', style: { maxWidth: '760px' } });
    var kopfzeile = E('div', { class: 'hy-hinweis' }, [E('div', { class: 'hy-fig', html: KIT.figur(PAKET.figur.aussehen, { ausdruck: 'froh' }) }),
      E('p', { html: L('Bevor wir zu Familie Yilmaz fahren: <b>Beantworte</b> zwei kurze Fragen. Danach schlage ich dir einen Weg vor – ⛰️ Basis oder 🚀 Profi.', 'Vor der Fahrt: <b>Beantworte</b> 2 kurze Fragen. Dann schlage ich dir einen Weg vor.') })]);
    w.appendChild(kopfzeile);
    STUFEN.einstufung(w, { aufgaben: [
      { frage: L('Ein Raum bekommt zu wenig Heizwasser. Drehst du die Voreinstellung <b>größer</b> oder <b>kleiner</b>?', 'Ein Raum bekommt zu wenig Wasser. Drehst du die Voreinstellung <b>größer</b> oder <b>kleiner</b>?'), pruefe: function (a) { return /gr(ö|oe|o)(ß|ss|s)/i.test(a); } },
      { frage: L('Heizlast 1160 W, Heizkörper 55/45 °C: Wie groß ist der Soll-Volumenstrom in l/h?', 'Heizlast 1160 W. Heizkörper 55/45 °C. Wie viel Wasser in l/h?'), pruefe: function (a) { var x = parseFloat(String(a).replace(',', '.')); return Math.abs(x - 100) <= 3; } }],
      weiter: function (stufe) { api.speicher('e', stufe); start(); } });
    w.querySelectorAll('.primaer').forEach(function (k) { k.classList.remove('primaer'); });   // nur „Weiter“ unten ist hervorgehoben
    w.appendChild(E('button', { type: 'button', text: L('Ohne Einstufung mit ⛰️ Basis starten', 'Ohne Fragen starten (Basis)'), onclick: function () { STUFEN.setzePfad('basis', false); api.speicher('e', 'basis'); start(); } }));
    box.appendChild(w);
  }
  var DEMO = {
    1: { start: L('Ich zeige dir den ersten Schritt, dann machst du weiter.', 'Ich zeige dir den 1. Schritt. Dann machst du weiter.'),
      tun: function (s) { var h = s.haus(); h.pumpe = Math.max(1, h.pumpe - 0.5); s.modus('messung'); var a = s.auswertung(), w = a.zeilen.slice().sort(function (x, y) { return (y.r.vor - x.r.vor) || (y.i - x.i); })[0];   // ungünstigster Raum: offenstes Ventil, weitester Weg
        return L('Ich habe die Pumpe auf <b>' + hyZahl(h.pumpe, 1) + ' m</b> gedreht und auf 🔧 Messung geschaltet. Alle Räume bekommen etwas weniger. Der ungünstigste Raum, <b>' + KIT.esc(hyName(w.r)) + '</b>, hat noch <b>' + hyZahl(w.m.x * 100) + ' %</b> – also darf ich weiter herunter. Die Pumpe braucht jetzt ≈ ' + a.watt + ' W.',
          'Pumpe jetzt <b>' + hyZahl(h.pumpe, 1) + ' m</b>. Der Raum mit dem wenigsten Wasser: <b>' + KIT.esc(hyName(w.r)) + '</b> mit ' + hyZahl(w.m.x * 100) + ' %. Das reicht noch. Ich darf weiter runter.'); },
      frage: L('Warum schaue ich beim Herunterdrehen nur auf den <b>ungünstigsten</b> Raum?', 'Warum schaue ich nur auf den Raum mit dem <b>wenigsten</b> Wasser?'),
      antwort: L('Wenn der ungünstigste Raum noch 90 % bekommt, bekommen alle anderen sicher genug – sie sind ja auf diese Förderhöhe gedrosselt. Fällt er unter 90 %, war ich einen Schritt zu weit.', 'Bekommt er genug, bekommen alle genug. Fällt er unter 90 %, war es zu weit.'),
      weiter: L('Jetzt du: <b>Dreh</b> die Pumpe weiter herunter, bis der ungünstigste Raum gerade noch 90 % hat. <b>Stelle</b> die Räume über 110 % nach. Dann <b>prüfe</b> mit 📋.', 'Jetzt du: <b>Dreh</b> die Pumpe weiter runter. Der Raum hinten braucht 90 %. Dann <b>prüfe</b> mit 📋.') },
    2: { start: L('Ich zeige dir zuerst, wie du einen Raum mit Fußbodenheizung abliest.', 'Ich zeige dir: So liest du die Fußbodenheizung ab.'),
      tun: function (s) { var h = s.haus(), r = h.plaetze[0], n = HY.kreise(r), v = HY.vsoll(r); s.modus('messung'); s.wahl(0);
        return L('Das <b>Wohnzimmer</b> hat ' + r.flaeche + ' m² Fußbodenheizung, also <b>' + n + ' Heizkreise</b> am Verteiler. Soll: ' + HY.heizlast(r) + ' W / (1,163 · 5 K) = <b>' + hyZahl(v) + ' l/h</b>. Je Kreis: ' + hyZahl(v / n) + ' l/h = <b>' + hyZahl(v / n / 60, 2) + ' l/min</b> – das soll jeder Durchflussmesser zeigen.',
          'Das <b>Wohnzimmer</b> hat <b>' + n + ' Kreise</b>. Soll: <b>' + hyZahl(v) + ' l/h</b>. Je Kreis: <b>' + hyZahl(v / n / 60, 2) + ' l/min</b>.'); },
      frage: L('Warum braucht das Wohnzimmer mit Fußbodenheizung viel mehr Wasser als das Schlafzimmer oben mit Heizkörper?', 'Warum braucht das Wohnzimmer viel mehr Wasser als das Schlafzimmer?'),
      antwort: L('Die Fußbodenheizung hat nur 5 K Spreizung (35/30 °C), der Heizkörper 10 K (55/45 °C). Jeder Liter bringt nur halb so viel Wärme – dazu ist das Wohnzimmer doppelt so groß.', 'Die FBH hat nur 5 K. Der Heizkörper hat 10 K. Und das Wohnzimmer ist größer.'),
      weiter: L('Jetzt du: 1. <b>Gleiche</b> alle Räume auf 90–110 % ab. 2. <b>Stelle</b> die Pumpe sparsam ein. 3. <b>Prüfe</b> mit 📋.', 'Jetzt du: <b>Gleiche</b> alle Räume ab. <b>Stelle</b> die Pumpe sparsam ein. <b>Prüfe</b> mit 📋.') }
  };
  function demoHinweis(n) {
    var D = DEMO[n], w = E('div', {});
    w.appendChild(E('p', { html: D.start }));
    w.appendChild(E('div', { class: 'hy-regel', style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } }, [
      E('button', { type: 'button', text: L('▶ Zeig’s mir', '▶ Zeig es mir'), onclick: function () {
        var text = D.tun(sim), ant = E('div', { 'aria-live': 'polite' }), x = E('div', {});
        x.appendChild(E('p', { html: text }));
        x.appendChild(E('p', { html: '🤔 <b>' + L('Erkläre dir selbst:', 'Überleg kurz:') + '</b> ' + D.frage }));
        x.appendChild(E('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } }, [
          E('button', { type: 'button', text: L('Begründung zeigen', 'Antwort zeigen'), onclick: function () { ant.innerHTML = '<div class="muster"><b>' + L('Begründung:', 'Antwort:') + '</b> ' + D.antwort + '</div>'; } }),
          E('button', { type: 'button', text: L('Jetzt ich →', 'Jetzt ich →'), onclick: function () { api.speicher('d' + n, 1); zeigeTut(); } })]));
        x.appendChild(ant);
        sim.hinweis(x, 'froh'); } }),
      E('button', { type: 'button', text: L('Selbst probieren', 'Selbst probieren'), onclick: function () { api.speicher('d' + n, 1); zeigeTut(); } })]));
    return w;
  }
  var TUT = [
    function () { return L('Herr Yilmaz am Telefon: „Das Kinderzimmer von Can oben wird einfach nicht warm!“ <b>Tippe</b> das Kinderzimmer Can an.', 'Herr Yilmaz sagt: „Das Zimmer von Can wird nicht warm.“ <b>Tippe</b> auf das Zimmer von Can.'); },
    function () { return L('1. <b>Dreh</b> das Thermostat bei Can auf 5 (weißer Knopf, +). 2. <b>Beobachte</b> Temperatur und Ventilhub.', '1. <b>Dreh</b> das Thermostat auf 5 (+). 2. <b>Schau</b> auf die Temperatur.'); },
    function () { return L('Kaum Wirkung! Das Ventil war schon <b>ganz offen</b>. Es kommt einfach nicht genug Wasser an. <b>Schalte</b> oben auf 🔧 Messung: Köpfe ab – so misst du für den Abgleich.', 'Es wird nicht wärmer. Das Ventil war schon ganz offen. <b>Tippe</b> oben auf 🔧 Messen: Köpfe ab.'); },
    function () { return L('🟥 = zu wenig, 🟧 = zu viel Wasser. Die nahen Räume nehmen sich das Wasser. 1. <b>Drossle</b> die Räume mit zu viel Wasser am gelben Ring (−). 2. <b>Erhöhe</b> die Pumpe etwas, wenn oben dann noch Wasser fehlt. 3. <b>Prüfe</b> mit 📋 Abgleich prüfen.', '🟥 = zu wenig. 🟧 = zu viel. 1. <b>Drossle</b> die 🟧-Räume am gelben Ring (−). 2. <b>Prüfe</b> mit 📋.'); }
  ];
  function zeigeTut() {
    if (!sim) return;
    if (ansicht === 'frei') { sim.hinweis(L('Plane dein eigenes Haus: Tippe auf einen Platz, wähle Raumart, Fläche und Heizfläche. Je weiter hinten im OG, desto länger der Leitungsweg. Dann gleich ab!', 'Plane ein Haus. Tippe auf einen Platz. Wähle Raum und Heizung. Dann gleich ab.'), 'froh'); return; }
    var lv = LEVEL[ansicht];
    if (api.geschafft(lv.id)) { sim.hinweis(lv.nr < 3 ? L('✔ Geschafft! Weiter mit Auftrag ' + (lv.nr + 1) + ' oben.', '✔ Geschafft! Weiter mit Auftrag ' + (lv.nr + 1) + '.') : L('✔ Alle drei Aufträge geschafft. Probier im <b>eigenen Haus</b> aus, was du willst – oder geh unten weiter.', '✔ Alles geschafft! Plane ein <b>eigenes Haus</b> oder geh weiter.'), 'froh'); return; }
    if (ansicht > 0 && !api.speicher('d' + ansicht)) { sim.hinweis(demoHinweis(ansicht), 'froh'); return; }
    if (ansicht === 0) { if (tut < TUT.length) sim.hinweis(TUT[tut](), tut === 2 ? 'nachdenklich' : 'froh'); else sim.hinweis(L('Ziel: In der Messung bekommen alle Räume 90–110 % ihres Soll-Volumenstroms. <b>Prüfe</b> dann mit 📋 Abgleich prüfen.', 'Ziel: Alle Räume grün (90 bis 110 %). <b>Prüfe</b> dann mit 📋.'), 'froh'); }
    else if (ansicht === 1) sim.hinweis(L('Herr Yilmaz hat die Pumpe „zur Sicherheit“ auf <b>5 m</b> gedreht. Jetzt bekommt jeder Raum zu viel Wasser, die Pumpe braucht unnötig Strom und es drohen Geräusche. 1. <b>Stelle</b> die Pumpe so niedrig wie möglich ein – der ungünstigste Raum braucht noch 90 %. 2. <b>Prüfe</b> mit 📋 Abgleich prüfen.', 'Die Pumpe steht auf 5 m. Das ist zu viel. 1. <b>Dreh</b> sie runter. Jeder Raum braucht aber 90 %. 2. <b>Prüfe</b> mit 📋.'), 'nachdenklich');
    else sim.hinweis(L('Neubau Okafor: EG und Bad mit <b>Fußbodenheizung</b> (35/30 °C), oben Heizkörper (55/45 °C). Bei der FBH zeigt der <b>Durchflussmesser am Verteiler</b> l/min je Kreis. 1. <b>Gleiche</b> alle Räume ab. 2. <b>Stelle</b> die Pumpe sparsam ein.', 'Neubau Okafor: unten Fußbodenheizung, oben Heizkörper. Die FBH braucht viel Wasser. 1. <b>Gleiche</b> alles ab. 2. <b>Stelle</b> die Pumpe sparsam ein.'), 'froh');
  }
  function mindestens(n) { if (tut < n && tut < TUT.length) { tut = n; api.speicher('t', tut); } }
  function schlechtester(a) { return a.zeilen.slice().sort(function (x, y) { return x.m.x - y.m.x; })[0]; }
  function kommentar(was, i, s) {
    var h = s.haus(), r = i != null ? h.plaetze[i] : null;
    if (ansicht !== 'frei') api.speicher('h' + (ansicht + 1), hausCode(h));
    if (ansicht === 0) {
      if (was === 'wahl' && i === 7) mindestens(1);
      if (was === 'thermo' && i === 7 && r.thermo >= 5) mindestens(2);
      if (was === 'modus' && s.modus() === 'messung') mindestens(3);
      zeigeTut();
    }
    if (was === 'thermo' && r) {
      var x = HY.rechne(h, false).raeume[i];
      if (r.thermo > 3 && x.h >= 0.99 && x.T < x.Td - 0.6) s.sag(L('Das Thermostat ist weiter auf – aber das Ventil war schon 100 % offen. <b>Aufdrehen bringt nicht mehr Wasser.</b> Der Raum ist unterversorgt.', 'Das Ventil war schon ganz offen. <b>Aufdrehen hilft nicht.</b> Es kommt zu wenig Wasser.'), 'warn');
      else if (x.h < 0.99) s.sag(L(hyName(r) + ': Das Thermostat regelt. Ist es warm genug, schließt es das Ventil (Hub ' + hyZahl(x.h * 100) + ' %).', 'Das Thermostat macht das Ventil zu, wenn es warm genug ist.'), '');
      else s.sag(L(hyName(r) + ': ' + hyZahl(x.T, 1) + ' °C, Ventil ganz offen.', hyName(r) + ': ' + hyZahl(x.T, 1) + ' °C.'), '');
    } else if (was === 'pumpe') {
      var a = s.auswertung(), w = schlechtester(a);
      if (!a.zeilen.length) return;
      if (!a.alle && a.zeilen.filter(function (z) { return z.m.x > 1.3; }).length >= 2 && ansicht !== 1) s.sag(L('Die Pumpe drückt jetzt mit ' + hyZahl(h.pumpe, 1) + ' m. Die fernen Räume bekommen mehr – die <b>nahen aber auch</b>. Ohne Abgleich verschiebst du nur das Problem und zahlst Strom (≈ ' + a.watt + ' W).', 'Die Pumpe drückt mehr. Die nahen Räume bekommen noch mehr Wasser. Das kostet Strom (≈ ' + a.watt + ' W).'), 'warn');
      else if (w.m.x < 0.9 && w.r.vor >= 7) s.sag(L(hyName(w.r) + ' steht schon auf <b>N</b> (ganz offen) und bekommt nur ' + hyZahl(w.m.x * 100) + ' %: Hier hilft nur mehr Förderhöhe.', hyName(w.r) + ' ist schon ganz offen (N). Er bekommt zu wenig. Die Pumpe muss höher.'), 'warn');
      else s.sag(L('Pumpe ' + hyZahl(h.pumpe, 1) + ' m ≈ ' + a.watt + ' W · am wenigsten versorgt: ' + hyName(w.r) + ' mit ' + hyZahl(w.m.x * 100) + ' %.', 'Pumpe ' + hyZahl(h.pumpe, 1) + ' m. Am wenigsten: ' + hyName(w.r) + ' ' + hyZahl(w.m.x * 100) + ' %.'), '');
    } else if (was === 'vor' && r) {
      var m = HY.rechne(h, true).raeume[i];
      s.sag(L(hyName(r) + ': Voreinstellung ' + hyVor(r.vor) + ' → ' + hyZahl(m.V) + ' von ' + hyZahl(m.vs) + ' l/h (' + hyZahl(m.x * 100) + ' %) bei abgenommenem Kopf. Kleinere Zahl = mehr Widerstand = weniger Wasser.', hyName(r) + ': ' + hyZahl(m.x * 100) + ' %. Kleine Zahl = weniger Wasser.'), m.x >= 0.9 && m.x <= 1.1 ? 'ok' : '');
    } else if (was === 'bauen') s.sag('', '');
  }
  function ziel(a, s) {
    if (ansicht === 'frei') {
      s.sag(a.alle ? L('✔ Dein Haus ist abgeglichen. Die kleinste passende Förderhöhe wäre ' + hyZahl(a.noetig, 1) + ' m' + (a.pumpe > a.noetig ? ' – du kannst die Pumpe noch herunterdrehen.' : '.'), '✔ Abgeglichen. Die Pumpe reicht mit ' + hyZahl(a.noetig, 1) + ' m.')
        : L('Noch nicht abgeglichen. Tipp: Den Raum mit dem weitesten Weg auf N, Pumpe so einstellen, dass er genug bekommt – dann die anderen drosseln.', 'Noch nicht fertig. Erst den fernsten Raum auf N. Dann die anderen drosseln.'), a.alle ? 'ok' : 'warn');
      return;
    }
    var lv = LEVEL[ansicht];
    if (!a.alle) {
      var schlecht = a.zeilen.filter(function (z) { return !z.ok; });
      s.sag(L('Noch nicht abgeglichen: ' + schlecht.map(function (z) { return hyName(z.r) + ' ' + hyZahl(z.m.x * 100) + ' %'; }).join(', ') + '. Unter 90 %: öffnen oder Pumpe höher. Über 110 %: drosseln.', 'Noch nicht fertig: ' + schlecht.map(function (z) { return hyName(z.r); }).join(', ') + '.'), 'warn');
      return;
    }
    if (!lv.ok(a)) {
      s.sag(L('Alle Räume passen – aber die Pumpe läuft mit ' + hyZahl(a.pumpe, 1) + ' m höher als nötig (≈ ' + a.watt + ' W). Dreh sie in 0,5-m-Schritten herunter und stell die Räume nach.', 'Alle Räume passen. Aber die Pumpe ist zu hoch. Dreh sie runter.'), 'warn');
      return;
    }
    if (ansicht === 0) { tut = 99; api.speicher('t', tut); }
    var titel = [L('Mein Abgleich im Haus Yilmaz', 'Mein Abgleich bei Yilmaz'), L('Pumpe bei Yilmaz richtig eingestellt', 'Pumpe bei Yilmaz'), L('Mein Abgleich im Neubau Okafor', 'Mein Abgleich bei Okafor')][ansicht];
    api.notiere(lv.id, titel, s.protokollHtml(a));
    api.level(lv.id, L('Alle ' + a.zeilen.length + ' Räume bekommen 90–110 % ihres Soll-Volumenstroms, Pumpe ' + hyZahl(a.pumpe, 1) + ' m (≈ ' + a.watt + ' W).', 'Alle Räume passen. Pumpe ' + hyZahl(a.pumpe, 1) + ' m.'));
    s.sag(L('✔ <b>Geschafft!</b> Schau unter 🌡️ Betrieb: Alle Räume werden warm' + (a.pfeift ? '. Hörst du noch 🔊? Dann ist der Druck zu hoch.' : ', kein Ventil pfeift.'), '✔ <b>Geschafft!</b> Schau unter 🌡️ Heizen: Alle Räume werden warm.'), 'ok');
    var k = box.querySelector('.hy-tabs'); if (k) k.parentNode.replaceChild(kopf().firstChild, k);
    zeigeTut();
  }
  function start() {
    if (!api.speicher('e') && !api.geschafft('S1')) { einstufen(); return; }
    box.innerHTML = '';
    sim = null;
    sim = hausSimulator(box, api, { haus: ansicht === 'frei' ? frei : hausFuer(ansicht), bauen: ansicht === 'frei', profi: PFAD.stufe === 'profi', kopf: kopf(), beiAenderung: kommentar, ziel: ziel });
    zeigeTut();
  }
  start();
  return {
    loesen: function () {
      api.speicher('e', 'basis'); api.speicher('d1', 1); api.speicher('d2', 1);
      LEVEL.forEach(function (lv, n) { ansicht = n; haeuser[n] = HY.automatik(n === 1 ? hausYilmaz() : lv.haus()); start(); sim.profiAlle(); sim.pruefe(true); });
    }
  };
}

/* ---------- Übungen: dieselbe Simulation in neuen Situationen ---------- */
function uebungAbgleich(hausFn, opt) {
  return function (box, api) {
    var h = hausFn();
    var sim = hausSimulator(box, api, { haus: h, profi: PFAD.stufe === 'profi', pumpeFest: opt.pumpeFest, kopf: STUFEN.pfadwahl(null, { text: L('Profi: Soll-Volumenstrom selbst berechnen.', 'Profi: Soll selbst rechnen.') }),
      ziel: function (a, s) {
        if (!a.alle) { s.sag(L('Noch nicht: ' + a.zeilen.filter(function (z) { return !z.ok; }).map(function (z) { return hyName(z.r) + ' ' + hyZahl(z.m.x * 100) + ' %'; }).join(', ') + '.', 'Noch nicht fertig.'), 'warn'); return; }
        if (opt.sparsam && a.pumpe > a.noetig) { s.sag(L('Alle Räume passen, aber die Pumpe ist höher als nötig. Geht es mit weniger?', 'Alles passt. Aber die Pumpe ist zu hoch.'), 'warn'); return; }
        s.sag(L('✔ Abgeglichen.', '✔ Geschafft.'), 'ok');
        api.notiere(opt.titel, s.protokollHtml(a));
        api.erledigt(L('Alle ' + a.zeilen.length + ' Räume 90–110 %, Pumpe ' + hyZahl(a.pumpe, 1) + ' m.', 'Alle Räume passen.'));
      } });
    sim.hinweis(opt.hinweis(), 'froh');
    return { loesen: function () { if (opt.pumpeFest) voreinstellenBei(h); else HY.automatik(h); sim.profiAlle(); sim.pruefe(true); } };
  };
}
// Voreinstellungen für eine feste Förderhöhe (Musterlösung bei gesperrter Pumpe)
function voreinstellenBei(h) {
  var pumpe = h.pumpe;
  for (var n = 0; n < 40; n++) {
    var e = HY.rechne(h, true);
    h.plaetze.forEach(function (r, i) { if (!r) return; var x = e.raeume[i].x; if (x > 1.05 && r.vor > 1) r.vor = Math.max(1, r.vor - 0.25); else if (x < 0.95 && r.vor < 7) r.vor = Math.min(7, r.vor + 0.25); });
  }
  h.pumpe = pumpe;
  return h;
}
function uebungSoll(box, api) {
  var h = hausFewo(), fertig = false;
  var sim = hausSimulator(box, api, { haus: h, profi: true, pumpeFest: true,
    beiProfi: function (bek, s) {
      var alle = h.plaetze.every(function (r, i) { return !r || bek[i]; });
      if (alle && !fertig) {
        fertig = true;
        api.notiere(L('Soll-Volumenstrom der Ferienwohnung', 'Soll der Ferienwohnung'), '<ul>' + h.plaetze.map(function (r) { return r ? '<li>' + KIT.esc(hyName(r)) + ': ' + HY.heizlast(r) + ' W / (1,163 · ' + HY.spreizung(r) + ' K) = ' + hyZahl(HY.vsoll(r)) + ' l/h</li>' : ''; }).join('') + '</ul>');
        api.erledigt(L('Für alle vier Räume den Soll-Volumenstrom richtig berechnet.', 'Alle 4 Räume richtig gerechnet.'));
        s.sag(L('✔ Alle vier Werte stimmen. Fällt dir das Bad auf? Kleine Heizlast, aber mit 5 K Spreizung viel Wasser.', '✔ Alles richtig. Das Bad hat FBH: Es braucht viel Wasser.'), 'ok');
      }
    } });
  sim.hinweis(L('1. <b>Tippe</b> jeden Raum an. 2. <b>Berechne</b> seinen Soll-Volumenstrom: V = Q / (1,163 · ΔT).', '1. <b>Tippe</b> jeden Raum an. 2. <b>Rechne</b>: V = Q / (1,163 · ΔT).'), 'froh');
  return { loesen: function () { sim.profiAlle(); fertig = true; api.notiere(L('Soll-Volumenstrom der Ferienwohnung', 'Soll der Ferienwohnung'), '<p>Musterlösung</p>'); api.erledigt(L('Für alle vier Räume den Soll-Volumenstrom richtig berechnet.', 'Alle 4 Räume richtig gerechnet.')); } };
}

/* ---------- Nachweis Teil A: Haus Berger, allein und ohne Rückmeldung ---------- */
function nachweisBerger(box) {
  var h = hausBerger();
  var sim = hausSimulator(box, null, { haus: h, stumm: true, profi: false });
  box.insertBefore(KIT.el('p', { html: L('Haus Berger · Kessel neu, nie abgeglichen. Es gibt keine Rückmeldung. 1. <b>Miss</b> mit 🔧. 2. <b>Stelle</b> Voreinstellungen und Pumpe ein. 3. <b>Gib</b> Teil A ab.', 'Haus Berger. Es gibt keine Hilfe. 1. <b>Miss</b> mit 🔧. 2. <b>Stelle</b> Ventile und Pumpe ein. 3. <b>Gib</b> ab.') }), box.firstChild);
  return {
    auswerten: function () {
      var a = sim.auswertung(), z = a.zeilen, ok = function (f) { return z.filter(f).every(function (x) { return x.ok; }); };
      var lou = z.filter(function (x) { return x.i === 7; })[0], fbh = z.filter(function (x) { return x.r.heiz === 'fbh'; })[0];
      return [
        { lz: 'LZ1', text: L('Entferntester Raum (Kinderzimmer Lou, OG hinten) bekommt mindestens 90 %', 'Kinderzimmer Lou bekommt genug Wasser'), ok: lou.m.x >= 0.9 },
        { lz: 'LZ3', text: L('Alle Räume im EG 90–110 %', 'EG: alle Räume passen'), ok: ok(function (x) { return x.i < 4; }) },
        { lz: 'LZ3', text: L('Alle Räume im OG 90–110 %', 'OG: alle Räume passen'), ok: ok(function (x) { return x.i >= 4; }) },
        { lz: 'LZ4', text: L('Pumpe nicht höher als nötig (≤ ' + hyZahl(a.noetig, 1) + ' m) und alle Räume ausreichend versorgt', 'Pumpe sparsam und alle Räume genug'), ok: a.pumpe <= a.noetig && z.every(function (x) { return x.m.x >= 0.9; }) },
        { lz: 'LZ5', text: L('Wohnzimmer mit Fußbodenheizung 90–110 %', 'FBH im Wohnzimmer passt'), ok: fbh.ok }
      ];
    },
    loesen: function () { var auto = HY.automatik(hausBerger()); h.pumpe = auto.pumpe; h.plaetze.forEach(function (r, i) { if (r) r.vor = auto.plaetze[i].vor; }); sim.zeichne(); }
  };
}

/* ===================================================================== */
window.PAKET = {
  id: 'shk-hydraulischer-abgleich',
  titel: 'Im Gleichgewicht',
  untertitel: 'Hydraulischer Abgleich – du gleichst ein ganzes Haus ab',
  version: '0.7',
  bestehen: 80,
  dauer: 'etwa 90 Minuten',
  welt: { thema: 'technik', kulisse: 'werkstatt', symbol: '🔥', farbe: '#586bac', farbeHell: '#e3e7f3' },   // Farben der Staatlichen Berufsschule Kaufbeuren
  figur: { name: 'Petra Lindner', rolle: 'Meisterin, Lindner Haustechnik', aussehen: { haut: 1, haare: 'braun', frisur: 'zopf', kleidung: '#c2410c' } },
  figuren: { yilmaz: { name: 'Emre Yilmaz', rolle: 'Kunde', aussehen: { haut: 2, haare: 'schwarz', frisur: 'kurz', kleidung: '#0369a1', bart: true } } },
  leitsituation: 'Willkommen bei <b>Lindner Haustechnik</b>! Heute fahren wir zu Familie Yilmaz: Oben bleibt ein Kinderzimmer kalt, obwohl der Kessel genug Wärme liefert. Der Kessel ist neu – aber <b>abgeglichen</b> hat die Anlage nie jemand. Das machst du jetzt: Raum für Raum, mit Thermostat, Voreinstellung und Pumpe. Danach wartet ein Neubau mit Fußbodenheizung.',
  spielwelt: { titel: 'Im Gleichgewicht – der Haus-Simulator', tab: 'Haus-Simulator', start: abgleichSpiel },

  stationen: [
    { id: 'S1', titel: 'Auftrag 1 · Haus Yilmaz: das kalte Kinderzimmer', lz: ['LZ1', 'LZ2', 'LZ3'], check: ['C1', 'C2', 'C3'],
      mitdenken: { auftrag: '<b>Erkläre</b> Herrn Yilmaz in drei Sätzen, warum Aufdrehen am Thermostat im Kinderzimmer nichts gebracht hat.' + SATZ(['Das Ventil im Kinderzimmer war schon …', 'Das Heizwasser fließt vor allem …, weil …', 'Erst wenn …, kommt oben genug an.']), muster: 'Das Thermostatventil war schon ganz offen, mehr Durchfluss geht damit nicht. Das Heizwasser nimmt den Weg mit dem kleinsten Widerstand, also die nahen Heizkörper im EG. Erst wenn diese per Voreinstellung gedrosselt sind, kommt oben genug an.' } },
    { id: 'S2', titel: 'Auftrag 2 · Haus Yilmaz: die Pumpe richtig einstellen', lz: ['LZ4'], check: ['C4', 'C5', 'C6'],
      mitdenken: { auftrag: '<b>Skizziere</b> auf Papier, wie sich Stromverbrauch und Versorgung des ungünstigsten Raums ändern, wenn du die Pumpe von 5 m auf 3 m herunterdrehst.' + SATZ(['Wenn ich die Pumpe herunterdrehe, sinkt …', 'Der ungünstigste Raum bekommt dann …', 'Ich darf so weit herunter, bis …']), muster: 'Stromverbrauch sinkt deutlich (bei Yilmaz von etwa 37 W auf rund 20 W). Die Versorgung des ungünstigsten Raums sinkt auch – solange er noch mindestens 90 % bekommt, ist die kleinere Förderhöhe besser.' } },
    { id: 'S3', titel: 'Auftrag 3 · Neubau Okafor: Fußbodenheizung und Heizkörper', lz: ['LZ5', 'LZ2'], check: ['C7', 'C8', 'C9'],
      mitdenken: { auftrag: '<b>Erkläre</b> einer Mitschülerin, warum das Wohnzimmer der Okafors mehr Heizwasser braucht als ein gleich großer Raum mit Heizkörper.' + SATZ(['Die Fußbodenheizung hat eine Spreizung von …', 'Bei kleinerer Spreizung gibt jeder Liter …', 'Deshalb braucht der Raum …']), muster: 'Die Fußbodenheizung arbeitet mit 35/30 °C, also nur 5 K Spreizung. Jeder Liter Wasser gibt dadurch nur halb so viel Wärme ab wie bei 10 K. Für dieselbe Heizlast braucht der Raum deshalb doppelt so viel Volumenstrom.' } }
  ],

  uebungen: [
    { id: 'U1', titel: 'Kita Sonnenschein: nur mit der Voreinstellung', lz: ['LZ1', 'LZ3'],
      auftrag: 'In der Kita Sonnenschein ist die Pumpe vom Planer fest auf 4 m eingestellt. 1. <b>Miss</b> alle Räume mit abgenommenen Köpfen. 2. <b>Stelle</b> jeden Raum nur über die Voreinstellung auf 90–110 % ein.',
      interaktion: uebungAbgleich(hausKita, { pumpeFest: true, titel: 'Abgleich Kita Sonnenschein',
        hinweis: function () { return L('Die Pumpe bleibt auf 4 m. 1. <b>Miss</b> mit 🔧. 2. <b>Stelle</b> jeden Raum am gelben Ring auf 90–110 % ein.', 'Die Pumpe bleibt bei 4 m. <b>Stelle</b> nur die Ventile ein.'); } }),
      tipps: ['Schalte auf 🔧 Messung. Welche Räume sind orange, welche rot?', 'Die Küche und der Waschraum liegen nah am Heizraum und bekommen weit über 150 %. Dreh dort die Voreinstellung deutlich herunter (etwa auf 3–4).', 'Gruppenraum Eulen ganz hinten bleibt auf N. Alle anderen drosseln, bis der Balken im grünen Feld steht – etwa Bären 6, Küche 3½, Waschraum 3½, Garderobe 4, Füchse 6¼, Ruheraum 5½, Leitung 5.'],
      reflexion: { frage: '<b>Erkläre</b>: Warum brauchen Räume nahe am Heizraum eine kleinere Voreinstellung als Räume weit hinten?' + SATZ(['Nahe Räume haben einen … Leitungsweg.', 'Deshalb muss das Ventil …']), muster: 'Ihr Leitungsweg hat wenig Widerstand. Damit sie nicht zu viel Wasser bekommen, muss das Ventil den fehlenden Widerstand ausgleichen – also stärker drosseln.' } },
    { id: 'U2', titel: 'Ferienwohnung: Soll-Volumenstrom berechnen', lz: ['LZ2'],
      auftrag: 'Für die Ferienwohnung im Dachgeschoss fehlen im Protokoll die Soll-Volumenströme. <b>Berechne</b> sie für alle vier Räume.',
      interaktion: uebungSoll,
      tipps: ['Die Formel lautet V = Q / (1,163 · ΔT). Q steht im Raum als Heizlast, ΔT ist die Spreizung.', 'Heizkörper: 55/45 °C → ΔT = 10 K. Fußbodenheizung: 35/30 °C → ΔT = 5 K.', 'Wohnküche: 1440 W / 11,63 ≈ 124 l/h. Bad (FBH): 470 W / 5,815 ≈ 81 l/h. Schlafzimmer: 900 W / 11,63 ≈ 77 l/h. Flur: 420 W / 11,63 ≈ 36 l/h.'],
      reflexion: { frage: 'Das Bad hat nur ein Drittel der Heizlast der Wohnküche, braucht aber 81 statt 124 l/h – also mehr als die Hälfte. <b>Erkläre</b>, warum.' + SATZ(['Das Bad hat … mit einer Spreizung von …', 'Halbe Spreizung bedeutet …']), muster: 'Das Bad hat Fußbodenheizung mit nur 5 K Spreizung. Halbe Spreizung bedeutet doppelten Volumenstrom bei gleicher Heizlast.' } },
    { id: 'U3', titel: 'Praxis Dr. Okonkwo: sparsam abgleichen', lz: ['LZ4', 'LZ5'],
      auftrag: 'In der Arztpraxis läuft die Pumpe auf 5 m, Wartezimmer und Empfang haben Fußbodenheizung. 1. <b>Gleiche</b> alle Räume auf 90–110 % ab. 2. <b>Stelle</b> die Pumpe so niedrig wie möglich ein.',
      interaktion: uebungAbgleich(hausPraxis, { sparsam: true, titel: 'Abgleich Praxis Dr. Okonkwo',
        hinweis: function () { return L('1. <b>Suche</b> den ungünstigsten Raum. 2. <b>Stelle</b> Pumpe und Voreinstellungen ein. Ziel: alle 90–110 % mit möglichst kleiner Förderhöhe.', '1. <b>Suche</b> den Raum mit dem wenigsten Wasser. 2. <b>Stelle</b> Pumpe und Ventile ein.'); } }),
      tipps: ['Der ungünstigste Raum ist der mit dem weitesten Weg: das Büro von Dr. Okonkwo im OG hinten. Stell ihn auf N.', 'Senke die Pumpe, bis das Büro gerade noch 90–110 % bekommt – das ist bei 3,5 m. Dann alle anderen Räume drosseln.', 'Bei 3,5 m passen etwa: Wartezimmer 4¾, Empfang 4¼, WC 2½, Behandlung 1: 4¾, Behandlung 2: 5, Labor 4½, Büro N (mit 🔧 nachprüfen).'],
      reflexion: { frage: '<b>Erkläre</b>: Warum hat die Pumpe nach dem Abgleich auf 3,5 m gereicht, obwohl vorher 5 m eingestellt waren?' + SATZ(['Vorher haben die nahen Räume …', 'Nach dem Drosseln muss die Pumpe nur noch …']), muster: 'Vorher haben die nahen Räume viel zu viel Wasser bekommen. Nach dem Drosseln fließt nur noch der Soll-Volumenstrom. Die Förderhöhe muss nur noch den ungünstigsten Raum versorgen.' } }
  ],

  nachweis: {
    dauer: '20 Minuten',
    gewichtA: 50,
    einleitung: 'Heute fährst du <b>allein</b> zu Familie Berger. Kessel neu, nie abgeglichen, die Pumpe steht auf 4,5 m. Ich schaue mir dein Protokoll später an – es gibt unterwegs keine Hinweise.',
    teilA: {
      titel: 'Haus Berger abgleichen',
      auftrag: '1. <b>Gleiche</b> alle Räume auf 90–110 % ihres Soll-Volumenstroms ab. 2. <b>Stelle</b> die Pumpe so niedrig wie möglich ein. 3. <b>Gib</b> Teil A ab.',
      interaktion: nachweisBerger
    },
    teilB: { proLZ: 2 }
  },

  merkblatt: [
    { lz: 'LZ1', titel: 'Warum ein Abgleich?', zeilen: [
      { text: 'Ohne Abgleich fließt das Heizwasser bevorzugt dort, wo der ___ am kleinsten ist.', loesung: 'Widerstand' },
      { text: 'Nahe Räume sind dann ___, entfernte Räume ___.', loesung: 'überversorgt, unterversorgt' }
    ], fehler: 'Beim kalten Raum das Thermostat aufdrehen – das Ventil ist dort schon ganz offen.', beispiel: 'Haus Yilmaz: Küche 158 %, Kinderzimmer Can 77 %.' },
    { lz: 'LZ2', titel: 'Soll-Volumenstrom', zeilen: [
      { text: 'V = Q / (___ · ΔT)', loesung: '1,163 Wh/(kg·K)' },
      { text: 'Heizkörper 55/45 °C: ΔT = ___ K; Fußbodenheizung 35/30 °C: ΔT = ___ K.', loesung: '10; 5' }
    ], fehler: 'Den Faktor 1,163 oder die Spreizung vergessen.', beispiel: '930 W / (1,163 · 10 K) ≈ 80 l/h.' },
    { lz: 'LZ3', titel: 'Voreinstellung', zeilen: [
      { text: 'Gemessen und eingestellt wird mit ___ Thermostatköpfen.', loesung: 'abgenommenen' },
      { text: 'Kleinere Voreinstellung = ___ Widerstand = ___ Durchfluss.', loesung: 'mehr; weniger' }
    ], fehler: 'Den Durchfluss mit dem Thermostatkopf begrenzen wollen.', beispiel: 'Ziel: jeder Raum 90–110 % seines Solls.', schema: 'Messen → überversorgte Räume drosseln → unterversorgte öffnen → erneut messen.' },
    { lz: 'LZ4', titel: 'Pumpe einstellen', zeilen: [
      { text: 'Der ___ Raum (meist am weitesten weg) bestimmt die nötige Förderhöhe.', loesung: 'ungünstigste' },
      { text: 'Die Pumpe so ___ wie möglich einstellen; 1 m Förderhöhe ≈ ___ mbar.', loesung: 'niedrig; 100' }
    ], fehler: '„Pumpe höher“ statt Abgleich: Die nahen Räume bekommen noch mehr, Strom und Geräusche steigen.', beispiel: 'Haus Yilmaz: von 5 m auf 3,5 m – Pumpenleistung von etwa 37 W auf 23 W.' },
    { lz: 'LZ5', titel: 'Fußbodenheizung', zeilen: [
      { text: 'Die FBH hat eine kleine Spreizung, deshalb braucht sie ___ Volumenstrom.', loesung: 'mehr (bei 5 K doppelt so viel wie bei 10 K)' },
      { text: 'Eingestellt wird am ___, abgelesen am Durchflussmesser in ___.', loesung: 'Heizkreisverteiler; l/min' }
    ], fehler: 'l/min und l/h verwechseln: 1 l/min = 60 l/h.', beispiel: '270 l/h auf 3 Kreise = 90 l/h je Kreis = 1,5 l/min.' }
  ],
  selbsttest: ['N4', 'N6', 'N11', 'N14', 'N20'],
  vorwissen: ['N1', 'N5', 'N10', 'N16', 'N18'],

  lernziele: [
    { id: 'LZ1', kurz: 'Ursache', text: 'Ich kann erklären, warum ohne hydraulischen Abgleich nahe Räume zu viel und entfernte Räume zu wenig Heizwasser bekommen.' },
    { id: 'LZ2', kurz: 'Volumenstrom', text: 'Ich kann den Soll-Volumenstrom eines Raums aus Heizlast und Spreizung berechnen.' },
    { id: 'LZ3', kurz: 'Voreinstellung', text: 'Ich kann Thermostatventile so voreinstellen, dass jeder Raum seinen Soll-Volumenstrom bekommt.' },
    { id: 'LZ4', kurz: 'Pumpe', text: 'Ich kann die Pumpe nach dem Abgleich passend einstellen und begründen, warum „Pumpe höher“ allein keine Lösung ist.' },
    { id: 'LZ5', kurz: 'Heizflächen', text: 'Ich kann Heizkörper und Fußbodenheizung beim Abgleich unterscheiden (Spreizung, Verteiler, Durchflussmesser).' }
  ],

  glossar: [
    { begriff: 'Hydraulischer Abgleich', erklaerung: '<i>der hydraulische Abgleich, die hydraulischen Abgleiche</i> – Alle Heizflächen werden so eingestellt, dass jede genau so viel Heizwasser bekommt, wie sie braucht.', vorab: true },
    { begriff: 'Volumenstrom', erklaerung: '<i>der Volumenstrom, die Volumenströme</i> – So viel Heizwasser fließt pro Zeit durch eine Heizfläche, in l/h.', vorab: true },
    { begriff: 'Heizlast', erklaerung: '<i>die Heizlast, die Heizlasten</i> – So viel Wärme braucht ein Raum am kältesten Tag, in Watt (W).', vorab: true },
    { begriff: 'Spreizung', erklaerung: '<i>die Spreizung, die Spreizungen</i> – Unterschied zwischen Vorlauf- und Rücklauftemperatur, z. B. 55/45 °C = 10 K.', vorab: true },
    { begriff: 'Voreinstellung', erklaerung: '<i>die Voreinstellung, die Voreinstellungen</i> – Einstellring am Thermostatventil. Er begrenzt den größten Durchfluss. 1 = stark gedrosselt, N = ganz offen.', vorab: true },
    { begriff: 'Thermostatkopf', erklaerung: '<i>der Thermostatkopf, die Thermostatköpfe</i> – Regelt die Raumtemperatur. Er öffnet oder schließt das Ventil, je nach Temperatur.' },
    { begriff: 'Ventilhub', erklaerung: '<i>der Ventilhub, die Ventilhübe</i> – Wie weit das Ventil gerade offen ist, in Prozent.' },
    { begriff: 'Differenzdruck', erklaerung: '<i>der Differenzdruck, die Differenzdrücke</i> – Druckunterschied vor und hinter einem Bauteil, in mbar. Hoher Differenzdruck am fast geschlossenen Ventil führt zu Pfeifen.' },
    { begriff: 'Förderhöhe', erklaerung: '<i>die Förderhöhe, die Förderhöhen</i> – Druck, den die Heizungspumpe erzeugt, in Metern (1 m ≈ 100 mbar).', vorab: true },
    { begriff: 'Δp-konstant', erklaerung: '<i>Regelart der Pumpe, gesprochen „Delta p konstant“</i> – Regelart der Pumpe: Sie hält die eingestellte Förderhöhe konstant.' },
    { begriff: 'Unterversorgung', erklaerung: '<i>die Unterversorgung, ohne Plural</i> – Ein Raum bekommt weniger Heizwasser, als er braucht. Er wird nicht warm.' },
    { begriff: 'Überversorgung', erklaerung: '<i>die Überversorgung, ohne Plural</i> – Ein Raum bekommt mehr Heizwasser, als er braucht. Das Wasser fehlt anderen Räumen.' },
    { begriff: 'Ungünstigster Raum', erklaerung: '<i>der ungünstigste Raum, die ungünstigsten Räume</i> – Der Raum, der bei Soll-Volumenstrom den größten Druckverlust hat – meist der am weitesten entfernte. Er bestimmt die nötige Förderhöhe.' },
    { begriff: 'Heizkreisverteiler', erklaerung: '<i>der Heizkreisverteiler, die Heizkreisverteiler</i> – Verteilt bei der Fußbodenheizung das Heizwasser auf die einzelnen Heizkreise.' },
    { begriff: 'Durchflussmesser', erklaerung: '<i>der Durchflussmesser, die Durchflussmesser</i> – Anzeige am Heizkreisverteiler. Zeigt den Volumenstrom eines Heizkreises, meist in l/min.' }
  ],

  fragen: [
    /* ---------- Kurz-Checks ---------- */
    { id: 'C1', lz: 'LZ1', einsatz: ['check'], typ: 'mc',
      frage: 'Warum bekommt das Kinderzimmer im OG ohne Abgleich zu wenig Heizwasser?',
      optionen: [
        { text: 'Das Wasser nimmt den Weg mit dem kleinsten Widerstand – die nahen Heizkörper im EG nehmen sich zu viel.', richtig: true },
        { text: 'Warmes Wasser steigt nach oben, also müsste das OG eigentlich zu viel bekommen.', feedback: 'In der geschlossenen Anlage treibt die Pumpe das Wasser, nicht der Auftrieb. Entscheidend ist der Widerstand der Wege.' },
        { text: 'Der Kessel ist zu klein.', feedback: 'Der Kessel liefert genug Wärme – sie wird nur falsch verteilt. Die nahen Räume bekommen sogar zu viel.' }
      ],
      erklaerung: 'Ohne Voreinstellung haben die nahen Räume den kleinsten Widerstand. Dort fließt zu viel, für die fernen Räume bleibt zu wenig.' },
    { id: 'C2', lz: 'LZ3', einsatz: ['check'], typ: 'mc',
      frage: 'Herr Yilmaz dreht das Thermostat im kalten Kinderzimmer von 3 auf 5. Was passiert?',
      optionen: [
        { text: 'Fast nichts: Das Ventil war schon ganz offen, mehr Wasser kommt so nicht an.', richtig: true },
        { text: 'Der Raum wird schneller warm, weil mehr Wasser fließt.', feedback: 'Das Thermostat öffnet das Ventil höchstens bis zur Voreinstellung. War es schon ganz offen, ändert Aufdrehen nichts.' },
        { text: 'Die Pumpe läuft schneller.', feedback: 'Das Thermostat wirkt nur auf sein eigenes Ventil, nicht auf die Pumpe.' }
      ],
      erklaerung: 'Ein unterversorgter Raum hat sein Ventil schon ganz offen. Abhilfe bringt nur, die anderen Räume per Voreinstellung zu drosseln.' },
    { id: 'C3', lz: 'LZ2', einsatz: ['check'], typ: 'zahl',
      frage: 'Ein Raum hat eine Heizlast von <b>930 W</b>. Der Heizkörper läuft mit 55/45 °C. Wie groß ist der Soll-Volumenstrom?',
      zahl: { wert: 80, toleranz: 2, einheit: 'l/h' },
      typisch: [{ wert: 93, feedback: 'Du hast nur durch die Spreizung geteilt. Es fehlt der Faktor 1,163 Wh/(kg·K).' }, { wert: 800, feedback: 'Prüf die Rechnung: 930 / (1,163 · 10) ≈ 80.' }],
      erklaerung: 'V = Q / (1,163 · ΔT) = 930 W / (1,163 · 10 K) ≈ 80 l/h.' },
    { id: 'C4', lz: 'LZ4', einsatz: ['check'], typ: 'mc',
      frage: 'Alle Räume sind abgeglichen, aber die Pumpe steht noch auf 5 m statt der nötigen 3,5 m. Was ist die Folge?',
      optionen: [
        { text: 'Alle Räume bekommen gleichmäßig zu viel Wasser, die Pumpe braucht unnötig Strom, Geräusche werden wahrscheinlicher.', richtig: true },
        { text: 'Nichts – die Voreinstellung begrenzt den Durchfluss ja.', feedback: 'Die Voreinstellung ist ein Widerstand, keine feste Mengenbegrenzung. Mehr Förderhöhe drückt mehr Wasser hindurch.' },
        { text: 'Die Räume werden kälter.', feedback: 'Mehr Druck bedeutet mehr Wasser, nicht weniger. Die Räume werden eher etwas wärmer.' }
      ],
      erklaerung: 'Die Voreinstellungen passen nur zur gewählten Förderhöhe. Zu viel Förderhöhe → Überversorgung überall, mehr Strom, Gefahr von Geräuschen.' },
    { id: 'C5', lz: 'LZ4', einsatz: ['check'], typ: 'mc',
      frage: 'Welcher Raum bestimmt, wie hoch die Pumpe mindestens eingestellt werden muss?',
      optionen: [
        { text: 'Der ungünstigste Raum – meist der am weitesten entfernte, dessen Ventil auf N steht.', richtig: true },
        { text: 'Der Raum mit der größten Fläche.', feedback: 'Groß heißt nicht ungünstig. Entscheidend ist der Druckverlust bei Soll-Volumenstrom – vor allem durch den langen Leitungsweg.' },
        { text: 'Der Raum direkt neben dem Heizraum.', feedback: 'Dieser Raum hat den kürzesten Weg und muss sogar gedrosselt werden.' }
      ],
      erklaerung: 'Die Pumpe muss genau den Druckverlust des ungünstigsten Strangs schaffen. Alle anderen Räume werden auf diese Förderhöhe gedrosselt.' },
    { id: 'C6', lz: 'LZ1', einsatz: ['check'], typ: 'mc',
      frage: 'Warum steht das Ventil im entferntesten Raum nach dem Abgleich meist auf N?',
      optionen: [
        { text: 'Sein langer Leitungsweg bremst schon genug – zusätzliche Drosselung ist nicht nötig.', richtig: true },
        { text: 'Weil N „Nacht“ bedeutet und Kinderzimmer nachts warm sein sollen.', feedback: 'N steht für „normal“, also ganz offen ohne Voreinstellung.' },
        { text: 'Weil entfernte Räume immer die größte Heizlast haben.', feedback: 'Die Heizlast hängt vom Raum ab, nicht von der Lage zum Heizraum.' }
      ],
      erklaerung: 'Der entfernteste Raum hat den größten Rohrwiderstand. Er wird nicht gedrosselt; die Pumpe wird auf ihn eingestellt.' },
    { id: 'C7', lz: 'LZ5', einsatz: ['check'], typ: 'zahl',
      frage: 'Das Bad der Okafors hat Fußbodenheizung (35/30 °C) und eine Heizlast von <b>600 W</b>. Wie groß ist der Soll-Volumenstrom?',
      zahl: { wert: 103, toleranz: 3, einheit: 'l/h' },
      typisch: [{ wert: 52, feedback: 'Du hast mit 10 K gerechnet. Die Fußbodenheizung hat hier nur 5 K Spreizung.' }, { wert: 120, feedback: 'Da fehlt der Faktor 1,163: 600 / (1,163 · 5) ≈ 103.' }],
      erklaerung: 'V = 600 W / (1,163 · 5 K) ≈ 103 l/h – fast doppelt so viel wie bei einem Heizkörper.' },
    { id: 'C8', lz: 'LZ5', einsatz: ['check'], typ: 'zahl',
      frage: 'Ein FBH-Raum braucht <b>120 l/h</b> und hat <b>2 Heizkreise</b>. Was soll jeder Durchflussmesser am Verteiler anzeigen (in l/min)?',
      zahl: { wert: 1, toleranz: 0.05, einheit: 'l/min' },
      typisch: [{ wert: 2, feedback: '120 l/h = 2 l/min – aber das ist für beide Kreise zusammen. Je Kreis die Hälfte.' }, { wert: 60, feedback: '60 l/h je Kreis stimmt. Gefragt ist l/min: 60 l/h / 60 = 1 l/min.' }],
      erklaerung: '120 l/h / 2 Kreise = 60 l/h je Kreis = 1 l/min.' },
    { id: 'C9', lz: 'LZ3', einsatz: ['check'], typ: 'mc',
      frage: 'Du drehst die Voreinstellung eines Heizkörpers von 4 auf 3. Was ändert sich?',
      optionen: [
        { text: 'Der Widerstand steigt, der Volumenstrom sinkt.', richtig: true },
        { text: 'Die Raumtemperatur wird auf einen niedrigeren Wert geregelt.', feedback: 'Die Solltemperatur stellt der Thermostatkopf ein, nicht die Voreinstellung.' },
        { text: 'Der Volumenstrom steigt.', feedback: 'Kleinere Zahl = enger = weniger Durchfluss.' }
      ],
      erklaerung: 'Die Voreinstellung begrenzt den Durchfluss: kleinere Zahl, größerer Widerstand, weniger Wasser.' },

    /* ---------- Nachweis Teil B (je LZ 4) ---------- */
    { id: 'N1', lz: 'LZ1', einsatz: ['nachweis', 'vorwissen'], typ: 'mc',
      frage: 'Wie verteilt sich das Heizwasser in einer Anlage <b>ohne</b> hydraulischen Abgleich?',
      optionen: [
        { text: 'Es fließt bevorzugt durch die Heizflächen mit dem kleinsten Widerstand, meist nahe an der Pumpe.', richtig: true },
        { text: 'Gleichmäßig auf alle Heizkörper.', feedback: 'Gleichmäßig wäre es nur, wenn alle Wege gleich viel Widerstand hätten. Kurze Wege bremsen weniger.' },
        { text: 'Bevorzugt ins obere Stockwerk, weil warmes Wasser steigt.', feedback: 'Die Pumpe treibt das Wasser. Entscheidend ist der Widerstand, nicht der Auftrieb.' }
      ],
      erklaerung: 'Wasser nimmt den Weg des geringsten Widerstands. Ohne Abgleich sind nahe Heizflächen überversorgt, entfernte unterversorgt.' },
    { id: 'N2', lz: 'LZ1', einsatz: ['nachweis'], typ: 'mc',
      frage: 'Welche Beobachtungen deuten auf einen <b>fehlenden hydraulischen Abgleich</b> hin?',
      optionen: [
        { text: 'Entfernte Räume werden nicht richtig warm.', richtig: true },
        { text: 'Thermostatventile pfeifen oder rauschen.', richtig: true },
        { text: 'Die Pumpe läuft auf einer hohen Stufe und verbraucht viel Strom.', richtig: true },
        { text: 'Ein Heizkörper gluckert und ist oben kalt.', feedback: 'Das ist typisch für Luft im Heizkörper – hier hilft Entlüften.' }
      ],
      erklaerung: 'Unterversorgte Räume, Strömungsgeräusche und eine „zur Sicherheit“ hochgedrehte Pumpe sind typische Folgen. Gluckern deutet auf Luft hin.' },
    { id: 'N3', lz: 'LZ1', einsatz: ['nachweis'], typ: 'zuordnen',
      frage: 'Ordne jeder Beobachtung die wahrscheinliche Ursache zu.',
      paare: [
        { links: 'Raum nahe am Heizraum ist zu warm, Ventil pfeift', rechts: 'Überversorgung' },
        { links: 'Raum am Ende des Strangs bleibt kalt, Ventil ganz offen', rechts: 'Unterversorgung' },
        { links: 'Heizkörper oben kalt, gluckert', rechts: 'Luft im Heizkörper' },
        { links: 'Alle Räume sind gleich kühl', rechts: 'Vorlauftemperatur zu niedrig' }
      ],
      feedbackFalsch: 'Achte darauf, ob nur einzelne Räume betroffen sind (Verteilung) oder alle (Wärmeerzeugung).',
      erklaerung: 'Ungleich verteilte Wärme spricht für fehlenden Abgleich; gleichmäßig kühle Räume für zu wenig Vorlauftemperatur; Gluckern für Luft.' },
    { id: 'N4', lz: 'LZ1', einsatz: ['nachweis'], typ: 'mc',
      frage: 'Welcher Raum ist ohne Abgleich am ehesten <b>unterversorgt</b>?',
      optionen: [
        { text: 'Ein Raum im OG mit dem längsten Leitungsweg vom Heizraum.', richtig: true },
        { text: 'Ein kleiner Raum direkt über dem Heizraum.', feedback: 'Kurzer Weg, wenig Widerstand – dieser Raum bekommt eher zu viel.' },
        { text: 'Das Gäste-WC neben dem Kessel.', feedback: 'Nah am Kessel heißt wenig Widerstand – eher Überversorgung.' }
      ],
      erklaerung: 'Je länger der Leitungsweg, desto größer der Widerstand – ohne Abgleich bleibt für diese Räume zu wenig Wasser.' },
    { id: 'N5', lz: 'LZ2', einsatz: ['nachweis', 'vorwissen'], typ: 'zahl',
      frage: 'Heizlast <b>1400 W</b>, Heizkörper 55/45 °C. Wie groß ist der Soll-Volumenstrom?',
      zahl: { wert: 120, toleranz: 3, einheit: 'l/h' },
      typisch: [{ wert: 140, feedback: 'Du hast nur durch die Spreizung geteilt. Es fehlt der Faktor 1,163.' }, { wert: 1204, feedback: 'Da ist die Kommastelle verrutscht: 1400 / 11,63 ≈ 120.' }],
      erklaerung: 'V = 1400 W / (1,163 · 10 K) ≈ 120 l/h.' },
    { id: 'N6', lz: 'LZ2', einsatz: ['nachweis'], typ: 'zahl',
      frage: 'Ein Raum mit Fußbodenheizung (35/30 °C) hat eine Heizlast von <b>700 W</b>. Wie groß ist der Soll-Volumenstrom?',
      zahl: { wert: 120, toleranz: 3, einheit: 'l/h' },
      typisch: [{ wert: 60, feedback: 'Du hast mit 10 K gerechnet. Bei 35/30 °C beträgt die Spreizung nur 5 K.' }, { wert: 140, feedback: 'Der Faktor 1,163 fehlt.' }],
      erklaerung: 'V = 700 W / (1,163 · 5 K) ≈ 120 l/h.' },
    { id: 'N7', lz: 'LZ2', einsatz: ['nachweis'], typ: 'mc',
      frage: 'Wofür steht die Zahl <b>1,163</b> in der Formel V = Q / (1,163 · ΔT)?',
      optionen: [
        { text: 'Für die spezifische Wärmekapazität von Wasser: 1,163 Wh je kg und K (1 kg ≈ 1 l).', richtig: true },
        { text: 'Für die Dichte von Heizwasser.', feedback: 'Die Dichte liegt bei etwa 1 kg/l. 1,163 ist die Wärme, die 1 kg Wasser je Kelvin aufnimmt.' },
        { text: 'Für den Wirkungsgrad des Kessels.', feedback: 'Der Kessel spielt für die Verteilung keine Rolle. 1,163 gehört zum Wasser.' }
      ],
      erklaerung: '1 kg Wasser speichert 1,163 Wh je Kelvin. Daraus folgt der Volumenstrom in l/h, wenn Q in W und ΔT in K eingesetzt werden.' },
    { id: 'N8', lz: 'LZ2', einsatz: ['nachweis'], typ: 'mc',
      frage: 'Die Heizlast bleibt gleich, die Spreizung wird von 10 K auf 5 K <b>halbiert</b>. Was passiert mit dem Soll-Volumenstrom?',
      optionen: [
        { text: 'Er verdoppelt sich.', richtig: true },
        { text: 'Er halbiert sich.', feedback: 'ΔT steht im Nenner. Kleinere Spreizung → größerer Volumenstrom.' },
        { text: 'Er bleibt gleich.', feedback: 'Jeder Liter gibt bei kleinerer Spreizung weniger Wärme ab. Es muss mehr Wasser fließen.' }
      ],
      erklaerung: 'V = Q / (1,163 · ΔT): halbe Spreizung → doppelter Volumenstrom.' },
    { id: 'N9', lz: 'LZ3', einsatz: ['nachweis'], typ: 'mc',
      frage: 'Bei der Messung mit abgenommenen Köpfen bekommt ein Raum <b>150 %</b> seines Solls. Was tust du?',
      optionen: [
        { text: 'Die Voreinstellung verkleinern, bis 90–110 % erreicht sind.', richtig: true },
        { text: 'Das Thermostat zudrehen.', feedback: 'Das Thermostat regelt die Temperatur. Der maximale Durchfluss wird über die Voreinstellung begrenzt.' },
        { text: 'Die Pumpe höher stellen.', feedback: 'Dann bekommt der Raum noch mehr. Überversorgung behebt man durch Drosseln.' }
      ],
      erklaerung: 'Überversorgte Räume werden über die Voreinstellung gedrosselt.' },
    { id: 'N10', lz: 'LZ3', einsatz: ['nachweis', 'vorwissen'], typ: 'mc',
      frage: 'Warum misst man beim Abgleich mit <b>abgenommenen</b> Thermostatköpfen?',
      optionen: [
        { text: 'Damit nur die Voreinstellung den Durchfluss begrenzt und nicht die gerade herrschende Raumtemperatur.', richtig: true },
        { text: 'Damit das Ventil ganz geschlossen ist.', feedback: 'Ohne Kopf ist das Ventil offen – bis auf die Voreinstellung.' },
        { text: 'Weil der Kopf beim Einstellen sonst beschädigt wird.', feedback: 'Es geht um die Messung: Der Kopf würde je nach Raumtemperatur drosseln und das Ergebnis verfälschen.' }
      ],
      erklaerung: 'Ohne Kopf ist das Ventil voll geöffnet. So zeigt die Messung den Auslegungsfall, den die Voreinstellung begrenzt.' },
    { id: 'N11', lz: 'LZ3', einsatz: ['nachweis'], typ: 'mc',
      frage: 'Ein Raum steht schon auf <b>N</b> und bekommt nur 80 % seines Solls. Was hilft?',
      optionen: [
        { text: 'Die Förderhöhe der Pumpe erhöhen und die übrigen Räume nachstellen.', richtig: true },
        { text: 'Die Voreinstellung auf 1 stellen.', feedback: '1 ist die stärkste Drosselung – dann kommt noch weniger an.' },
        { text: 'Das Thermostat auf 5 drehen.', feedback: 'Das Ventil ist schon ganz offen. Aufdrehen bringt keinen zusätzlichen Durchfluss.' }
      ],
      erklaerung: 'Ist ein Ventil ganz offen und reicht es trotzdem nicht, fehlt Förderhöhe. Danach müssen die anderen Räume neu gedrosselt werden.' },
    { id: 'N12', lz: 'LZ3', einsatz: ['nachweis'], typ: 'zuordnen',
      frage: 'Ordne zu: Was bedeutet die Einstellung?',
      paare: [
        { links: 'Voreinstellung 1', rechts: 'stark gedrosselt' },
        { links: 'Voreinstellung N', rechts: 'ganz offen' },
        { links: 'Thermostat 3', rechts: 'etwa 20 °C' },
        { links: 'Thermostat ✱', rechts: 'Frostschutz, etwa 6 °C' }
      ],
      feedbackFalsch: 'Die Voreinstellung begrenzt den Durchfluss, der Thermostatkopf stellt die Raumtemperatur ein.',
      erklaerung: 'Voreinstellung: 1 = wenig, N = offen. Thermostat: ✱ ≈ 6 °C, 3 ≈ 20 °C, je Stufe etwa 4 K.' },
    { id: 'N13', lz: 'LZ4', einsatz: ['nachweis'], typ: 'mc',
      frage: 'Wie stellst du die Pumpe nach dem Abgleich ein?',
      optionen: [
        { text: 'So niedrig, dass der ungünstigste Raum gerade noch seinen Soll-Volumenstrom bekommt.', richtig: true },
        { text: 'Auf die höchste Stufe, damit alle Räume sicher warm werden.', feedback: 'Dann sind alle Räume überversorgt, Strom und Geräusche steigen.' },
        { text: 'Immer auf die mittlere Stufe.', feedback: 'Die nötige Förderhöhe hängt vom Haus ab und muss bestimmt werden.' }
      ],
      erklaerung: 'Die Förderhöhe richtet sich nach dem ungünstigsten Strang – nicht mehr als nötig.' },
    { id: 'N14', lz: 'LZ4', einsatz: ['nachweis'], typ: 'mc',
      frage: 'Welche Folgen hat eine <b>zu hoch</b> eingestellte Pumpe?',
      optionen: [
        { text: 'Strömungsgeräusche an den Ventilen', richtig: true },
        { text: 'Höherer Stromverbrauch der Pumpe', richtig: true },
        { text: 'Überversorgung und zu hohe Rücklauftemperatur', richtig: true },
        { text: 'Der Kessel erzeugt dadurch mehr Wärme', feedback: 'Die Pumpe verteilt Wärme, sie erzeugt keine. Die Wärmemenge bestimmt der Bedarf der Räume.' }
      ],
      erklaerung: 'Zu viel Förderhöhe: Geräusche, unnötiger Strom, Überversorgung und hohe Rücklauftemperaturen (schlecht für Brennwertnutzung).' },
    { id: 'N15', lz: 'LZ4', einsatz: ['nachweis'], typ: 'zahl',
      frage: 'Die Pumpe ist auf <b>3,5 m</b> Förderhöhe eingestellt. Wie viel ist das ungefähr in mbar?',
      zahl: { wert: 350, toleranz: 10, einheit: 'mbar' },
      typisch: [{ wert: 35, feedback: '1 m Wassersäule ≈ 100 mbar, nicht 10 mbar.' }, { wert: 3500, feedback: '1 m ≈ 100 mbar. 3,5 m ≈ 350 mbar.' }],
      erklaerung: '1 m Wassersäule ≈ 98 mbar ≈ 100 mbar. 3,5 m ≈ 350 mbar.' },
    { id: 'N16', lz: 'LZ4', einsatz: ['nachweis', 'vorwissen'], typ: 'mc',
      frage: 'Ein Kunde meint: „Dreh doch einfach die Pumpe höher, dann wird es oben warm.“ Was antwortest du?',
      optionen: [
        { text: 'Dann bekommen die nahen Räume noch mehr – das Problem verschiebt sich, Strom und Geräusche steigen. Besser abgleichen.', richtig: true },
        { text: 'Gute Idee – genau das ist der hydraulische Abgleich.', feedback: 'Der Abgleich verteilt das Wasser über die Voreinstellungen. Pumpe höher allein ändert die Verteilung nicht.' },
        { text: 'Die Pumpe hat keinen Einfluss auf die Räume.', feedback: 'Doch: Mehr Förderhöhe bedeutet mehr Durchfluss – nur eben in allen Räumen.' }
      ],
      erklaerung: 'Ohne Abgleich steigt bei höherer Förderhöhe der Durchfluss überall. Die Ungleichverteilung bleibt.' },
    { id: 'N17', lz: 'LZ5', einsatz: ['nachweis'], typ: 'zahl',
      frage: 'Der Durchflussmesser eines FBH-Kreises zeigt <b>1,5 l/min</b>. Wie viel ist das in l/h?',
      zahl: { wert: 90, toleranz: 0.5, einheit: 'l/h' },
      typisch: [{ wert: 0.025, feedback: 'Du hast geteilt. Eine Stunde hat 60 Minuten: 1,5 · 60.' }, { wert: 25, feedback: 'Eine Stunde hat 60 Minuten: 1,5 l/min · 60 = 90 l/h.' }],
      erklaerung: '1,5 l/min · 60 min/h = 90 l/h.' },
    { id: 'N18', lz: 'LZ5', einsatz: ['nachweis', 'vorwissen'], typ: 'mc',
      frage: 'Warum braucht eine Fußbodenheizung bei gleicher Heizlast mehr Volumenstrom als ein Heizkörper?',
      optionen: [
        { text: 'Weil sie mit kleinerer Spreizung arbeitet (z. B. 5 K statt 10 K).', richtig: true },
        { text: 'Weil ihre Rohre länger sind.', feedback: 'Längere Rohre erhöhen den Widerstand, aber nicht den Wasserbedarf. Der hängt von Heizlast und Spreizung ab.' },
        { text: 'Weil sie eine höhere Vorlauftemperatur braucht.', feedback: 'Im Gegenteil: Die FBH arbeitet mit niedriger Vorlauftemperatur (z. B. 35 °C).' }
      ],
      erklaerung: 'Bei kleiner Spreizung transportiert jeder Liter weniger Wärme. Für dieselbe Heizlast muss mehr Wasser fließen.' },
    { id: 'N19', lz: 'LZ5', einsatz: ['nachweis'], typ: 'mc',
      frage: 'Wo stellst du bei der Fußbodenheizung den Volumenstrom ein?',
      optionen: [
        { text: 'Am Heizkreisverteiler, für jeden Heizkreis einzeln.', richtig: true },
        { text: 'Am Raumthermostat an der Wand.', feedback: 'Das Raumthermostat regelt die Temperatur über Stellantriebe, begrenzt aber nicht den Volumenstrom.' },
        { text: 'Am Kessel.', feedback: 'Am Kessel stellt man Temperaturen ein, nicht den Volumenstrom einzelner Kreise.' }
      ],
      erklaerung: 'Jeder FBH-Kreis hat am Verteiler ein Einstellventil, oft mit Durchflussmesser in l/min.' },
    { id: 'N20', lz: 'LZ5', einsatz: ['nachweis'], typ: 'mc',
      frage: 'Ein Wohnzimmer mit Fußbodenheizung braucht <b>270 l/h</b> und hat <b>3 Heizkreise</b>. Was soll jeder Durchflussmesser anzeigen?',
      optionen: [
        { text: '1,5 l/min', richtig: true },
        { text: '4,5 l/min', feedback: '4,5 l/min ist der Volumenstrom aller drei Kreise zusammen.' },
        { text: '90 l/min', feedback: '90 ist richtig – aber in l/h. In l/min: 90 / 60 = 1,5.' }
      ],
      mischen: false,
      erklaerung: '270 l/h / 3 Kreise = 90 l/h je Kreis = 1,5 l/min.' }
  ]
};
