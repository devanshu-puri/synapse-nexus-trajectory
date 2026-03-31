'use client'

import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useSimulationStore } from '@/store/simulationStore'
import { projectPoint } from '@/utils/mapHelpers'

interface MapLibreMapProps {
  showAttentionWeights?: boolean
  selectedAgentId?: string | null
  className?: string
}

// Coordinate of a long, straight stretch of the Pan-Island Expressway (PIE) in Singapore
const MAP_ORIGIN = { lat: 1.3275, lng: 103.7954 }
const ROAD_BEARING = -68 // Bearing of the PIE at this coordinate (roughly WNW)

// Helper to reliably project local simulation space (x, y) to real-world map coordinates along the road
function getMapLngLat(x: number, y: number): [number, number] {
  const distance = Math.sqrt(x * x + y * y)
  if (distance === 0) return [MAP_ORIGIN.lng, MAP_ORIGIN.lat]

  // Math.atan2(x, y) defines +Y as 0 degrees (forward) and +X as 90 degrees (right)
  const angleDeg = (Math.atan2(x, y) * 180) / Math.PI
  const finalBearing = ROAD_BEARING + angleDeg

  // projectPoint expects lat, lng and returns [lat, lng]
  const [targetLat, targetLng] = projectPoint(MAP_ORIGIN.lat, MAP_ORIGIN.lng, distance, finalBearing)
  return [targetLng, targetLat]
}

