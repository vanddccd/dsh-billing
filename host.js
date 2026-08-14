// @ts-check
/**
 * dsh-deepseek-billing — DeepSeek Harness 插件
 *
 * 功能：
 *   /balance  查询 DeepSeek 账户余额（人民币优先，附美元）
 *   /cost     查看当前会话的 API 费用估算（人民币）
 *   工具 deepseek_billing —— 让模型自己也能查询余额 / 会话费用
 *
 * 定价：默认内置 DeepSeek 官方 API 单价（2026-08-17 起自动切换峰谷价），
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
 * 官方单价（人民币 / 百万 tokens）。
 * 2026-08-17 00:00（北京时间）前使用扁平价；之后按峰谷时段计费：
 * 高峰 9:00–12:00、14:00–18:00，其余为闲时。
 * 来源：https://api-docs.deepseek.com/zh-cn/quick_start/pricing/
 */
const DEFAULT_PRICING = {
  'deepseek-v4-flash': {
    cacheHit: 0.02, cacheMiss: 1, output: 2,
    schedules: [{
      effectiveAt: '2026-08-17T00:00:00+08:00',
      timezoneOffsetMinutes: BEIJING_OFFSET_MINUTES,
      peakWindows: DEFAULT_PEAK_WINDOWS,
      offPeak: { cacheHit: 0.05, cacheMiss: 1.5, output: 4.5 },
      peak: { cacheHit: 0.1, cacheMiss: 3.0, output: 9.0 },
    }],
  },
  'deepseek-v4-pro': {
    cacheHit: 0.025, cacheMiss: 3, output: 6,
    schedules: [{
      effectiveAt: '2026-08-17T00:00:00+08:00',
      timezoneOffsetMinutes: BEIJING_OFFSET_MINUTES,
      peakWindows: DEFAULT_PEAK_WINDOWS,
      offPeak: { cacheHit: 0.15, cacheMiss: 4.5, output: 13.5 },
      peak: { cacheHit: 0.30, cacheMiss: 9.0, output: 27.0 },
    }],
  },
  'deepseek-chat': { cacheHit: 0.2, cacheMiss: 2, output: 3 },
  'deepseek-reasoner': { cacheHit: 1, cacheMiss: 4, output: 16 },
}

/** 未配置单价的模型使用的兜底单价（同 deepseek-v4-pro 扁平价）。 */
const DEFAULT_FALLBACK_PRICE = { cacheHit: 0.025, cacheMiss: 3, output: 6 }

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

