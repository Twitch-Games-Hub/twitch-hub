type Rank = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

interface RankColors {
  fill: string;
  border: string;
  highlight: string;
}

const RANK_COLORS: Record<Rank, RankColors> = {
  bronze: { fill: '#cd7f32', border: '#8b5a2b', highlight: '#daa06d' },
  silver: { fill: '#c0c0c0', border: '#808080', highlight: '#e8e8e8' },
  gold: { fill: '#ffd700', border: '#b8860b', highlight: '#fff8dc' },
  platinum: { fill: '#e5e4e2', border: '#a9a9a9', highlight: '#f8f8ff' },
  diamond: { fill: '#b9f2ff', border: '#4fc3f7', highlight: '#e0f7fa' },
};

const SIZE = 24;
const SCALE = 2; // Retina

/**
 * Draws a shield shape path on the canvas context.
 * Shield is centered and sized to fit within the given pixel size.
 */
function drawShieldPath(ctx: CanvasRenderingContext2D, s: number): void {
  const cx = s / 2;
  const top = s * 0.08;
  const bottom = s * 0.92;
  const midY = s * 0.6;
  const halfW = s * 0.4;

  ctx.beginPath();
  // Top edge
  ctx.moveTo(cx - halfW, top);
  ctx.lineTo(cx + halfW, top);
  // Right side curves down to point
  ctx.quadraticCurveTo(cx + halfW, midY, cx, bottom);
  // Left side curves from point back up
  ctx.quadraticCurveTo(cx - halfW, midY, cx - halfW, top);
  ctx.closePath();
}

/**
 * Draws chevron marks inside the shield based on rank tier.
 */
function drawChevrons(ctx: CanvasRenderingContext2D, s: number, rank: Rank): void {
  const cx = s / 2;
  const chevronCounts: Record<Rank, number> = {
    bronze: 1,
    silver: 2,
    gold: 3,
    platinum: 4,
    diamond: 5,
  };
  const count = chevronCounts[rank];
  const colors = RANK_COLORS[rank];

  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';

  const startY = s * 0.32;
  const spacing = s * 0.1;
  const halfW = s * 0.18;

  for (let i = 0; i < Math.min(count, 3); i++) {
    const y = startY + i * spacing;
    ctx.beginPath();
    ctx.moveTo(cx - halfW, y);
    ctx.lineTo(cx, y + spacing * 0.7);
    ctx.lineTo(cx + halfW, y);
    ctx.stroke();
  }

  // For platinum/diamond, add a small star at top
  if (count >= 4) {
    drawStar(ctx, cx, s * 0.24, s * 0.06, colors.border);
  }
  if (count >= 5) {
    drawStar(ctx, cx, s * 0.24, s * 0.08, colors.highlight);
  }
}

/**
 * Draws a small star shape.
 */
function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const outerX = cx + Math.cos(angle) * r;
    const outerY = cy + Math.sin(angle) * r;

    const innerAngle = angle + Math.PI / 5;
    const innerX = cx + Math.cos(innerAngle) * r * 0.4;
    const innerY = cy + Math.sin(innerAngle) * r * 0.4;

    if (i === 0) {
      ctx.moveTo(outerX, outerY);
    } else {
      ctx.lineTo(outerX, outerY);
    }
    ctx.lineTo(innerX, innerY);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * Renders a shield/chevron rank badge and returns a data URL.
 * Each badge is ~24px at 1x (48px at 2x for retina).
 */
export function renderInsignia(rank: Rank): string {
  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  canvas.width = SIZE * SCALE;
  canvas.height = SIZE * SCALE;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.scale(SCALE, SCALE);

  const colors = RANK_COLORS[rank];

  // Shield fill
  drawShieldPath(ctx, SIZE);
  ctx.fillStyle = colors.fill;
  ctx.fill();

  // Highlight gradient (top-left shine)
  drawShieldPath(ctx, SIZE);
  const grad = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  grad.addColorStop(0, colors.highlight + '80');
  grad.addColorStop(0.5, 'transparent');
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fill();

  // Border
  drawShieldPath(ctx, SIZE);
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Chevrons
  drawChevrons(ctx, SIZE, rank);

  return canvas.toDataURL('image/png');
}
