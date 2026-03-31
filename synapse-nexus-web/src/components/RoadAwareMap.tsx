'use client'

import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useTrafficStore } from '@/store/trafficStore'
import { ROAD_NETWORK, INTERSECTIONS } from '@/data/roadNetwork'
import { THREAT_COLORS } from '@/types/vehicle'

// ─── Custom GTA-style dark map — NO external tile server ────────────────────
// All roads are drawn from our ROAD_NETWORK. Vehicles can NEVER drift off roads
// because the same coordinates drive both rendering and vehicle placement.
const DARK_MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {},
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#080B14' },
    },
  ],
}

// Build road GeoJSON from our ROAD_NETWORK
function buildRoadGeoJSON() {
  return {
    type: 'FeatureCollection' as const,
    features: ROAD_NETWORK.map(r => ({
      type: 'Feature' as const,
      properties: { id: r.id, name: r.name, type: r.type, lanes: r.lanes },
      geometry: { type: 'LineString' as const, coordinates: r.coordinates },
    })),
  }
}

// Generate city-block rectangles between road bounding boxes for atmosphere
function buildCityBlocksGeoJSON() {
  const blocks: GeoJSON.Feature[] = []
  // Generate simple offset rectangles to give a "city block" feel
  const grid = [
    [103.8470, 1.2760, 103.8530, 1.2845],
    [103.8535, 1.2760, 103.8598, 1.2842],
    [103.8603, 1.2760, 103.8660, 1.2843],
    [103.8470, 1.2855, 103.8528, 1.2950],
    [103.8535, 1.2857, 103.8600, 1.2950],
    [103.8605, 1.2855, 103.8670, 1.2950],
    [103.8480, 1.2758, 103.8530, 1.2800],
    [103.8540, 1.2755, 103.8590, 1.2798],
    [103.8600, 1.2756, 103.8660, 1.2800],
    [103.8462, 1.2810, 103.8528, 1.2848],
    [103.8415, 1.2770, 103.8460, 1.2960],
    [103.8672, 1.2760, 103.8720, 1.2960],
  ]
  for (const [x1, y1, x2, y2] of grid) {
    const pad = 0.0008
    blocks.push({
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [x1 + pad, y1 + pad],
          [x2 - pad, y1 + pad],
          [x2 - pad, y2 - pad],
          [x1 + pad, y2 - pad],
          [x1 + pad, y1 + pad],
        ]],
      },
    })
  }
  return { type: 'FeatureCollection' as const, features: blocks }
}

function buildIntersectionGeoJSON() {
  const colors: Record<string, string> = { red: '#FF3B3B', yellow: '#F5A623', green: '#00FF88' }
  return {
    type: 'FeatureCollection' as const,
    features: INTERSECTIONS.map(i => ({
      type: 'Feature' as const,
      properties: { color: i.lightState ? colors[i.lightState] : '#8892A4' },
      geometry: { type: 'Point' as const, coordinates: i.center },
    })),
  }
}

// Build route LineString for ego's planned route
function buildRouteGeoJSON(plannedRoute: string[]) {
  const coords: [number, number][] = plannedRoute.flatMap(id => {
    const road = ROAD_NETWORK.find(r => r.id === id)
    return road ? road.coordinates : []
  })
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'LineString' as const, coordinates: coords },
  }
}

const EMPTY_FC = { type: 'FeatureCollection' as const, features: [] as any[] }

