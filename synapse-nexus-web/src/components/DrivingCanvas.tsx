'use client'

import { useEffect, useRef, memo } from 'react'
import type { ScenarioState, SimVehicle, WorldPos, RiskState } from '@/types/simulation'

// ─── Canvas drawing helpers ────────────────────────────────────────────────────

const RISK_COLOR: Record<RiskState, string> = {
  safe: '#4A9EFF',
  warning: '#F5A623',
  danger: '#FF3B3B',
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
}

function drawEgoVehicle(ctx: CanvasRenderingContext2D, x: number, y: number, heading: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(heading)

  // Amber glow
  ctx.shadowColor = '#F5A623'
  ctx.shadowBlur = 15

  // Body
  ctx.fillStyle = '#FFFFFF'
  drawRoundRect(ctx, -8, -13, 16, 26, 3)

  ctx.shadowBlur = 0

  // Windshield (top 30%)
  ctx.fillStyle = '#1E2535'
  drawRoundRect(ctx, -6, -11, 12, 8, 2)

  // Headlights
  ctx.fillStyle = '#FFFDE7'
  ctx.beginPath(); ctx.arc(-4, -14, 2, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(4, -14, 2, 0, Math.PI * 2); ctx.fill()

  // Taillights
  ctx.fillStyle = '#FF3B3B'
  ctx.beginPath(); ctx.arc(-4, 13, 1.5, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(4, 13, 1.5, 0, Math.PI * 2); ctx.fill()

  ctx.restore()
}

function drawRoads(ctx: CanvasRenderingContext2D, MAP_SIZE: number) {
  ctx.save()

  // 1. Road Base (Main)
  ctx.fillStyle = '#1A1F2E'
  ctx.fillRect(1460, 0, 80, MAP_SIZE)

  // 2. Footpaths
  ctx.fillStyle = '#252B3B'
  ctx.fillRect(1452, 0, 8, MAP_SIZE) // Left
  ctx.fillRect(1540, 0, 8, MAP_SIZE) // Right

  // 3. Texture (200 random dots)
  ctx.fillStyle = 'rgba(255,255,255,0.03)'
  for (let i = 0; i < 200; i++) {
    const rx = 1460 + (i * 37) % 80
    const ry = (i * 157) % MAP_SIZE
    ctx.beginPath(); ctx.arc(rx, ry, 0.5, 0, Math.PI * 2); ctx.fill()
  }

  // 4. Edges
  ctx.strokeStyle = '#2D3748'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(1460, 0); ctx.lineTo(1460, MAP_SIZE); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(1540, 0); ctx.lineTo(1540, MAP_SIZE); ctx.stroke()

  // 5. Center Divider (Orange dashed)
  ctx.strokeStyle = 'rgba(245, 166, 35, 0.4)'
  ctx.setLineDash([20, 15])
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(1500, 0); ctx.lineTo(1500, MAP_SIZE); ctx.stroke()

  // 6. Lane Markings (White faint)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
  ctx.setLineDash([30, 20])
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(1480, 0); ctx.lineTo(1480, MAP_SIZE); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(1520, 0); ctx.lineTo(1520, MAP_SIZE); ctx.stroke()
  ctx.setLineDash([])

  // 7. Intersection (y=1200)
  ctx.fillStyle = '#1A1F2E'
  ctx.fillRect(0, 1170, MAP_SIZE, 60)
  ctx.strokeStyle = '#2D3748'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(0, 1170); ctx.lineTo(MAP_SIZE, 1170); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(0, 1230); ctx.lineTo(MAP_SIZE, 1230); ctx.stroke()
  // Stop line
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(1460, 1168, 80, 4)

  // 8. Side Road (y=1600, 45 deg)
  ctx.save()
  ctx.translate(1540, 1600)
  ctx.rotate(Math.PI / 4)
  ctx.fillStyle = '#1A1F2E'
  ctx.fillRect(0, -25, 500, 50)
  ctx.strokeStyle = '#2D3748'
  ctx.beginPath(); ctx.moveTo(0, -25); ctx.lineTo(500, -25); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(0, 25); ctx.lineTo(500, 25); ctx.stroke()
  ctx.restore()

  // Lane Labels
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.font = '9px JetBrains Mono'
  ctx.fillText('← LANE 1', 1464, 1800)
  ctx.fillText('LANE 2 →', 1515, 1800)

  ctx.restore()
}

function drawCar(
  ctx: CanvasRenderingContext2D,
  v: SimVehicle,
  now: number,
  worldTime: number,
) {
  ctx.save()
  ctx.translate(v.x, v.y)
  ctx.rotate(v.heading)

  const col = RISK_COLOR[v.risk]
  const isPulse = v.risk === 'danger'

  // Pulsing danger circle
  if (isPulse) {
    const pulse = 15 + 10 * Math.sin(now / 300)
    const grad = ctx.createRadialGradient(0, 0, 5, 0, 0, pulse)
    grad.addColorStop(0, 'rgba(255,59,59,0.3)')
    grad.addColorStop(1, 'rgba(255,59,59,0)')
    ctx.fillStyle = grad
    ctx.beginPath(); ctx.arc(0, 0, pulse, 0, Math.PI * 2); ctx.fill()
  }

  if (v.isWrongWay) {
    // Wrong way: red rect with X
    ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 16
    ctx.fillStyle = '#FF3B3B'
    drawRoundRect(ctx, -7, -11, 14, 22, 2)
    ctx.shadowBlur = 0
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.5
    ctx.beginPath(); ctx.moveTo(-3, -6); ctx.lineTo(3, 6); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(3, -6); ctx.lineTo(-3, 6); ctx.stroke()
  } else if (v.kind === 'pedestrian') {
    // Pedestrian: circle
    ctx.fillStyle = col
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3])
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.stroke()
    ctx.setLineDash([])
  } else if (v.kind === 'truck') {
    ctx.fillStyle = col
    drawRoundRect(ctx, -7, -14, 14, 28, 2)
    ctx.fillStyle = col + '88'
    drawRoundRect(ctx, -6, -14, 12, 10, 2) // cab
  } else if (v.kind === 'motorcycle') {
    ctx.fillStyle = col
    ctx.beginPath()
    ctx.ellipse(0, 0, 3, 7, 0, 0, Math.PI * 2); ctx.fill()
  } else {
    // Regular car
    ctx.fillStyle = col
    drawRoundRect(ctx, -6, -10, 12, 20, 2)
    // Windshield
    ctx.fillStyle = col + '55'
    drawRoundRect(ctx, -5, -9, 10, 6, 1)
    // Headlights
    if (!v.braking) {
      ctx.fillStyle = '#FFFDE7'
      ctx.beginPath(); ctx.arc(-3, -11, 1.5, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(3, -11, 1.5, 0, Math.PI * 2); ctx.fill()
    } else {
      ctx.fillStyle = '#FF3B3B'
      ctx.beginPath(); ctx.arc(-3, 10, 2, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(3, 10, 2, 0, Math.PI * 2); ctx.fill()
    }
  }

  // Heading arrow
  ctx.fillStyle = col
  const arrowFwd = v.kind === 'pedestrian' ? 14 : (v.kind === 'truck' ? 18 : 13)
  ctx.beginPath()
  ctx.moveTo(0, -arrowFwd); ctx.lineTo(-2.5, -(arrowFwd - 5)); ctx.lineTo(2.5, -(arrowFwd - 5))
  ctx.closePath(); ctx.fill()

  ctx.restore()

  // V2N wifi icon
  if (v.showV2N) {
    ctx.save()
    ctx.translate(v.x + 14, v.y - 14)
    ctx.fillStyle = '#4A9EFF'
    ctx.font = 'bold 10px JetBrains Mono'
    ctx.fillText('V2N', -10, 0)
    ctx.restore()
  }

  // HUD Label (moved to screen space badges below)
}

function drawTrail(ctx: CanvasRenderingContext2D, trail: WorldPos[], col: string) {
  trail.forEach((pt, i) => {
    const opacity = 0.5 - i * 0.1
    const size = 2.5 - i * 0.4
    ctx.fillStyle = col + Math.round(opacity * 255).toString(16).padStart(2, '0')
    ctx.beginPath(); ctx.arc(pt.x, pt.y, size, 0, Math.PI * 2); ctx.fill()
  })
}

function drawTrajectory(
  ctx: CanvasRenderingContext2D,
  pts: WorldPos[],
  col: string,
  solid: boolean,
  opacity: number,
  lineWidth: number,
  flashing: boolean,
  flashPhase: number,
) {
  if (!pts.length) return
  const alpha = flashing ? (Math.sin(flashPhase) > 0 ? 0.9 : 0.3) : opacity
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = col
  ctx.lineWidth = lineWidth
  if (!solid) ctx.setLineDash([4, 4])
  ctx.beginPath()
  pts.forEach((pt, i) => {
    if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y)
  })
  ctx.stroke()
  // Dots along trajectory
  pts.forEach((pt, i) => {
    const dotSize = Math.max(1, 2.5 - i * 0.3)
    const dotAlpha = 1 - i / pts.length
    ctx.globalAlpha = alpha * dotAlpha
    ctx.fillStyle = col
    ctx.beginPath(); ctx.arc(pt.x, pt.y, dotSize, 0, Math.PI * 2); ctx.fill()
  })
  ctx.globalAlpha = 1
  ctx.setLineDash([])
  ctx.restore()
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  state: ScenarioState
}

const DrivingCanvas = memo(function DrivingCanvas({ state }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mapRef = useRef<HTMLImageElement | null>(null)
  const stateRef = useRef<ScenarioState>(state)
  const rafRef = useRef<number>(0)

  // Keep state ref fresh
  stateRef.current = state

  // Load map image once
  useEffect(() => {
    const img = new Image()
    img.src = '/maps/36092f0b03a857c6a3403e25b4b7aab3.png'
    img.onload = () => { mapRef.current = img }
  }, [])

  // Canvas resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        canvas.width = entry.contentRect.width
        canvas.height = entry.contentRect.height
      }
    })
    ro.observe(canvas.parentElement!)
    return () => ro.disconnect()
  }, [])

  // 60fps rAF rendering loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const render = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) { rafRef.current = requestAnimationFrame(render); return }

      const W = canvas.width || canvas.offsetWidth
      const H = canvas.height || canvas.offsetHeight
      if (!W || !H) { rafRef.current = requestAnimationFrame(render); return }

      canvas.width = W; canvas.height = H

      const s = stateRef.current
      const { ego } = s
      const now = performance.now()
      const flashPhase = now / 250 // for flash animations

      ctx.clearRect(0, 0, W, H)

      // ── World space (camera follows ego) ─────────────────────────────────────
      ctx.save()
      ctx.translate(W / 2 - ego.x, H / 2 - ego.y)

      // Map background
      const MAP_SIZE = 3000
      if (mapRef.current) {
        ctx.drawImage(mapRef.current, 0, 0, MAP_SIZE, MAP_SIZE)
      } else {
        ctx.fillStyle = '#0A1020'
        ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE)
      }
      // Dark overlay
      ctx.fillStyle = 'rgba(8, 11, 20, 0.65)'
      ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE)

      // Draw Roads
      drawRoads(ctx, MAP_SIZE)

      // Draw vehicle trails
      s.vehicles.forEach(v => {
        if (!v.visible) return
        drawTrail(ctx, v.trail, RISK_COLOR[v.risk])
      })

      // Draw trajectories
      s.vehicles.forEach(v => {
        if (!v.visible) return
        const col = RISK_COLOR[v.risk]
        const isDanger = v.risk === 'danger'
        drawTrajectory(ctx, v.traj1, col, true, 0.8, isDanger ? 3 : 2, isDanger, flashPhase)
        drawTrajectory(ctx, v.traj2, col, false, 0.4, 1, false, 0)
        drawTrajectory(ctx, v.traj3, col, false, 0.2, 1, false, 0)

        // Danger intersection X mark
        if (isDanger && v.traj1.length > 0) {
          const pt = v.traj1[Math.floor(v.traj1.length / 2)]
          ctx.save()
          ctx.translate(pt.x, pt.y)
          ctx.strokeStyle = '#FF3B3B'; ctx.lineWidth = 2.5
          ctx.globalAlpha = 0.9
          ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(5, 5); ctx.stroke()
          ctx.beginPath(); ctx.moveTo(5, -5); ctx.lineTo(-5, 5); ctx.stroke()
          ctx.globalAlpha = 1
          ctx.restore()
        }
      })

      // Draw other vehicles
      s.vehicles.forEach(v => {
        if (v.visible) drawCar(ctx, v, now, now / 1000)
      })

      // Draw ego vehicle at its world position
      drawEgoVehicle(ctx, ego.x, ego.y, ego.heading)

      // Draw Distance Measurement (between ego and front car)
      const leadCar = s.vehicles.find(v => v.y < ego.y && Math.abs(v.x - ego.x) < 20)
      if (leadCar) {
        const dist = Math.abs(leadCar.y - ego.y)
        const dCol = dist < 100 ? '#FF3B3B' : (dist < 200 ? '#F5A623' : '#4A9EFF')
        ctx.strokeStyle = dCol
        ctx.setLineDash([5, 5])
        ctx.beginPath(); ctx.moveTo(ego.x, ego.y); ctx.lineTo(leadCar.x, leadCar.y); ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 10px JetBrains Mono'
        ctx.fillText(`${(dist / 2).toFixed(0)}m`, ego.x + 10, (ego.y + leadCar.y) / 2)
      }

      ctx.restore()

      // ── Screen space UI ───────────────────────────────────────────────────────
      s.vehicles.forEach(v => {
        if (!v.visible) return
        // Project world to screen
        const screenX = W / 2 + (v.x - ego.x)
        const screenY = H / 2 + (v.y - ego.y)

        // Only draw badge if within 250px of ego
        const dist = Math.hypot(v.x - ego.x, v.y - ego.y)
        if (dist < 500) {
          ctx.save()
          ctx.translate(screenX + 20, screenY - 20)
          
          // Badge background
          ctx.fillStyle = 'rgba(13, 22, 35, 0.85)'
          ctx.strokeStyle = RISK_COLOR[v.risk]
          ctx.lineWidth = 1
          ctx.beginPath(); ctx.roundRect(0, 0, 80, 45, 2); ctx.fill(); ctx.stroke()

          // Badge text
          ctx.fillStyle = RISK_COLOR[v.risk]
          ctx.font = 'bold 9px JetBrains Mono'
          ctx.fillText(v.label, 6, 12)
          
          ctx.fillStyle = '#8892A4'
          ctx.font = '8px JetBrains Mono'
          const speedStr = v.kind === 'pedestrian' ? '4 km/h' : '52 km/h'
          const laneStr = v.x < 1500 ? 'Lane 1' : 'Lane 2'
          ctx.fillText(`↑ ${speedStr}`, 6, 24)
          ctx.fillText(`${laneStr}`, 6, 32)
          ctx.fillText(`${(dist/2).toFixed(0)}m dist`, 6, 40)
          
          // Leader line
          ctx.strokeStyle = 'rgba(255,255,255,0.2)'
          ctx.setLineDash([2, 2])
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-20, 20); ctx.stroke()

          ctx.restore()
        }
      })

      // Screen flash on danger
      if (s.screenFlash && Math.sin(flashPhase * 2) > 0) {
        ctx.save()
        ctx.strokeStyle = '#FF3B3B'
        ctx.lineWidth = 6
        ctx.shadowColor = '#FF3B3B'
        ctx.shadowBlur = 20
        ctx.strokeRect(3, 3, W - 6, H - 6)
        ctx.restore()
      } else if (s.dangerMode) {
        ctx.save()
        ctx.strokeStyle = '#FF3B3B'
        ctx.lineWidth = 3
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(now / 400)
        ctx.strokeRect(3, 3, W - 6, H - 6)
        ctx.restore()
      }

      rafRef.current = requestAnimationFrame(render)
    }

    rafRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <div className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
    </div>
  )
})

export default DrivingCanvas
