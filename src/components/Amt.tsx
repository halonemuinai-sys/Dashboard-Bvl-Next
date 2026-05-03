"use client";

import { formatCurrency, formatCompact } from '@/lib/utils';
import { useHideAmounts } from '@/lib/hide-amounts';

const MASK = '••••••';

interface Props {
  value: number;
  compact?: boolean;
  className?: string;
}

export default function Amt({ value, compact = false, className }: Props) {
  const { hidden } = useHideAmounts();
  const text = hidden ? MASK : compact ? formatCompact(value) : formatCurrency(value);
  return <span className={className}>{text}</span>;
}
