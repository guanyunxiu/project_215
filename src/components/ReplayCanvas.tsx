import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { Canvas, Path } from 'fabric'
import { StrokeData } from '../../shared/types'
import { Play, Pause, RotateCcw } from 'lucide-react'

interface ReplayCanvasProps {
  strokes: StrokeData[]
  speed?: number
}

function buildPathFromStroke(stroke: StrokeData): Path {
  const pts = stroke.points
  if (pts.length === 0) return new Path('M 0 0')

  let svg = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    svg += ` L ${pts[i].x} ${pts[i].y}`
  }

  const brushColor = stroke.tool === 'eraser' ? '#ffffff' : stroke.color
  const brushWidth = stroke.tool === 'eraser' ? stroke.width * 3 : stroke.width

  return new Path(svg, {
    stroke: brushColor,
    strokeWidth: brushWidth,
    fill: '',
    strokeLineCap: 'round',
    strokeLineJoin: 'round',
  })
}

export default function ReplayCanvas({ strokes, speed = 1 }: ReplayCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<Canvas | null>(null)
  const canvasIdRef = useRef(`replay-canvas-${Math.random().toString(36).slice(2, 9)}`)
  const animFrameRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const pauseOffsetRef = useRef<number>(0)
  const initAttemptRef = useRef(0)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const addedCountRef = useRef(0)

  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const speedRef = useRef(speed)
  const isPlayingRef = useRef(false)
  const isDisposedRef = useRef(false)

  const sortedStrokes = useMemo(() => {
    return [...strokes].sort((a, b) => a.timestamp - b.timestamp)
  }, [strokes])

  useEffect(() => {
    speedRef.current = speed
  }, [speed])

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  const getDuration = useCallback(() => {
    if (sortedStrokes.length === 0) return 0
    const ts = sortedStrokes.map(s => s.timestamp)
    return Math.max(ts[ts.length - 1] - ts[0], 0)
  }, [sortedStrokes])

  const resetCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || isDisposedRef.current) return
    canvas.clear()
    canvas.backgroundColor = '#ffffff'
    canvas.renderAll()
    addedCountRef.current = 0
    setProgress(0)
    pauseOffsetRef.current = 0
  }, [])

  const addStrokesUpTo = useCallback((elapsed: number) => {
    const canvas = canvasRef.current
    if (!canvas || isDisposedRef.current || sortedStrokes.length === 0) return

    const baseTs = sortedStrokes[0].timestamp
    const threshold = baseTs + elapsed

    let count = 0
    for (const stroke of sortedStrokes) {
      if (stroke.timestamp <= threshold) {
        count++
      } else {
        break
      }
    }

    if (count > addedCountRef.current) {
      for (let i = addedCountRef.current; i < count; i++) {
        const pathObj = buildPathFromStroke(sortedStrokes[i])
        pathObj.selectable = false
        pathObj.evented = false
        canvas.add(pathObj)
      }
      addedCountRef.current = count
      canvas.renderAll()
    }
  }, [sortedStrokes])

  const tick = useCallback(() => {
    if (!isPlayingRef.current || isDisposedRef.current) return

    const duration = getDuration()
    const elapsed = (Date.now() - startTimeRef.current) * speedRef.current
    const clamped = Math.min(elapsed, duration)

    addStrokesUpTo(clamped)
    setProgress(duration > 0 ? clamped / duration : 0)

    if (clamped >= duration) {
      setIsPlaying(false)
      return
    }

    animFrameRef.current = requestAnimationFrame(tick)
  }, [getDuration, addStrokesUpTo])

  useEffect(() => {
    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(tick)
    }
    return () => {
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [isPlaying, tick])

  const handlePlay = useCallback(() => {
    const duration = getDuration()
    if (duration === 0) return

    if (progress >= 1) {
      resetCanvas()
      pauseOffsetRef.current = 0
    }

    startTimeRef.current = Date.now() - pauseOffsetRef.current / speedRef.current
    setIsPlaying(true)
  }, [getDuration, progress, resetCanvas])

  const handlePause = useCallback(() => {
    const duration = getDuration()
    const elapsed = (Date.now() - startTimeRef.current) * speedRef.current
    pauseOffsetRef.current = Math.min(elapsed, duration)
    setIsPlaying(false)
  }, [getDuration])

  const handleReset = useCallback(() => {
    setIsPlaying(false)
    cancelAnimationFrame(animFrameRef.current)
    resetCanvas()
  }, [resetCanvas])

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const duration = getDuration()
    const seekTo = ratio * duration

    cancelAnimationFrame(animFrameRef.current)
    setIsPlaying(false)

    resetCanvas()
    if (seekTo > 0) {
      addStrokesUpTo(seekTo)
    }

    pauseOffsetRef.current = seekTo
    setProgress(ratio)
  }, [getDuration, resetCanvas, addStrokesUpTo])

  useEffect(() => {
    isDisposedRef.current = false
    addedCountRef.current = 0

    const initCanvas = () => {
      if (!containerRef.current || isDisposedRef.current) return
      if (canvasRef.current) return

      const el = containerRef.current
      const w = el.clientWidth
      const h = el.clientHeight

      if (w < 10 || h < 10) {
        initAttemptRef.current++
        if (initAttemptRef.current < 50) {
          requestAnimationFrame(initCanvas)
        }
        return
      }

      const canvasEl = document.createElement('canvas')
      canvasEl.id = canvasIdRef.current
      el.appendChild(canvasEl)

      const canvas = new Canvas(canvasIdRef.current, {
        width: w,
        height: h,
        backgroundColor: '#ffffff',
        selection: false,
        isDrawingMode: false,
      })

      canvasRef.current = canvas
    }

    initCanvas()

    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect
        const canvas = canvasRef.current
        if (!canvas) {
          initCanvas()
          return
        }
        if (newW > 10 && newH > 10) {
          canvas.setDimensions({ width: newW, height: newH })
          canvas.renderAll()
        }
      }
    })
    observer.observe(el)
    resizeObserverRef.current = observer

    return () => {
      isDisposedRef.current = true
      cancelAnimationFrame(animFrameRef.current)
      observer.disconnect()
      resizeObserverRef.current = null
      if (canvasRef.current) {
        canvasRef.current.dispose()
        canvasRef.current = null
      }
      const existing = el.querySelector(`#${canvasIdRef.current}`)
      if (existing) existing.remove()
      const lower = el.querySelector('.lower-canvas')
      if (lower) lower.remove()
      const upper = el.querySelector('.upper-canvas')
      if (upper) upper.remove()
    }
  }, [sortedStrokes])

  const duration = getDuration()
  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '300px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
          background: '#ffffff',
        }}
      />

      <div className="flex items-center gap-3 px-1">
        <button
          onClick={isPlaying ? handlePause : handlePlay}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
          disabled={sortedStrokes.length === 0}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        <button
          onClick={handleReset}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
          disabled={sortedStrokes.length === 0}
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div
          className="flex-1 h-2 bg-white/10 rounded-full cursor-pointer relative overflow-hidden"
          onClick={handleSeek}
        >
          <div
            className="h-full rounded-full transition-[width] duration-100"
            style={{
              width: `${progress * 100}%`,
              background: 'linear-gradient(90deg, #FF6B35, #FFD93D)',
            }}
          />
        </div>

        <span className="text-xs text-white/50 font-mono min-w-[3.5rem] text-right">
          {formatTime(progress * duration)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  )
}
