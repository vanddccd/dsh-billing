// dsh-billing 浏览器半：会话头部双胶囊（余额 + 本会话费用），事件驱动更新。
// 工厂格式直接注册进平台模块表，仅依赖平台共享的 react（无构建步骤）。
// 同时注册新旧两个包名 id，避免旧 graph 行残留时加载失败。
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

    /** 从会话快照选取"最近一条已结算助手消息的 turn:step"（原始字符串，步进时变化）。 */
    function selectStepSignal(snapshot) {
      let best = null
      for (const node of snapshot.nodes) {
        if (node.kind !== 'assistant') continue
        if (best === null || node.turn > best.turn || (node.turn === best.turn && node.step > best.step)) {
          best = { turn: node.turn, step: node.step }
        }
      }
      return best ? `${best.turn}:${best.step}` : ''
    }

    /** 从会话快照选取"最近完成的轮次号"（原始值，轮次结束时变化）。 */
    function selectMaxTurnEnd(snapshot) {
      let max = 0
      for (const turn of snapshot.turnEnds.keys()) if (turn > max) max = turn
      return max
    }

    /**
     * 纯函数：根据最新信号决定是否触发一次刷新。
     * fire 条件：轮次结束；或同一轮内步号跨过 10 的整数倍边界。
     * @param {object} st 上一次状态 {ready, turn, step, turnEnd}
     * @param {string} stepSig 最近助手消息的 "turn:step"（可为空）
     * @param {number} turnEndSig 最近结束的轮次号
     */
    function evaluateStepTrigger(st, stepSig, turnEndSig) {
      const cur = stepSig === '' ? null : stepSig.split(':').map(Number)
      const curTurn = cur ? cur[0] : 0
      const curStep = cur ? cur[1] : 0
      if (!st.ready) {
        return { st: { ready: true, turn: curTurn, step: curStep, turnEnd: turnEndSig }, fire: false }
      }
      if (turnEndSig !== st.turnEnd) {
        return { st: { ...st, turnEnd: turnEndSig, turn: curTurn, step: curStep }, fire: true }
      }
      if (curTurn === st.turn && Math.floor(curStep / 10) > Math.floor(st.step / 10)) {
        return { st: { ...st, step: curStep }, fire: true }
      }
      if (curTurn !== st.turn) {
        return { st: { ...st, turn: curTurn, step: curStep }, fire: false }
      }
      return { st, fire: false }
    }

    const pillBase = {
      display: 'inline-flex',
      alignItems: 'center',
      whiteSpace: 'nowrap',
      fontVariantNumeric: 'tabular-nums',
      fontSize: '11px',
      lineHeight: '20px',
      padding: '0 8px',
      borderRadius: '999px',
      border: '1px solid rgba(127, 127, 127, 0.3)',
      background: 'rgba(127, 127, 127, 0.12)',
      cursor: 'pointer',
    }

    // ---- 双胶囊：余额 + 本会话费用（会话头部静态区，order 为负）----
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

      // 事件驱动信号（原始值，避免多余渲染）
      const stepSig = typeof props.useSession === 'function' ? props.useSession(selectStepSignal) : ''
      const turnEndSig = typeof props.useSession === 'function' ? props.useSession(selectMaxTurnEnd) : 0

      // 步进触发：同一轮内每跨过 10 的整数倍 → 防抖 300ms 刷新；轮次结束 → 刷新
      const progressRef = useRef({ ready: false, turn: 0, step: 0, turnEnd: 0 })
      useEffect(() => {
        const st = progressRef.current
        const next = evaluateStepTrigger(st, stepSig, turnEndSig)
        progressRef.current = next.st
        if (!next.fire) return
        const timer = setTimeout(refreshAll, 300) // 同批多次变化合并为一次请求
        return () => clearTimeout(timer)
      }, [sessionId, stepSig, turnEndSig])

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
        { style: { display: 'inline-flex', alignItems: 'center', gap: '6px' } },
        h(
          'span',
          {
            title: balTitle,
            style: { ...pillBase },
            onClick: () => refreshAll(),
          },
          '余额 ',
          h('b', { style: { color: cny ? 'rgba(64, 158, 106, 1)' : 'inherit' } }, `¥${cny ? cny.totalBalance : balFailed ? '—' : '…'}`),
        ),
        h(
          'span',
          {
            title: costTitle,
            style: { ...pillBase, opacity: costFailed ? 0.45 : 1 },
            onClick: () => refreshAll(),
          },
          '会话 ',
          h('b', null, `¥${costData ? fmtCost(costData.cost) : costFailed ? '—' : '…'}`),
        ),
      )
    }

    function apply(ctx) {
      // 兼容旧包名残留的 graph 行：只在新包名条目下注册，避免重复胶囊。
      const entryName = ctx.fiber?.entry?.options?.name
      if (entryName !== undefined && entryName !== 'dsh-billing') return
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
    // 测试挂点（生产无副作用）：供离线单测验证触发逻辑
    exports.testHooks = { evaluateStepTrigger, selectStepSignal, selectMaxTurnEnd }
    return exports
}
window.__ModuleLoader__.load({ id: 'dsh-billing', factory: makeFactory })
window.__ModuleLoader__.load({ id: 'dsh-deepseek-billing', factory: makeFactory })
