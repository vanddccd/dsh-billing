// dsh-billing 浏览器半：会话头部三胶囊（余额 + 本会话费用 + 峰谷时段），事件驱动更新。
// 数字动效 = NumberFlow 逐位滚动（odometer 式），只滚动值变化的位。
// 源码在本目录，构建产物 ../client.js —— 用 scripts/build.sh 重新构建，勿手改产物。
import { createElement as h, useCallback, useEffect, useRef, useState } from 'react'
import { Rolling } from './rolling'
import { rpc } from './rpc'
import { costFractionDigits, fmtCost, toNumber } from './format'
import { computeTide, fmtRemain, fmtRemainShort, type Tide, type TideRules } from './tide'
import BILLING_CSS from './pills.css'

const BILLING_CSS_ID = 'dsh-billing-pills'

/** 金额滚动结束后放行 tokens 的兜底延时：金额值未变（NumberFlow 不播动画）时用。 */
const TOKENS_FALLBACK_MS = 800

// ---- 样式注入（明暗模式用 DSH design token）----
if (typeof document !== 'undefined') {
  let tag = document.querySelector(`style[data-plugin-css="${BILLING_CSS_ID}"]`) as HTMLStyleElement | null
  if (!tag) {
    tag = document.createElement('style')
    tag.setAttribute('data-plugin', 'dsh-billing')
    tag.setAttribute('data-plugin-css', BILLING_CSS_ID)
    document.head.appendChild(tag)
  }
  tag.textContent = BILLING_CSS
}

// ---- 宿主数据类型（宽松声明，宿主字段可能随版本增减）----
type CostModel = {
  model: string
  priced?: boolean
  cost: number
  inputTokens: number
  cacheReadTokens: number
  outputTokens: number
}
type CostData = {
  cost: number
  totalTokens: number
  models?: CostModel[]
  pricingSource?: string
  pricingSyncedAt?: string
} | null
type BalInfo = { currency: string; totalBalance: string; toppedUpBalance: string; grantedBalance: string }
type BalData = { isAvailable?: boolean; infos?: BalInfo[] } | null

/**
 * 会话胶囊内容：金额先滚动 → tokens 紧随其后（链条时序）。
 *   - 切换会话（sessionId 变）：语境重置，tokens 归 0 起步，不残留上个会话
 *   - 同会话刷新：tokens 停在旧值等金额滚完，再从旧值滚到新值（不闪回 0）
 *   - 金额为 ¥0.00 / 失败：tokens 不动画（显示 0 / 不渲染）
 * 链条触发点从「按旧 pop-in 时长估算的 setTimeout」换成 NumberFlow 的
 * onAnimationsFinish（金额真实滚动结束），并保留兜底定时器覆盖「金额未变化」的情形。
 */
function SessionAmount({
  costData,
  costFailed,
  sessionId,
}: {
  costData: CostData
  costFailed: boolean
  sessionId: string | undefined
}) {
  const hasData = costData != null
  const currentTokens = hasData && !costFailed ? (costData as NonNullable<CostData>).totalTokens : 0
  const [tokensShown, setTokensShown] = useState(0)
  const pendingTokens = useRef(0)
  const lastSession = useRef(sessionId)

  useEffect(() => {
    if (lastSession.current !== sessionId) {
      lastSession.current = sessionId
      pendingTokens.current = 0
      setTokensShown(0)
      return
    }
    pendingTokens.current = currentTokens
    const cost = hasData ? (costData as NonNullable<CostData>).cost : 0
    if (costFailed || !hasData || !(cost > 0)) {
      setTokensShown(0)
      return
    }
    // 金额未触发滚动（值没变）时兜底放行 tokens。
    const timer = window.setTimeout(() => setTokensShown(pendingTokens.current), TOKENS_FALLBACK_MS)
    return () => window.clearTimeout(timer)
  }, [costData, costFailed, sessionId])

  const cost = hasData ? (costData as NonNullable<CostData>).cost : 0
  const amount: number | null = costFailed ? null : !hasData || !(cost > 0) ? 0 : cost
  const digits = amount === null ? 2 : costFractionDigits(amount)

  return (
    <span className="billing-amount">
      <span className="billing-money-slot">
        <Rolling
          value={amount}
          placeholder="—"
          prefix="¥"
          fractionDigits={digits}
          locales="zh-CN"
          onAnimationsFinish={() => setTokensShown(pendingTokens.current)}
        />
      </span>
      <span className="billing-tokens-slot">
        <Rolling
          value={costFailed ? null : tokensShown}
          placeholder=""
          prefix="("
          suffix=")"
          locales="en-US"
        />
      </span>
    </span>
  )
}

