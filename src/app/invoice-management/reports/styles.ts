export const C = {
  navyBg:    '1E3A5F',
  navyText:  'FFFFFF',
  goldBg:    '9A7B38',
  goldText:  'FFFFFF',
  slateBg:   '475569',
  slateText: 'FFFFFF',
  lightBg:   'F8FAFC',
  zebraBg:   'F1F5F9',
  accentBg:  'EFF6FF',
  border:    'CBD5E1',
  softBorder:'E2E8F0',
  greenText: '059669',
  greenBg:   'ECFDF5',
  amberText: 'D97706',
  amberBg:   'FFFBEB',
  redText:   'DC2626',
  redBg:     'FEF2F2',
  blueText:  '1D4ED8',
  blueBg:    'DBEAFE',
};

export const thinBorder = (color = C.border) => ({
  style: 'thin' as const,
  color: { argb: 'FF' + color },
});

export const doubleBottomBorder = (color = C.navyBg) => ({
  top: thinBorder(C.border),
  bottom: { style: 'double' as const, color: { argb: 'FF' + color } },
  left: thinBorder(C.border),
  right: thinBorder(C.border),
});

export const borderAll = (color = C.border) => ({
  top: thinBorder(color),
  bottom: thinBorder(color),
  left: thinBorder(color),
  right: thinBorder(color),
});

export const numFmt = '#,##0;[Red](#,##0);"-"';
export const pctFmt = '+0.00%;-0.00%;0.00%';
export const pctPositiveFmt = '0.00%';
export const intFmt = '#,##0';

export function downloadBlob(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function createTitleHeader(
  ws: any,
  title: string,
  subtitle: string,
  totalCols: number
) {
  const colLetter = String.fromCharCode(64 + Math.min(totalCols, 26));

  // Row 1: Title
  ws.mergeCells(`A1:${colLetter}1`);
  const titleCell = ws.getCell('A1');
  titleCell.value = title;
  titleCell.font = { name: 'Georgia', bold: true, size: 14, color: { argb: 'FF' + C.navyBg } };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(1).height = 30;

  // Row 2: Subtitle
  ws.mergeCells(`A2:${colLetter}2`);
  const subCell = ws.getCell('A2');
  subCell.value = subtitle;
  subCell.font = { name: 'Arial', italic: true, size: 9.5, color: { argb: 'FF64748B' } };
  subCell.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(2).height = 18;

  // Row 3: Spacer
  ws.addRow([]);
}
