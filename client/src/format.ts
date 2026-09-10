/** 金额小数位规则：<0.01 四位、<1 三位、否则两位（与改造前保持一致）。 */
export function costFractionDigits(cost: number): number {
  if (!Number.isFinite(cost) || cost <= 0) return 2
  if (cost < 0.01) return 4
  if (cost < 1) return 3
  return 2
}

/** 纯文本金额（title 提示用，位数与胶囊一致）。 */
export function fmtCost(cost: number): string {
  if (!Number.isFinite(cost) || cost <= 0) return '0.00'
  return cost.toFixed(costFractionDigits(cost))
}

/** 接口金额可能是字符串（"12.34"）：转成 NumberFlow 可用的数字；非法值返回 null。 */
export function toNumber(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  if (typeof raw === 'string') {
    const n = Number.parseFloat(raw.replace(/,/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return null
}