/**
 * 峰谷时段：**规则由宿主下发**（/billing/tide 的 windowsHours / weekendOffPeak / tz），
 * 客户端随分钟自算 isPeak 与「还剩 X」——这样时段一到点就翻转，不会因为
 * 缓存了宿主的 isPeak 而在跨过 12:00 / 18:00 后仍显示旧时段。
 *
 * 未拿到宿主规则时用内置兜底规则，且兜底规则与 host.js 的 DEFAULT_PEAK_WINDOWS 同源口径。
 * 会话切换/切回前台都会重取一次规则。
 */
function useTide(sessionId: string | undefined) {
  const [rules, setRules] = useState<TideRules | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let alive = true
    rpc('tide')
      .then((value) => {
        if (!alive || !value) return
        setRules({
          windowsHours: value.windowsHours,
          weekendOffPeak: value.weekendOffPeak,
          timezoneOffsetMinutes: value.timezoneOffsetMinutes,
        })
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [sessionId])

  // 每分钟推进一次当前时间，让「还剩 X」跟随变化，也保证时段到点翻转。
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60 * 1000)
    return () => window.clearInterval(timer)
  }, [])

  return computeTide(new Date(now), rules ?? undefined)
}

// ---- 三胶囊：余额 + 本会话费用 + 峰谷时段（会话头部静态区，order 为负）----
// 更新策略（按需触发，无空闲轮询）：
//  1. 轮次中：每完成 10 步刷新一次（跨过 10 的整数倍边界时）
//  2. 每轮结束（turn/end）：刷新一次，结算本轮的收尾步
//  3. 挂载 / 切换会话：立即刷新
//  4. 点击任意一个胶囊：立即刷新两个
//  5. 页面从后台切回可见：立即刷新一次
//  空闲时零请求。
function BillingPills(props: any) {
  const sessionId: string | undefined = props.sessionId
  const [costData, setCostData] = useState<CostData>(null)
  const [balData, setBalData] = useState<BalData>(null)
  const [costFailed, setCostFailed] = useState(false)
  const [balFailed, setBalFailed] = useState(false)
  // 两个端点各自独立序号：只丢弃"同端点"的过期响应，互不干扰
  const costEpochRef = useRef(0)
  const balEpochRef = useRef(0)

  const refreshCost = useCallback(async () => {
    if (!sessionId) return
    const epoch = ++costEpochRef.current
    try {
      const value = await rpc('cost', { sessionId })
      if (epoch !== costEpochRef.current) return // 丢弃过期响应
      setCostData(value)
      setCostFailed(false)
    } catch {
      if (epoch === costEpochRef.current) setCostFailed(true)
    }
  }, [sessionId])

  const refreshBalance = useCallback(async () => {
    const epoch = ++balEpochRef.current
    try {
      const value = await rpc('balance')
      if (epoch !== balEpochRef.current) return
      setBalData(value)
      setBalFailed(false)
    } catch {
      if (epoch === balEpochRef.current) setBalFailed(true)
    }
  }, [])

  const refreshAll = useCallback(() => {
    refreshCost()
    refreshBalance()
  }, [refreshCost, refreshBalance])

  // 挂载 / 切换会话：立即刷新
  useEffect(() => {
    setCostData(null)
    setCostFailed(false)
    refreshAll()
  }, [sessionId])

  // 轮次结束刷新：running 从 true → false 时结算本轮（新版快照无 turn/step，改用 running 判断）
  const running = typeof props.useSession === 'function' ? props.useSession((s: any) => s.running) : false
  const prevRunningRef = useRef(running)
  useEffect(() => {
    const wasRunning = prevRunningRef.current
    prevRunningRef.current = running
    if (wasRunning && !running) refreshAll()
  }, [running, refreshAll])

  // 页面从后台切回可见：立即刷新一次（非轮询）
  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) refreshAll()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [refreshAll])

  const cny = balData && balData.infos ? balData.infos.find((i) => i.currency === 'CNY') : undefined
  const usd = balData && balData.infos ? balData.infos.find((i) => i.currency === 'USD') : undefined
  // 峰谷时段：规则来自宿主 /billing/tide，客户端随分钟自算（见 useTide）
  const tide = useTide(sessionId)
  const tideLabel = tide.isPeak ? '高峰时段' : '低谷时段'
  const tideRemain = fmtRemain(tide.nextChangeHours)
  const tideSummary = `DeepSeek API 峰谷定价（北京时间）\n高峰时段：周一至周五 09:00–12:00、14:00–18:00；其余（含周末全天）为空闲时段。\n空闲价 = 高峰价的一半。`
  const tideTitle = tide.isPeak
    ? `目前为高峰时段。低谷价还要 ${tideRemain}。`
    : `当前为低谷时段。还有 ${tideRemain} 变更为高峰价。\n${tideSummary}`
  let balTitle = 'DeepSeek 账户余额（点击刷新）'
  if (cny) {
    balTitle = `DeepSeek 账户余额（点击刷新）\n人民币：总 ¥${cny.totalBalance}（充值 ¥${cny.toppedUpBalance}，赠金 ¥${cny.grantedBalance}）${balData?.isAvailable ? '' : '（当前不可用）'}`
    if (usd) balTitle += `\n美元：总 $${usd.totalBalance}（充值 $${usd.toppedUpBalance}，赠金 $${usd.grantedBalance}）`
  }

  let costTitle = '本会话 API 费用估算（官方单价）\n点击立即刷新'
  if (costData && costData.models && costData.models.length > 0) {
    const sourceLine =
      costData.pricingSource === 'online'
        ? `单价来源：官方在线同步${costData.pricingSyncedAt ? `（${new Date(costData.pricingSyncedAt).toLocaleString()}）` : ''}`
        : costData.pricingSource === 'builtin'
          ? '单价来源：内置默认（在线同步暂不可用，若官方改价可能失准）'
          : '单价来源：待宿主上报（若刚更新过插件，请重启 dsh web 后刷新页面）'
    costTitle = `本会话 API 费用估算（官方单价）\n${costData.models
      .map(
        (m) =>
          `${m.model}${m.priced ? '' : '（默认单价）'}：¥${fmtCost(m.cost)}（输入 ${m.inputTokens.toLocaleString()} + 缓存命中 ${m.cacheReadTokens.toLocaleString()} / 输出 ${m.outputTokens.toLocaleString()} tokens）`,
      )
      .join('\n')}\n合计 ¥${fmtCost(costData.cost)}\n${sourceLine}\n点击立即刷新`
  }

  return (
    <span className="billing-pills">
      <span className="billing-pill" title={balTitle} onClick={() => refreshAll()}>
        余额{' '}
        <b className={'billing-num' + (cny ? ' billing-ok' : '')}>
          <span className="billing-money-slot">
            <Rolling
              value={cny ? toNumber(cny.totalBalance) : null}
              placeholder={balFailed ? '—' : '…'}
              prefix="¥"
              fractionDigits={2}
              locales="zh-CN"
            />
          </span>
        </b>
      </span>
      <span
        className="billing-pill"
        title={costTitle}
        onClick={() => refreshAll()}
        style={costFailed ? { opacity: 0.45 } : undefined}
      >
        会话{' '}
        <b className="billing-num">
          <SessionAmount costData={costData} costFailed={costFailed} sessionId={sessionId} />
        </b>
      </span>
      <span
        className="billing-pill"
        title={tideTitle}
        onClick={() => refreshAll()}
      >
        {tideLabel} ·{' '}
        <b className={'billing-num ' + (tide.isPeak ? 'billing-warn' : 'billing-ok')}>
          {fmtRemainShort(tide.nextChangeHours)}
        </b>
      </span>
    </span>
  )
}

export function apply(ctx: any) {
  // conversation.session.header.actions：会话头部动作区（list 槽位；负数 order = 静态会话上下文）
  ctx.slots.inject('conversation.session.header.actions', () =>
    ctx.slots.register(
      { name: 'conversation.session.header.actions', id: 'billing-pills', order: -10 },
      BillingPills,
    ),
  )
}

export const inject = ['slots']
// 测试挂点（生产无副作用）
export const testHooks = { computeTide }
