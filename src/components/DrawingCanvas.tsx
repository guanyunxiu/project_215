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
  const strokesRef = useRef<StrokeData[]>(strokes)
  const isRedrawingRef = useRef(false)

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

  useEffect(() => {
    strokesRef.current = strokes
  }, [strokes])

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

  useEffect(() => {
    if (!containerRef.current) return

    const el = containerRef.current
    const canvasEl = document.createElement('canvas')
    el.appendChild(canvasEl)

    const canvas = new Canvas(canvasEl, {
      width: el.clientWidth,
      height: el.clientHeight,
      backgroundColor: '#ffffff',
      selection: false,
      isDrawingMode: isDrawing,
    })

    const brush = new PencilBrush(canvas)
    brush.color = tool === 'eraser' ? '#ffffff' : color
    brush.width = tool === 'eraser' ? width * 3 : width
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

    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return
      const w = containerRef.current.clientWidth
      const h = containerRef.current.clientHeight
      canvasRef.current.setDimensions({ width: w, height: h })
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      canvas.dispose()
      canvasRef.current = null
    }
  }, [])

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
