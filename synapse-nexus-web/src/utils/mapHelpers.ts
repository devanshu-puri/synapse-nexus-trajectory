/**
 * Calculate distance between two points in meters using Haversine formula
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3 // Earth's radius in meters
  const p1 = (lat1 * Math.PI) / 180
  const p2 = (lat2 * Math.PI) / 180
  const dp = ((lat2 - lat1) * Math.PI) / 180
  const dl = ((lng2 - lng1) * Math.PI) / 180

  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Calculate bearing/heading from one point to another in degrees
 */
export function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const l1 = (lat1 * Math.PI) / 180
  const l2 = (lat2 * Math.PI) / 180
  const dl = ((lng2 - lng1) * Math.PI) / 180

  const y = Math.sin(dl) * Math.cos(l2)
  const x = Math.cos(l1) * Math.sin(l2) - Math.sin(l1) * Math.cos(l2) * Math.cos(dl)

  const bearing = (Math.atan2(y, x) * 180) / Math.PI
  return (bearing + 360) % 360
}

/**
 * Project a point given distance (meters) and bearing (degrees)
 */
export function projectPoint(lat: number, lng: number, distance: number, bearing: number): [number, number] {
  const R = 6371e3
  const b = (bearing * Math.PI) / 180
  const l1 = (lat * Math.PI) / 180
  const g1 = (lng * Math.PI) / 180

  const l2 = Math.asin(
    Math.sin(l1) * Math.cos(distance / R) +
    Math.cos(l1) * Math.sin(distance / R) * Math.cos(b)
  )
  const g2 = g1 + Math.atan2(
    Math.sin(b) * Math.sin(distance / R) * Math.cos(l1),
    Math.cos(distance / R) - Math.sin(l1) * Math.sin(l2)
  )

  return [(l2 * 180) / Math.PI, (g2 * 180) / Math.PI]
}

/**
 * Check if an agent is in the collision zone of the ego vehicle
 */
export function isInCollisionZone(
  agent: { lat: number; lng: number },
  ego: { lat: number; lng: number },
  thresholdMeters: number = 10
): boolean {
  return calculateDistance(agent.lat, agent.lng, ego.lat, ego.lng) <= thresholdMeters
}

/**
 * Format coordinates for UI display
 */
export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
}

/**
 * Generate a simulated trajectory path based on position, velocity, and heading
 */
export function generateTrajectoryPoints(
  lat: number,
  lng: number,
  speedMetersPerSec: number,
  headingDegrees: number,
  steps: number,
  timeStepSeconds: number = 0.5
): [number, number][] {
  const points: [number, number][] = []
  let currentLat = lat
  let currentLng = lng
  
  for (let i = 0; i < steps; i++) {
    const distance = speedMetersPerSec * timeStepSeconds
    const newPoint = projectPoint(currentLat, currentLng, distance, headingDegrees)
    currentLat = newPoint[0]
    currentLng = newPoint[1]
    // Note: ProjectPoint returns [lat, lng], but MapLibre often expects [lng, lat]
    // The caller is responsible for converting to [lng, lat] for GeoJSON
    points.push([currentLat, currentLng])
  }
  
  return points
}
