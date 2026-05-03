"use client";

import { formatCurrency, formatCompact, formatShort } from '@/lib/utils';
import { useHideAmounts } from '@/lib/hide-amounts';

const MASK = '••••••';

interface Props {
  value: number;
  compact?: boolean;
  short?: boolean;
  className?: string;
}

export default function Amt({ value, compact = false, short = false, className }: Props) {
  const { hidden } = useHideAmounts();
  const text = hidden ? MASK
    : short   ? formatShort(value)
    : compact  ? formatCompact(value)
    : formatCurrency(value);
  return <span className={className}>{text}</span>;
}
