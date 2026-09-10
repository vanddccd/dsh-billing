import { createElement as h, useMemo } from 'react'
import NumberFlow from '@number-flow/react'

export type RollingProps = {
  /** null = 无数据：退化为 placeholder 纯文本。 */
  value: number | null
  /** 无数据时的占位（加载中 `…`、失败 `—`、不显示 `''`）。 */
  placeholder?: string
  prefix?: string
  suffix?: string
  /** 固定小数位；省略则用 Intl 默认（整数不带小数）。 */
  fractionDigits?: number
  locales?: string
  className?: string
  /** 本轮滚动结束回调（用于金额 → tokens 的链条时序）。 */
  onAnimationsFinish?: () => void
}

/**
 * 逐位滚动数字（NumberFlow，odometer 式）：只滚动值变化的位，未变的位静止。
 * 相比旧的「整串 pop-in」，反馈更克制，且位数变化时不会让整串重播。
 * 非数字态退化为纯文本，槽位宽度由 CSS 兜住，避免状态切换推动相邻元素。
 */
export function Rolling({
  value,
  placeholder = '…',
  prefix,
  suffix,
  fractionDigits,
  locales = 'en-US',
  className,
  onAnimationsFinish,
}: RollingProps) {
  // format 必须引用稳定：每次渲染新建对象会让 NumberFlow 重建 Intl formatter。
  const format = useMemo<Intl.NumberFormatOptions>(
    () =>
      fractionDigits == null
        ? {}
        : { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits },
    [fractionDigits],
  )

  if (value === null) return h('span', { className }, placeholder)

  return h(NumberFlow, {
    className,
    value,
    locales,
    format,
    prefix,
    suffix,
    onAnimationsFinish,
  })
}
