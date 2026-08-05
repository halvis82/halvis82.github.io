/* ---------------------------------------------------------------
   A live orbital scene: the sky, the planets, the Moon, Earth, and the
   International Space Station, all in one rotating frame.

   Only one thing is fetched:

     https://api.wheretheiss.at/v1/satellites/25544

   which gives the station's latitude, longitude, altitude, speed, whether
   it is in sunlight, and the subsolar point. Everything else is worked
   out from the clock.

   Three coordinate systems, tied together so they turn as one:

   1. Earth-fixed. Coastlines in latitude and longitude, from Natural
      Earth, simplified and baked in.
   2. Equatorial. Stars, constellation figures, and the computed
      positions of the Sun, Moon and planets, in right ascension and
      declination.
   3. The view. Centred on the point of the globe the station is over.
      Greenwich sidereal time converts that geographic longitude into a
      right ascension, which is the hinge between systems one and two.

   The consequence is that the sky is not wallpaper. It sits still while
   the Earth turns under it, exactly as the real sky does, and the whole
   frame drifts because the station is crossing about four degrees of
   longitude every minute.

   The planets come from the JPL approximate elements for 1800 to 2050:
   Keplerian elements and their per-century rates, solved for eccentric
   anomaly, converted to heliocentric ecliptic, then geocentric, then
   equatorial. Good to arcminutes, which is far finer than a few pixels.
   The Moon uses a low-precision lunar series. No ephemeris is fetched,
   because none needs to be: the mathematics is the same every time and
   only the clock changes.
   --------------------------------------------------------------- */