export default function MapLibreMap({ 
  showAttentionWeights = false, 
  selectedAgentId = null,
  className = '' 
}: MapLibreMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const [mapError, setMapError] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)

  const { agents, egoVehicle, systemStats } = useSimulationStore()

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    try {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
        center: [MAP_ORIGIN.lng, MAP_ORIGIN.lat],
        zoom: 17,
        pitch: 60,
        bearing: ROAD_BEARING, // Rotate map camera to face down the road
        attributionControl: false
      })

      map.current.addControl(new maplibregl.NavigationControl(), 'top-right')

      map.current.on('error', () => setMapError(true))
      map.current.on('load', () => setMapLoaded(true))
    } catch {
      setMapError(true)
    }

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!mapLoaded || !map.current || mapError) return
    if (!map.current.isStyleLoaded()) return

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    const agentElements = document.querySelectorAll('.agent-marker')
    agentElements.forEach(el => el.remove())

    const egoElement = document.querySelector('.ego-marker')
    if (egoElement) egoElement.remove()

    if (map.current.getSource('agents')) {
      (map.current.getSource('agents') as maplibregl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: agents.map(agent => ({
          type: 'Feature' as const,
          properties: {
            id: agent.id,
            risk: agent.risk,
            intent: agent.intent
          },
          geometry: {
            type: 'Point' as const,
            coordinates: getMapLngLat(agent.position.x, agent.position.y)
          }
        }))
      })
    } else {
      map.current.addSource('agents', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: agents.map(agent => ({
            type: 'Feature' as const,
            properties: {
              id: agent.id,
              risk: agent.risk,
              intent: agent.intent
            },
            geometry: {
              type: 'Point' as const,
              coordinates: getMapLngLat(agent.position.x, agent.position.y)
            }
          }))
        }
      })

      map.current.addLayer({
        id: 'agents-layer',
        type: 'circle',
        source: 'agents',
        paint: {
          'circle-radius': 8,
          'circle-color': [
            'match',
            ['get', 'risk'],
            'danger', '#FF3B3B',
            'warning', '#F5A623',
            '#00FF88' // safe
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#080B14'
        }
      })
    }

    // Ego Vehicle Position
    const [egoLng, egoLat] = getMapLngLat(egoVehicle.position.x, egoVehicle.position.y)

    // Instantly center camera to follow ego vehicle (avoids async projection errors)
    if (map.current) {
       map.current.setCenter([egoLng, egoLat])
    }

    const egoEl = document.createElement('div')
    egoEl.className = 'ego-marker'
    egoEl.innerHTML = `
      <div style="
        width: 16px;
        height: 32px;
        background: #ffffff;
        border-radius: 4px;
        box-shadow: 0 0 15px #F5A623, 0 0 30px rgba(245,166,35,0.4);
        position: relative;
      ">
        <div style="
          position: absolute;
          top: -6px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-bottom: 8px solid #ffffff;
        "></div>
      </div>
    `
    // Rotate DOM marker to match camera facing straight up
    egoEl.style.transform = `rotate(${ROAD_BEARING}deg)`

    const egoMarker = new maplibregl.Marker({ element: egoEl })
      .setLngLat([egoLng, egoLat])
      .addTo(map.current)
    markersRef.current.push(egoMarker)

    // Attention lines mapping
    if (showAttentionWeights && selectedAgentId) {
      const selectedAgent = agents.find(a => a.id === selectedAgentId)
      if (selectedAgent && map.current.getSource('attention')) {
        const attentionFeatures = selectedAgent.attentionWeights.map((weight, idx) => {
          const otherAgent = agents[idx]
          if (!otherAgent || otherAgent.id === selectedAgent.id) return null
          return {
            type: 'Feature' as const,
            properties: { weight },
            geometry: {
              type: 'LineString' as const,
              coordinates: [
                getMapLngLat(selectedAgent.position.x, selectedAgent.position.y),
                getMapLngLat(otherAgent.position.x, otherAgent.position.y)
              ]
            }
          }
        }).filter(Boolean)

        ;(map.current.getSource('attention') as maplibregl.GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: attentionFeatures as any
        })
      } else if (selectedAgent) {
        map.current.addSource('attention', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: selectedAgent.attentionWeights.map((weight, idx) => {
              const otherAgent = agents[idx]
              if (!otherAgent || otherAgent.id === selectedAgent.id) return null
              return {
                type: 'Feature' as const,
                properties: { weight },
                geometry: {
                  type: 'LineString' as const,
                  coordinates: [
                    getMapLngLat(selectedAgent.position.x, selectedAgent.position.y),
                    getMapLngLat(otherAgent.position.x, otherAgent.position.y)
                  ]
                }
              }
            }).filter(Boolean) as any
          }
        })

        map.current.addLayer({
          id: 'attention-layer',
          type: 'line',
          source: 'attention',
          paint: {
            'line-color': '#F5A623',
            'line-width': ['*', ['get', 'weight'], 4],
            'line-opacity': 0.6
          }
        })
      }
    }

    // TTC Countdowns on danger agents
    agents.forEach(agent => {
      if (agent.risk === 'danger') {
        const [lng, lat] = getMapLngLat(agent.position.x, agent.position.y)

        const dangerEl = document.createElement('div')
        dangerEl.innerHTML = `
          <div style="
            width: 40px;
            height: 40px;
            border: 2px solid #FF3B3B;
            border-radius: 50%;
            animation: pulse 1s infinite;
            position: relative;
          ">
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              font-size: 10px;
              color: #FF3B3B;
              font-family: monospace;
              font-weight: bold;
              background: rgba(8,11,20,0.8);
              padding: 2px 4px;
              border-radius: 2px;
            ">
              ${agent.ttc.toFixed(1)}s
            </div>
          </div>
          <style>
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.3); opacity: 0.5; }
            }
          </style>
        `
        dangerEl.style.pointerEvents = 'none'

        const dangerMarker = new maplibregl.Marker({ element: dangerEl })
          .setLngLat([lng, lat])
          .addTo(map.current!)
        markersRef.current.push(dangerMarker)
      }
    })

  }, [agents, egoVehicle, showAttentionWeights, selectedAgentId, mapError, mapLoaded])

  if (mapError) {
    return (
      <div className={`w-full h-full bg-secondary flex items-center justify-center ${className}`}>
        <div className="text-center p-8">
          <p className="text-textsecondary text-sm font-mono-data">Map visualization unavailable</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={mapContainer} 
      className={`w-full h-full ${className}`}
      style={{ background: '#080B14' }}
    />
  )
}