/** 把 HTML 解析成 {行: [单元格文本]} 的表格列表（剥掉标签，容忍空白）。 */
export function htmlTables(html) {
  const tables = []
  for (const table of html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)) {
    const rows = []
    for (const tr of table[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = []
      for (const cell of tr[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)) {
        const text = cell[1]
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/\u00a0/g, ' ')
          .trim()
        cells.push(text)
      }
      if (cells.length > 0) rows.push(cells)
    }
    if (rows.length > 0) tables.push(rows)
  }
  return tables
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

  // 1. 主价格表：第一行是模型列（deepseek-*），其后有"百万tokens输入（缓存命中）"等行。
  //    注意：指标行可能带 rowspan 标签列（价格(1)），价格相对指标标签的偏移 = 模型列下标。
  for (const rows of tables) {
    const header = rows[0] ?? []
    const modelCols = []
    for (let i = 1; i < header.length; i++) {
      if (/^deepseek-[\w.-]+$/.test(header[i])) modelCols.push({ idx: i, model: header[i] })
    }
    if (modelCols.length === 0) continue
    const hitLabel = '百万tokens输入（缓存命中）'
    const missLabel = '百万tokens输入（缓存未命中）'
    const outLabel = '百万tokens输出'
    const findRow = (label) => rows.find((r) => r.includes(label)) ?? null
    const hitRow = findRow(hitLabel)
    const missRow = findRow(missLabel)
    const outRow = findRow(outLabel)
    if (!hitRow || !missRow || !outRow) continue
    for (const { idx, model } of modelCols) {
      const entry = {
        cacheHit: parseYuan(hitRow[hitRow.indexOf(hitLabel) + idx]),
        cacheMiss: parseYuan(missRow[missRow.indexOf(missLabel) + idx]),
        output: parseYuan(outRow[outRow.indexOf(outLabel) + idx]),
      }
      if ([entry.cacheHit, entry.cacheMiss, entry.output].every(Number.isFinite)) models[model] = entry
    }
  }

  // 2. 峰谷价表：行首为模型名（rowspan 跨两行），随后是 空闲时段 / 高峰时段 各一行三价
  let scheduleTable = null
  for (const rows of tables) {
    if (rows.some((r) => r.includes('空闲时段'))) {
      scheduleTable = rows
      break
    }
  }
  let schedule = null
  if (scheduleTable) {
    const peak = {}
    const offPeak = {}
    let currentModel = null
    for (const row of scheduleTable) {
      if (/^deepseek-[\w.-]+$/.test(row[0] ?? '')) {
        currentModel = row[0]
        if (row[1] === '空闲时段') offPeak[currentModel] = [parseYuan(row[2]), parseYuan(row[3]), parseYuan(row[4])]
        else if (row[1] === '高峰时段') peak[currentModel] = [parseYuan(row[2]), parseYuan(row[3]), parseYuan(row[4])]
      } else if (currentModel && (row[0] === '空闲时段' || row[0] === '高峰时段')) {
        ;(row[0] === '空闲时段' ? offPeak : peak)[currentModel] = [parseYuan(row[1]), parseYuan(row[2]), parseYuan(row[3])]
      }
    }
    // 生效时间与高峰时段窗口（取自页脚说明文本）
    const eff = html.match(/北京时间\s*(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日\s*(\d{1,2}):(\d{2})/)
    const windowsText = html.match(/高峰时段为北京时间([\s\S]*?)(?:（|。|；|<)/)?.[1] ?? ''
    const windows = [...windowsText.matchAll(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/g)].map((m) => [Number(m[1]), Number(m[3])])
    if (eff && windows.length > 0) {
      const effectiveAt = `${eff[1]}-${String(eff[2]).padStart(2, '0')}-${String(eff[3]).padStart(2, '0')}T${String(eff[4]).padStart(2, '0')}:${String(eff[5]).padStart(2, '0')}:00+08:00`
      schedule = { effectiveAt, timezoneOffsetMinutes: BEIJING_OFFSET_MINUTES, peakWindows: windows }
      for (const model of Object.keys(offPeak)) {
        if (peak[model] && offPeak[model].every(Number.isFinite) && peak[model].every(Number.isFinite)) {
          models[model] = {
            ...(models[model] ?? {}),
            schedules: [{
              effectiveAt,
              timezoneOffsetMinutes: BEIJING_OFFSET_MINUTES,
              peakWindows: windows,
              offPeak: { cacheHit: offPeak[model][0], cacheMiss: offPeak[model][1], output: offPeak[model][2] },
              peak: { cacheHit: peak[model][0], cacheMiss: peak[model][1], output: peak[model][2] },
            }],
          }
        }
      }
    }
  }

  if (Object.keys(models).length === 0) return null
  return { models, schedule }
}

/**
 * 分层合成最终单价表：内置默认 ← 官方在线 ← 用户显式配置（字段级）。
 * @param {object} synced 在线解析结果（可为 null）
 * @param {object} userPricing 用户在配置里显式写的 pricing（原始值）
 */
