// dsh-billing 浏览器半：会话头部三胶囊（余额 + 本会话费用 + 峰谷时段），事件驱动更新。
// 工厂格式直接注册进平台模块表，仅依赖平台共享的 react（无构建步骤）。
function makeFactory(require) {
    const react = require('react')
    const { createElement: h, useCallback, useEffect, useRef, useState } = react

    // ---- 宿主 RPC 调用 ----
    async function rpc(endpoint, args) {
      let response
      try {
        response = await fetch(`/billing/${endpoint}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            type: 'client-request',
            rpcId: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `billing-${Date.now()}-${Math.random()}`,
            method: endpoint,
            payload: args === undefined ? {} : { args },
          }),
        })
      } catch (error) {
        throw new Error(`billing/${endpoint} 网络错误：${error instanceof Error ? error.message : String(error)}`)
      }
      const body = await response.json().catch(() => ({}))
      if (body.result?.ok) return body.result.value
      throw new Error(body.result?.error?.message ?? `billing/${endpoint} HTTP ${response.status}`)
    }

    function fmtCost(c) {
      if (!Number.isFinite(c) || c <= 0) return '0.00'
      if (c < 0.01) return c.toFixed(4)
      if (c < 1) return c.toFixed(3)
      return c.toFixed(2)
    }

    // 会话胶囊内容：费用做 number pop-in；totalTokens 太长，单独平铺显示
    function sessionNum(costData, costFailed) {
      if (!costData) return costFailed ? '—' : '…'
      if (costData.cost <= 0) return h(Digits, { value: '¥0.00' })
      return h('span', {},
        h(Digits, { value: `¥${fmtCost(costData.cost)}` }),
        `(${costData.totalTokens.toLocaleString()})`,
      )
    }

    // ---- 胶囊样式（用 DSH design token，适配明暗模式）----
    const BILLING_CSS_ID = 'dsh-billing-pills'
    const BILLING_CSS = `
      .billing-pills { display: inline-flex; align-items: center; gap: 2px; }
      .billing-pill {
        display: inline-flex; align-items: center; gap: 3px;
        min-height: 28px; padding: 3px 8px; border: 0; border-radius: 6px;
        background: transparent; color: var(--dsw-alias-label-secondary);
        font-size: 12px; line-height: 18px; white-space: nowrap; cursor: pointer;
        transition: background 120ms ease, color 120ms ease;
      }
      .billing-pill:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
      .billing-num { font-weight: 600; font-variant-numeric: tabular-nums; }
      .billing-ok { color: #43b97f; }
      .billing-warn { color: #e08a3e; }

      /* Number pop-in (transitions.dev) */
      :root {
        --digit-dur: 500ms;
        --digit-distance: 8px;
        --digit-stagger: 70ms;
        --digit-blur: 2px;
        --digit-ease: cubic-bezier(0.34, 1.45, 0.64, 1);
        --digit-dir-x: 0;
        --digit-dir-y: 1;
      }
      @keyframes t-digit-pop-in {
        0% { transform: translate(calc(var(--digit-distance) * var(--digit-dir-x)), calc(var(--digit-distance) * var(--digit-dir-y))); opacity: 0; filter: blur(var(--digit-blur)); }
        100% { transform: translate(0, 0); opacity: 1; filter: blur(0); }
      }
      .t-digit-group { display: inline-flex; align-items: baseline; }
      .t-digit { display: inline-block; will-change: transform, opacity, filter; }
      .t-digit-group.is-animating .t-digit { animation: t-digit-pop-in var(--digit-dur) var(--digit-ease) both; }
      .t-digit-group.is-animating .t-digit[data-stagger="1"] { animation-delay: var(--digit-stagger); }
      .t-digit-group.is-animating .t-digit[data-stagger="2"] { animation-delay: calc(var(--digit-stagger) * 2); }
      @media (prefers-reduced-motion: reduce) {
        .t-digit-group .t-digit { animation: none !important; }
      }
    `
    if (typeof document !== 'undefined') {
      let tag = document.querySelector('style[data-plugin-css="' + BILLING_CSS_ID + '"]')
      if (!tag) {
        tag = document.createElement('style')
        tag.setAttribute('data-plugin', 'dsh-billing')
        tag.setAttribute('data-plugin-css', BILLING_CSS_ID)
        document.head.appendChild(tag)
      }
      tag.textContent = BILLING_CSS
    }

    // ---- Number pop-in：数字值变化时自动重放（transitions.dev React 适配）----
    function useDigits(value) {
      const [playing, setPlaying] = useState(false)
      const first = useRef(true)
      useEffect(() => {
        if (first.current) { first.current = false; return }
        setPlaying(false)
        const raf = requestAnimationFrame(() => requestAnimationFrame(() => setPlaying(true)))
        return () => cancelAnimationFrame(raf)
      }, [value])
      return playing
    }

    function Digits({ value }) {
      const playing = useDigits(value)
      return h(
        'span',
        { className: 't-digit-group' + (playing ? ' is-animating' : '') },
        String(value).split('').map((ch, i) => h('span', { key: i, className: 't-digit', 'data-stagger': i > 0 ? String(i) : undefined }, ch)),
      )
    }

    // ---- DeepSeek API 峰谷时段（北京时间 UTC+8）----
    // 官方时段：工作日高峰 09:00–12:00、14:00–18:00；其余为低谷；
    // 周六/周日全天低谷；低谷价 = 高峰价的一半。
    const TZ_OFFSET_MS = 8 * 3600 * 1000
    const PEAK_RANGES = [[9 * 60, 12 * 60], [14 * 60, 18 * 60]] // [startMin, endMin)
    const DAY_MS = 24 * 3600 * 1000

    /** 转成北京时间的 (weekday, 当日分钟数)。weekday: 0=周日 … 6=周六。 */
    function bjParts(date) {
      const bj = new Date(date.getTime() + TZ_OFFSET_MS)
      return { weekday: bj.getUTCDay(), minutes: bj.getUTCHours() * 60 + bj.getUTCMinutes() }
    }

    /** 某时刻是否处于高峰（北京时间）。周末全天低谷 → false。 */
    function isPeakAt(date) {
      const { weekday, minutes } = bjParts(date)
      if (weekday === 0 || weekday === 6) return false
      return PEAK_RANGES.some(([s, e]) => minutes >= s && minutes < e)
    }

    /** 距下一次状态翻转（高峰↔低谷）的小时数；最多向后找 3 天。 */
    function nextChangeHours(date) {
      const start = date.getTime()
      const current = isPeakAt(date)
      const limit = start + 3 * DAY_MS
      for (let t = start + 60 * 1000; t < limit; t += 60 * 1000) {
        if (isPeakAt(new Date(t)) !== current) return (t - start) / 3600000
      }
      return 72
    }

    /** 计算时段状态：{ isPeak, nextChangeHours }。纯函数，供 UI 与单测共用。 */
    function computeTide(date) {
      return { isPeak: isPeakAt(date), nextChangeHours: nextChangeHours(date) }
    }

    /** 完整文案用：>=1h 显示小时（一位小数），<1h 显示分钟。 */
    function fmtRemain(hours) {
      if (hours < 1) {
        const m = Math.max(1, Math.round(hours * 60))
        return `${m} 分钟`
      }
      const r = Math.round(hours * 10) / 10
      return `${Number.isInteger(r) ? r : r.toFixed(1)} 小时`
    }

    /** 胶囊简写：>=1h 显示 `5.8h`，<1h 显示 `38m`。 */
    function fmtRemainShort(hours) {
      if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`
      const r = Math.round(hours * 10) / 10
      return `${Number.isInteger(r) ? r : r.toFixed(1)}h`
    }

    // ---- 三胶囊：余额 + 本会话费用 + 峰谷时段（会话头部静态区，order 为负）----
    // 更新策略（按需触发，无空闲轮询）：
    //  1. 轮次中：每完成 10 步刷新一次（跨过 10 的整数倍边界时）
    //  2. 每轮结束（turn/end）：刷新一次，结算本轮的收尾步
    //  3. 挂载 / 切换会话：立即刷新
    //  4. 点击任意一个胶囊：立即刷新两个
    //  5. 页面从后台切回可见：立即刷新一次
    //  空闲时零请求。
    function BillingPills(props) {
      const sessionId = props.sessionId
      const [costData, setCostData] = useState(null)
      const [balData, setBalData] = useState(null)
      const [costFailed, setCostFailed] = useState(false)
      const [balFailed, setBalFailed] = useState(false)
      // 峰谷时段：用当前时间计算；每分钟刷新一次以更新"还剩 X 小时"。
      const [tideNow, setTideNow] = useState(() => Date.now())
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
      const running = typeof props.useSession === 'function' ? props.useSession((s) => s.running) : false
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

      // 峰谷时段：每分钟更新一次当前时间，让"还剩 X 小时"跟随变化
      useEffect(() => {
        const timer = setInterval(() => setTideNow(Date.now()), 60 * 1000)
        return () => clearInterval(timer)
      }, [])

      const cny = balData && balData.infos ? balData.infos.find((i) => i.currency === 'CNY') : undefined
      const usd = balData && balData.infos ? balData.infos.find((i) => i.currency === 'USD') : undefined
      // ---- 峰谷时段胶囊（北京时间）----
      const tide = computeTide(new Date(tideNow))
      const tideLabel = tide.isPeak ? '高峰时段' : '低谷时段'
      const tideRemain = fmtRemain(tide.nextChangeHours)
      const tideSummary = `DeepSeek API 峰谷定价（北京时间）\n工作日高峰 09:00–12:00、14:00–18:00；周末全天低谷。\n低谷价 = 高峰价的一半。`
      const tideTitle = tide.isPeak
        ? `目前为高峰时段。低谷价还要 ${tideRemain}。`
        : `当前为低谷时段。还有 ${tideRemain} 变更为高峰价。\n${tideSummary}`
      let balTitle = 'DeepSeek 账户余额（点击刷新）'
      if (cny) {
        balTitle = `DeepSeek 账户余额（点击刷新）\n人民币：总 ¥${cny.totalBalance}（充值 ¥${cny.toppedUpBalance}，赠金 ¥${cny.grantedBalance}）${balData.isAvailable ? '' : '（当前不可用）'}`
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
          .map((m) => `${m.model}${m.priced ? '' : '（默认单价）'}：¥${fmtCost(m.cost)}（输入 ${m.inputTokens.toLocaleString()} + 缓存命中 ${m.cacheReadTokens.toLocaleString()} / 输出 ${m.outputTokens.toLocaleString()} tokens）`)
          .join('\n')}\n合计 ¥${fmtCost(costData.cost)}\n${sourceLine}\n点击立即刷新`
      }

      return h(
        'span',
        { className: 'billing-pills' },
        h(
          'span',
          {
            className: 'billing-pill',
            title: balTitle,
            onClick: () => refreshAll(),
          },
          '余额 ',
          h('b', { className: 'billing-num' + (cny ? ' billing-ok' : '') }, h(Digits, { value: cny ? `¥${cny.totalBalance}` : (balFailed ? '—' : '…') })),
        ),
        h(
          'span',
          {
            className: 'billing-pill',
            title: costTitle,
            onClick: () => refreshAll(),
            style: costFailed ? { opacity: 0.45 } : undefined,
          },
          '会话 ',
          h('b', { className: 'billing-num' }, sessionNum(costData, costFailed)),
        ),
        h(
          'span',
          {
            className: 'billing-pill',
            title: tideTitle,
            onClick: () => { refreshAll(); setTideNow(Date.now()) },
          },
          tideLabel,
          ' · ',
          h('b', { className: 'billing-num ' + (tide.isPeak ? 'billing-warn' : 'billing-ok') }, h(Digits, { value: fmtRemainShort(tide.nextChangeHours) })),
        ),
      )
    }

    function apply(ctx) {
      // conversation.session.header.actions：会话头部动作区（list 槽位；负数 order = 静态会话上下文）
      ctx.slots.inject('conversation.session.header.actions', () =>
        ctx.slots.register(
          { name: 'conversation.session.header.actions', id: 'billing-pills', order: -10 },
          BillingPills,
        ),
      )
    }

    const exports = {}
    exports.inject = ['slots']
    exports.apply = apply
    // 测试挂点（生产无副作用）
    exports.testHooks = { computeTide }
    return exports
}
window.__ModuleLoader__.load({ id: 'dsh-billing', factory: makeFactory })
