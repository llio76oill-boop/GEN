'use client';

import { MapContainer, TileLayer, CircleMarker, Popup, ZoomControl } from 'react-leaflet';
import { GENERATORS, STATUS_COLOR, STATUS_LABEL } from '@/data/generators';

export default function LeafletMap() {
  return (
    <MapContainer
      center={[33.4258, 43.2994]}
      zoom={13}
      style={{ width: '100%', height: '100%', background: '#0d0d1a' }}
      zoomControl={false}
      attributionControl={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>'
        maxZoom={19}
        subdomains="abcd"
      />
      <ZoomControl position="bottomright" />

      {GENERATORS.map((gen) => (
        <CircleMarker
          key={gen.id}
          center={[gen.lat, gen.lng]}
          radius={gen.status === 'fault' || gen.status === 'offline' ? 7 : 5}
          pathOptions={{
            color:       STATUS_COLOR[gen.status],
            fillColor:   STATUS_COLOR[gen.status],
            fillOpacity: gen.status === 'fault' ? 0.92 : 0.72,
            weight:      gen.status === 'fault' ? 2.5 : 1.5,
          }}
        >
          <Popup maxWidth={200}>
            <div>
              <p style={{ fontWeight: 700, color: STATUS_COLOR[gen.status], marginBottom: 4 }}>
                مولد #{String(gen.id).padStart(4, '0')}
              </p>
              <p>📍 الحي: {gen.area}</p>
              <p>⚡ القدرة: {gen.power} KW</p>
              <p>🕐 ساعات التشغيل: {gen.hours.toLocaleString()} ساعة</p>
              <p>
                📊 الحالة:{' '}
                <span style={{ color: STATUS_COLOR[gen.status], fontWeight: 600 }}>
                  {STATUS_LABEL[gen.status]}
                </span>
              </p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
