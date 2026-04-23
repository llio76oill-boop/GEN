'use client';

import { MapContainer, TileLayer, CircleMarker, Popup, ZoomControl } from 'react-leaflet';
import { useGenerators, STATUS_COLOR, STATUS_LABEL } from '@/hooks/useGenerators';
import { TELEMETRY_BY_GEN_ID } from '@/data/live-telemetry';

export default function LeafletMap() {
  const { generators } = useGenerators();
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

      {generators.map((gen) => {
        const tele = TELEMETRY_BY_GEN_ID.get(gen.id);
        const fuelColor = tele
          ? tele.generator.fuel_level_percent > 50 ? '#10b981'
          : tele.generator.fuel_level_percent > 25 ? '#f59e0b' : '#ef4444'
          : '#6b7280';
        return (
          <CircleMarker
            key={gen.id}
            center={[gen.lat, gen.lng]}
            radius={gen.status === 'fault' ? 9 : gen.status === 'offline' ? 7 : 6}
            pathOptions={{
              color:       STATUS_COLOR[gen.status],
              fillColor:   STATUS_COLOR[gen.status],
              fillOpacity: gen.status === 'fault' ? 0.95 : 0.78,
              weight:      gen.status === 'fault' ? 2.5 : 1.5,
            }}
          >
            <Popup maxWidth={260} className="sgm-popup">
              <div style={{ fontFamily: 'Segoe UI, sans-serif', direction: 'rtl', minWidth: 220 }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: STATUS_COLOR[gen.status],
                    boxShadow: `0 0 6px ${STATUS_COLOR[gen.status]}`,
                    flexShrink: 0,
                  }} />
                  <strong style={{ color: '#fff', fontSize: 13 }}>{gen.area}</strong>
                  <span style={{
                    marginRight: 'auto', fontSize: 10, fontWeight: 700,
                    background: STATUS_COLOR[gen.status] + '22',
                    color: STATUS_COLOR[gen.status],
                    border: `1px solid ${STATUS_COLOR[gen.status]}44`,
                    borderRadius: 999, padding: '1px 8px',
                  }}>{STATUS_LABEL[gen.status]}</span>
                </div>

                {/* Live telemetry grid */}
                {tele && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: 11, marginBottom: 10, padding: '8px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <span style={{ color: '#94a3b8' }}>الطاقة</span>
                    <span style={{ color: '#60a5fa', fontWeight: 700, fontFamily: 'monospace' }}>{tele.electrical.power_kw} kW</span>
                    <span style={{ color: '#94a3b8' }}>الجهد</span>
                    <span style={{ color: '#a78bfa', fontWeight: 700, fontFamily: 'monospace' }}>{tele.electrical.voltage.toFixed(1)} V</span>
                    <span style={{ color: '#94a3b8' }}>التيار</span>
                    <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{tele.electrical.current.toFixed(0)} A</span>
                    <span style={{ color: '#94a3b8' }}>الحرارة</span>
                    <span style={{ color: tele.generator.engine_temperature_c > 90 ? '#f97316' : '#34d399', fontFamily: 'monospace' }}>
                      {tele.generator.engine_temperature_c.toFixed(1)}°C
                    </span>
                    <span style={{ color: '#94a3b8' }}>الوقود</span>
                    <span style={{ color: fuelColor, fontWeight: 700, fontFamily: 'monospace' }}>
                      {tele.generator.fuel_level_percent.toFixed(1)}%
                    </span>
                    <span style={{ color: '#94a3b8' }}>الطاقة اليومية</span>
                    <span style={{ color: '#fbbf24', fontFamily: 'monospace' }}>{tele.electrical.energy_kwh_today.toFixed(2)} kWh</span>
                  </div>
                )}

                {/* Fuel bar */}
                {tele && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${tele.generator.fuel_level_percent}%`, background: fuelColor, borderRadius: 999 }} />
                    </div>
                  </div>
                )}

                {/* Basic info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 12px', fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>
                  <span>القدرة المركبة</span>
                  <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{gen.power} kW</span>
                  <span>ساعات التشغيل</span>
                  <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{gen.hours.toLocaleString()} ساعة</span>
                  <span>الرقم</span>
                  <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{tele?.device_id ?? `G-${String(gen.id).padStart(3,'0')}`}</span>
                </div>

                {/* Link */}
                <a
                  href={`/dashboard/generators/${gen.id}`}
                  style={{
                    display: 'block', textAlign: 'center',
                    background: 'rgba(99,102,241,0.18)',
                    border: '1px solid rgba(99,102,241,0.35)',
                    color: '#a78bfa', borderRadius: 10, padding: '5px 0',
                    fontSize: 12, fontWeight: 700, textDecoration: 'none',
                  }}
                >
                  عرض ملف المولد ←
                </a>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
