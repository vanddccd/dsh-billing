// dsh-billing 同步链路探针：node scripts/probe-sync.mjs
//
// 回答一个具体问题：**「单价来源：官方在线同步」到底是真的，还是机制空转？**
//
// 做法：在独立 node 进程里真实调用 host.js 的 apply()，套一层假宿主 ctx
// （commands / tools / connection.rpc / logger 全接到本地收集器），再注入可控的
// fetch 与 setTimeout，观察四个场景下的实际行为。**不启动、也不影响运行中的 dsh web。**
//
// 四个场景与期望：
//   ① 正常联网      → 真发请求、HTTP 200、logger.info 报「已同步 N 个模型」、下次调度 12h
//   ② 断网          → logger.warn 报错因、保持原值、下次调度 60s（失败退避起点）
//   ③ 官方页 500    → 同上（明确判失败）
//   ④ 200 但无价格表 → 同上（**解析不到价必须判失败，不许拿残缺数据冒充成功**）
//
// 退出码：0 = 四场景全部符合预期；1 = 有不符合项（或①因本机网络不通而失败）。

const hostUrl = new URL('../host.js', import.meta.url).href
const { apply } = await import(hostUrl)

const realFetch = globalThis.fetch.bind(globalThis)
const realSetTimeout = globalThis.setTimeout.bind(globalThis)
const sleep = (ms) => new Promise((r) => realSetTimeout(r, ms))
const INTERVAL_MS = 12 * 60 * 60 * 1000
const RETRY_MS = 60 * 1000

/** 假宿主上下文：只实现插件真正会用到的那几个面，其余记下来供观察。 */
function makeCtx(logs) {
  const reg = { commands: [], tools: [], rpc: null }
  const ctx = {
    logger: {
      info: (...a) => logs.push(['info', ...a]),
      warn: (...a) => logs.push(['warn', ...a]),
      error: (...a) => logs.push(['error', ...a]),
    },
    commands: { register: (c) => reg.commands.push(c) },
    tools: { register: (t) => reg.tools.push(t) },
    inject: (deps, cb) => {
      if (deps.includes('connection')) cb({ connection: { rpc: { handle: (_path, fn) => { reg.rpc = fn } } } })
    },
    get: () => undefined,
    effect: () => {},
  }
  return { ctx, reg }
}

const fmtTimer = (t) =>
  t === INTERVAL_MS ? '12h（成功后常规周期）'
  : t === RETRY_MS ? '60s（失败退避起点）'
  : `${t}ms（第三方内部定时器，非本插件）`

/** 跑一个场景，返回观察结果。 */
async function run(label, mode) {
  const logs = [], net = [], timers = []
  const { ctx, reg } = makeCtx(logs)

  globalThis.fetch = async (url, init) => {
    const u = String(url)
    const t0 = Date.now()
    try {
      let res
      if (mode === 'offline') throw new Error('模拟断网 ECONNREFUSED')
      if (mode === 'http500') res = new Response('boom', { status: 500 })
      else if (mode === 'noTable') res = new Response('<html><body>maintenance</body></html>', { status: 200 })
      else res = await realFetch(url, init)
      net.push({ url: u, status: res.status, ms: Date.now() - t0, ua: init?.headers?.['user-agent'] ?? null })
      return res
    } catch (err) {
      net.push({ url: u, err: String(err?.message ?? err), ms: Date.now() - t0 })
      throw err
    }
  }
  // 真调度但 unref：既能看到「下一次多久」，又不会把 12h 周期压缩成请求风暴。
  globalThis.setTimeout = (fn, delay, ...rest) => {
    timers.push(delay)
    const id = realSetTimeout(fn, delay, ...rest)
    if (id && typeof id.unref === 'function') id.unref()
    return id
  }

  try {
    apply(ctx, {})
    await sleep(1500)
    const tide = reg.rpc ? (await reg.rpc('tide', {}, undefined))?.value : null
    console.log(`\n── ${label} ──`)
    console.log('  发起请求 :', net.length
      ? net.map((n) => `${n.url} → ${n.err ?? 'HTTP ' + n.status}${n.ms != null ? `（${n.ms}ms）` : ''}${n.status === 200 ? ` [UA=${n.ua ?? '未带'}]` : ''}`).join('  |  ')
      : '（一个都没发）')
    console.log('  插件日志 :', logs.length
      ? logs.map((l) => `[${l[0]}] ` + l.slice(1).join(' ')).join('  |  ')
      : '（无输出）')
    console.log('  下次调度 :', timers.length ? timers.map(fmtTimer).join(', ') : '（无）')
    console.log('  注册面   :', `commands=${reg.commands.map((c) => '/' + c.name).join(',')} tools=${reg.tools.map((t) => t.name).join(',')} rpc=${reg.rpc ? '/billing' : '未注册'}`)
    if (tide) console.log('  tide 载荷:', `isPeak=${tide.isPeak} mode=${tide.mode} 节假日=${(tide.holidays ?? []).length}条 窗口=${JSON.stringify(tide.windowsHours)}`)
    return { logs, net, timers, tide }
  } finally {
    globalThis.fetch = realFetch
    globalThis.setTimeout = realSetTimeout
  }
}

const fail = []
const check = (label, cond, extra = '') => {
  console.log(`  ${cond ? '✅' : '❌'} ${label}${extra ? ' — ' + extra : ''}`)
  if (!cond) fail.push(label)
}
const isWarn = (r) => r.logs.some((l) => l[0] === 'warn')
const isInfo = (r) => r.logs.some((l) => l[0] === 'info')
const scheduled = (r, ms) => r.timers.includes(ms)

console.log('===== dsh-billing 同步链路探针（受控环境，非运行中的宿主）=====')

const ok = await run('① 正常联网：真抓官方价格页', 'ok')
check('真发起了对官方价格页的请求', ok.net.length === 1, ok.net[0]?.url)
check('拿到 HTTP 200', ok.net[0]?.status === 200, String(ok.net[0]?.status ?? ok.net[0]?.err))
check('走成功分支（logger.info）', isInfo(ok), ok.logs.map((l) => l[1]).join(' | ') || '无')
check('成功后按 12h 常规周期调度', scheduled(ok, INTERVAL_MS))

const offline = await run('② 断网：fetch 直接抛错', 'offline')
check('判失败（logger.warn）', isWarn(offline))
check('失败后按 60s 退避调度', scheduled(offline, RETRY_MS))

const http500 = await run('③ 官方页 HTTP 500', 'http500')
check('判失败（logger.warn）', isWarn(http500))
check('失败后按 60s 退避调度', scheduled(http500, RETRY_MS))

const noTable = await run('④ 官方页 200 但没有价格表', 'noTable')
check('解析不到价 → 明确判失败，不冒充成功', isWarn(noTable) && !isInfo(noTable))
check('失败后按 60s 退避调度', scheduled(noTable, RETRY_MS))
check('降级后 tide 仍可服务（节假日表/窗口照常下发）', noTable.tide?.holidays?.length > 0 && Array.isArray(noTable.tide?.windowsHours))

console.log(`\n${fail.length === 0 ? '🎉 同步链路四项场景全部符合预期' : `❌ ${fail.length} 项不符合预期：` + fail.join(' / ')}`)
console.log(fail.length === 0
  ? '   结论：官方页能真拉到、能真解析、改价/异常都有明确反应，「官方在线同步」不是空转。'
  : '   注意：场景① 失败也可能是本机网络不通导致，先单独 curl 官方价格页确认。')
process.exit(fail.length ? 1 : 0)
