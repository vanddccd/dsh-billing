// ---- DeepSeek API 峰谷时段（北京时间 UTC+8）----
// 官方口径：高峰 = 北京时间**周一至周五** 09:00–12:00、14:00–18:00，其余（含周末全天）为空闲；
// 空闲价 = 高峰价的一半。
//
// 判定权在宿主（host.js rateAt / resolveTide），客户端经 /billing/tide 取 isPeak。
// 本文件只在「RPC 尚未返回或失败」时兜底自算，且窗口规则由宿主下发（TideRules），
// 避免客户端硬编码口径与宿主漂移。
const DEFAULT_TZ_OFFSET_MINUTES = 480
const DEFAULT_WINDOWS: ReadonlyArray<readonly [number, number]> = [[9, 12], [14, 18]]
const DAY_MS = 24 * 3600 * 1000

/** 宿主下发的峰谷规则（窗口单位为北京时间的「小时」）。 */
export type TideRules = {
  windowsHours?: ReadonlyArray<readonly [number, number]>
  weekendOffPeak?: boolean
  timezoneOffsetMinutes?: number
}

export const FALLBACK_RULES: TideRules = {
  windowsHours: DEFAULT_WINDOWS,
  weekendOffPeak: true,
  timezoneOffsetMinutes: DEFAULT_TZ_OFFSET_MINUTES,
}

export type Tide = { isPeak: boolean; nextChangeHours: number }

/** 转成目标时区的 (weekday, 当日分钟数)。weekday: 0=周日 … 6=周六。 */
function zonedParts(date: Date, rules?: TideRules): { weekday: number; minutes: number } {
  const offset = rules?.timezoneOffsetMinutes ?? DEFAULT_TZ_OFFSET_MINUTES
  const zoned = new Date(date.getTime() + offset * 60 * 1000)
  return { weekday: zoned.getUTCDay(), minutes: zoned.getUTCHours() * 60 + zoned.getUTCMinutes() }
}

function rulesOf(rules?: TideRules) {
  return {
    windows: rules?.windowsHours?.length ? rules.windowsHours : DEFAULT_WINDOWS,
    weekendOffPeak: rules?.weekendOffPeak ?? true,
  }
}

/**
 * 某时刻是否处于高峰。**分钟粒度**——窗口端点（12:00 / 18:00）为闭区间起点，
 * 只比小时会把 12:30 这类时刻判错档，一次请求就差一倍价。
 */
export function isPeakAt(date: Date, rules?: TideRules): boolean {
  const { windows, weekendOffPeak } = rulesOf(rules)
  const { weekday, minutes } = zonedParts(date, rules)
  if (weekendOffPeak && (weekday === 0 || weekday === 6)) return false
  return windows.some(([start, end]) => minutes >= start * 60 && minutes < end * 60)
}

/** 距下一次状态翻转（高峰↔低谷）的小时数；最多向后找 3 天。 */
export function nextChangeHours(date: Date, rules?: TideRules): number {
  const start = date.getTime()
  const current = isPeakAt(date, rules)
  const limit = start + 3 * DAY_MS
  for (let t = start + 60 * 1000; t < limit; t += 60 * 1000) {
    if (isPeakAt(new Date(t), rules) !== current) return (t - start) / 3600000
  }
  return 72
}

/** 计算时段状态：{ isPeak, nextChangeHours }。纯函数，供 UI 与单测共用。 */
export function computeTide(date: Date, rules?: TideRules): Tide {
  return { isPeak: isPeakAt(date, rules), nextChangeHours: nextChangeHours(date, rules) }
}

/** 完整文案用：>=1h 显示小时（一位小数），<1h 显示分钟。 */
export function fmtRemain(hours: number): string {
  if (hours < 1) {
    const m = Math.max(1, Math.round(hours * 60))
    return `${m} 分钟`
  }
  const r = Math.round(hours * 10) / 10
  return `${Number.isInteger(r) ? r : r.toFixed(1)} 小时`
}

/** 胶囊简写：>=1h 显示 `5.8h`，<1h 显示 `38m`。 */
export function fmtRemainShort(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`
  const r = Math.round(hours * 10) / 10
  return `${Number.isInteger(r) ? r : r.toFixed(1)}h`
}
