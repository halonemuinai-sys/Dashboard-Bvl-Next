import type { CrossingSalesData } from '@/services/dashboardService';

const STORES = ['Plaza Indonesia', 'Plaza Senayan', 'Bali'];

function roundToNiceNumber(val: number): number {
  if (val <= 0) return 1000000;
  const exponent = Math.floor(Math.log10(val));
  const fraction = val / Math.pow(10, exponent);
  let niceFraction = 10;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 5) niceFraction = 5;
  return niceFraction * Math.pow(10, exponent);
}

function formatYLabel(yVal: number): string {
  if (yVal >= 1000000000) return `Rp ${(yVal / 1000000000).toFixed(1)} M`;
  if (yVal >= 1000000)    return `Rp ${(yVal / 1000000).toFixed(0)} jt`;
  return `Rp ${yVal.toLocaleString('id-ID')}`;
}

export function generateLineGraphCanvas(allMonthData: CrossingSalesData[], year: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width  = 1000;
  canvas.height = 500;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const STORE_COLORS: Record<string, string> = {
    'Plaza Indonesia': '#8B5CF6',
    'Plaza Senayan':   '#D97706',
    'Bali':            '#2563EB',
  };

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const dataPoints: Record<string, number[]> = {
    'Plaza Indonesia': [],
    'Plaza Senayan':   [],
    'Bali':            [],
  };
  allMonthData.forEach(md => {
    STORES.forEach(store => { dataPoints[store].push(md.storeStats[store]?.adjusted || 0); });
  });

  const top = 60, bottom = 60, left = 120, right = 50;
  const graphWidth  = canvas.width  - left - right;
  const graphHeight = canvas.height - top  - bottom;

  let maxVal = 0;
  STORES.forEach(s => dataPoints[s].forEach(v => { if (v > maxVal) maxVal = v; }));
  const yAxisMax = roundToNiceNumber(maxVal * 1.15);

  ctx.strokeStyle = '#F1F5F9';
  ctx.lineWidth   = 1;
  ctx.font        = '12px Arial';
  ctx.textAlign   = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle   = '#64748B';

  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const ratio = i / yTicks;
    const yPos  = canvas.height - bottom - ratio * graphHeight;
    ctx.beginPath();
    ctx.moveTo(left, yPos);
    ctx.lineTo(canvas.width - right, yPos);
    ctx.stroke();
    ctx.fillText(formatYLabel(yAxisMax * ratio), left - 15, yPos);
  }

  const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const xSpacing = graphWidth / 11;
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle   = '#64748B';
  monthLabels.forEach((label, idx) => {
    const xPos = left + idx * xSpacing;
    ctx.fillText(label, xPos, canvas.height - bottom + 15);
    ctx.strokeStyle = '#CBD5E1';
    ctx.beginPath();
    ctx.moveTo(xPos, canvas.height - bottom);
    ctx.lineTo(xPos, canvas.height - bottom + 5);
    ctx.stroke();
  });

  STORES.forEach(store => {
    const color  = STORE_COLORS[store];
    const points = dataPoints[store];

    ctx.strokeStyle = color;
    ctx.lineWidth   = 3.5;
    ctx.lineJoin    = 'round';
    ctx.lineCap     = 'round';
    ctx.beginPath();
    points.forEach((val, idx) => {
      const xPos = left + idx * xSpacing;
      const yPos = canvas.height - bottom - (val / yAxisMax) * graphHeight;
      if (idx === 0) ctx.moveTo(xPos, yPos); else ctx.lineTo(xPos, yPos);
    });
    ctx.stroke();

    ctx.fillStyle   = '#FFFFFF';
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2.5;
    points.forEach((val, idx) => {
      const xPos = left + idx * xSpacing;
      const yPos = canvas.height - bottom - (val / yAxisMax) * graphHeight;
      ctx.beginPath();
      ctx.arc(xPos, yPos, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  });

  ctx.font        = 'bold 13px Arial';
  ctx.textAlign   = 'left';
  ctx.textBaseline = 'middle';
  let legendX = left;
  STORES.forEach(store => {
    const color = STORE_COLORS[store];
    ctx.fillStyle = color;
    ctx.fillRect(legendX, 20, 20, 10);
    ctx.fillStyle = '#1E293B';
    ctx.fillText(store, legendX + 28, 25);
    legendX += ctx.measureText(store).width + 70;
  });

  ctx.font      = 'bold 14px Arial';
  ctx.fillStyle = '#0F172A';
  ctx.textAlign = 'right';
  ctx.fillText(`Store Performance — Year ${year}`, canvas.width - right, 25);

  return canvas;
}

export function generateComparisonGraphCanvas(
  data2023: CrossingSalesData[],
  data2024: CrossingSalesData[],
  data2025: CrossingSalesData[],
  data2026: CrossingSalesData[],
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width  = 1000;
  canvas.height = 500;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const getMonthlyTotals = (dataset: CrossingSalesData[]) =>
    dataset.map(md => STORES.reduce((s, store) => s + (md.storeStats[store]?.adjusted || 0), 0));

  const totals2023 = getMonthlyTotals(data2023);
  const totals2024 = getMonthlyTotals(data2024);
  const totals2025 = getMonthlyTotals(data2025);
  const totals2026 = getMonthlyTotals(data2026);

  const top = 70, bottom = 60, left = 120, right = 50;
  const graphWidth  = canvas.width  - left - right;
  const graphHeight = canvas.height - top  - bottom;

  let maxVal = 0;
  [totals2023, totals2024, totals2025, totals2026].forEach(arr => {
    arr.forEach(v => { if (v > maxVal) maxVal = v; });
  });
  const yAxisMax = roundToNiceNumber(maxVal * 1.15);

  ctx.strokeStyle = '#F1F5F9';
  ctx.lineWidth   = 1;
  ctx.font        = '12px Arial';
  ctx.textAlign   = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle   = '#64748B';

  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const ratio = i / yTicks;
    const yPos  = canvas.height - bottom - ratio * graphHeight;
    ctx.beginPath();
    ctx.moveTo(left, yPos);
    ctx.lineTo(canvas.width - right, yPos);
    ctx.stroke();
    ctx.fillText(formatYLabel(yAxisMax * ratio), left - 15, yPos);
  }

  const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun'];
  const xSpacing = graphWidth / 5;
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle   = '#64748B';
  monthLabels.forEach((label, idx) => {
    const xPos = left + idx * xSpacing;
    ctx.fillText(label, xPos, canvas.height - bottom + 15);
    ctx.strokeStyle = '#CBD5E1';
    ctx.beginPath();
    ctx.moveTo(xPos, canvas.height - bottom);
    ctx.lineTo(xPos, canvas.height - bottom + 5);
    ctx.stroke();
  });

  const plotLine = (points: number[], color: string, isDashed: boolean, thickness: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth   = thickness;
    ctx.setLineDash(isDashed ? [6, 6] : []);
    ctx.beginPath();
    points.forEach((val, idx) => {
      const xPos = left + idx * xSpacing;
      const yPos = canvas.height - bottom - (val / yAxisMax) * graphHeight;
      if (idx === 0) ctx.moveTo(xPos, yPos); else ctx.lineTo(xPos, yPos);
    });
    ctx.stroke();

    ctx.fillStyle   = isDashed ? '#FFFFFF' : color;
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2;
    ctx.setLineDash([]);
    points.forEach((val, idx) => {
      const xPos = left + idx * xSpacing;
      const yPos = canvas.height - bottom - (val / yAxisMax) * graphHeight;
      ctx.beginPath();
      ctx.arc(xPos, yPos, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  };

  plotLine(totals2023, '#94A3B8', true,  2.5);
  plotLine(totals2024, '#F59E0B', true,  2.5);
  plotLine(totals2025, '#3B82F6', false, 3.5);
  plotLine(totals2026, '#8B5CF6', false, 4.5);

  ctx.font        = 'bold 12px Arial';
  ctx.textAlign   = 'left';
  ctx.textBaseline = 'middle';
  let legendX = left;
  const yearsConfig = [
    { label: '2023 Total', color: '#94A3B8', isDashed: true  },
    { label: '2024 Total', color: '#F59E0B', isDashed: true  },
    { label: '2025 Total', color: '#3B82F6', isDashed: false },
    { label: '2026 Total', color: '#8B5CF6', isDashed: false },
  ];
  yearsConfig.forEach(cfg => {
    ctx.strokeStyle = cfg.color;
    ctx.lineWidth   = cfg.isDashed ? 2.5 : 3.5;
    ctx.setLineDash(cfg.isDashed ? [4, 4] : []);
    ctx.beginPath();
    ctx.moveTo(legendX, 30);
    ctx.lineTo(legendX + 25, 30);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#0F172A';
    ctx.fillText(cfg.label, legendX + 30, 30);
    legendX += ctx.measureText(cfg.label).width + 75;
  });

  ctx.font      = 'bold 14px Arial';
  ctx.fillStyle = '#0F172A';
  ctx.textAlign = 'right';
  ctx.fillText('Jan-Jun Store Performance Comparison (2023 - 2026)', canvas.width - right, 30);

  return canvas;
}
