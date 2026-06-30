export const CHART_AXIS_TICK = { fontSize: 11, fill: '#9CA3AF' } as const;

export const CHART_GRID_PROPS = {
  strokeDasharray: '3 3',
  stroke: '#f0f0f0',
} as const;

export const CHART_TOOLTIP_STYLE = {
  borderRadius: '8px',
  border: '1px solid #E5E7EB',
  fontSize: '13px',
} as const;

export const CHART_LEGEND_STYLE = { fontSize: '12px' } as const;

export const CHART_MARGIN = { top: 5, right: 10, left: -10, bottom: 5 } as const;

export const PM25_CHART_COLOR = '#6366F1';
export const PM10_CHART_COLOR = '#F97316';

export function formatChartTooltip(value?: number, name?: string): [string, string] {
  return [`${value ?? 0} ug/m3`, name ?? ''];
}
