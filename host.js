// @ts-check
/**
 * dsh-deepseek-billing — DeepSeek Harness 插件
 *
 * 功能：
 *   /balance  查询 DeepSeek 账户余额（人民币优先，附美元）
 *   /cost     查看当前会话的 API 费用估算（人民币）
 *   工具 deepseek_billing —— 让模型自己也能查询余额 / 会话费用
 *
 * 定价：默认内置 DeepSeek 官方 API 单价（2026-08-17 起峰谷价、周末全天空闲价；
 * 2026-09-10 12:00 起 flash 系列降价），限时内测模型按定价系列匹配；
 * 可在 profile 的 cordis.patch.yml 里通过 config.pricing 覆盖。
 *
 * 无任何运行时依赖，直接以绝对路径加载。
 */

export const name = 'deepseek-billing'

/** 依赖的服务：命令注册表 + 工具注册表（凭据服务在调用时按需获取）。 */
export const inject = ['commands', 'tools']

const PUBLIC_BASE_URL = 'https://api.deepseek.com'
const DEFAULT_API_KEY_ENV = 'DEEPSEEK_API_KEY'
const CRED_REF_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/
const BEIJING_OFFSET_MINUTES = 480
const DEFAULT_PEAK_WINDOWS = [[9, 12], [14, 18]]

/**
 * 官方单价（人民币 / 百万 tokens），按「定价系列」组织。
 *
 * 历史沿革（北京时间）：
 *   2026-08-17 00:00 起改为峰谷分时计价：高峰 周一至周五 9:00–12:00、14:00–18:00，其余空闲。
 *   2026-08-23 起：周末（周六/周日）全天执行空闲价。
 *   2026-09-10 12:00 起：flash 系列降价（空闲 0.02/1/4，高峰翻倍 0.04/2/8，
 *     缓存命中降幅 60%）；pro 系列价格不变。
 *   2026-09-13 官方公告（价格页脚注 2）：原定 2026-09-14 的 V4 Pro 下线计划取消，
 *     **9 月 14 日之后继续提供 V4 Pro 服务、计费方式保持不变**（pro 价不动）。
 *
 * 官方按「系列」定价，故新模型（含改名后的 deepseek-flash、限时内测名）按系列匹配，
 * 不必等官方价格页收录——价格页只列在售模型。
 * 来源：https://api-docs.deepseek.com/zh-cn/quick_start/pricing/
 */
const FLASH_SERIES_RATES = [
  {
    effectiveAt: '2026-08-17T00:00:00+08:00',
    offPeak: { cacheHit: 0.05, cacheMiss: 1.5, output: 4.5 },
    peak: { cacheHit: 0.10, cacheMiss: 3.0, output: 9.0 },
  },
  {
    effectiveAt: '2026-09-10T12:00:00+08:00',
    offPeak: { cacheHit: 0.02, cacheMiss: 1.0, output: 4.0 },
    peak: { cacheHit: 0.04, cacheMiss: 2.0, output: 8.0 },
  },
]

const PRO_SERIES_RATES = [
  {
    effectiveAt: '2026-08-17T00:00:00+08:00',
    offPeak: { cacheHit: 0.15, cacheMiss: 4.5, output: 13.5 },
    peak: { cacheHit: 0.30, cacheMiss: 9.0, output: 27.0 },
  },
  // 2026-09-13 官方公告撤销下线：V4 Pro 9-14 之后继续服务、计费不变，故不再有切 flash 价的档。
]

/**
 * 定价系列锚点：系列匹配时取该模型条目的单价。
 * pro 锚点挂 PRO_SERIES_RATES（2026-09-13 官方公告撤销 V4 Pro 下线后即只有 pro 价一档）；
 * 用户若显式配置了 deepseek-v4-pro 的 pricing，则按字段级覆盖优先生效。
 */
const SERIES_ANCHOR = { flash: 'deepseek-flash', pro: 'deepseek-v4-pro' }

/**
 * 内置收录的模型 id（官方现行名 + 已下线但仍可调用的旧名）。
 *   2026-09-10 起官方推荐名 deepseek-flash；旧名 deepseek-v4-flash、
 *   deepseek-v4-flash-vision-exp 仍可调用，请求由 V4.1-Flash 提供服务、按 Flash 价计费。
 */
const SERIES_MODELS = {
  flash: [
    'deepseek-flash',
    'deepseek-v4-flash',
    'deepseek-v4-flash-vision-exp',
    'deepseek-v4.1-flash-expires-on-0910',
  ],
  pro: ['deepseek-v4-pro'],
}

/** 由价目表构造一条 schedule（峰谷窗口 + 周末空闲）。 */
function makeSchedule(effectiveAt, offPeak, peak) {
  return {
    effectiveAt,
    timezoneOffsetMinutes: BEIJING_OFFSET_MINUTES,
    peakWindows: DEFAULT_PEAK_WINDOWS.map((window) => [...window]),
    // 官方规则：周六/周日全天执行空闲价。
    weekendOffPeak: true,
    offPeak: { ...offPeak },
    peak: { ...peak },
  }
}

/** 由历史价目表构造模型条目：顶层扁平价 = 最新一档空闲价（无 schedule 时的基准）。 */
function buildSeriesEntry(rates) {
  const schedules = rates.map((rate) => makeSchedule(rate.effectiveAt, rate.offPeak, rate.peak))
  const latest = rates[rates.length - 1]
  return { ...latest.offPeak, schedules }
}

const DEFAULT_PRICING = {}
for (const model of SERIES_MODELS.flash) DEFAULT_PRICING[model] = buildSeriesEntry(FLASH_SERIES_RATES)
for (const model of SERIES_MODELS.pro) DEFAULT_PRICING[model] = buildSeriesEntry(PRO_SERIES_RATES)