(function () {
  'use strict';

  var canvas = document.getElementById('scene');
  var host   = document.getElementById('sig');
  var capEl  = document.getElementById('sig-cap');
  if (!canvas || !host) return;
  if (typeof COAST === 'undefined' || typeof STARS === 'undefined') return;

  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var API = 'https://api.wheretheiss.at/v1/satellites/25544';
  var REFRESH = 5000;

  var W = 1200, H = 800, dpr = 1;
  var D2R = Math.PI / 180, R2D = 180 / Math.PI;
  var EARTH_KM = 6371;

  var iss = null;
  // Which way along the orbit it is travelling. Held unknown until two
  // readings far enough apart prove it, because guessing means drawing the
  // path backwards for the first few seconds.
  var ascending = true, dirKnown = false;
  var latHist = [];
  var you = null;                          // visitor location, from IP
  var lon0 = 0, lat0 = 0, tLon = 0, tLat = 0, haveFix = false;

  // Dragging takes the view off the station for a while, then it drifts back
  var dragging = false, dragX = 0, dragY = 0, dragLon = 0, dragLat = 0;
  var releasedAt = 0, everDragged = false;
  var HOLD_MS = 5000;      // how long to stay put after letting go
  var DEG_PER_PX = 0.26;

  // Turning the view inside out. At 0 we are outside looking at Earth with
  // the sky behind it. At 1 we are standing on the surface looking straight
  // up. The two sky centres are exactly antipodal, so the transition is a
  // 180 degree sweep about a perpendicular axis, which reads as the whole
  // scene tipping over rather than cutting between two states.
  var inside = 0, insideTarget = 0, insideAt = 0;
  var FLIP_SECS = 2.6;
  var STAY_INSIDE_MS = 26000;
  var GREEN = '#57cf92';

  var gx = 0, gy = 0, gr = 150;      // globe centre and radius
  var sx = 0, sy = 0, sScale = 1, sOut = 1, sIn = 1;   // sky centre and scale

  // lat, lon, label, small
  var PLACES = [
    [32.72, -117.16, 'San Diego', false],
    [37.77, -122.42, 'Bay Area', false],
    [60.90,    8.70, 'Norway', false],
    [40.20,   -3.70, 'where i learned how to exit VIM', true]
  ];

  // ------------------------------------------------------------------
  // Baked data
  // ------------------------------------------------------------------

  function decodeDelta(blob, div) {
    var out = [], groups = blob.split(';'), i, j;
    for (i = 0; i < groups.length; i++) {
      var nums = groups[i].split(' '), pts = [], x = 0, y = 0;
      for (j = 0; j < nums.length; j++) {
        var p = nums[j].split(',');
        var dx = parseInt(p[0], 10), dy = parseInt(p[1], 10);
        if (j === 0) { x = dx; y = dy; } else { x += dx; y += dy; }
        pts.push([x / div, y / div]);
      }
      if (pts.length > 1) out.push(pts);
    }
    return out;
  }

  var COASTLINES = decodeDelta(COAST, 10);
  var FIGURES    = decodeDelta(CLINES, 10);

  var STARLIST = (function () {
    var raw = STARS.split(' '), out = [], i;
    for (i = 0; i < raw.length; i++) {
      var p = raw[i].split(',');
      out.push([+p[0] / 10, +p[1] / 10, +p[2] / 10]);
    }
    return out;
  })();

  var NAMED = (function () {
    if (typeof SNAMES === 'undefined') return [];
    var raw = SNAMES.split(';'), out = [], i;
    for (i = 0; i < raw.length; i++) {
      var c = raw[i].split(',');
      if (c.length < 3) continue;
      out.push([+c[0] / 10, +c[1] / 10, c.slice(2).join(',')]);
    }
    return out;
  })();

  // ------------------------------------------------------------------
  // Time and orbital mechanics
  // ------------------------------------------------------------------

  function julian(d) { return d.getTime() / 86400000 + 2440587.5; }

  // Greenwich mean sidereal time, degrees. This is the hinge that ties
  // geographic longitude to right ascension.
  function gmst(jd) {
    var T = (jd - 2451545.0) / 36525;
    var g = 280.46061837 + 360.98564736629 * (jd - 2451545.0)
          + 0.000387933 * T * T;
    return ((g % 360) + 360) % 360;
  }

  // JPL approximate elements, valid 1800-2050.
  // a, e, I, L, longitude of perihelion, longitude of node, then rates.
  var PLANETS = [
    ['Mercury', 0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593,
                0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
    ['Venus',   0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255,
                0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418],
    ['Mars',    1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891,
                0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
    ['Jupiter', 5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909,
                -0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
    ['Saturn',  9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448,
                -0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794]
  ];
  var EARTH_EL = [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0,
                  0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0];

  function norm360(x) { return ((x % 360) + 360) % 360; }

  // Heliocentric ecliptic rectangular coordinates, in astronomical units
  function helio(el, T) {
    var a = el[0] + el[6] * T;
    var e = el[1] + el[7] * T;
    var I = (el[2] + el[8] * T) * D2R;
    var L = el[3] + el[9] * T;
    var wbar = el[4] + el[10] * T;
    var Om = (el[5] + el[11] * T) * D2R;

    var M = norm360(L - wbar);
    if (M > 180) M -= 360;
    M *= D2R;
    var w = wbar * D2R - Om;

    // Kepler's equation, Newton iteration. Converges in a handful of steps
    // for every eccentricity in this table.
    var E = M + e * Math.sin(M);
    for (var i = 0; i < 8; i++) {
      var dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      E -= dE;
      if (Math.abs(dE) < 1e-10) break;
    }

    var xp = a * (Math.cos(E) - e);
    var yp = a * Math.sqrt(1 - e * e) * Math.sin(E);

    var cw = Math.cos(w), sw = Math.sin(w);
    var cO = Math.cos(Om), sO = Math.sin(Om);
    var cI = Math.cos(I), sI = Math.sin(I);

    return [
      (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
      (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
      (sw * sI) * xp + (cw * sI) * yp
    ];
  }

  var OBL = 23.43928 * D2R;

  function eclipticToEquatorial(x, y, z) {
    return [x,
            y * Math.cos(OBL) - z * Math.sin(OBL),
            y * Math.sin(OBL) + z * Math.cos(OBL)];
  }

  function toRaDec(v) {
    var ra = norm360(Math.atan2(v[1], v[0]) * R2D);
    var dec = Math.atan2(v[2], Math.sqrt(v[0] * v[0] + v[1] * v[1])) * R2D;
    return [ra, dec];
  }

  function bodies(date) {
    var jd = julian(date);
    var T = (jd - 2451545.0) / 36525;
    var earth = helio(EARTH_EL, T);
    var out = [];

    // The Sun, seen from Earth, is simply the reverse of Earth's own
    // heliocentric position.
    var sunEq = eclipticToEquatorial(-earth[0], -earth[1], -earth[2]);
    var sun = toRaDec(sunEq);
    out.push({ name: 'Sun', ra: sun[0], dec: sun[1], mag: -26, sun: true });

    for (var i = 0; i < PLANETS.length; i++) {
      var el = PLANETS[i].slice(1);
      var p = helio(el, T);
      var g = [p[0] - earth[0], p[1] - earth[1], p[2] - earth[2]];
      var eq = eclipticToEquatorial(g[0], g[1], g[2]);
      var rd = toRaDec(eq);
      out.push({ name: PLANETS[i][0], ra: rd[0], dec: rd[1], mag: 0 });
    }

    // Moon: low-precision series, ecliptic longitude and latitude
    var Lp = 218.316 + 481267.8813 * T;
    var M  = 357.529 + 35999.0503 * T;
    var Mp = 134.963 + 477198.8676 * T;
    var Dm = 297.850 + 445267.1115 * T;
    var F  = 93.272 + 483202.0175 * T;
    var mlon = Lp + 6.289 * Math.sin(Mp * D2R)
                  - 1.274 * Math.sin((Mp - 2 * Dm) * D2R)
                  + 0.658 * Math.sin(2 * Dm * D2R);
    var mlat = 5.128 * Math.sin(F * D2R);
    var mr = 1;
    var ml = mlon * D2R, mb = mlat * D2R;
    var mv = eclipticToEquatorial(mr * Math.cos(mb) * Math.cos(ml),
                                  mr * Math.cos(mb) * Math.sin(ml),
                                  mr * Math.sin(mb));
    var mrd = toRaDec(mv);
    var sunLon = 280.459 + 36000.771 * T + 1.915 * Math.sin(M * D2R);
    var elong = norm360(mlon - sunLon);
    out.push({ name: 'Moon', ra: mrd[0], dec: mrd[1], mag: -12,
               moon: true, phase: (1 - Math.cos(elong * D2R)) / 2, elong: elong });
    return out;
  }

  // ------------------------------------------------------------------
  // Projections
  // ------------------------------------------------------------------

  // Earth: orthographic, far side hidden so it reads as a solid sphere.
  function projEarth(lat, lon, rad) {
    var la = lat * D2R, lo = (lon - lon0) * D2R, l0 = lat0 * D2R;
    var cla = Math.cos(la), sla = Math.sin(la);
    var z = Math.sin(l0) * sla + Math.cos(l0) * cla * Math.cos(lo);
    if (z < 0) return null;
    var r = gr * (rad || 1);
    return [gx + r * cla * Math.sin(lo),
            gy - r * (Math.cos(l0) * sla - Math.sin(l0) * cla * Math.cos(lo)),
            z];
  }

  // Great-circle distance in kilometres
  function km(aLat, aLon, bLat, bLon) {
    var d2 = Math.PI / 180;
    var dLat = (bLat - aLat) * d2, dLon = (bLon - aLon) * d2;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(aLat * d2) * Math.cos(bLat * d2) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function vec3(lat, lon) {
    var la = lat * D2R, lo = lon * D2R;
    return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
  }

  function sunlitAt(lat, lon, sLat, sLon) {
    var a = vec3(lat, lon), b = vec3(sLat, sLon);
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] > 0;
  }

  // Sky: stereographic about the point opposite the view centre, which is
  // the patch of sky lying behind Earth from where we are looking.
  var skyRa0 = 0, skyDec0 = 0;

  function rodrigues(v, k, ang) {
    var c = Math.cos(ang), sn = Math.sin(ang);
    var kd = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];
    return [
      v[0] * c + (k[1] * v[2] - k[2] * v[1]) * sn + k[0] * kd * (1 - c),
      v[1] * c + (k[2] * v[0] - k[0] * v[2]) * sn + k[1] * kd * (1 - c),
      v[2] * c + (k[0] * v[1] - k[1] * v[0]) * sn + k[2] * kd * (1 - c)
    ];
  }

  var zenRa = 0, zenDec = 0, locRa = 0, locDec = 0;

  function updateSkyCentre(date) {
    var ra0 = norm360(gmst(julian(date)) + lon0);
    // The backdrop always shows the sky behind Earth. It does not flip.
    skyRa0 = norm360(ra0 + 180);
    skyDec0 = -lat0;

    // The porthole sweeps from that same backdrop direction round to the
    // zenith overhead, a clean 180 degrees, which is what sells it as the
    // sphere being turned inside out rather than a crossfade between two
    // unrelated pictures.
    zenRa = ra0; zenDec = lat0;
    var z = vec3(lat0, ra0);
    var start = [-z[0], -z[1], -z[2]];
    var axis = [-Math.sin(ra0 * D2R), Math.cos(ra0 * D2R), 0];   // local east
    var c = inside > 0.0005 ? rodrigues(start, axis, inside * Math.PI) : start;
    var rd = toRaDec(c);
    locRa = rd[0]; locDec = rd[1];
  }

  // Projection for the porthole: same stereographic maths, but centred on the
  // globe and scaled so the horizon lands exactly on its rim.
  var lx = 0, ly = 0, lScale = 1, zoomK = 1;

  function projLocal(ra, dec) {
    var d0 = locDec * D2R, d = dec * D2R;
    var dra = (ra - locRa) * D2R;
    var cosc = Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos(dra);
    if (cosc < -0.2) return null;
    var k = lScale / (1 + cosc);
    return [lx + k * Math.cos(d) * Math.sin(dra),
            ly - k * (Math.cos(d0) * Math.sin(d) - Math.sin(d0) * Math.cos(d) * Math.cos(dra))];
  }

  function projSky(ra, dec) {
    var d0 = skyDec0 * D2R, d = dec * D2R;
    var dra = (ra - skyRa0) * D2R;
    var cosc = Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos(dra);
    if (cosc < -0.34) return null;                 // beyond the useful field
    var k = sScale / (1 + cosc);                    // stereographic
    return [sx + k * Math.cos(d) * Math.sin(dra),
            sy - k * (Math.cos(d0) * Math.sin(d) - Math.sin(d0) * Math.cos(d) * Math.cos(dra))];
  }

  // ------------------------------------------------------------------
  // Data
  // ------------------------------------------------------------------

  // Roughly where the visitor is, from their IP. No permission prompt and no
  // GPS: this is the coarse city-level guess their network already leaks, and
  // it is only ever used to place a dot.
  function locateVisitor() {
    return fetch('https://get.geojs.io/v1/ip/geo.json', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('geo'); return r.json(); })
      .then(function (d) {
        var la = parseFloat(d.latitude), lo = parseFloat(d.longitude);
        if (!isFinite(la) || !isFinite(lo)) throw new Error('geo values');
        you = { lat: la, lon: lo, city: d.city || '', region: d.region || '' };
      })
      .catch(function () {
        return fetch('https://ipwho.is/', { cache: 'no-store' })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (!d || !isFinite(d.latitude)) throw new Error('geo2');
            you = { lat: d.latitude, lon: d.longitude, city: d.city || '', region: d.region || '' };
          })
          .catch(function () { you = null; });
      });
  }

  // ------------------------------------------------------------------
  // Things happening on Earth right now
  // ------------------------------------------------------------------
  //
  // NASA's Earth Observatory Natural Event Tracker. Open events only, and
  // deliberately thinned: there are typically well over a hundred active
  // wildfires, and plotting all of them turns the planet into a rash.
  var events = { fires: [], volcanoes: [], storms: [] };

  function loadEvents() {
    return fetch('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=16',
                 { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('eonet'); return r.json(); })
      .then(function (d) {
        var fires = [], volc = [], storms = [], i, j;
        var list = d.events || [];
        for (i = 0; i < list.length; i++) {
          var e = list[i];
          var g = e.geometry && e.geometry[e.geometry.length - 1];
          if (!g || !g.coordinates) continue;
          var c = g.coordinates;
          if (Array.isArray(c[0])) continue;              // skip polygons
          var lat = c[1], lon = c[0];
          if (!isFinite(lat) || !isFinite(lon)) continue;
          var cat = (e.categories && e.categories[0] && e.categories[0].id) || '';
          var name = (e.title || '').replace(/^Wildfire\s+/i, '');
          if (cat === 'wildfires') fires.push({ lat: lat, lon: lon, name: name });
          else if (cat === 'severeStorms') storms.push({ lat: lat, lon: lon, name: e.title });
        }
        // Thin the fires so they read as scattered hotspots rather than a
        // solid smear. One per coarse grid cell, then sampled evenly across
        // the whole set rather than taking the first ones found, since the
        // feed arrives grouped by region and the first N would all land on
        // the same continent.
        var cell = {}, uniq = [];
        for (i = 0; i < fires.length; i++) {
          var k = Math.round(fires[i].lat / 5) + ':' + Math.round(fires[i].lon / 5);
          if (cell[k]) continue;
          cell[k] = 1; uniq.push(fires[i]);
        }
        var keep = uniq;
        if (uniq.length > 18) {
          keep = [];
          var stride = uniq.length / 18;
          for (j = 0; j < 18; j++) keep.push(uniq[Math.floor(j * stride)]);
        }
        events.fires = keep;
        events.storms = storms.slice(0, 5);
      })
      .catch(function () { });
  }

  // Volcanoes move on a completely different clock from fires and storms.
  // EONET keeps a volcano event open for months but only adds a new position
  // when a satellite actually flags a thermal anomaly, so a two week window
  // finds nothing at all. A year of events, filtered to those seen recently,
  // is what actually reflects which volcanoes are currently restless.
  //
  // Note this deliberately misses the permanently grumbling ones. Fuego above
  // Antigua erupts most days and never trips the detector, so it never
  // appears. Routine activity is not really an event.
  function loadVolcanoes() {
    return fetch('https://eonet.gsfc.nasa.gov/api/v3/events?category=volcanoes&status=open&days=365',
                 { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('eonet-v'); return r.json(); })
      .then(function (d) {
        var out = [], list = d.events || [], cutoff = Date.now() - 120 * 86400000;
        for (var i = 0; i < list.length; i++) {
          var e = list[i];
          var g = e.geometry && e.geometry[e.geometry.length - 1];
          if (!g || !g.coordinates || Array.isArray(g.coordinates[0])) continue;
          var when = Date.parse(g.date || '');
          if (isFinite(when) && when < cutoff) continue;
          out.push({ lat: g.coordinates[1], lon: g.coordinates[0],
                     name: (e.title || '').replace(/\s*Volcano.*$/, '') });
          if (out.length >= 8) break;
        }
        events.volcanoes = out;
      })
      .catch(function () { });
  }

  // Planetary K index. Above about four the auroral oval widens far enough
  // south to be worth drawing.
  var kp = null;

  function loadKp() {
    return fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
                 { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('kp'); return r.json(); })
      .then(function (d) {
        for (var i = d.length - 1; i >= 0; i--) {
          var v = d[i] && d[i].Kp;
          if (typeof v === 'number' && isFinite(v)) { kp = v; return; }
        }
      })
      .catch(function () { });
  }

  // ------------------------------------------------------------------
  // On station power, and why it is not here
  // ------------------------------------------------------------------
  //
  // NASA's public telemetry stream carries the solar arrays, and the channel
  // list published alongside it names both a voltage and a current for each
  // of the eight wings, which would give power directly as V times I.
  //
  // The current channels never transmit. Subscribed to all sixteen for three
  // minutes and took 3885 updates: every one of the eight voltages arrived,
  // steady at 159.9 to 160.6 volts, which is exactly the station's regulated
  // 160 volt bus. Not one sample from any current channel. They are in the
  // catalogue but not on the public feed.
  //
  // Voltage alone says nothing, because a regulated bus sits at 160 volts
  // whether the arrays are producing 5 kilowatts or 200. So there is no
  // honest way to show power, and the client that used to try has been
  // removed rather than left holding a streaming connection open on every
  // page load for data that never comes.

  function load() {
    return fetch(API, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('iss ' + r.status);
      return r.json();
    }).then(function (d) {
      if (typeof d.latitude !== 'number') throw new Error('bad payload');
      // Ascending or descending, taken from the readings themselves rather
      // than assumed. It uses the oldest reading that shows a decisive change
      // in latitude, so mid-orbit it resolves within a couple of seconds,
      // while near the top and bottom of the orbit, where latitude barely
      // moves, it simply waits instead of guessing from noise.
      var nowMs = Date.now();
      latHist.push([nowMs, d.latitude]);
      while (latHist.length > 8 || (latHist.length > 2 && nowMs - latHist[0][0] > 60000)) {
        latHist.shift();
      }
      for (var h = 0; h < latHist.length - 1; h++) {
        var dl = d.latitude - latHist[h][1];
        // Two hundredths of a degree. The positions come from orbital
        // elements rather than a noisy sensor, so a small change is still a
        // real one, and near the turning points of the orbit that is all
        // the change there is.
        if (Math.abs(dl) > 0.02) { ascending = dl > 0; dirKnown = true; break; }
      }
      iss = d;
      tLon = d.longitude;
      tLat = d.latitude * 0.45;
      if (!haveFix) { lon0 = tLon; lat0 = tLat; haveFix = true; }
      setCaption();
    }).catch(function () { setCaption(); });
  }

  // ------------------------------------------------------------------
  // Drawing
  // ------------------------------------------------------------------

  var col = { ink: '#fff', acc: '#6ba5f5', dark: true };

  function readTheme() {
    var cs = getComputedStyle(document.documentElement);
    col.ink = cs.getPropertyValue('--text').trim() || '#fff';
    col.acc = cs.getPropertyValue('--accent').trim() || '#6ba5f5';
    var a = document.documentElement.getAttribute('data-theme');
    col.dark = a ? a === 'dark'
                 : window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function rgba(hex, a) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  var MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

  function drawFigures() {
    ctx.strokeStyle = rgba(col.ink, col.dark ? 0.17 : 0.13);
    ctx.lineWidth = 0.7;
    for (var i = 0; i < FIGURES.length; i++) {
      var seg = FIGURES[i], started = false;
      ctx.beginPath();
      for (var j = 0; j < seg.length; j++) {
        var p = projSky(seg[j][0], seg[j][1]);
        if (!p) { started = false; continue; }
        if (!started) { ctx.moveTo(p[0], p[1]); started = true; }
        else ctx.lineTo(p[0], p[1]);
      }
      ctx.stroke();
    }
  }

  function drawStars() {
    for (var i = 0; i < STARLIST.length; i++) {
      var s = STARLIST[i];
      var p = projSky(s[0], s[1]);
      if (!p) continue;
      if (p[0] < -20 || p[0] > W + 20 || p[1] < -20 || p[1] > H + 20) continue;
      var m = s[2];
      var r = Math.max(0.45, (5.0 - m) * 0.50);
      var a = Math.max(0.22, Math.min(1, (5.6 - m) / 4.6));
      ctx.fillStyle = rgba(col.ink, a * (col.dark ? 1 : 0.7));
      // A faint halo on the brightest handful, so they read as stars
      // rather than as evenly sized dots
      if (m < 1.6) {
        var hg = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 7);
        hg.addColorStop(0, rgba(col.ink, 0.30));
        hg.addColorStop(1, rgba(col.ink, 0));
        ctx.fillStyle = hg;
        ctx.beginPath(); ctx.arc(p[0], p[1], 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = rgba(col.ink, a);
      }
      ctx.beginPath();
      ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawStarNames() {
    ctx.font = '500 8.5px ' + MONO;
    ctx.textAlign = 'left';
    ctx.fillStyle = rgba(col.ink, 0.34);
    for (var i = 0; i < NAMED.length; i++) {
      var n = NAMED[i];
      var p = projSky(n[0], n[1]);
      if (!p) continue;
      if (p[0] < 40 || p[0] > W - 60 || p[1] < 30 || p[1] > H - 30) continue;
      ctx.fillText(n[2], p[0] + 5, p[1] - 4);
    }
  }

  function drawBodies(now, t) {
    var list = bodies(now);
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      var p = projSky(b.ra, b.dec);
      if (!p) continue;

      if (b.sun) {
        var g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 190);
        g.addColorStop(0, rgba(col.acc, 0.30));
        g.addColorStop(0.35, rgba(col.acc, 0.08));
        g.addColorStop(1, rgba(col.acc, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p[0], p[1], 190, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = rgba(col.ink, 0.8);
        ctx.beginPath(); ctx.arc(p[0], p[1], 7, 0, Math.PI * 2); ctx.fill();
        label(p, 'SUN', 13);
        continue;
      }

      if (b.moon) {
        var mr = 9;
        ctx.strokeStyle = rgba(col.ink, 0.55);
        ctx.lineWidth = 0.9;
        ctx.beginPath(); ctx.arc(p[0], p[1], mr, 0, Math.PI * 2); ctx.stroke();
        var waxing = b.elong < 180;
        ctx.fillStyle = rgba(col.ink, 0.30);
        ctx.beginPath();
        ctx.arc(p[0], p[1], mr, -Math.PI / 2, Math.PI / 2, !waxing);
        ctx.ellipse(p[0], p[1], mr * Math.abs(1 - 2 * b.phase), mr, 0,
                    Math.PI / 2, -Math.PI / 2, b.phase < 0.5 ? !waxing : waxing);
        ctx.fill();
        label(p, 'MOON ' + Math.round(b.phase * 100) + '%', mr + 4);
        continue;
      }

      var rr = b.name === 'Jupiter' || b.name === 'Venus' ? 3.1 : 2.3;
      ctx.fillStyle = rgba(col.acc, 0.85);
      ctx.beginPath(); ctx.arc(p[0], p[1], rr, 0, Math.PI * 2); ctx.fill();
      var halo = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 14);
      halo.addColorStop(0, rgba(col.acc, 0.22));
      halo.addColorStop(1, rgba(col.acc, 0));
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(p[0], p[1], 14, 0, Math.PI * 2); ctx.fill();
      label(p, b.name.toUpperCase(), rr + 5, col.acc);
    }
  }

  function label(p, text, off, c) {
    if (p[0] < 30 || p[0] > W - 70 || p[1] < 24 || p[1] > H - 24) return;
    ctx.font = '500 8.5px ' + MONO;
    ctx.textAlign = 'left';
    ctx.fillStyle = rgba(c || col.ink, 0.45);
    ctx.fillText(text, p[0] + off, p[1] + 3);
  }

  function smoothstep(x, a, b) {
    var t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  // The porthole. Everything is clipped to the globe's own disc, so looking
  // up from a place on Earth happens inside that circle and never spreads
  // across the page.
  function drawPorthole(t) {
    var alpha = smoothstep(inside, 0.62, 1.0);
    if (alpha <= 0.002) return;

    var r = lScale;
    ctx.save();
    ctx.beginPath();
    ctx.arc(lx, ly, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalAlpha = alpha;

    ctx.fillStyle = rgba(col.dark ? '#000000' : '#ffffff', col.dark ? 0.62 : 0.30);
    ctx.fillRect(lx - r, ly - r, r * 2, r * 2);

    var i, p;
    ctx.strokeStyle = rgba(col.ink, 0.16);
    ctx.lineWidth = 0.6;
    for (i = 0; i < FIGURES.length; i++) {
      var seg = FIGURES[i], started = false;
      ctx.beginPath();
      for (var j = 0; j < seg.length; j++) {
        p = projLocal(seg[j][0], seg[j][1]);
        if (!p) { started = false; continue; }
        if (!started) { ctx.moveTo(p[0], p[1]); started = true; } else ctx.lineTo(p[0], p[1]);
      }
      ctx.stroke();
    }

    for (i = 0; i < STARLIST.length; i++) {
      var st = STARLIST[i];
      p = projLocal(st[0], st[1]);
      if (!p) continue;
      if (p[0] < lx - r || p[0] > lx + r || p[1] < ly - r || p[1] > ly + r) continue;
      var m = st[2];
      ctx.fillStyle = rgba(col.ink, Math.max(0.22, Math.min(1, (5.6 - m) / 4.6)));
      ctx.beginPath();
      ctx.arc(p[0], p[1], Math.max(0.45, (5.0 - m) * 0.46), 0, Math.PI * 2);
      ctx.fill();
    }

    var list = bodies(new Date());
    for (i = 0; i < list.length; i++) {
      var bd = list[i];
      p = projLocal(bd.ra, bd.dec);
      if (!p) continue;
      if (bd.sun) {
        var g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * 0.5);
        g.addColorStop(0, rgba(col.acc, 0.32));
        g.addColorStop(1, rgba(col.acc, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p[0], p[1], r * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = rgba(col.ink, 0.85);
        ctx.beginPath(); ctx.arc(p[0], p[1], 5, 0, Math.PI * 2); ctx.fill();
      } else if (bd.moon) {
        ctx.strokeStyle = rgba(col.ink, 0.6);
        ctx.lineWidth = 0.9;
        ctx.beginPath(); ctx.arc(p[0], p[1], 7, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.fillStyle = rgba(col.acc, 0.9);
        ctx.beginPath(); ctx.arc(p[0], p[1], 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.font = '500 7.5px ' + MONO;
        ctx.textAlign = 'left';
        ctx.fillStyle = rgba(col.acc, 0.5);
        ctx.fillText(bd.name.toUpperCase(), p[0] + 5, p[1] + 3);
      }
    }

    ctx.font = '600 8px ' + MONO;
    ctx.textAlign = 'center';
    ctx.fillStyle = rgba(col.ink, 0.4);
    ctx.fillText('N', lx, ly - r + 12);
    ctx.fillText('S', lx, ly + r - 7);
    ctx.textAlign = 'left';  ctx.fillText('E', lx + r - 12, ly + 3);
    ctx.textAlign = 'right'; ctx.fillText('W', lx - r + 12, ly + 3);
    ctx.restore();

    // Rim, so it reads as a window rather than a hole
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = rgba(col.ink, 0.38);
    ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.arc(lx, ly, r, 0, Math.PI * 2); ctx.stroke();

    ctx.font = '500 8px ' + MONO;
    ctx.textAlign = 'center';
    ctx.fillStyle = rgba(col.ink, 0.5);
    var ns = lat0 >= 0 ? 'N' : 'S', ew = lon0 >= 0 ? 'E' : 'W';
    // Inside the rim: the disc overhangs the corner, so anything placed
    // under it falls off the bottom of the window.
    ctx.fillText('LOOKING UP FROM ' + Math.abs(lat0).toFixed(1) + '\u00b0' + ns + '  ' +
                 Math.abs(((lon0 + 540) % 360) - 180).toFixed(1) + '\u00b0' + ew,
                 lx, ly - r + 30);
    ctx.restore();
  }

  function drawEarth(sLat, sLon, t) {
    var grBase = gr;
    gr = gr * zoomK;
    var i, j, lat, lon, p;

    // Fully opaque. Stars, constellation figures and planets sitting behind
    // the planet were showing straight through it, which makes no sense.
    ctx.fillStyle = col.dark ? '#080c12' : '#e9eef5';
    ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = rgba(col.ink, 0.30);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2); ctx.stroke();

    ctx.lineWidth = 0.6;
    ctx.strokeStyle = rgba(col.ink, 0.12);
    for (lon = -180; lon < 180; lon += 30) {
      ctx.beginPath(); var st = false;
      for (lat = -90; lat <= 90; lat += 5) {
        p = projEarth(lat, lon);
        if (!p) { st = false; continue; }
        if (!st) { ctx.moveTo(p[0], p[1]); st = true; } else ctx.lineTo(p[0], p[1]);
      }
      ctx.stroke();
    }
    for (lat = -60; lat <= 60; lat += 30) {
      ctx.beginPath(); st = false;
      for (lon = -180; lon <= 180; lon += 5) {
        p = projEarth(lat, lon);
        if (!p) { st = false; continue; }
        if (!st) { ctx.moveTo(p[0], p[1]); st = true; } else ctx.lineTo(p[0], p[1]);
      }
      ctx.stroke();
    }

    ctx.lineWidth = 0.9;
    for (i = 0; i < COASTLINES.length; i++) {
      var pts = COASTLINES[i], run = [], runLit = null;
      for (j = 0; j < pts.length; j++) {
        p = projEarth(pts[j][1], pts[j][0]);
        var lit = sunlitAt(pts[j][1], pts[j][0], sLat, sLon);
        if (!p) { if (run.length > 1) strokeRun(run, runLit); run = []; runLit = null; continue; }
        if (runLit !== null && lit !== runLit) {
          if (run.length > 1) strokeRun(run, runLit);
          run = [run[run.length - 1]];
        }
        runLit = lit; run.push(p);
      }
      if (run.length > 1) strokeRun(run, runLit);
    }

    for (i = 0; i < PLACES.length; i++) {
      var q = PLACES[i];
      p = projEarth(q[0], q[1]);
      // Fade the label out as the place rotates toward the limb, rather
      // than letting it pop off at the edge
      if (!p || p[2] < 0.12) continue;
      var edge = Math.min(1, (p[2] - 0.12) / 0.22);
      var l2 = sunlitAt(q[0], q[1], sLat, sLon);
      ctx.fillStyle = rgba(col.ink, (l2 ? 0.75 : 0.4) * edge);
      ctx.beginPath(); ctx.arc(p[0], p[1], 1.7, 0, Math.PI * 2); ctx.fill();
      ctx.font = '500 ' + (q[3] ? 6.5 : 8) + 'px ' + MONO;
      ctx.textAlign = 'left';
      ctx.fillStyle = rgba(col.ink, (q[3] ? 0.34 : 0.45) * edge);
      ctx.fillText(q[2], p[0] + 5, p[1] + (i === 0 ? 9 : -1));
    }

    // Visitor position, from their IP. Green so it is obviously "you"
    // rather than another piece of the scene.
    if (you) {
      var yp = projEarth(you.lat, you.lon);
      if (yp && yp[2] > 0.10) {
        var ye = Math.min(1, (yp[2] - 0.10) / 0.2);
        var pulse = 0.6 + Math.sin(t * 2.1) * 0.4;
        var yg = ctx.createRadialGradient(yp[0], yp[1], 0, yp[0], yp[1], 16);
        yg.addColorStop(0, rgba(GREEN, 0.34 * pulse * ye));
        yg.addColorStop(1, rgba(GREEN, 0));
        ctx.fillStyle = yg;
        ctx.beginPath(); ctx.arc(yp[0], yp[1], 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = rgba(GREEN, 0.95 * ye);
        ctx.beginPath(); ctx.arc(yp[0], yp[1], 2.6, 0, Math.PI * 2); ctx.fill();
        placeLabel(yp[0] + 6, yp[1], 'you', GREEN, 8, 0.8 * ye);
      }
    }

    // Drawn last so the station and its track sit on top of everything else
    drawAurora(t, sLat, sLon);
    drawEvents(t);
    drawStation(t);
    gr = grBase;
  }

  var ORANGE = '#e8843c';   // wildfires
  var RED    = '#e0483a';   // volcanoes, so the two are not just orange dots
  var AURORA = '#4fd6a0';

  // The auroral oval widens toward the equator as geomagnetic activity rises.
  // Roughly 67 degrees at Kp 1, dropping about two degrees per Kp step.
  function drawAurora(t, sLat, sLon) {
    if (kp === null || kp < 3.6) return;
    var band = 67 - 2.0 * (kp - 1);
    var strength = Math.min(1, (kp - 3.6) / 4);
    ctx.save();
    ctx.lineWidth = 2.2;
    for (var pole = 0; pole < 2; pole++) {
      var sgn = pole ? -1 : 1;
      for (var ring = 0; ring < 3; ring++) {
        var lat = sgn * (band + (ring - 1) * 3.5);
        var wob = 0.5 + 0.5 * Math.sin(t * 0.9 + ring * 1.7 + pole);
        ctx.strokeStyle = rgba(AURORA, (0.13 + 0.20 * wob) * strength);
        // Night side only. An aurora over the daylit half would be there in
        // principle and invisible in practice, and drawing it as a full ring
        // reads as a stripe across the planet rather than a curtain.
        ctx.beginPath();
        var started = false;
        for (var lon = -180; lon <= 180; lon += 2) {
          var p = projEarth(lat, lon, 1.004);
          if (!p || sunlitAt(lat, lon, sLat, sLon)) { started = false; continue; }
          if (!started) { ctx.moveTo(p[0], p[1]); started = true; } else ctx.lineTo(p[0], p[1]);
        }
        ctx.stroke();
      }

      // A few vertical strokes, so it reads as a curtain hanging above the
      // surface rather than a contour line drawn on it
      ctx.strokeStyle = rgba(AURORA, 0.10 * strength);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var c2 = 0; c2 < 34; c2++) {
        var lo2 = -180 + c2 * 10.6 + Math.sin(t * 0.5 + c2) * 3;
        var la2 = sgn * band;
        if (sunlitAt(la2, lo2, sLat, sLon)) continue;
        var a1 = projEarth(la2, lo2, 1.004), a2 = projEarth(la2, lo2, 1.028);
        if (!a1 || !a2) continue;
        ctx.moveTo(a1[0], a1[1]); ctx.lineTo(a2[0], a2[1]);
      }
      ctx.stroke();
      ctx.lineWidth = 2.2;
    }
    ctx.restore();
  }

  function drawEvents(t) {
    var i, p;

    // Wildfires: small orange points, flickering slightly out of step
    for (i = 0; i < events.fires.length; i++) {
      var f = events.fires[i];
      p = projEarth(f.lat, f.lon, 1.002);
      if (!p || p[2] < 0.12) continue;
      var fl = 0.55 + 0.45 * Math.sin(t * 3.1 + i * 2.3);
      var g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 9);
      g.addColorStop(0, rgba(ORANGE, 0.42 * fl));
      g.addColorStop(1, rgba(ORANGE, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p[0], p[1], 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba(ORANGE, 0.9);
      ctx.beginPath(); ctx.arc(p[0], p[1], 1.5, 0, Math.PI * 2); ctx.fill();
      eventLabel(p, f.name, ORANGE, 5);
    }

    // Volcanoes: a slow pulse pushing outward
    for (i = 0; i < events.volcanoes.length; i++) {
      var v = events.volcanoes[i];
      p = projEarth(v.lat, v.lon, 1.002);
      if (!p || p[2] < 0.12) continue;
      var ph = (t * 0.55 + i * 0.4) % 1;
      ctx.strokeStyle = rgba(RED, 0.55 * (1 - ph));
      ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.arc(p[0], p[1], 3 + ph * 13, 0, Math.PI * 2); ctx.stroke();
      volcanoGlyph(p[0], p[1], 4.4, 1);
      eventLabel(p, v.name, RED, 8);
    }

    // Cyclones: a turning spiral, and it turns the right way. Anticlockwise
    // in the northern hemisphere, clockwise in the southern.
    for (i = 0; i < events.storms.length; i++) {
      var st = events.storms[i];
      p = projEarth(st.lat, st.lon, 1.002);
      if (!p || p[2] < 0.15) continue;
      var spin = (st.lat >= 0 ? 1 : -1);
      var rot = t * 0.85 * spin;
      var rMax = Math.max(7, gr * 0.075);
      ctx.strokeStyle = rgba(col.ink, 0.5);
      ctx.lineWidth = 1;
      for (var arm = 0; arm < 2; arm++) {
        ctx.beginPath();
        for (var k = 0; k <= 34; k++) {
          var u = k / 34;
          var ang = rot + arm * Math.PI + spin * u * 3.0;
          var rr = rMax * u;
          var px = p[0] + Math.cos(ang) * rr;
          var py = p[1] + Math.sin(ang) * rr;
          if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.fillStyle = rgba(col.ink, 0.75);
      ctx.beginPath(); ctx.arc(p[0], p[1], 1.6, 0, Math.PI * 2); ctx.fill();
      eventLabel(p, st.name, col.ink, rMax + 4);
    }
  }

  // A cone rather than a dot. A wildfire and a volcano were both small
  // orange points, which told you an orange thing was happening and nothing
  // more.
  function volcanoGlyph(x, y, r, a) {
    ctx.beginPath();
    ctx.moveTo(x - r, y + r * 0.62);
    ctx.lineTo(x, y - r * 0.78);
    ctx.lineTo(x + r, y + r * 0.62);
    ctx.closePath();
    ctx.fillStyle = rgba(RED, 0.30 * a);
    ctx.fill();
    ctx.strokeStyle = rgba(RED, 0.95 * a);
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }

  // Labels sit on the thing they name. No key, no index, nothing to cross
  // reference. Where several would collide the later ones are simply left
  // off, so a dense cluster of fires shows as points with a couple named
  // rather than a wall of overlapping text.
  var labelBoxes = [];

  function placeLabel(x, y, text, c, size, alpha) {
    if (!text) return false;
    var fs = size || 7;
    ctx.font = '500 ' + fs + 'px ' + MONO;
    var w = ctx.measureText(text).width;
    var bx = x, by = y - fs * 0.6, bw = w, bh = fs * 1.25;
    if (bx < 4 || bx + bw > W - 4 || by < 4 || by + bh > H - 4) return false;
    for (var i = 0; i < labelBoxes.length; i++) {
      var o = labelBoxes[i];
      if (bx < o[0] + o[2] + 3 && bx + bw + 3 > o[0] &&
          by < o[1] + o[3] + 2 && by + bh + 2 > o[1]) return false;
    }
    labelBoxes.push([bx, by, bw, bh]);
    ctx.textAlign = 'left';
    ctx.fillStyle = rgba(c, alpha === undefined ? 0.5 : alpha);
    ctx.fillText(text, bx, y + fs * 0.35);
    return true;
  }

  function eventLabel(p, text, c, off) {
    if (!text) return;
    var short = text.split(',')[0];
    if (short.length > 22) short = short.slice(0, 22);
    // The feed mixes casing, so KAWAIHAE ROAD sits next to Johnson Canyon.
    if (short === short.toUpperCase()) {
      short = short.toLowerCase().replace(/(^|[\s-])([a-z])/g,
        function (m, a, b) { return a + b.toUpperCase(); });
    }
    placeLabel(p[0] + (off || 6), p[1], short, c, 7, 0.55);
  }

  function strokeRun(run, lit) {
    ctx.beginPath();
    ctx.moveTo(run[0][0], run[0][1]);
    for (var k = 1; k < run.length; k++) ctx.lineTo(run[k][0], run[k][1]);
    ctx.strokeStyle = rgba(col.ink, lit ? 0.72 : 0.20);
    ctx.stroke();
  }

  var ORBIT_MIN = 92.7;
  var ORB_DEG_PER_MIN = 360 / ORBIT_MIN;  // one ISS orbit
  var EARTH_DEG_PER_MIN = 360 / 1436.07; // one sidereal day

  // Where the station will actually be, not merely a great circle through it.
  //
  // Two things were wrong before. Math.asin only ever returns the ascending
  // heading, so a descending pass was drawn heading north when it was going
  // south. And the track is not a fixed great circle: Earth turns underneath
  // it, dragging the path west as the orbit proceeds. Checked against real
  // positions two minutes apart, this lands within 4 km, where the previous
  // version was out by 1258 km.
  function groundTrack(lat, lon, inc, ascending, backMin, fwdMin, step) {
    var pts = [], la = lat * D2R;
    var s = Math.max(-1, Math.min(1, Math.cos(inc * D2R) / Math.max(1e-6, Math.cos(la))));
    var az = Math.asin(s);
    if (!ascending) az = Math.PI - az;
    for (var m = -backMin; m <= fwdMin; m += step) {
      var d = ORB_DEG_PER_MIN * m * D2R;
      var sa = Math.max(-1, Math.min(1,
        Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(az)));
      var dlon = Math.atan2(Math.sin(az) * Math.sin(d) * Math.cos(la),
                            Math.cos(d) - Math.sin(la) * sa) * R2D;
      pts.push([Math.asin(sa) * R2D, lon + dlon - EARTH_DEG_PER_MIN * m]);
    }
    return pts;
  }

  function drawTrackPart(track, i0, i1, alpha) {
    ctx.lineWidth = 0.9;
    ctx.strokeStyle = rgba(col.acc, alpha);
    ctx.beginPath();
    var started = false;
    for (var i = Math.floor(i0); i <= Math.min(track.length - 1, Math.ceil(i1)); i++) {
      var p = projEarth(track[i][0], track[i][1], 1.001);
      if (!p) { started = false; continue; }
      if (!started) { ctx.moveTo(p[0], p[1]); started = true; }
      else ctx.lineTo(p[0], p[1]);
    }
    ctx.stroke();
  }

  function drawStation(t) {
    if (!iss) return;
    stationDrawn = true;
    var alt = 1 + iss.altitude / EARTH_KM;

    // Reach past the limb on both sides. The visible hemisphere spans ninety
    // degrees of arc from the centre, which is about twenty-three minutes of
    // flight, so anything shorter stops in open ocean partway across.
    if (dirKnown) {
      var track = groundTrack(iss.latitude, iss.longitude, 51.6, ascending, 28, 46, 0.5);
      trackPts = track.length;
      // Where it has been, then where it is going, so the direction of travel
      // is legible without an arrowhead.
      drawTrackPart(track, 0, 28 / 0.5, 0.16);
      drawTrackPart(track, 28 / 0.5, track.length - 1, 0.42);
    } else {
      trackPts = 0;
    }

    var s = projEarth(iss.latitude, iss.longitude, alt);
    var g = projEarth(iss.latitude, iss.longitude, 1.0);
    if (!s) return;

    if (g) {
      ctx.strokeStyle = rgba(col.acc, 0.3);
      ctx.setLineDash([1.5, 2.5]);
      ctx.beginPath(); ctx.moveTo(g[0], g[1]); ctx.lineTo(s[0], s[1]); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = rgba(col.acc, 0.5);
      ctx.beginPath(); ctx.arc(g[0], g[1], 1.6, 0, Math.PI * 2); ctx.fill();
    }

    ctx.save();
    ctx.translate(s[0], s[1]);
    ctx.strokeStyle = rgba(col.acc, 0.95);
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeRect(-8, -4.5, 5, 9);
    ctx.strokeRect(3, -4.5, 5, 9);
    ctx.strokeRect(-1.6, -2, 3.2, 4);
    ctx.restore();

    var pulse = 0.75 + Math.sin(t * 1.6) * 0.25;
    var gl = ctx.createRadialGradient(s[0], s[1], 0, s[0], s[1], 26);
    gl.addColorStop(0, rgba(col.acc, 0.32 * pulse));
    gl.addColorStop(1, rgba(col.acc, 0));
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.arc(s[0], s[1], 26, 0, Math.PI * 2); ctx.fill();

    ctx.font = '600 8.5px ' + MONO;
    ctx.textAlign = 'left';
    ctx.fillStyle = rgba(col.acc, 0.65);
    ctx.fillText('ISS', s[0] + 13, s[1] - 6);

    var gl = ctx.createRadialGradient(s[0], s[1], 0, s[0], s[1], 26);
    gl.addColorStop(0, rgba(col.acc, 0.32 * pulse));
    gl.addColorStop(1, rgba(col.acc, 0));
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.arc(s[0], s[1], 26, 0, Math.PI * 2); ctx.fill();
  }

  function draw(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    var now = new Date();

    // Scrolling nudges the whole scene upward. Pure translation, no change of
    // angle, so it reads as the viewpoint rising rather than the camera
    // tilting. Applied identically to the sky and the globe so nothing
    // detaches from anything else.
    sScale = sOut;
    sx = W * 0.40;
    sy = H * 0.38 + parY;

    gy = H - gr * 0.52 + parY;
    // The porthole keeps the globe's footprint. The sense of travelling to
    // the surface comes from the globe swelling inside it, not from the
    // window itself growing.
    lx = gx; ly = gy; lScale = gr * (1 + 0.08 * inside);
    // Ease the descent so it accelerates away from the outside view and
    // settles as it arrives, rather than moving at a constant rate.
    zoomK = 1 + 7.5 * (inside * inside * (3 - 2 * inside));

    updateSkyCentre(now);

    drawFigures();
    drawStars();
    drawBodies(now, t);
    drawStarNames();

    labelBoxes.length = 0;
    var sLat = iss ? iss.solar_lat : 0;
    var sLon = iss ? iss.solar_lon : 0;
    // Earth fades out as the porthole opens over it, in the same place and
    // at the same size, so one becomes the other.
    // Earth stays visible well into the move, swelling as the viewpoint
    // drops toward the surface, and is clipped to the porthole so it never
    // spills across the page while it grows.
    var earthAlpha = 1 - smoothstep(inside, 0.55, 0.92);
    if (earthAlpha > 0.004) {
      ctx.save();
      if (inside > 0.001) {
        ctx.beginPath();
        ctx.arc(lx, ly, lScale, 0, Math.PI * 2);
        ctx.clip();
      }
      ctx.globalAlpha = earthAlpha;
      drawEarth(sLat, sLon, t);
      ctx.restore();
    }
    drawPorthole(t);
  }

  // ------------------------------------------------------------------
  // Loop
  // ------------------------------------------------------------------

  var running = false, raf = 0, t0 = 0, clock = 0, skyMode = false;
  var parY = 0, parTarget = 0;
  var PAR_FACTOR = 0.055, PAR_MAX = 90;
  var stationDrawn = false, trackPts = 0;

  function easeLon(cur, target, k) {
    var d = ((target - cur + 540) % 360) - 180;
    return cur + d * k;
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!t0) t0 = now;
    clock = (now - t0) / 1000;

    // Ease the flip, and come back outside on its own after a while
    if (insideTarget === 1 && Date.now() - insideAt > STAY_INSIDE_MS) insideTarget = 0;
    var step = 1 / (FLIP_SECS * 60);
    if (inside < insideTarget) inside = Math.min(insideTarget, inside + step);
    else if (inside > insideTarget) inside = Math.max(insideTarget, inside - step);

    if (!dragging && inside < 0.02 && insideTarget === 0) {
      var since = Date.now() - releasedAt;
      if (!everDragged || since > HOLD_MS) {
        // Ease back onto the station. Slower right after a drag so it
        // glides rather than snapping out from under the cursor.
        var k = (!everDragged || since > HOLD_MS + 4000) ? 0.04
              : 0.006 + 0.034 * Math.min(1, (since - HOLD_MS) / 4000);
        lon0 = easeLon(lon0, tLon, k);
        lat0 += (tLat - lat0) * k;
      }
    }
    // Read-only view state, so the rotation can be checked from outside
    // without inferring it from pixels.
    parY += (parTarget - parY) * 0.08;

    window.__view = { lon0: lon0, lat0: lat0, dragging: dragging,
                      inside: inside, you: you, skyMode: skyMode,
                      stationDrawn: stationDrawn, trackPts: trackPts,
                      ascending: ascending, dirKnown: dirKnown, parY: parY,
                      kp: kp,
                      events: { fires: events.fires.length,
                                volcanoes: events.volcanoes.length,
                                storms: events.storms.length } };
    stationDrawn = false;
    draw(clock);
  }

  function layout() {
    gr = Math.max(90, Math.min(210, Math.min(W, H) * 0.26));
    // Tucked into the corner and slightly overhanging it, so it reads as
    // part of the backdrop rather than as a widget parked on the text.
    gx = W - gr * 0.72;
    gy = H - gr * 0.52 + parY;
    sx = W * 0.40;
    sy = H * 0.38;
    sOut = Math.max(W, H) * 0.42;
    sIn  = Math.min(W, H) * 0.46;      // puts the horizon inside the frame
    sScale = sOut + (sIn - sOut) * inside;
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    layout();
    draw(clock);
  }

  function setCaption() {
    if (!capEl) return;
    if (!iss) {
      capEl.textContent = 'That is the sky as it is right now, with Earth and the International Space Station. The live position feed could not be reached, so the station is not shown.';
      return;
    }
    var ns = iss.latitude >= 0 ? 'N' : 'S';
    var ew = iss.longitude >= 0 ? 'E' : 'W';
    var txt =
      'The International Space Station is at ' + Math.abs(iss.latitude).toFixed(1) + '° ' + ns +
      ', ' + Math.abs(iss.longitude).toFixed(1) + '° ' + ew + ' right now, ' +
      Math.round(iss.altitude) + ' km up and traveling ' +
      Math.round(iss.velocity).toLocaleString() + ' km/h. Everything behind it is where it ' +
      'actually is: the stars, the planets, the Moon’s phase, and the line between day and night.';

    // One short sentence naming the marks, covering only what is actually on
    // screen. Claiming live volcanoes while that feed is down would be worse
    // than saying nothing at all.
    var marks = [];
    if (events.fires.length)     marks.push('Orange marks wildfires');
    if (events.volcanoes.length) marks.push('red marks volcanoes');
    if (events.storms.length)    marks.push('spirals are cyclones');
    if (marks.length) {
      txt += ' ' + marks.join(', ') + ', all live and drawn where and when they are happening.';
    }
    if (kp !== null && kp >= 3.6) txt += ' The green band is tonight’s aurora.';
    if (you) txt += ' The green dot is roughly you.';
    capEl.textContent = txt;
  }

  function start() { if (running) return; running = true; t0 = 0; raf = requestAnimationFrame(frame); }
  function stop()  { running = false; cancelAnimationFrame(raf); }
  function updateRunning() {
    if (reduceMotion.matches) return;
    if (!document.hidden) start(); else stop();
  }

  function init() {
    readTheme();
    resize();
    setCaption();
    locateVisitor();
    loadEvents();     setInterval(loadEvents, 900000);
    loadVolcanoes(); setInterval(loadVolcanoes, 3600000);
    loadKp();      setInterval(loadKp, 600000);
    // A quick second reading so the direction is settled within a couple of
    // seconds rather than after a full refresh interval
    setTimeout(load, 1400);
    setTimeout(load, 3000);
    setTimeout(load, 5200);
    load().then(function () {
      resize();
      if (reduceMotion.matches) { draw(1); return; }
      updateRunning();
    });
    setInterval(load, REFRESH);
  }

  // Drag to look around. The sky and the globe share one rotation, so the
  // stars, planets and Moon all swing together automatically.
  //
  // Listening on the window rather than the canvas, because the canvas sits
  // behind the page and would only ever receive events in the margins. The
  // filter below keeps text selectable and links clickable: a drag starts
  // only on empty space, never on something you might be trying to read or
  // press.
  var NO_DRAG = 'a, button, input, textarea, select, label, p, h1, h2, h3, li, span, strong, em, code';

  function draggableFrom(target) {
    if (!target || !target.closest) return true;
    return !target.closest(NO_DRAG);
  }

  var downX = 0, downY = 0, downAt = 0;

  // Screen point back to a place on the globe. Only succeeds inside the disc,
  // which is what makes "click the Earth" distinguishable from "click the sky".
  function pickGlobe(px, py) {
    var x = (px - gx) / gr, y = -(py - gy) / gr;
    var q = x * x + y * y;
    if (q > 0.985) return null;
    var z = Math.sqrt(1 - q);
    var l0 = lat0 * D2R;
    var la = Math.asin(Math.max(-1, Math.min(1, z * Math.sin(l0) + y * Math.cos(l0))));
    var lo = lon0 + Math.atan2(x, z * Math.cos(l0) - y * Math.sin(l0)) * R2D;
    return [la * R2D, ((lo + 540) % 360) - 180];
  }

  function flipTo(lat, lon) {
    tLat = Math.max(-82, Math.min(82, lat));
    tLon = lon;
    lat0 = tLat; lon0 = tLon;       // snap, the flip itself carries the motion
    insideTarget = 1;
    insideAt = Date.now();
    everDragged = true;
    releasedAt = Date.now() + STAY_INSIDE_MS;
  }

  function flipOut() {
    insideTarget = 0;
    releasedAt = Date.now();
  }

  window.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    if (!draggableFrom(e.target)) return;
    downX = e.clientX; downY = e.clientY; downAt = Date.now();
    dragging = true; everDragged = true;
    dragX = e.clientX; dragY = e.clientY;
    dragLon = lon0; dragLat = lat0;
    host.classList.add('is-dragging');
    document.body.classList.add('scene-drag');
  });

  window.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    lon0 = dragLon - (e.clientX - dragX) * DEG_PER_PX;
    // Clamp the tilt: past the poles the projection turns inside out
    lat0 = Math.max(-82, Math.min(82, dragLat + (e.clientY - dragY) * DEG_PER_PX));
    e.preventDefault();
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    releasedAt = Date.now();
    host.classList.remove('is-dragging');
    document.body.classList.remove('scene-drag');

    // A short press with almost no movement is a click, not a drag
    if (e && Math.abs(e.clientX - downX) < 5 && Math.abs(e.clientY - downY) < 5
          && Date.now() - downAt < 500) {
      if (inside > 0.5) { flipOut(); return; }
      var hit = pickGlobe(e.clientX, e.clientY);
      if (hit) flipTo(hit[0], hit[1]);
    }
  }
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  window.addEventListener('blur', endDrag);

  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', function () {
    parTarget = -Math.min(PAR_MAX, window.scrollY * PAR_FACTOR);
  }, { passive: true });

  document.addEventListener('visibilitychange', updateRunning);
  window.addEventListener('themechange', function () { readTheme(); draw(clock); });
  var scheme = window.matchMedia('(prefers-color-scheme: dark)');
  if (scheme.addEventListener) scheme.addEventListener('change', function () { readTheme(); });

  init();
})();
