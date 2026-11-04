(function () {
  try {
    if (localStorage.getItem('nolog')) return;
    var id = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    var start = Date.now();
    fetch('/api/hit', {
      method: 'POST',
      keepalive: true,
      body: JSON.stringify({
        id: id,
        page: location.pathname + location.search,
        referrer: document.referrer,
        lang: navigator.language,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screen: screen.width + 'x' + screen.height,
        viewport: innerWidth + 'x' + innerHeight,
        dpr: devicePixelRatio,
        touch: navigator.maxTouchPoints > 0
      })
    }).catch(function () {});
    function leave() {
      navigator.sendBeacon('/api/hit', JSON.stringify({ type: 'leave', id: id, duration: Math.round((Date.now() - start) / 1000) }));
    }
    addEventListener('pagehide', leave);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') leave(); });
  } catch (e) {}
})();