/**
 * 旧模型：官方价格页已下架，仅历史会话可能命中，保留但**不随系列调价**（deprecated）。
 */
DEFAULT_PRICING['deepseek-chat'] = { cacheHit: 0.2, cacheMiss: 2, output: 3 }
DEFAULT_PRICING['deepseek-reasoner'] = { cacheHit: 1, cacheMiss: 4, output: 16 }

/**
 * 未识别模型的兜底单价：钉死在 pro 系列的最高价（宁可略高估，不可低估）。
 * 刻意**不**复用 PRO_SERIES_RATES——兜底价须独立于任何系列调价，
 * 将来 pro 系列若再降价，兜底价不跟随下调，避免把「未知模型」往低估方向带。
 * deepseek-* 的 flash/pro 系列模型走系列匹配，不会落到这里。
 */
const DEFAULT_FALLBACK_PRICE = buildSeriesEntry([
  {
    effectiveAt: '2026-08-17T00:00:00+08:00',
    offPeak: { cacheHit: 0.15, cacheMiss: 4.5, output: 13.5 },
    peak: { cacheHit: 0.30, cacheMiss: 9.0, output: 27.0 },
  },
])

const DEFAULT_CONFIG = {
  apiKeyEnv: DEFAULT_API_KEY_ENV,
  baseURL: PUBLIC_BASE_URL,
  fallbackPrice: DEFAULT_FALLBACK_PRICE,
  pricing: DEFAULT_PRICING,
}

// ---- 官方价格在线同步 ----
const DEFAULT_PRICE_SYNC = {
  enabled: true,
  url: 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing/',
  intervalMs: 12 * 60 * 60 * 1000,
  timeoutMs: 15000,
}

/**
 * 单元格文本规范化。用于**匹配**（不用于取值）：
 *   1. `<br>` 变体（`<br>`、`<br/>`、`<br />`）剥成空串——官方用 `<br>` 做指标列折行，
 *      若剥成空格会让「百万tokens输入（缓存命中）」匹配失败；
 *   2. 其余标签剥成空串；
 *   3. `&nbsp;` / 全角空格 / 连续空白折叠成单个半角空格，去首尾。
 */
