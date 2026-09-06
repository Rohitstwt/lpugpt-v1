import type { CampusPlace } from "./geo";

export function buildMapHtml(opts: {
  path: Array<{ lat: number; lng: number }>;
  markers: Array<{ lat: number; lng: number; label: string; color?: string }>;
}) {
  const pathJson = JSON.stringify(opts.path);
  const markersJson = JSON.stringify(opts.markers);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; background: #171717; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const path = ${pathJson};
    const markers = ${markersJson};
    const map = L.map('map', { zoomControl: false, attributionControl: false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
    const latlngs = path.map(p => [p.lat, p.lng]);
    if (latlngs.length > 1) {
      L.polyline(latlngs, { color: '#ff6a00', weight: 5, opacity: 0.9 }).addTo(map);
    }
    markers.forEach(m => {
      L.circleMarker([m.lat, m.lng], {
        radius: 8,
        fillColor: m.color || '#ff6a00',
        color: '#fff',
        weight: 2,
        fillOpacity: 0.95
      }).addTo(map).bindTooltip(m.label, { permanent: false, direction: 'top' });
    });
    if (latlngs.length) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [28, 28], maxZoom: 17 });
    } else if (markers.length) {
      const pts = markers.map(m => [m.lat, m.lng]);
      map.fitBounds(L.latLngBounds(pts), { padding: [28, 28], maxZoom: 17 });
    } else {
      map.setView([31.2549, 75.7053], 15);
    }
  </script>
</body>
</html>`;
}

export function mapsUrl(
  from: { lat: number; lng: number },
  to: CampusPlace
): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&travelmode=walking`;
}
