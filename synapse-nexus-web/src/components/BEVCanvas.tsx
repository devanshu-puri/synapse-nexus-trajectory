'use client'

import { useEffect, useRef } from 'react'

interface BEVCanvasProps {
  opacity?: number
}

interface Agent {
  baseX: number
  baseY: number
  phase: number
  speed: number
  color: string
  trail: { x: number; y: number }[]
  vx: number
  vy: number
}

export default function BEVCanvas({ opacity = 0.35 }: BEVCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const agentsRef = useRef<Agent[]>([])
  const egoRef = useRef({ x: -60, y: 0 })
  const tRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const colors = ['#00FF88', '#F5A623', '#FF3B3B']

    const initAgents = (w: number, h: number) => {
      agentsRef.current = Array.from({ length: 8 }, () => ({
        baseX: Math.random() * w * 0.85 + w * 0.075,
        baseY: Math.random() * h * 0.75 + h * 0.05,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        trail: [],
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
      }))
    }

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      canvas.width = parent.clientWidth
      canvas.height = parent.clientHeight
      egoRef.current.y = canvas.height * 0.67
      initAgents(canvas.width, canvas.height)
    }

    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      const w = canvas.width
      const h = canvas.height
      const t = (tRef.current += 0.016)
      const ego = egoRef.current

      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = '#080B14'
      ctx.fillRect(0, 0, w, h)

      // Grid
      ctx.strokeStyle = '#1E2535'
      ctx.lineWidth = 1
      const gridSize = 40
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }

      // Ego vehicle
      ego.x += 0.4
      if (ego.x > w + 60) ego.x = -60

      ctx.save()
      ctx.shadowBlur = 15
      ctx.shadowColor = '#F5A623'
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(ego.x - 5, ego.y - 9, 10, 18)
      ctx.restore()

      // Agents
      agentsRef.current.forEach((agent) => {
        const px = agent.baseX + Math.cos(t * agent.speed + agent.phase) * 60
        const py = agent.baseY + Math.sin(t * agent.speed * 0.7 + agent.phase) * 40

        agent.vx = Math.cos(t * agent.speed + agent.phase + Math.PI / 2) * agent.speed
        agent.vy = Math.sin(t * agent.speed * 0.7 + agent.phase + Math.PI / 2) * agent.speed * 0.7

        agent.trail.push({ x: px, y: py })
        if (agent.trail.length > 8) agent.trail.shift()

        const dx = px - ego.x
        const dy = py - ego.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const isClose = dist < 70

        // Trail
        agent.trail.forEach((pos, i) => {
          const progress = i / 7
          ctx.beginPath()
          ctx.arc(pos.x, pos.y, 1.5 + progress * 1.5, 0, Math.PI * 2)
          ctx.fillStyle =
            agent.color +
            Math.floor((0.1 + progress * 0.5) * 255)
              .toString(16)
              .padStart(2, '0')
          ctx.fill()
        })

        // Trajectory lines
        const angle = Math.atan2(agent.vy, agent.vx)
        const lineColor = isClose ? '#FF3B3B' : agent.color

        const drawTrajLine = (offsetAngle: number, lineOpacity: number, lineWidth: number, length: number) => {
          const a = angle + offsetAngle
          const ex = px + Math.cos(a) * length
          const ey = py + Math.sin(a) * length
          const grad = ctx.createLinearGradient(px, py, ex, ey)
          grad.addColorStop(0, lineColor + Math.floor(lineOpacity * 255).toString(16).padStart(2, '0'))
          grad.addColorStop(1, lineColor + '00')
          ctx.beginPath()
          ctx.moveTo(px, py)
          ctx.lineTo(ex, ey)
          ctx.strokeStyle = grad
          ctx.lineWidth = lineWidth
          ctx.stroke()
        }

        drawTrajLine(0, 1.0, 2, 80)
        drawTrajLine((-10 * Math.PI) / 180, 0.5, 1.5, 80)
        drawTrajLine((10 * Math.PI) / 180, 0.3, 1, 80)

        // Agent circle
        ctx.beginPath()
        ctx.arc(px, py, 5, 0, Math.PI * 2)
        ctx.fillStyle = agent.color
        ctx.fill()

        // Collision alert
        if (isClose) {
          const pulse = 12 + Math.sin(Date.now() / 200) * 8
          ctx.beginPath()
          ctx.arc(px, py, pulse, 0, Math.PI * 2)
          ctx.strokeStyle = '#FF3B3B'
          ctx.lineWidth = 2
          ctx.stroke()
        }
      })

      animFrameRef.current = requestAnimationFrame(draw)
    }

    animFrameRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        opacity,
      }}
    />
  )
}