function normalizeCell(html) {
  return String(html)
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;|&#160;|\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 把 HTML 解析成 {行: [单元格文本]} 的表格列表（剥掉标签，容忍空白）。 */
export function htmlTables(html) {
  const tables = []
  for (const table of html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)) {
    const rows = []
    for (const tr of table[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = []
      for (const cell of tr[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)) {
        cells.push(normalizeCell(cell[1]))
      }
      if (cells.length > 0) rows.push(cells)
    }
    if (rows.length > 0) tables.push(rows)
  }
  return tables
}

/**
 * 从表头单元格里取出模型 id，容忍官方页的脚注角标与排版噪声。
 *   官方写法：`deepseek-flash<sup>(1)</sup>` → `deepseek-flash(1)`
 *   历史上出现过：`deepseek-chat`、`deepseek-v4-pro*`、`deepseek-flash （1）`
 * 返回 null 表示该单元格不是模型列（如「模型」表头本身）。
 */
export function modelIdFromHeaderCell(cell) {
  const cleaned = normalizeCell(cell)
    .replace(/[（(]\s*\d*\s*[）)]/g, '') // 脚注角标 (1) （2）
    .replace(/\[\d+\]/g, '')
    .replace(/[*＊†‡]+/g, '')
    .trim()
    .toLowerCase()
  return /^deepseek-[a-z0-9][\w.-]*$/.test(cleaned) ? cleaned : null
}

function parseYuan(text) {
  const match = String(text).match(/([\d.]+)\s*元/)
  return match ? Number(match[1]) : NaN
}

/**
 * 解析官方价格页 HTML → { models: {id: {cacheHit, cacheMiss, output, schedules?}}, schedule? }。
 * 解析不到任何模型时返回 null（调用方回退内置默认）。
 */
export function parsePricingHtml(html) {
  const tables = htmlTables(html)
  const models = {}

  // 1. 找模型列顺序（表头行里的 deepseek-* 单元格，按出现顺序）。
  //    官方现行表头：`模型 | deepseek-flash(1) | deepseek-v4-pro(2)`——模型名自带脚注角标，
  //    故用 modelIdFromHeaderCell 归一化后再取，不能直接对整串做正则（历史上正是这里导致同步静默失效）。
  let modelOrder = []
  for (const rows of tables) {
    const header = rows[0] ?? []
    const cols = []
    for (const cell of header) {
      const id = modelIdFromHeaderCell(cell)
      if (id) cols.push(id)
    }
    if (cols.length > 0) { modelOrder = cols; break }
  }
  if (modelOrder.length === 0) return null

  // 2. 遍历行收集「指标 × 时段」价格。
  //    官方表格结构：指标列 rowspan=2，跨「空闲时段」「高峰时段」两行；
  //    htmlTables 不展开 rowspan，所以高峰行缺指标标签，靠「上一个指标」关联。
  const METRIC_LABELS = [
    ['百万tokens输入（缓存命中）', 'cacheHit'],
    ['百万tokens输入（缓存未命中）', 'cacheMiss'],
    ['百万tokens输出', 'output'],
  ]
  const offPeak = {} // model -> { cacheHit, cacheMiss, output }
  const peak = {}
  let currentMetric = null

  for (const rows of tables) {
    for (const row of rows) {
      // 单元格先归一化（统一全角括号/空格、剥标签），再与标签比对——
      // 官方指标列写作 `百万tokens输入<br>（缓存命中）`。
      const cells = row.map((c) => normalizeCell(c))
      for (const [label, field] of METRIC_LABELS) {
        if (cells.includes(label)) { currentMetric = field; break }
      }
      if (currentMetric === null) continue

      let target = null
      let priceStart = -1
      const idleIdx = cells.indexOf('空闲时段')
      const peakIdx = cells.indexOf('高峰时段')
      if (idleIdx >= 0) { target = offPeak; priceStart = idleIdx + 1 }
      else if (peakIdx >= 0) { target = peak; priceStart = peakIdx + 1 }
      if (target === null) continue

      for (let i = 0; i < modelOrder.length; i++) {
        const price = parseYuan(cells[priceStart + i])
        if (!Number.isFinite(price)) continue
        const model = modelOrder[i]
        if (!target[model]) target[model] = {}
        target[model][currentMetric] = price
      }
    }
  }

  // 3. 组装：每个模型必须同时有空闲价与高峰价，否则丢弃。
  //    这里只产出「当前价」，不写生效时间——生效时间由调用方按「首次观察到该价」决定，
  //    否则官方改价会回溯改写历史会话的成本。
  for (const model of modelOrder) {
    const off = offPeak[model]
    const pk = peak[model]
    if (!off || !pk) continue
    if (![off.cacheHit, off.cacheMiss, off.output].every(Number.isFinite)) continue
    if (![pk.cacheHit, pk.cacheMiss, pk.output].every(Number.isFinite)) continue
    models[model] = {
      offPeak: { cacheHit: off.cacheHit, cacheMiss: off.cacheMiss, output: off.output },
      peak: { cacheHit: pk.cacheHit, cacheMiss: pk.cacheMiss, output: pk.output },
    }
  }

  if (Object.keys(models).length === 0) return null
  return { models }
}

/** 深拷贝模型条目（避免 schedules 数组在多次合成间共享）。 */
function cloneEntry(entry) {
  const copy = { ...entry }
  if (Array.isArray(entry.schedules)) {
    copy.schedules = entry.schedules.map((sched) => ({
      ...sched,
      peakWindows: Array.isArray(sched.peakWindows) ? sched.peakWindows.map((w) => [...w]) : sched.peakWindows,
      offPeak: { ...sched.offPeak },
      peak: { ...sched.peak },
    }))
  }
  return copy
}

function sameRate(a, b) {
  if (!a || !b) return false
  return a.cacheHit === b.cacheHit && a.cacheMiss === b.cacheMiss && a.output === b.output
}

/**
 * 分层合成最终单价表：内置默认 ← 官方在线 ← 用户显式配置（字段级）。
 *
 * 在线同步到的价若与内置最新一档不同，就作为**新的一条 schedule 追加**，
 * 生效时间取「首次观察到该价的同步时刻」（observedAt），
 * 这样官方改价只影响之后的请求，不会回溯改写历史会话成本。
 *
 * @param {{models: Record<string, {offPeak: object, peak: object}>}|null} synced 在线解析结果（可为 null）
 * @param {object} [userPricing] 用户在配置里显式写的 pricing（原始值）
 * @param {number} [observedAt] 本次同步时刻（ms）；缺省用当前时间
 */
export function layerPricing(synced, userPricing, observedAt) {
  const next = {}
  for (const [model, entry] of Object.entries(DEFAULT_PRICING)) next[model] = cloneEntry(entry)

  if (synced?.models) {
    const observed = Number.isFinite(observedAt) ? observedAt : Date.now()
    for (const [model, entry] of Object.entries(synced.models)) {
      const existing = next[model]
      if (!existing) {
        // 官方价格页新收录的模型：无历史价，以同步时刻为起点建条目。
        next[model] = {
          ...entry.offPeak,
          schedules: [makeSchedule(new Date(observed).toISOString(), entry.offPeak, entry.peak)],
        }
        continue
      }
      const schedules = [...(existing.schedules ?? [])]
      // 官方价格页反映的是「此刻生效的价」，故与 observedAt 时刻生效的那一档比较，
      // 而不是与最新一档比较——内置表可能已预置未来的降价档。
      const active = schedules
        .filter((sched) => new Date(sched.effectiveAt).getTime() <= observed)
        .sort((a, b) => new Date(a.effectiveAt).getTime() - new Date(b.effectiveAt).getTime())
        .at(-1) ?? null
      if (active && sameRate(active.offPeak, entry.offPeak) && sameRate(active.peak, entry.peak)) continue
      // 页面价与已知档不符：以官方为准追加一条并从此刻接管，
      // 同时丢弃所有「预置的未来档」（它们基于公告或猜测，已被官方实际价证伪）。
      const kept = schedules.filter((sched) => new Date(sched.effectiveAt).getTime() <= observed)
      kept.push(makeSchedule(new Date(observed).toISOString(), entry.offPeak, entry.peak))
      next[model] = { ...existing, ...entry.offPeak, schedules: kept }
    }
  }

  for (const [model, entry] of Object.entries(userPricing ?? {})) {
    next[model] = { ...(next[model] ?? {}), ...entry }
  }
  return next
}

/** 合并用户配置：每个模型的 pricing 条目与内置默认值做字段级覆盖。 */
export function mergeConfig(config) {
  const raw = config && typeof config === 'object' ? config : {}
  const pricing = {}
  for (const [model, entry] of Object.entries(DEFAULT_PRICING)) {
    const userEntry = raw.pricing?.[model]
    pricing[model] = userEntry
      ? { ...cloneEntry(entry), ...userEntry }
      : cloneEntry(entry)
  }
  for (const [model, entry] of Object.entries(raw.pricing ?? {})) {
    if (!(model in pricing)) pricing[model] = { ...entry }
  }
  const fallbackPrice = raw.fallbackPrice
    ? { ...cloneEntry(DEFAULT_FALLBACK_PRICE), ...raw.fallbackPrice }
    : cloneEntry(DEFAULT_FALLBACK_PRICE)
  return {
    apiKeyEnv: typeof raw.apiKeyEnv === 'string' && raw.apiKeyEnv ? raw.apiKeyEnv : DEFAULT_API_KEY_ENV,
    baseURL: typeof raw.baseURL === 'string' && raw.baseURL ? raw.baseURL : PUBLIC_BASE_URL,
    fallbackPrice,
    pricing,
  }
}

/** 在 timeMs 时刻该模型适用的单价（含峰谷时段判断）。 */
export function rateAt(pricingEntry, timeMs) {
  let active = null
  for (const sched of pricingEntry?.schedules ?? []) {
    const effectiveAt = new Date(sched.effectiveAt).getTime()
    if (Number.isFinite(effectiveAt) && timeMs >= effectiveAt) {
      if (!active || effectiveAt > new Date(active.effectiveAt).getTime()) active = sched
    }
  }
  if (!active) return { rate: pricingEntry, mode: 'flat' }
  const offset = Number.isFinite(active.timezoneOffsetMinutes) ? active.timezoneOffsetMinutes : BEIJING_OFFSET_MINUTES
  const shifted = new Date(timeMs + offset * 60000)
  // 2026-08-23 起官方规则：周末（周六/周日）全天执行低谷价。
  const weekday = shifted.getUTCDay() // 0=周日 … 6=周六
  if (active.weekendOffPeak === true && (weekday === 0 || weekday === 6)) {
    return { rate: active.offPeak, mode: 'off-peak' }
  }
  // 峰谷判定必须精确到分钟：官方高峰结束时刻是整点闭区间（12:00、18:00），
  // 若只比小时会把 12:00/14:00/18:00 这类边界整点判错档，一次请求就差一倍价。
  const minutes = shifted.getUTCHours() * 60 + shifted.getUTCMinutes()
  const windows = Array.isArray(active.peakWindows) && active.peakWindows.length > 0
    ? active.peakWindows
    : DEFAULT_PEAK_WINDOWS
  const inPeak = windows.some(([start, end]) => minutes >= start * 60 && minutes < end * 60)
  return { rate: inPeak ? active.peak : active.offPeak, mode: inPeak ? 'peak' : 'off-peak' }
}

/**
 * 峰谷状态（供 Web UI 胶囊）。判定权在宿主，客户端只负责显示——
 * 客户端原本按 UTC+8 自行推算，一旦两边时区/规则口径不一致就会显示与实际计费不符的时段。
 *
 * @param {object} [pricingCtx] 当前定价上下文（含活跃模型的 schedules）
 * @param {number} [nowMs] 判定时刻，缺省取当前时间
 */
export function resolveTide(pricingCtx, nowMs) {
  const now = Number.isFinite(nowMs) ? nowMs : Date.now()
  const entry = resolvePricing('deepseek-flash', pricingCtx?.pricing ?? {})?.entry ?? pricingCtx?.fallbackPrice
  const { mode } = rateAt(entry, now)
  // flat 表示该价目没有峰谷档（不该发生，除非用户把 schedules 配没了）。
  // 此时返回 null，让客户端回退到内置规则自算——不能假装成「低谷」。
  if (mode === 'flat') {
    return { isPeak: null, mode, ...tideWindows(entry, now), updatedAt: now }
  }
  return {
    isPeak: mode === 'peak',
    mode,
    // 一并下发窗口与周末规则：客户端 RPC 失败时可按同一份窗口降级自算，避免硬编码口径漂移。
    ...tideWindows(entry, now),
    updatedAt: now,
  }
}

/** 取 now 时刻生效档的峰谷窗口（毫秒区间，用于客户端展示与兜底自算）。 */
function tideWindows(entry, now) {
  let active = null
  for (const sched of entry?.schedules ?? []) {
    const at = new Date(sched.effectiveAt).getTime()
    if (Number.isFinite(at) && now >= at && (!active || at > new Date(active.effectiveAt).getTime())) active = sched
  }
  if (!active) return { windowsHours: DEFAULT_PEAK_WINDOWS.map((w) => [...w]), weekendOffPeak: false, timezoneOffsetMinutes: BEIJING_OFFSET_MINUTES }
  return {
    windowsHours: (Array.isArray(active.peakWindows) && active.peakWindows.length > 0 ? active.peakWindows : DEFAULT_PEAK_WINDOWS).map((w) => [...w]),
    weekendOffPeak: active.weekendOffPeak === true,
    timezoneOffsetMinutes: Number.isFinite(active.timezoneOffsetMinutes) ? active.timezoneOffsetMinutes : BEIJING_OFFSET_MINUTES,
  }
}

function stepKey(turn, step) {
  return `${turn}:${step}`
}

/**
 * 从会话日志统计实际 token 用量（以 provider 上报的 usage 为准）。
 *
 * 每个 assistant/chunk 中的 usage 分片 = 一次模型请求的记账；
 * assistant/message.usage 只在没有 usage 分片时作为兜底（例如历史兼容）。
 * 失败的请求没有 assistant 消息，但其 usage 分片已持久化，会被计入。
 *
 * @param {any[]} events 会话事件日志数组（session-query 读取的完整日志）
 * @param {string} [keyPrefix] 聚合多个会话时给 stepKey 加前缀（如 `${sessionId}:`），
 *   防止跨会话 turn:step 撞车互相覆盖。
 * @returns {Map<string, {turn:number, step:number, time:number, usage:any, model:string|null}>}
 */
export function collectUsage(events, keyPrefix) {
  const prefix = typeof keyPrefix === 'string' ? keyPrefix : ''
  const steps = new Map()
  if (!Array.isArray(events)) return steps
  for (const event of events) {
    if (event.type === 'assistant/chunk') {
      const chunk = event.data?.chunk
      if (chunk?.type !== 'usage') continue
      const key = `${prefix}${stepKey(event.data.turn, event.data.step)}`
      let bucket = steps.get(key)
      if (!bucket) {
        bucket = { turn: event.data.turn, step: event.data.step, time: event.time, usage: null, model: null }
        steps.set(key, bucket)
      }
      const u = chunk.usage ?? {}
      const acc = bucket.usage ?? { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 }
      acc.inputTokens += u.inputTokens ?? 0
      acc.outputTokens += u.outputTokens ?? 0
      acc.cacheReadTokens += u.cacheReadTokens ?? 0
      bucket.usage = acc
    } else if (event.type === 'assistant/message') {
      const key = `${prefix}${stepKey(event.data.turn, event.data.step)}`
      let bucket = steps.get(key)
      if (!bucket) {
        bucket = { turn: event.data.turn, step: event.data.step, time: event.time, usage: null, model: null }
        steps.set(key, bucket)
      }
      const source = event.data.message?.source
      if (source?.model) bucket.model = `${source.provider ?? ''}:${source.model}`
      if (!bucket.usage && event.data.usage) bucket.usage = { ...event.data.usage }
    }
  }
  return steps
}

/**
 * 合并多个会话的 token 用量（跨会话聚合用）。
 *
 * 子代理会话是 fork 出来的，日志开头**物理复制**了继承的父会话事件
 * （对应 inheritedEventCount），直接相加会重复计费——每个会话只取
 * [inheritedEventCount:] 之后自己产生的事件。
 * stepKey 加会话 id 前缀，防止跨会话 turn:step 撞车互相覆盖。
 *
 * @param {Array<{sessionId: string, events: any[], inheritedEventCount?: number}>} entries
 * @returns {Map<string, object>} 前缀化 stepKey → 用量桶
 */
export function mergeLineageUsage(entries) {
  const steps = new Map()
  for (const entry of entries ?? []) {
    if (!entry?.sessionId) continue
    const events = Array.isArray(entry.events) ? entry.events : []
    const cut = Number.isFinite(entry.inheritedEventCount) && entry.inheritedEventCount > 0
      ? entry.inheritedEventCount
      : 0
    const own = cut > 0 ? events.slice(cut) : events
    for (const [key, bucket] of collectUsage(own, `${entry.sessionId}:`)) {
      steps.set(key, bucket)
    }
  }
  return steps
}

/**
 * 模型 id → 定价系列。官方按系列定价，故限时内测模型（如 deepseek-v4.1-flash-*）
 * 也能归到所属系列，不必等官方价格页收录。
 */
export function pricingSeries(bareModel) {
  const id = String(bareModel ?? '').toLowerCase()
  if (!id.startsWith('deepseek-')) return null
  if (id.includes('pro')) return 'pro'
  if (id.includes('flash')) return 'flash'
  return null
}

/**
 * 查模型单价条目：精确命中优先，否则按系列锚点匹配。
 * @returns {{entry: object, matched: 'exact'|'series'}|null}
 */
export function resolvePricing(bareModel, pricing) {
  if (bareModel && Object.prototype.hasOwnProperty.call(pricing, bareModel)) {
    return { entry: pricing[bareModel], matched: 'exact' }
  }
  const series = pricingSeries(bareModel)
  const anchor = series ? SERIES_ANCHOR[series] : null
  if (anchor && Object.prototype.hasOwnProperty.call(pricing, anchor)) {
    return { entry: pricing[anchor], matched: 'series' }
  }
  return null
}

/** 按模型聚合用量并计算费用（人民币）。 */
export function summarize(usageSteps, config, nowMs) {
  const byModel = new Map()
  for (const bucket of usageSteps.values()) {
    if (!bucket.usage) continue
    const model = bucket.model ?? '(unknown)'
    const bareModel = model === '(unknown)' ? model : (model.includes(':') ? model.slice(model.lastIndexOf(':') + 1) : model)
    let agg = byModel.get(model)
    if (!agg) {
      agg = { model, inputTokens: 0, cacheReadTokens: 0, outputTokens: 0, steps: 0, cost: 0, savedCost: 0, priced: false, matched: null }
      byModel.set(model, agg)
    }
    const input = bucket.usage.inputTokens ?? 0
    const cache = bucket.usage.cacheReadTokens ?? 0
    const output = bucket.usage.outputTokens ?? 0
    agg.inputTokens += input
    agg.cacheReadTokens += cache
    agg.outputTokens += output
    agg.steps += 1
    const resolved = resolvePricing(bareModel, config.pricing)
    const { rate } = rateAt(resolved?.entry ?? config.fallbackPrice, bucket.time ?? nowMs)
    agg.cost += (input * (rate.cacheMiss ?? 0) + cache * (rate.cacheHit ?? 0) + output * (rate.output ?? 0)) / 1e6
    // 缓存命中省下的钱（**推算值**，非账单值）：命中 token 数 ×（未命中价 − 命中价）。
    // 口径假设「这些 token 若未命中会按未命中价计费」；官方实际扣费以账单为准。
    // 客户端拿不到单价，无法自行推算，故必须由宿主算好随 costPayload 下发。
    agg.savedCost += (cache * Math.max(0, (rate.cacheMiss ?? 0) - (rate.cacheHit ?? 0))) / 1e6
    if (resolved) {
      agg.priced = true
      agg.matched = agg.matched ?? resolved.matched
    }
  }
  return [...byModel.values()].sort((a, b) => a.model.localeCompare(b.model))
}

function fmtMoney(cny) {
  return cny < 0.01 && cny > 0 ? cny.toFixed(4) : cny.toFixed(2)
}

/** 会话费用文本（人民币）。usage = lineageUsage 聚合结果；pricingCtx = { pricing, fallbackPrice, source, syncedAt }。 */
export function formatCostText(usage, pricingCtx) {
  const steps = usage?.steps ?? new Map()
  const nowMs = Date.now()
  const rows = summarize(steps, pricingCtx, nowMs)
  if (rows.length === 0) {
    return '本会话（含子代理）目前没有已记账的模型用量（assistant/usage 记录）。'
  }
  const sub = Math.max(0, (usage?.sessions ?? 1) - 1)
  const lines = [
    sub > 0 ? '📊 本会话 API 费用估算（含子代理，按官方单价，人民币）' : '📊 本会话 API 费用估算（按官方单价，人民币）',
    '',
  ]
  let total = 0
  let saved = 0
  for (const row of rows) {
    const tokens = row.inputTokens + row.cacheReadTokens + row.outputTokens
    total += row.cost
    saved += row.savedCost ?? 0
    lines.push(
      `• ${row.model}${row.priced ? '' : '（未配置单价，按 fallbackPrice 估算）'}`,
      `    输入 ${row.inputTokens.toLocaleString()} + 缓存命中 ${row.cacheReadTokens.toLocaleString()} / 输出 ${row.outputTokens.toLocaleString()} tokens（${row.steps} 次请求）`,
      `    费用 ¥${fmtMoney(row.cost)}`,
    )
  }
  lines.push('', `合计：¥${fmtMoney(total)}`)
  if (saved > 0) {
    lines.push(
      `缓存命中省下约 ¥${fmtMoney(saved)}（推算值，非账单值：命中 token 数 × 未命中价与命中价之差；若这些 token 全部未命中，则需约 ¥${fmtMoney(total + saved)}）。`,
    )
  }
  lines.push('', '说明：按每次请求实际计费时间套用单价（2026-08-17 起峰谷价、周末全天空闲价；2026-09-10 12:00 起 flash 系列降价）。')
  if (sub > 0) {
    lines.push(`口径：本会话 + ${sub} 个子代理会话；子代理日志中 fork 继承的父会话事件已剔除，不重复计费。`)
  }
  if (usage?.failed > 0) {
    lines.push(`⚠️ 另有 ${usage.failed} 个会话的事件日志读取失败（非「未落盘」类），未计入。`)
  }
  if (usage?.missing > 0) {
    lines.push(`另有 ${usage.missing} 个已结束的会话无法计入：dsh 现在只写投影缓存，事件日志不再落盘。`)
  }
  const src = pricingCtx?.source === 'online'
    ? `单价来源：官方在线同步${pricingCtx.syncedAt ? `（${new Date(pricingCtx.syncedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}）` : ''}`
    : '单价来源：内置默认（官方在线同步不可用，若官方改价请手动更新配置）'
  lines.push('', src)
  return lines.join('\n')
}

/** 余额文本（人民币优先，附美元）。 */
export function formatBalanceText(payload) {
  if (!payload || !Array.isArray(payload.balance_infos)) {
    return '余额接口返回了无法识别的数据。'
  }
  const infos = payload.balance_infos
  const order = ['CNY', 'USD']
  const sorted = [...infos].sort((a, b) => order.indexOf(a.currency) - order.indexOf(b.currency))
  const lines = ['💰 DeepSeek 账户余额', `账户可用：${payload.is_available ? '是' : '否'}`, '']
  for (const info of sorted) {
    const label = info.currency === 'CNY' ? '人民币 (CNY)' : info.currency === 'USD' ? '美元 (USD)' : info.currency
    const symbol = info.currency === 'CNY' ? '¥' : '$'
    lines.push(
      `${label}`,
      `  总余额：${symbol}${info.total_balance}`,
      `  充值余额：${symbol}${info.topped_up_balance}`,
      `  赠金余额：${symbol}${info.granted_balance}`,
      '',
    )
  }
  return lines.join('\n').trimEnd()
}

function withTimeout(signal, ms) {
  if (typeof AbortSignal.any === 'function') {
    const signals = [signal, AbortSignal.timeout(ms)].filter((s) => s instanceof AbortSignal)
    return AbortSignal.any(signals)
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error('request timed out')), ms)
  const onAbort = () => controller.abort(signal?.reason)
  signal?.addEventListener('abort', onAbort, { once: true })
  controller.signal.addEventListener('abort', () => {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }, { once: true })
  return controller.signal
}

export function apply(ctx, config) {
  const cfg = mergeConfig(config)

  if (!CRED_REF_PATTERN.test(cfg.apiKeyEnv)) {
    throw new TypeError(`deepseek-billing: apiKeyEnv "${cfg.apiKeyEnv}" 不是合法的凭据引用（POSIX 环境变量名）`)
  }

  // ---- 单价状态：内置默认 ← 官方在线同步 ← 用户显式配置 ----
  const priceSync = { ...DEFAULT_PRICE_SYNC, ...(config?.priceSync ?? {}) }
  const userPricing = config?.pricing
  let current = {
    pricing: cfg.pricing,
    fallbackPrice: cfg.fallbackPrice,
    source: 'builtin',
    syncedAt: null,
  }

  /** 从官方价格页拉取并更新单价表；失败保持现状（回退内置/上次成功值）。 */
  async function syncPrices() {
    try {
      const response = await fetch(priceSync.url, { signal: withTimeout(undefined, priceSync.timeoutMs) })
      if (!response.ok) throw new Error(`价格页返回 HTTP ${response.status}`)
      const observedAt = Date.now()
      const parsed = parsePricingHtml(await response.text())
      if (!parsed) throw new Error('价格页解析不到任何模型价格')
      current = {
        // observedAt 作为「首次观察到该价」的生效时间：官方改价只影响之后的请求，不回溯历史会话。
        pricing: layerPricing(parsed, userPricing, observedAt),
        fallbackPrice: cfg.fallbackPrice,
        source: 'online',
        syncedAt: observedAt,
      }
      ctx.logger?.info?.('deepseek-billing: 官方单价已同步（%d 个模型）', Object.keys(parsed.models).length)
      return true
    } catch (error) {
      ctx.logger?.warn?.('deepseek-billing: 官方单价同步失败，继续使用%s：%s', current.source === 'online' ? '上次在线值' : '内置默认值', error instanceof Error ? error.message : String(error))
      return false
    }
  }
  if (priceSync.enabled) {
    // 启动即同步一次（不阻塞）；失败按 60s→2min→…→30min 退避重试，成功后回到常规周期
    let retryDelay = 60 * 1000
    let timer = null
    const schedule = (delay) => {
      if (timer !== null) clearTimeout(timer)
      timer = setTimeout(() => {
        syncPrices().then((ok) => {
          if (ok) retryDelay = 60 * 1000
          else retryDelay = Math.min(retryDelay * 2, 30 * 60 * 1000)
          schedule(ok ? priceSync.intervalMs : retryDelay)
        })
      }, delay)
    }
    syncPrices().then((ok) => schedule(ok ? priceSync.intervalMs : retryDelay))
    ctx.effect(() => () => {
      if (timer !== null) clearTimeout(timer)
    })
  }

  /** 解析 API key：凭据服务优先，环境变量兜底（与官方适配器一致）。 */
  async function resolveApiKey() {
    const credentials = ctx.get('credentials')
    if (credentials) {
      const hit = await credentials.resolve(cfg.apiKeyEnv)
      if (hit && hit.value) return hit.value
    }
    const ambient = process.env[cfg.apiKeyEnv]
    if (ambient) return ambient
    return undefined
  }

  async function fetchBalance(signal) {
    const apiKey = await resolveApiKey()
    if (!apiKey) {
      throw new Error(`未找到 API Key（凭据引用 ${cfg.apiKeyEnv} 未配置，也没有同名环境变量）。请在 Web 的模型设置页保存密钥。`)
    }
    const baseURL = process.env.DEEPSEEK_BASE_URL || cfg.baseURL
    const url = new URL('/user/balance', baseURL.endsWith('/') ? baseURL : baseURL + '/')
    const response = await fetch(url, {
      method: 'GET',
      headers: { authorization: `Bearer ${apiKey}` },
      signal: await withTimeout(signal, 15000),
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`余额接口返回 HTTP ${response.status}：${detail.slice(0, 200) || response.statusText}`)
    }
    return response.json()
  }

  /** 结构化余额数据（供 Web UI 悬浮胶囊渲染）。 */
  async function balancePayload(signal) {
    const raw = await fetchBalance(signal)
    return {
      isAvailable: raw?.is_available === true,
      infos: (raw?.balance_infos ?? []).map((info) => ({
        currency: info.currency,
        totalBalance: info.total_balance,
        grantedBalance: info.granted_balance,
        toppedUpBalance: info.topped_up_balance,
      })),
      updatedAt: Date.now(),
    }
  }

  /** 结构化会话费用数据（供 Web UI 会话头部渲染）。usage = lineageUsage 聚合结果。 */
  function costPayload(usage) {
    const rows = summarize(usage?.steps ?? new Map(), current, Date.now())
    return {
      cost: rows.reduce((sum, row) => sum + row.cost, 0),
      totalTokens: rows.reduce((sum, row) => sum + row.inputTokens + row.cacheReadTokens + row.outputTokens, 0),
      // 缓存命中省下的金额（推算值）；「未命中则需」= cost + cacheSaved
      cacheSaved: rows.reduce((sum, row) => sum + row.savedCost, 0),
      models: rows.map((row) => ({
        model: row.model,
        cost: row.cost,
        inputTokens: row.inputTokens,
        cacheReadTokens: row.cacheReadTokens,
        outputTokens: row.outputTokens,
        steps: row.steps,
        savedCost: row.savedCost,
        priced: row.priced,
      })),
      subagentSessions: Math.max(0, (usage?.sessions ?? 0) - 1),
      failedSessions: usage?.failed ?? 0,
      /** 已结束、事件日志未落盘因而无法计入的会话数（正常现象，与 failedSessions 区分）。 */
      missingSessions: usage?.missing ?? 0,
      pricingSource: current.source,
      pricingSyncedAt: current.syncedAt,
      updatedAt: Date.now(),
    }
  }

  /** 已上报过的失败会话 id：同一会话只报一次，避免每次 RPC 都刷屏 stderr。 */
  const reportedReadFailures = new Set()

  /**
   * 「事件日志不存在」与「日志真的读坏」必须分开。
   *
   * dsh 现在只写投影缓存（`~/.dsh/storages/session_projcache/`），事件日志不再落盘，
   * 所以**已结束的会话回读必然失败** —— 这是正常现象，不该报警；
   * 只有文件损坏 / 权限 / 解析失败才是真问题。
   */
  function isMissingLogError(detail) {
    return /ENOENT|no such file|not found|不存在|未找到|missing/i.test(String(detail))
  }

  /** 失败去重上报。ctx.logger 在本插件上下文里实测不落盘，故一律同时写 stderr 兜底。 */
  function reportReadFailure(id, detail) {
    if (reportedReadFailures.has(id)) return
    reportedReadFailures.add(id)
    const line = `[dsh-billing] 会话 ${id} 的事件日志不可读：${detail}`
    try { ctx.logger?.warn?.(line) } catch { /* logger 不可用不影响主流程 */ }
    try { process.stderr.write(line + '\n') } catch { /* 同上 */ }
  }

  /** 递归展平后代树为会话 id 列表（防环、防重复）。 */
  function flattenDescendants(node, acc, seen) {
    const id = String(node?.session?.header?.id ?? '')
    if (!id || seen.has(id)) return
    seen.add(id)
    acc.push(id)
    for (const child of node?.descendants ?? []) flattenDescendants(child, acc, seen)
  }

  /**
   * 聚合「本会话 + 全部子代理后代会话」的 token 用量。
   *
   * 通过 sessionQuery.traceSession 拿完整后代树（含孙代理）；每个会话读日志后按
   * inheritedEventCount 切片去重（子代理日志物理复制了 fork 继承的父会话事件）。
   * traceSession 不可用或失败时降级为只统计本会话；单个子会话读取失败跳过并计数，
   * 绝不因个别损坏会话拖垮整体。
   *
   * @returns {Promise<{steps: Map<string, object>, sessions: number, failed: number, missing: number, ownReadable: boolean}>}
   */
  async function lineageUsage(sessionId) {
    const empty = { steps: new Map(), sessions: 0, failed: 0, missing: 0, ownReadable: false }
    if (typeof sessionId !== 'string' || sessionId === '') return empty
    const sessionQuery = ctx.get('sessionQuery')
    if (!sessionQuery || typeof sessionQuery.readSession !== 'function') return empty

    const ids = [sessionId]
    const seen = new Set([sessionId])
    if (typeof sessionQuery.traceSession === 'function') {
      try {
        const trace = await sessionQuery.traceSession(sessionId)
        for (const child of trace?.descendants ?? []) flattenDescendants(child, ids, seen)
      } catch (error) {
        ctx.logger?.warn?.('deepseek-billing: 会话谱系查询失败，降级只统计本会话：%s', error instanceof Error ? error.message : String(error))
      }
    }

    const entries = []
    let sessions = 0
    let failed = 0
    let missing = 0
    let ownReadable = false
    for (const id of ids) {
      let snapshot
      try {
        snapshot = await sessionQuery.readSession(id)
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error)
        if (isMissingLogError(detail)) {
          // 已结束的会话、事件日志未落盘 —— 正常现象，只计数不报警
          missing += 1
        } else {
          failed += 1
          reportReadFailure(id, detail)
        }
        continue
      }
      entries.push({ sessionId: id, events: snapshot?.events, inheritedEventCount: snapshot?.inheritedEventCount })
      sessions += 1
      if (id === sessionId) ownReadable = true
    }
    return { steps: mergeLineageUsage(entries), sessions, failed, missing, ownReadable }
  }

  // ---- 命令：/balance ----
  ctx.commands.register({
    name: 'balance',
    description: '查询 DeepSeek 账户余额（人民币优先，附美元）',
    handler: async ({ signal }) => {
      try {
        const payload = await fetchBalance(signal)
        return { kind: 'success', text: formatBalanceText(payload) }
      } catch (error) {
        return { kind: 'error', text: `查询余额失败：${error instanceof Error ? error.message : String(error)}` }
      }
    },
  })

  // ---- 命令：/cost ----
  ctx.commands.register({
    name: 'cost',
    description: '查看当前会话的 DeepSeek API 费用估算（人民币，含子代理）',
    handler: async ({ agent }) => {
      try {
        const usage = await lineageUsage(agent?.session?.id)
        if (!usage.ownReadable) {
          return { kind: 'error', text: '当前会话不存在或无法读取事件日志。' }
        }
        return { kind: 'success', text: formatCostText(usage, current) }
      } catch (error) {
        return { kind: 'error', text: `统计费用失败：${error instanceof Error ? error.message : String(error)}` }
      }
    },
  })

  // ---- 工具：deepseek_billing ----
  ctx.tools.register({
    name: 'deepseek_billing',
    description:
      '查询 DeepSeek 账户余额或当前会话费用（人民币）。query 取值：balance（余额）、cost（本会话费用）、both（两者）。当用户问"花了多少钱"或"余额"时使用。',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          enum: ['balance', 'cost', 'both'],
          description: 'balance=账户余额；cost=当前会话费用；both=两者都要',
        },
      },
      required: ['query'],
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: String(value) }],
    },
    async execute(args, exec) {
      const query = args?.query ?? 'both'
      const parts = []
      if (query === 'balance' || query === 'both') {
        try {
          parts.push(formatBalanceText(await fetchBalance(exec.signal)))
        } catch (error) {
          parts.push(`查询余额失败：${error instanceof Error ? error.message : String(error)}`)
        }
      }
      if (query === 'cost' || query === 'both') {
        if (exec.agent?.session) {
          try {
            const usage = await lineageUsage(exec.agent.session.id)
            parts.push(usage.ownReadable
              ? formatCostText(usage, current)
              : '当前会话的事件日志无法读取，无法统计费用。')
          } catch (error) {
            parts.push(`统计费用失败：${error instanceof Error ? error.message : String(error)}`)
          }
        } else {
          parts.push('当前调用没有关联的会话，无法统计费用。')
        }
      }
      return parts.join('\n\n')
    },
  })

  // ---- Web UI 数据通道：/billing/* RPC（浏览器悬浮胶囊轮询用）----
  // 与官方 api-gateway 相同：connection 服务经 ctx.inject 作用域访问，不在根上下文。
  ctx.inject(['connection'], (connectionCtx) => {
    const connection = connectionCtx.connection
    if (!connection?.rpc) return
    connection.rpc.handle('/billing', async (endpoint, payload, signal) => {
      try {
        if (endpoint === 'balance') {
          return { ok: true, value: await balancePayload(signal) }
        }
        if (endpoint === 'cost') {
          const sessionId = payload?.args?.sessionId
          const usage = await lineageUsage(sessionId)
          if (!usage.ownReadable) {
            return { ok: false, error: { code: 'NO_SESSION', message: `会话不存在或无法读取事件日志：${String(sessionId)}`, details: {} } }
          }
          return { ok: true, value: costPayload(usage) }
        }
        if (endpoint === 'tide') {
          return { ok: true, value: resolveTide(current, Date.now()) }
        }
        return { ok: false, error: { code: 'BAD_ENDPOINT', message: `未知的 billing 端点：${String(endpoint)}`, details: {} } }
      } catch (error) {
        return { ok: false, error: { code: 'ERROR', message: error instanceof Error ? error.message : String(error), details: {} } }
      }
    })
  })
}
