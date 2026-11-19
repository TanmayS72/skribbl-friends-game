import { DrawAction, DrawPoint, StrokeAction, ShapeAction, FillAction } from '../types/game.js';

export const VIRTUAL_WIDTH = 1200;
export const VIRTUAL_HEIGHT = 900;

export class DrawingEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = VIRTUAL_WIDTH;
    this.canvas.height = VIRTUAL_HEIGHT;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      throw new Error('Canvas 2D context not supported');
    }
    this.ctx = context;
    this.initCanvas();
  }

  public initCanvas(): void {
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
  }

  public clear(): void {
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
  }

  /**
   * Translates client pointer coordinates (e.g. from mouse/touch) to virtual 1200x900 canvas coordinates.
   */
  public getVirtualCoords(clientX: number, clientY: number): DrawPoint {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = VIRTUAL_WIDTH / rect.width;
    const scaleY = VIRTUAL_HEIGHT / rect.height;

    const x = Math.round((clientX - rect.left) * scaleX);
    const y = Math.round((clientY - rect.top) * scaleY);

    return {
      x: Math.max(0, Math.min(VIRTUAL_WIDTH, x)),
      y: Math.max(0, Math.min(VIRTUAL_HEIGHT, y)),
    };
  }

  /**
   * Renders a single DrawAction.
   */
  public executeAction(action: DrawAction): void {
    if (action.type === 'clear') {
      this.clear();
      return;
    }

    if (action.type === 'stroke') {
      this.renderStroke(action);
      return;
    }

    if (action.type === 'shape') {
      this.renderShape(action);
      return;
    }

    if (action.type === 'fill') {
      this.floodFill(action.x, action.y, action.color);
      return;
    }
  }

  /**
   * Replays an entire array of draw actions (snapshot).
   */
  public replayHistory(actions: DrawAction[]): void {
    this.clear();
    for (const action of actions) {
      this.executeAction(action);
    }
  }

  /**
   * Smoothly draws a stroke segment or full stroke.
   */
  public renderStroke(stroke: StrokeAction): void {
    const points = stroke.points;
    if (points.length === 0) return;

    this.ctx.save();
    this.ctx.strokeStyle = stroke.tool === 'eraser' ? '#FFFFFF' : stroke.color;
    this.ctx.fillStyle = stroke.tool === 'eraser' ? '#FFFFFF' : stroke.color;
    this.ctx.lineWidth = stroke.size;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    if (points.length === 1) {
      // Single dot
      this.ctx.beginPath();
      this.ctx.arc(points[0].x, points[0].y, stroke.size / 2, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      this.ctx.beginPath();
      this.ctx.moveTo(points[0].x, points[0].y);

      for (let i = 1; i < points.length - 1; i++) {
        // Midpoint quadratic interpolation for silky smooth curved lines
        const midX = (points[i].x + points[i + 1].x) / 2;
        const midY = (points[i].y + points[i + 1].y) / 2;
        this.ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
      }

      const last = points[points.length - 1];
      this.ctx.lineTo(last.x, last.y);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  /**
   * Renders shapes: line, rectangle, circle.
   */
  public renderShape(shape: ShapeAction): void {
    this.ctx.save();
    this.ctx.strokeStyle = shape.color;
    this.ctx.lineWidth = shape.size;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    if (shape.tool === 'line') {
      this.ctx.beginPath();
      this.ctx.moveTo(shape.startX, shape.startY);
      this.ctx.lineTo(shape.endX, shape.endY);
      this.ctx.stroke();
    } else if (shape.tool === 'rectangle') {
      const width = shape.endX - shape.startX;
      const height = shape.endY - shape.startY;
      this.ctx.strokeRect(shape.startX, shape.startY, width, height);
    } else if (shape.tool === 'circle') {
      const rx = Math.abs(shape.endX - shape.startX) / 2;
      const ry = Math.abs(shape.endY - shape.startY) / 2;
      const cx = (shape.startX + shape.endX) / 2;
      const cy = (shape.startY + shape.endY) / 2;

      this.ctx.beginPath();
      this.ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  /**
   * High performance 32-bit typed-array BFS flood fill with zero object allocations in hot loop.
   */
  public floodFill(startX: number, startY: number, fillColorHex: string): void {
    const width = VIRTUAL_WIDTH;
    const height = VIRTUAL_HEIGHT;

    // Boundary clamp
    const sx = Math.max(0, Math.min(width - 1, Math.floor(startX)));
    const sy = Math.max(0, Math.min(height - 1, Math.floor(startY)));

    const imgData = this.ctx.getImageData(0, 0, width, height);
    const data32 = new Uint32Array(imgData.data.buffer);

    const targetColor32 = data32[sy * width + sx];
    const fillUint32 = hexToUint32(fillColorHex);

    if (targetColor32 === fillUint32) return;

    // Fast color component extraction
    const tr = targetColor32 & 0xFF;
    const tg = (targetColor32 >> 8) & 0xFF;
    const tb = (targetColor32 >> 16) & 0xFF;

    const matchesTarget = (color: number) => {
      const r = color & 0xFF;
      const g = (color >> 8) & 0xFF;
      const b = (color >> 16) & 0xFF;
      return (Math.abs(r - tr) + Math.abs(g - tg) + Math.abs(b - tb)) < 35;
    };

    // Pre-allocated flat Int32Array queue to eliminate all heap allocations
    const totalPixels = width * height;
    const queue = new Int32Array(totalPixels);
    const visited = new Uint8Array(totalPixels);

    let head = 0;
    let tail = 0;

    const startIdx = sy * width + sx;
    queue[tail++] = startIdx;
    visited[startIdx] = 1;

    while (head < tail) {
      const idx = queue[head++];
      data32[idx] = fillUint32;

      const x = idx % width;
      const y = (idx / width) | 0;

      // Check 4-connected neighbors without array allocations
      // East (x + 1)
      if (x + 1 < width) {
        const nidx = idx + 1;
        if (visited[nidx] === 0) {
          visited[nidx] = 1;
          if (matchesTarget(data32[nidx])) queue[tail++] = nidx;
        }
      }
      // West (x - 1)
      if (x - 1 >= 0) {
        const nidx = idx - 1;
        if (visited[nidx] === 0) {
          visited[nidx] = 1;
          if (matchesTarget(data32[nidx])) queue[tail++] = nidx;
        }
      }
      // South (y + 1)
      if (y + 1 < height) {
        const nidx = idx + width;
        if (visited[nidx] === 0) {
          visited[nidx] = 1;
          if (matchesTarget(data32[nidx])) queue[tail++] = nidx;
        }
      }
      // North (y - 1)
      if (y - 1 >= 0) {
        const nidx = idx - width;
        if (visited[nidx] === 0) {
          visited[nidx] = 1;
          if (matchesTarget(data32[nidx])) queue[tail++] = nidx;
        }
      }
    }

    this.ctx.putImageData(imgData, 0, 0);
  }
}

/**
 * Converts a hex string '#RRGGBB' to 32-bit ABGR/RGBA unsigned integer.
 */
function hexToUint32(hex: string): number {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const a = 255;
  // Little-endian Uint32 representation: AABBGGRR
  return (a << 24) | (b << 16) | (g << 8) | r;
}
