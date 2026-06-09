import { useRef, useEffect, useCallback } from 'react'
import { Canvas, PencilBrush, Path } from 'fabric'
import { StrokeData } from '../../shared/types'

interface DrawingCanvasProps {
  isDrawing: boolean
  strokes: StrokeData[]
  onDraw: (stroke: StrokeData) => void
  onClear: () => void
  onUndo: () => void
  color: string
  width: number
  tool: 'pen' | 'eraser'
  clearStrokes?: number
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

export default function DrawingCanvas({
  isDrawing,
  strokes,
  onDraw,
  color,
  width,
  tool,
  clearStrokes,
}: DrawingCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<Canvas | null>(null)
  const isDrawingRef = useRef(isDrawing)
  const onDrawRef = useRef(onDraw)
  const colorRef = useRef(color)
  const widthRef = useRef(width)
  const toolRef = useRef(tool)
  const isRedrawingRef = useRef(false)
  const initAttemptRef = useRef(0)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  useEffect(() => {
    isDrawingRef.current = isDrawing
  }, [isDrawing])

  useEffect(() => {
    onDrawRef.current = onDraw
  }, [onDraw])

  useEffect(() => {
    colorRef.current = color
  }, [color])

  useEffect(() => {
    widthRef.current = width
  }, [width])

  useEffect(() => {
    toolRef.current = tool
  }, [tool])

  const updateBrush = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const activeTool = toolRef.current
    const brushColor = activeTool === 'eraser' ? '#ffffff' : colorRef.current
    const brushWidth = activeTool === 'eraser' ? widthRef.current * 3 : widthRef.current

    const brush = new PencilBrush(canvas)
    brush.color = brushColor
    brush.width = brushWidth
    canvas.freeDrawingBrush = brush
  }, [])

  useEffect(() => {
    updateBrush()
  }, [color, width, tool, updateBrush])

  const initCanvas = useCallback(() => {
    if (!containerRef.current) return
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
    canvasEl.id = 'drawing-canvas'
    el.appendChild(canvasEl)

    const canvas = new Canvas('drawing-canvas', {
      width: w,
      height: h,
      backgroundColor: '#ffffff',
      selection: false,
      isDrawingMode: isDrawingRef.current,
    })

    const leftover = el.querySelector('canvas:not(.lower-canvas):not(.upper-canvas)')
    if (leftover) leftover.remove()

    const brush = new PencilBrush(canvas)
    brush.color = toolRef.current === 'eraser' ? '#ffffff' : colorRef.current
    brush.width = toolRef.current === 'eraser' ? widthRef.current * 3 : widthRef.current
    canvas.freeDrawingBrush = brush

    canvasRef.current = canvas

    canvas.on('path:created', (e: { path: Path }) => {
      if (isRedrawingRef.current) return

      const pathObj = e.path
      if (!pathObj || !isDrawingRef.current) {
        canvas.remove(pathObj)
        return
      }

      const commands = pathObj.path
      const points: { x: number; y: number }[] = []
      for (const cmd of commands) {
        if (cmd[0] === 'M' || cmd[0] === 'L') {
          points.push({ x: cmd[1] as number, y: cmd[2] as number })
        }
      }

      if (points.length < 2) return

      onDrawRef.current({
        type: 'path',
        points,
        color: colorRef.current,
        width: widthRef.current,
        tool: toolRef.current,
        timestamp: Date.now(),
      })
    })
  }, [])

  useEffect(() => {
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
      observer.disconnect()
      resizeObserverRef.current = null
      if (canvasRef.current) {
        canvasRef.current.dispose()
        canvasRef.current = null
      }
    }
  }, [initCanvas])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.isDrawingMode = isDrawing
    canvas.selection = false

    if (!isDrawing) {
      canvas.getObjects().forEach((obj) => {
        obj.selectable = false
        obj.evented = false
      })
    }
    canvas.renderAll()
  }, [isDrawing])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    isRedrawingRef.current = true
    canvas.clear()
    canvas.backgroundColor = '#ffffff'

    for (const stroke of strokes) {
      const pathObj = buildPathFromStroke(stroke)
      pathObj.selectable = false
      pathObj.evented = false
      canvas.add(pathObj)
    }
    canvas.renderAll()
    isRedrawingRef.current = false
  }, [strokes])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    isRedrawingRef.current = true
    canvas.clear()
    canvas.backgroundColor = '#ffffff'
    canvas.renderAll()
    isRedrawingRef.current = false
  }, [clearStrokes])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        cursor: isDrawing ? (tool === 'eraser' ? 'cell' : 'crosshair') : 'default',
      }}
    />
  )
}