export default function RoadAwareMap({ className = '' }: { className?: string }) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  const { egoVehicle, vehicles } = useTrafficStore()

  // ── Map initialization ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: DARK_MAP_STYLE,
      center: [103.8550, 1.2850],
      zoom: 15,
      pitch: 50,
      bearing: 0,
      attributionControl: false,
    })

    m.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right')

    m.on('load', () => {
      // ── City blocks (atmosphere) ───────────────────────────────────────────
      m.addSource('city-blocks', { type: 'geojson', data: buildCityBlocksGeoJSON() })
      m.addLayer({
        id: 'city-blocks-fill',
        type: 'fill',
        source: 'city-blocks',
        paint: { 'fill-color': '#0F1520', 'fill-opacity': 0.9 },
      })
      m.addLayer({
        id: 'city-blocks-outline',
        type: 'line',
        source: 'city-blocks',
        paint: { 'line-color': '#1A2235', 'line-width': 0.5 },
      })

      // ── Road network ───────────────────────────────────────────────────────
      m.addSource('roads', { type: 'geojson', data: buildRoadGeoJSON() })

      // Road outer glow
      m.addLayer({
        id: 'road-glow-outer',
        type: 'line',
        source: 'roads',
        paint: {
          'line-color': 'rgba(245,166,35,0.08)',
          'line-width': ['match', ['get', 'type'], 'highway', 28, 'arterial', 20, 14],
          'line-blur': 8,
        },
      })
      m.addLayer({
        id: 'road-glow-inner',
        type: 'line',
        source: 'roads',
        paint: {
          'line-color': 'rgba(245,166,35,0.15)',
          'line-width': ['match', ['get', 'type'], 'highway', 18, 'arterial', 12, 8],
          'line-blur': 4,
        },
      })
      // Road surface
      m.addLayer({
        id: 'road-surface',
        type: 'line',
        source: 'roads',
        paint: {
          'line-color': '#1E2A3A',
          'line-width': ['match', ['get', 'type'], 'highway', 12, 'arterial', 9, 6],
          'line-cap': 'round',
          'line-join': 'round',
        },
      })
      // Lane center dashes
      m.addLayer({
        id: 'road-center',
        type: 'line',
        source: 'roads',
        paint: {
          'line-color': '#F5A62340',
          'line-width': 1,
          'line-dasharray': [8, 6],
        },
      })
      // Road edge highlight
      m.addLayer({
        id: 'road-edge',
        type: 'line',
        source: 'roads',
        paint: {
          'line-color': '#2A3A50',
          'line-width': 0.5,
          'line-gap-width': ['match', ['get', 'type'], 'highway', 11, 'arterial', 8, 5],
        },
      })

      // ── Intersections ──────────────────────────────────────────────────────
      m.addSource('intersections', { type: 'geojson', data: buildIntersectionGeoJSON() })
      m.addLayer({
        id: 'intersections-glow',
        type: 'circle',
        source: 'intersections',
        paint: {
          'circle-radius': 14,
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.15,
          'circle-blur': 1,
        },
      })
      m.addLayer({
        id: 'intersections-dot',
        type: 'circle',
        source: 'intersections',
        paint: {
          'circle-radius': 5,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#080B14',
        },
      })

      // ── Ego route ──────────────────────────────────────────────────────────
      m.addSource('ego-route', {
        type: 'geojson',
        data: buildRouteGeoJSON(egoVehicle.plannedRoute),
      })
      m.addLayer({
        id: 'ego-route-glow',
        type: 'line',
        source: 'ego-route',
        paint: {
          'line-color': 'rgba(245,166,35,0.2)',
          'line-width': 8,
          'line-blur': 4,
        },
      })
      m.addLayer({
        id: 'ego-route-line',
        type: 'line',
        source: 'ego-route',
        paint: {
          'line-color': '#F5A623',
          'line-width': 2.5,
          'line-dasharray': [10, 5],
          'line-opacity': 0.9,
        },
      })

      // ── Danger zones (critical + high vehicles) ────────────────────────────
      m.addSource('danger-zones', { type: 'geojson', data: EMPTY_FC })
      m.addLayer({
        id: 'danger-zones-fill',
        type: 'circle',
        source: 'danger-zones',
        paint: {
          'circle-radius': 45,
          'circle-color': 'rgba(255,0,0,0.06)',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': 'rgba(255,0,0,0.35)',
        },
      })

      // ── Predicted trajectory lines ─────────────────────────────────────────
      m.addSource('trajectories', { type: 'geojson', data: EMPTY_FC })
      m.addLayer({
        id: 'trajectories-lines',
        type: 'line',
        source: 'trajectories',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 1.5,
          'line-dasharray': [5, 4],
          'line-opacity': 0.55,
        },
      })

      // ── Traffic vehicles ───────────────────────────────────────────────────
      m.addSource('vehicles', { type: 'geojson', data: EMPTY_FC })
      // Shadow
      m.addLayer({
        id: 'vehicles-shadow',
        type: 'circle',
        source: 'vehicles',
        paint: {
          'circle-radius': ['match', ['get', 'vtype'], 'truck', 13, 'bus', 13, 9],
          'circle-color': 'rgba(0,0,0,0.5)',
          'circle-blur': 1.5,
          'circle-translate': [3, 3],
        },
      })
      // Vehicle body
      m.addLayer({
        id: 'vehicles-body',
        type: 'circle',
        source: 'vehicles',
        paint: {
          'circle-radius': ['match', ['get', 'vtype'], 'truck', 11, 'bus', 11, 7],
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 3,
          'circle-stroke-color': ['get', 'threatColor'],
        },
      })

      // ── Ego vehicle ────────────────────────────────────────────────────────
      m.addSource('ego', {
        type: 'geojson',
        data: {
          type: 'Feature' as const,
          properties: {},
          geometry: { type: 'Point' as const, coordinates: [egoVehicle.lng, egoVehicle.lat] },
        },
      })
      // Pulse ring
      m.addLayer({
        id: 'ego-pulse',
        type: 'circle',
        source: 'ego',
        paint: {
          'circle-radius': 28,
          'circle-color': 'rgba(245,166,35,0.06)',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': 'rgba(245,166,35,0.35)',
        },
      })
      // Glow
      m.addLayer({
        id: 'ego-glow',
        type: 'circle',
        source: 'ego',
        paint: {
          'circle-radius': 18,
          'circle-color': 'rgba(245,166,35,0.15)',
          'circle-blur': 3,
        },
      })
      // Marker
      m.addLayer({
        id: 'ego-marker',
        type: 'circle',
        source: 'ego',
        paint: {
          'circle-radius': 10,
          'circle-color': '#FFFFFF',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#F5A623',
        },
      })

      setMapLoaded(true)
    })

    map.current = m
    return () => { m.remove(); map.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update sources every tick ────────────────────────────────────────────────
  useEffect(() => {
    const m = map.current
    if (!m || !mapLoaded || !m.isStyleLoaded()) return

    // Ego
    ;(m.getSource('ego') as maplibregl.GeoJSONSource)?.setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [egoVehicle.lng, egoVehicle.lat] },
    })

    // Vehicles
    ;(m.getSource('vehicles') as maplibregl.GeoJSONSource)?.setData({
      type: 'FeatureCollection',
      features: vehicles.map(v => ({
        type: 'Feature' as const,
        properties: {
          color: v.color,
          vtype: v.type,
          threatColor: THREAT_COLORS[v.threatLevel],
        },
        geometry: { type: 'Point' as const, coordinates: [v.lng, v.lat] },
      })),
    })

    // Trajectory lines (only threatening vehicles)
    ;(m.getSource('trajectories') as maplibregl.GeoJSONSource)?.setData({
      type: 'FeatureCollection',
      features: vehicles
        .filter(v => v.predictedPath.length > 1 && v.threatLevel !== 'none')
        .map(v => ({
          type: 'Feature' as const,
          properties: { color: THREAT_COLORS[v.threatLevel] },
          geometry: {
            type: 'LineString' as const,
            coordinates: [
              [v.lng, v.lat],
              ...v.predictedPath.map(p => [p.lng, p.lat] as [number, number]),
            ],
          },
        })),
    })

    // Danger zones
    ;(m.getSource('danger-zones') as maplibregl.GeoJSONSource)?.setData({
      type: 'FeatureCollection',
      features: vehicles
        .filter(v => v.threatLevel === 'critical' || v.threatLevel === 'high')
        .map(v => ({
          type: 'Feature' as const,
          properties: {},
          geometry: { type: 'Point' as const, coordinates: [v.lng, v.lat] },
        })),
    })

    // Smoothly follow ego — rotate map to ego heading
    m.easeTo({
      center: [egoVehicle.lng, egoVehicle.lat],
      bearing: -(egoVehicle.heading * 180) / Math.PI,
      duration: 90,
    })
  }, [vehicles, egoVehicle, mapLoaded])

  const wrongWay = vehicles.filter(v => v.isWrongWay)
  const critical = vehicles.find(v => v.threatLevel === 'critical')
  const currentRoad = ROAD_NETWORK.find(r => r.id === egoVehicle.roadId)

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div ref={mapContainer} className="w-full h-full" />

      {/* Collision warning banner */}
      {critical && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="animate-pulse bg-red-600 text-white px-6 py-2 text-sm font-bold font-mono-data rounded-sm shadow-xl ring-2 ring-red-400">
            🚨 COLLISION WARNING — TTC {isFinite(critical.ttc) ? critical.ttc.toFixed(1) : '—'}s — {Math.round(critical.distance)}m
          </div>
        </div>
      )}

      {/* Wrong-way banner */}
      {wrongWay.length > 0 && !critical && (
        <div className="absolute top-3 left-3 right-3 z-20 pointer-events-none">
          <div className="animate-pulse bg-red-700/90 text-white text-center px-4 py-2 text-xs font-bold font-mono-data rounded-sm ring-1 ring-red-500">
            🚨 WRONG WAY DRIVER DETECTED — {wrongWay.length} vehicle{wrongWay.length > 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Speed / road HUD (bottom-left) */}
      <div className="absolute bottom-4 left-4 z-10 bg-secondary/90 backdrop-blur-sm border border-border/60 px-4 py-3 min-w-[100px]">
        <div className="text-amber text-3xl font-bold font-clash leading-none">
          {Math.round(egoVehicle.speed)}
        </div>
        <div className="text-textsecondary text-[10px] font-mono-data tracking-widest mt-0.5">KM/H</div>
        <div className="border-t border-border/50 mt-2 pt-1.5">
          <div className="text-textsecondary text-[10px] font-mono-data">{currentRoad?.name ?? '—'}</div>
          <div className="text-textsecondary text-[10px] font-mono-data">Lane {egoVehicle.lane + 1}/{currentRoad?.lanes ?? 1}</div>
        </div>
      </div>

      {/* Mini legend (top-left) */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 pointer-events-none">
        <div className="flex items-center gap-1.5 bg-secondary/70 backdrop-blur-sm px-2 py-1 rounded-sm">
          <div className="w-2 h-2 rounded-full bg-white ring-2 ring-amber" />
          <span className="text-[10px] text-textsecondary font-mono-data">Ego</span>
        </div>
        <div className="flex items-center gap-1.5 bg-secondary/70 backdrop-blur-sm px-2 py-1 rounded-sm">
          <div className="w-5 h-0.5 bg-amber opacity-60" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #F5A623 0, #F5A623 8px, transparent 8px, transparent 13px)' }} />
          <span className="text-[10px] text-textsecondary font-mono-data">Route</span>
        </div>
      </div>
    </div>
  )
}
