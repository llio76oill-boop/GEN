'use client';

/**
 * FleetMap.tsx — Supercluster-powered Leaflet map for 3,000 generators.
 *
 * Rendered dynamically (no SSR) via next/dynamic in thingspeak/page.tsx.
 * Uses Supercluster for O(log n) cluster computation on zoom/pan.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { Map as LeafletMap } from 'leaflet';
import Supercluster from 'supercluster';
import 'leaflet/dist/leaflet.css';

import { STATUS_COLOR, type Generator } from '@/data/generators';

// ─── Types ───────────────────────────────────────────────────────────────────
interface FleetMapProps {
  generators: Generator[];
  focusedGen: Generator | null;
  onSelectGen: (g: Generator) => void;
}

type BBox = [number, number, number, number]; // [west, south, east, north]
type ClusterFeature = Supercluster.ClusterFeature<Supercluster.AnyProps>;
type PointFeature   = Supercluster.PointFeature<{ genId: number }>;

// ─── Cluster map state layer ──────────────────────────────────────────────────
function ClusterLayer({
  generators,
  index,
  onSelectGen,
  layerRef,
}: {
  generators: Generator[];
  index: Supercluster<{ genId: number }>;
  onSelectGen: (g: Generator) => void;
  layerRef: React.MutableRefObject<L.LayerGroup | null>;
}) {
  const map   = useMap();
  const genMap = useRef<Map<number, Generator>>(new Map());

  // Rebuild genMap when generators change
  useEffect(() => {
    genMap.current = new Map(generators.map((g) => [g.id, g]));
  }, [generators]);

  const render = useCallback(() => {
    if (!layerRef.current) return;
    layerRef.current.clearLayers();

    const zoom   = map.getZoom();
    const bounds = map.getBounds();
    const bbox: BBox = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ];

    const items = index.getClusters(bbox, zoom);

    items.forEach((item) => {
      const [lng, lat] = item.geometry.coordinates;
      const latlng = L.latLng(lat, lng);

      if ('cluster' in item.properties && item.properties.cluster) {
        // ── Cluster bubble ──
        const count = (item as ClusterFeature).properties.point_count;
        const size  = count > 500 ? 56 : count > 100 ? 44 : count > 20 ? 34 : 26;

        // Color cluster by dominant status — simplified: use orange for mixed
        const color = '#a855f7';

        const icon = L.divIcon({
          html: `
            <div style="
              width:${size}px; height:${size}px;
              border-radius:50%;
              background:${color}22;
              border:2px solid ${color}55;
              display:flex; align-items:center; justify-content:center;
              font-size:${size < 32 ? 10 : 12}px;
              font-weight:700;
              color:${color};
              font-family:monospace;
              backdrop-filter:blur(4px);
              box-shadow:0 0 12px ${color}44;
            ">${count > 999 ? '999+' : count}</div>
          `,
          iconSize:   [size, size],
          iconAnchor: [size / 2, size / 2],
          className:  '',
        });

        const marker = L.marker(latlng, { icon });
        marker.on('click', () => {
          const expansionZoom = Math.min(index.getClusterExpansionZoom((item as ClusterFeature).id as number), 18);
          map.flyTo(latlng, expansionZoom, { duration: 0.6 });
        });
        layerRef.current?.addLayer(marker);
      } else {
        // ── Single generator pin ──
        const feat  = item as PointFeature;
        const gen   = genMap.current.get(feat.properties.genId);
        if (!gen) return;

        const color = STATUS_COLOR[gen.status];
        const r     = 6;

        const icon = L.divIcon({
          html: `
            <div style="
              width:${r * 2}px; height:${r * 2}px;
              border-radius:50%;
              background:${color};
              border:2px solid white;
              box-shadow:0 0 8px ${color}99;
            "></div>
          `,
          iconSize:   [r * 2, r * 2],
          iconAnchor: [r, r],
          className:  '',
        });

        const marker = L.marker(latlng, { icon });
        marker.on('click', () => onSelectGen(gen));
        marker.bindTooltip(
          `<div style="font-family:monospace;font-size:11px;direction:rtl">
            <b>G-${String(gen.id).padStart(4,'0')}</b><br/>
            ${gen.city} — ${gen.area}<br/>
            ${gen.power} kW
          </div>`,
          { direction: 'top', offset: [0, -8] }
        );
        layerRef.current?.addLayer(marker);
      }
    });
  }, [map, index, onSelectGen, layerRef]);

  // Re-render on map move/zoom
  useMapEvents({
    moveend: render,
    zoomend: render,
  });

  // Initial render and on generators change
  useEffect(() => {
    render();
  }, [render, generators]);

  return null;
}

// ─── Focus handler — pans to a generator ─────────────────────────────────────
function FocusHandler({ gen }: { gen: Generator | null }) {
  const map = useMap();
  useEffect(() => {
    if (!gen) return;
    map.flyTo([gen.lat, gen.lng], 15, { duration: 0.8 });
  }, [gen, map]);
  return null;
}

// ─── Main FleetMap ────────────────────────────────────────────────────────────
export default function FleetMap({ generators, focusedGen, onSelectGen }: FleetMapProps) {
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [index, setIndex] = useState<Supercluster<{ genId: number }> | null>(null);
  const [mounted, setMounted] = useState(false);

  // Wait for the real DOM to be ready before letting Leaflet initialize
  useEffect(() => { setMounted(true); }, []);

  // Build Supercluster index when generators change
  useEffect(() => {
    const sc = new Supercluster<{ genId: number }>({
      radius:  60,
      maxZoom: 16,
      minZoom: 4,
    });

    const points: PointFeature[] = generators.map((g) => ({
      type:       'Feature',
      properties: { genId: g.id },
      geometry:   { type: 'Point', coordinates: [g.lng, g.lat] },
    }));

    sc.load(points);
    setIndex(sc);
    layerRef.current?.clearLayers();
  }, [generators]);

  // Fix Leaflet default icon path (broken in Next.js)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });
  }, []);

  // Al-Anbar center
  const CENTER: [number, number] = [33.43, 43.30];

  if (!mounted) {
    return (
      <div
        style={{ width: '100%', height: '100%', background: '#0d0d1a', borderRadius: 'inherit' }}
        className="flex items-center justify-center"
      >
        <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <MapContainer
      center={CENTER}
      zoom={9}
      style={{ width: '100%', height: '100%', background: '#0d0d1a' }}
      zoomControl={false}
      attributionControl={false}
    >
      {/* Dark map tiles */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        maxZoom={19}
      />

      {/* Layer group managed imperatively */}
      <LayerGroupInit layerRef={layerRef} />

      {/* Focus on selected generator */}
      <FocusHandler gen={focusedGen} />

      {/* Cluster rendering */}
      {index && (
        <ClusterLayer
          generators={generators}
          index={index}
          onSelectGen={onSelectGen}
          layerRef={layerRef}
        />
      )}
    </MapContainer>
  );
}

// Initialise the LayerGroup once and store in ref
function LayerGroupInit({ layerRef }: { layerRef: React.MutableRefObject<L.LayerGroup | null> }) {
  const map = useMap();
  useEffect(() => {
    if (layerRef.current) return;
    const lg = L.layerGroup().addTo(map);
    layerRef.current = lg;
  }, [map, layerRef]);
  return null;
}