export function layerPricing(synced, userPricing) {
  const next = {}
  for (const [model, entry] of Object.entries(DEFAULT_PRICING)) next[model] = { ...entry }
  if (synced) {
    for (const [model, entry] of Object.entries(synced.models)) next[model] = entry
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
      ? { ...entry, ...userEntry }
      : { ...entry }
  }
  for (const [model, entry] of Object.entries(raw.pricing ?? {})) {
    if (!(model in pricing)) pricing[model] = { ...entry }
  }
  const fallbackPrice = raw.fallbackPrice
    ? { ...DEFAULT_FALLBACK_PRICE, ...raw.fallbackPrice }
    : { ...DEFAULT_FALLBACK_PRICE }
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
  const hour = shifted.getUTCHours()
  const windows = Array.isArray(active.peakWindows) && active.peakWindows.length > 0
    ? active.peakWindows
    : DEFAULT_PEAK_WINDOWS
  const inPeak = windows.some(([start, end]) => hour >= start && hour < end)
  return { rate: inPeak ? active.peak : active.offPeak, mode: inPeak ? 'peak' : 'off-peak' }
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
 * @param {any} session 事件溯源会话对象（agent.session）
 * @returns {Map<string, {turn:number, step:number, time:number, usage:any, model:string|null}>}
 */
export function collectUsage(session) {
  const steps = new Map()
  if (!session || !Array.isArray(session.events)) return steps
  for (const event of session.events) {
    if (event.type === 'assistant/chunk') {
      const chunk = event.data?.chunk
      if (chunk?.type !== 'usage') continue
      const key = stepKey(event.data.turn, event.data.step)
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
      const key = stepKey(event.data.turn, event.data.step)
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

/** 按模型聚合用量并计算费用（人民币）。 */
export function summarize(usageSteps, config, nowMs) {
  const byModel = new Map()
  for (const bucket of usageSteps.values()) {
    if (!bucket.usage) continue
    const model = bucket.model ?? '(unknown)'
    const bareModel = model === '(unknown)' ? model : (model.includes(':') ? model.slice(model.lastIndexOf(':') + 1) : model)
    let agg = byModel.get(model)
    if (!agg) {
      agg = { model, inputTokens: 0, cacheReadTokens: 0, outputTokens: 0, steps: 0, cost: 0, priced: false }
      byModel.set(model, agg)
    }
    const input = bucket.usage.inputTokens ?? 0
    const cache = bucket.usage.cacheReadTokens ?? 0
    const output = bucket.usage.outputTokens ?? 0
    agg.inputTokens += input
    agg.cacheReadTokens += cache
    agg.outputTokens += output
    agg.steps += 1
    const pricingEntry = bareModel in config.pricing ? config.pricing[bareModel] : null
    const { rate } = rateAt(pricingEntry ?? config.fallbackPrice, bucket.time ?? nowMs)
    agg.cost += (input * (rate.cacheMiss ?? 0) + cache * (rate.cacheHit ?? 0) + output * (rate.output ?? 0)) / 1e6
    if (pricingEntry) agg.priced = true
  }
  return [...byModel.values()].sort((a, b) => a.model.localeCompare(b.model))
}

function fmtMoney(cny) {
  return cny < 0.01 && cny > 0 ? cny.toFixed(4) : cny.toFixed(2)
}

/** 会话费用文本（人民币）。pricingCtx = { pricing, fallbackPrice, source, syncedAt }。 */
export function formatCostText(session, pricingCtx) {
  const steps = collectUsage(session)
  const nowMs = Date.now()
  const rows = summarize(steps, pricingCtx, nowMs)
  if (rows.length === 0) {
    return '本会话目前没有已记账的模型用量（assistant/usage 记录）。'
  }
  const lines = ['📊 本会话 API 费用估算（按官方单价，人民币）', '']
  let total = 0
  for (const row of rows) {
    const tokens = row.inputTokens + row.cacheReadTokens + row.outputTokens
    total += row.cost
    lines.push(
      `• ${row.model}${row.priced ? '' : '（未配置单价，按 fallbackPrice 估算）'}`,
      `    输入 ${row.inputTokens.toLocaleString()} + 缓存命中 ${row.cacheReadTokens.toLocaleString()} / 输出 ${row.outputTokens.toLocaleString()} tokens（${row.steps} 次请求）`,
      `    费用 ¥${fmtMoney(row.cost)}`,
    )
  }
  lines.push('', `合计：¥${fmtMoney(total)}`)
  lines.push('', '说明：按每次请求实际计费时间套用单价（2026-08-17 起自动使用峰谷价）；子代理是独立会话，各自单独统计。')
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
      const parsed = parsePricingHtml(await response.text())
      if (!parsed) throw new Error('价格页解析不到任何模型价格')
      current = {
        pricing: layerPricing(parsed, userPricing),
        fallbackPrice: cfg.fallbackPrice,
        source: 'online',
        syncedAt: Date.now(),
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

  /** 结构化会话费用数据（供 Web UI 会话头部渲染）。 */
  function costPayload(session) {
    const rows = summarize(collectUsage(session), current, Date.now())
    return {
      cost: rows.reduce((sum, row) => sum + row.cost, 0),
      models: rows.map((row) => ({
        model: row.model,
        cost: row.cost,
        inputTokens: row.inputTokens,
        cacheReadTokens: row.cacheReadTokens,
        outputTokens: row.outputTokens,
        steps: row.steps,
        priced: row.priced,
      })),
      pricingSource: current.source,
      pricingSyncedAt: current.syncedAt,
      updatedAt: Date.now(),
    }
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
    description: '查看当前会话的 DeepSeek API 费用估算（人民币）',
    handler: async ({ agent }) => {
      try {
        return { kind: 'success', text: formatCostText(agent?.session, current) }
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
            parts.push(formatCostText(exec.agent.session, current))
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
    connection.rpc.handle('/billing', async (endpoint, payload) => {
      try {
        if (endpoint === 'balance') {
          return { ok: true, value: await balancePayload(undefined) }
        }
        if (endpoint === 'cost') {
          const sessionId = payload?.args?.sessionId
          const session = typeof sessionId === 'string' ? ctx.get('sessions')?.get(sessionId) : undefined
          if (!session) {
            return { ok: false, error: { code: 'NO_SESSION', message: `会话不存在或不在内存中：${String(sessionId)}` } }
          }
          return { ok: true, value: costPayload(session) }
        }
        return { ok: false, error: { code: 'BAD_ENDPOINT', message: `未知的 billing 端点：${String(endpoint)}` } }
      } catch (error) {
        return { ok: false, error: { code: 'ERROR', message: error instanceof Error ? error.message : String(error) } }
      }
    }, {})
  })
}
