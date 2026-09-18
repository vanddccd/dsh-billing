// dsh-billing 浏览器半：会话头部三胶囊（余额 + 本会话费用 + 峰谷时段），事件驱动更新。
// 数字动效 = NumberFlow 逐位滚动（odometer 式），只滚动值变化的位。
// 悬停明细 = **自定义浮层**（不再用原生 title：系统 tooltip 延迟约 1s、纯文本、暗色模式不可控）。
// 源码在本目录，构建产物 ../client.js —— 用 scripts/build.sh 重新构建，勿手改产物。
import { createElement as h, Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { Rolling } from './rolling'
import { rpc } from './rpc'
import { costFractionDigits, fmtCost, toNumber } from './format'
import { computeTide, fmtRemain, fmtRemainShort, type Tide, type TideRules } from './tide'
import BILLING_CSS from './pills.css'

const BILLING_CSS_ID = 'dsh-billing-pills'

/** 金额滚动结束后放行 tokens 的兜底延时：金额值未变（NumberFlow 不播动画）时用。 */
const TOKENS_FALLBACK_MS = 800

/** 余额低于该值（人民币）时把余额数字标红。改这里即可调整阈值。 */
const LOW_BALANCE_CNY = 5

/** 浮层显示延迟：够短以致不觉得卡，够长以致鼠标划过不误弹。 */
const POP_SHOW_DELAY_MS = 120
/** 浮层隐藏延迟：够短以致不粘手，够长以致能在胶囊与浮层之间移动而不闪。 */
const POP_HIDE_DELAY_MS = 90

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
  /** 该模型的请求次数（宿主 costPayload 上报）。 */
  steps?: number
  /** 该模型缓存命中省下的金额（推算值，宿主上报）。 */
  savedCost?: number
}
type CostData = {
  cost: number
  totalTokens: number
  models?: CostModel[]
  pricingSource?: string
  pricingSyncedAt?: string
  /** 聚合进来的子代理会话数（不含本会话）。 */
  subagentSessions?: number
  /** 日志读取失败、未计入的会话数。 */
  failedSessions?: number
  /** 缓存命中省下的金额（推算值，非账单值）。 */
  cacheSaved?: number
  /** 本次统计时刻，用于显示数据新鲜度。 */
  updatedAt?: number
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

// ---- 浮层（hover 明细）----

type PopKey = 'balance' | 'cost' | 'tide'

/**
 * 悬停/聚焦时展开的浮层容器。
 *
 * `billing-pop-slot` 是「桥接区」：它从胶囊底部一直延伸到浮层顶（padding-top 撑出视觉间隙），
 * 这样鼠标从胶囊移向浮层时不会经过非 hover 区，浮层就不会闪断。
 */
function Popover({ open, body }: { open: boolean; body: any }) {
  if (!open) return null
  return (
    <span className="billing-pop-slot">
      <span className="billing-pop" role="tooltip">
        {body}
      </span>
    </span>
  )
}

/** 缓存命中率 = 缓存命中 / (未命中输入 + 缓存命中)；分母为 0 时返回 null（不显示）。 */
function hitRate(m: CostModel): number | null {
  const denom = m.inputTokens + m.cacheReadTokens
  if (!Number.isFinite(denom) || denom <= 0) return null
  return (m.cacheReadTokens / denom) * 100
}

/** 图例用的短模型名：去掉 provider 前缀、deepseek- 前缀与 v4 / v4.1 版本段，过长再截断。 */
function shortModel(model: string): string {
  const bare = model.includes(':') ? model.slice(model.lastIndexOf(':') + 1) : model
  const short = bare.replace(/^deepseek-/, '').replace(/^v\d+(?:\.\d+)?-/, '')
  return short.length > 20 ? short.slice(0, 19) + '…' : short
}

/** 多模型占比条 + 内联图例。单模型时不渲染（恒为 100%，是噪声）。 */
function ShareBar({ models, total }: { models: CostModel[]; total: number }) {
  const pct = (m: CostModel) => (total > 0 ? (m.cost / total) * 100 : 0)
  return (
    <span className="billing-pop-share-wrap">
      <span className="billing-pop-share">
        {models.map((m, i) => (
          <i key={m.model + i} className={`billing-seg billing-seg-${Math.min(i, 3)}`} style={{ width: `${pct(m)}%` }} />
        ))}
      </span>
      <span className="billing-pop-lg">
        {models.map((m, i) => (
          <span key={m.model + i}>
            <i className={`billing-dot billing-seg-${Math.min(i, 3)}`} />
            {shortModel(m.model)} {pct(m).toFixed(1)}%
          </span>
        ))}
      </span>
    </span>
  )
}

/** 单个模型一行：模型名 + 金额，下行是请求次数与缓存命中率。 */
function ModelRow({ m }: { m: CostModel }) {
  const hit = hitRate(m)
  return (
    <span className="billing-pop-model">
      <span className="billing-pop-mrow">
        <span className="billing-pop-mname">
          {m.model}
          {m.priced ? '' : '（未配置单价，按兜底价估算）'}
        </span>
        <span className="billing-pop-mamt">¥{fmtCost(m.cost)}</span>
      </span>
      <span className="billing-pop-msub">
        {typeof m.steps === 'number' ? `${m.steps} 次请求` : '请求次数未知'}
        {hit === null ? null : (
          <>
            {' · 缓存命中 '}
            <b className="billing-pop-hit">{hit.toFixed(1)}%</b>
          </>
        )}
      </span>
    </span>
  )
}

/**
 * 会话费用浮层：分模型拆分 + 缓存节省 + 口径脚注。
 *
 * 缓存节省是**推算值**（命中 token 数 × 未命中价与命中价之差），由宿主算好下发——
 * 客户端只有金额与 token 数、没有单价，无法自行推算。
 */
function CostPopoverBody({ data }: { data: NonNullable<CostData> }) {
  const models = data.models ?? []
  if (models.length === 0) {
    return <span className="billing-pop-note">本会话暂无已记账的模型用量。</span>
  }
  const multi = models.length > 1
  const total = data.cost
  const saved = data.cacheSaved ?? 0
  const subagents = data.subagentSessions ?? 0
  const failed = data.failedSessions ?? 0
  const updated = typeof data.updatedAt === 'number' ? new Date(data.updatedAt).toLocaleTimeString() : null
  const source =
    data.pricingSource === 'online'
      ? `单价来源：官方在线同步${data.pricingSyncedAt ? `（${new Date(data.pricingSyncedAt).toLocaleString()}）` : ''}`
      : data.pricingSource === 'builtin'
        ? '单价来源：内置默认（在线同步不可用，若官方改价可能失准）'
        : '单价来源：待宿主上报（若刚更新过插件，请重启 dsh web 后刷新页面）'

  return (
    <>
      <span className="billing-pop-head">
        <span className="billing-pop-label">{multi ? `本会话费用 · ${models.length} 个模型` : '本会话费用'}</span>
        <span>
          <span className="billing-pop-amt">¥{fmtCost(total)}</span>
          <span className="billing-pop-tk">{data.totalTokens.toLocaleString()} tk</span>
        </span>
      </span>

      {multi ? <ShareBar models={models} total={total} /> : null}

      <span className="billing-pop-rule" />

      {models.map((m, i) => (
        <ModelRow key={m.model + i} m={m} />
      ))}

      {saved > 0 ? (
        <>
          <span className="billing-pop-rule" />
          <span className="billing-pop-save">
            <span className="billing-pop-save-lbl">缓存节省</span>
            <span>
              <span className="billing-pop-save-val">¥{fmtCost(saved)}</span>
              <span className="billing-pop-save-sub">未命中则需 ¥{fmtCost(total + saved)}</span>
            </span>
          </span>
        </>
      ) : null}

      <span className="billing-pop-foot">
        <span>
          {subagents > 0 ? `含 ${subagents} 个子代理会话` : '仅本会话'}
          {failed > 0 ? ` · ⚠️ ${failed} 个日志读取失败` : ''}
        </span>
        <span>{updated ? `${updated} 更新` : ''}</span>
      </span>
      <span className="billing-pop-source">{source}</span>
    </>
  )
}

/** 余额浮层：人民币 / 美元的总额、充值、赠金。 */
function BalancePopoverBody({ balData, cny, usd }: { balData: BalData; cny?: BalInfo; usd?: BalInfo }) {
  const row = (label: string, info: BalInfo, symbol: string) => (
    <span className="billing-pop-bal" key={label}>
      <span className="billing-pop-bal-head">
        <span>{label}</span>
        <span className="billing-pop-bal-total">
          {symbol}
          {info.totalBalance}
        </span>
      </span>
      <span className="billing-pop-bal-sub">
        充值 {symbol}
        {info.toppedUpBalance} · 赠金 {symbol}
        {info.grantedBalance}
      </span>
    </span>
  )
  return (
    <>
      <span className="billing-pop-head">
        <span className="billing-pop-label">账户余额</span>
        {balData?.isAvailable === false ? <span className="billing-pop-bad">当前不可用</span> : null}
      </span>
      {cny ? row('人民币 (CNY)', cny, '¥') : <span className="billing-pop-note">未返回人民币余额。</span>}
      {usd ? row('美元 (USD)', usd, '$') : null}
      <span className="billing-pop-foot">
        <span>点击胶囊立即刷新</span>
      </span>
    </>
  )
}

/** 峰谷浮层：当前时段 + 距切换时长 + 官方规则。 */
function TidePopoverBody({ tide, tideRemain }: { tide: Tide; tideRemain: string }) {
  return (
    <>
      <span className="billing-pop-head">
        <span className="billing-pop-label">DeepSeek API 峰谷定价</span>
        <span className={tide.isPeak ? 'billing-pop-warn' : 'billing-pop-hit'}>{tide.isPeak ? '高峰时段' : '低谷时段'}</span>
      </span>
      <span className="billing-pop-tide-line">
        {tide.isPeak ? `距转低谷还有 ${tideRemain}` : `距转高峰还有 ${tideRemain}`}
      </span>
      <span className="billing-pop-rule" />
      <span className="billing-pop-tide-rule">
        高峰：周一至周五 09:00–12:00、14:00–18:00（北京时间）
        <br />
        其余时段（含周末全天）为空闲；空闲价 = 高峰价的一半。
      </span>
      <span className="billing-pop-foot">
        <span>点击胶囊立即刷新</span>
      </span>
    </>
  )
}

// ---- 三胶囊：余额 + 本会话费用 + 峰谷时段（会话头部静态区，order 为负）----
// 更新策略（按需触发，无空闲轮询）：
//  1. 轮次结束（running 由 true → false）：刷新一次，结算本轮的收尾步
//  2. 挂载 / 切换会话：立即刷新
//  3. 点击任意一个胶囊：立即刷新两个
//  4. 页面从后台切回可见：立即刷新一次
//  5. 悬停展开浮层：不触发刷新（浮层只展示已有数据），点胶囊才刷新
//  注：当前新版会话快照只暴露 running、不暴露 turn/step，故「轮次中每 N 步刷新」
//     这条旧描述与实际能力不符，已从代码与 README 中移除。
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

  // ---- 浮层开关（带延迟，避免划过误弹 / 移向浮层时闪断）----
  const [openPop, setOpenPop] = useState<PopKey | null>(null)
  const showTimer = useRef<number | null>(null)
  const hideTimer = useRef<number | null>(null)

  const clearTimers = useCallback(() => {
    if (showTimer.current !== null) {
      window.clearTimeout(showTimer.current)
      showTimer.current = null
    }
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current)
      hideTimer.current = null
    }
  }, [])

  const showPop = useCallback(
    (key: PopKey) => {
      clearTimers()
      showTimer.current = window.setTimeout(() => setOpenPop(key), POP_SHOW_DELAY_MS)
    },
    [clearTimers],
  )

  const hidePop = useCallback(() => {
    clearTimers()
    hideTimer.current = window.setTimeout(() => setOpenPop(null), POP_HIDE_DELAY_MS)
  }, [clearTimers])

  // 卸载时清掉挂起的定时器，避免对已卸载组件 setState。
  useEffect(() => clearTimers, [clearTimers])

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

  // 余额状态：低余额标红（阈值见 LOW_BALANCE_CNY），接口报不可用时直接显示「不可用」。
  const cnyValue = cny ? toNumber(cny.totalBalance) : null
  const balUnavailable = balData?.isAvailable === false
  const balLow = !balUnavailable && cnyValue !== null && cnyValue < LOW_BALANCE_CNY
  const balClass = 'billing-num' + (balUnavailable ? '' : cnyValue === null ? '' : balLow ? ' billing-low' : ' billing-ok')

  const aria = (label: string, detail: string) => `${label}。悬停查看明细，点击立即刷新。${detail}`

  return (
    <span className="billing-pills" onMouseLeave={hidePop}>
      {/* 余额 */}
      <span
        className={'billing-pill' + (openPop === 'balance' ? ' billing-pill-open' : '')}
        onMouseEnter={() => showPop('balance')}
        onFocus={() => showPop('balance')}
        onBlur={hidePop}
        onClick={() => refreshAll()}
        tabIndex={0}
        role="button"
        aria-label={aria('DeepSeek 账户余额', cny ? `人民币总余额 ¥${cny.totalBalance}` : '')}
      >
        余额{' '}
        {balUnavailable ? (
          <b className="billing-num billing-warn">不可用</b>
        ) : (
          <b className={balClass}>
            <span className="billing-money-slot">
              <Rolling
                value={cnyValue}
                placeholder={balFailed ? '—' : '…'}
                prefix="¥"
                fractionDigits={2}
                locales="zh-CN"
              />
            </span>
          </b>
        )}
        <Popover open={openPop === 'balance'} body={<BalancePopoverBody balData={balData} cny={cny} usd={usd} />} />
      </span>

      {/* 会话费用 */}
      <span
        className={'billing-pill' + (openPop === 'cost' ? ' billing-pill-open' : '')}
        onMouseEnter={() => showPop('cost')}
        onFocus={() => showPop('cost')}
        onBlur={hidePop}
        onClick={() => refreshAll()}
        tabIndex={0}
        role="button"
        aria-label={aria('本会话 API 费用', costData ? `¥${fmtCost(costData.cost)}` : '')}
        style={costFailed ? { opacity: 0.45 } : undefined}
      >
        会话{' '}
        <b className="billing-num">
          <SessionAmount costData={costData} costFailed={costFailed} sessionId={sessionId} />
        </b>
        {costData ? (
          <Popover open={openPop === 'cost'} body={<CostPopoverBody data={costData} />} />
        ) : null}
      </span>

      {/* 峰谷时段 */}
      <span
        className={'billing-pill' + (openPop === 'tide' ? ' billing-pill-open' : '')}
        onMouseEnter={() => showPop('tide')}
        onFocus={() => showPop('tide')}
        onBlur={hidePop}
        onClick={() => refreshAll()}
        tabIndex={0}
        role="button"
        aria-label={aria(tideLabel, `距切换 ${tideRemain}`)}
      >
        {tideLabel} ·{' '}
        <b className={'billing-num ' + (tide.isPeak ? 'billing-warn' : 'billing-ok')}>
          {fmtRemainShort(tide.nextChangeHours)}
        </b>
        <Popover open={openPop === 'tide'} body={<TidePopoverBody tide={tide} tideRemain={tideRemain} />} />
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
// 测试挂点（生产无副作用）：
// 浮层三件套与两个纯函数单独导出，使其可脱离 NumberFlow 做渲染回归
// （NumberFlow 依赖 custom element 生命周期，jsdom 跑不起来）。
export const testHooks = {
  computeTide,
  hitRate,
  shortModel,
  CostPopoverBody,
  BalancePopoverBody,
  TidePopoverBody,
}
