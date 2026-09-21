// dsh-billing 定价回归验证：node scripts/verify-pricing.mjs
// 覆盖：官方价格页解析 / 内置价表与系列匹配 / 峰谷边界 / 同步幂等与不回溯 / tide RPC 载荷 / 真实会话回归
// 官方页优先在线抓取，失败则回退本地缓存（--cache <path>）或跳过解析段。
import * as M from '../host.js'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const PRICING_URL = 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing/'
const CACHE_PATH = path.join(os.tmpdir(), 'dsh-billing-pricing.html')

async function loadOfficialHtml() {
  try {
    const res = await fetch(PRICING_URL, { headers: { 'user-agent': 'Mozilla/5.0' } })
    if (res.ok) {
      const html = await res.text()
      if (/<table/i.test(html)) {
        fs.writeFileSync(CACHE_PATH, html)
        console.log(`（官方页在线抓取成功，已缓存到 ${CACHE_PATH}）`)
        return html
      }
    }
    console.log(`（官方页返回 HTTP ${res.status} 或结构异常，改用缓存）`)
  } catch (error) {
    console.log(`（在线抓取失败：${error instanceof Error ? error.message : String(error)}，改用缓存）`)
  }
  if (fs.existsSync(CACHE_PATH)) {
    console.log(`（使用缓存 ${CACHE_PATH}）`)
    return fs.readFileSync(CACHE_PATH, 'utf8')
  }
  return null
}

const cfg = M.mergeConfig({})
const fail = []
const ok = (label, cond, extra = '') => { console.log(`  ${cond ? '✅' : '❌'} ${label}${extra ? ' — ' + extra : ''}`); if (!cond) fail.push(label) }

const html = await loadOfficialHtml()
let parsed = null

console.log('=== A. 解析器（M1）===')
if (html === null) {
  console.log('  ⚠️ 跳过：既无在线页也无缓存')
} else {
parsed = M.parsePricingHtml(html)
ok('官方现行页可解析', parsed !== null)
ok('识别 deepseek-flash 空闲 0.02/1/4', JSON.stringify(parsed?.models?.['deepseek-flash']?.offPeak) === JSON.stringify({cacheHit:0.02,cacheMiss:1,output:4}))
ok('识别 deepseek-flash 高峰 0.04/2/8', JSON.stringify(parsed?.models?.['deepseek-flash']?.peak) === JSON.stringify({cacheHit:0.04,cacheMiss:2,output:8}))
ok('识别 deepseek-v4-pro 空闲 0.15/4.5/13.5', JSON.stringify(parsed?.models?.['deepseek-v4-pro']?.offPeak) === JSON.stringify({cacheHit:0.15,cacheMiss:4.5,output:13.5}))
ok('带脚注角标的表头归一化', M.modelIdFromHeaderCell('deepseek-flash<sup>(1)</sup>') === 'deepseek-flash')
ok('非模型表头返回 null', M.modelIdFromHeaderCell('模型') === null)
ok('<br> 折行指标标签仍可匹配（指标列归一化）', (() => {
  const h = '<table><tr><td>模型</td><td>deepseek-flash(1)</td></tr><tr><td rowspan=2>百万tokens输入<br>（缓存命中）</td><td>空闲时段</td><td>0.02元</td></tr><tr><td>高峰时段</td><td>0.04元</td></tr><tr><td rowspan=2>百万tokens输入<br>（缓存未命中）</td><td>空闲时段</td><td>1元</td></tr><tr><td>高峰时段</td><td>2元</td></tr><tr><td rowspan=2>百万tokens输出</td><td>空闲时段</td><td>4元</td></tr><tr><td>高峰时段</td><td>8元</td></tr></table>'
  const p = M.parsePricingHtml(h)
  const e = p?.models?.['deepseek-flash']
  return e?.offPeak?.output === 4 && e?.offPeak?.cacheMiss === 1 && e?.peak?.output === 8 && e?.peak?.cacheMiss === 2
})())

}

console.log('\n=== B. 内置价表（M2/M3）===')
const fl = M.resolvePricing('deepseek-flash', cfg.pricing), pro = M.resolvePricing('deepseek-v4-pro', cfg.pricing)
ok('deepseek-flash 精确命中', fl?.matched === 'exact')
ok('deepseek-v4-pro 精确命中', pro?.matched === 'exact')
ok('deepseek-v4-flash 精确命中', M.resolvePricing('deepseek-v4-flash', cfg.pricing)?.matched === 'exact')
ok('deepseek-v4-flash-vision-exp 精确命中', M.resolvePricing('deepseek-v4-flash-vision-exp', cfg.pricing)?.matched === 'exact')
ok('未知模型落兜底价', M.resolvePricing('deepseek-unknown-x', cfg.pricing) === null)
const R = (e, iso) => { const {rate,mode} = M.rateAt(e, new Date(iso).getTime()); return `${mode}|${rate.cacheHit}/${rate.cacheMiss}/${rate.output}` }
ok('v4-pro 09-14 11:59 仍 pro 高峰价', R(pro.entry,'2026-09-14T11:59:00+08:00') === 'peak|0.3/9/27', R(pro.entry,'2026-09-14T11:59:00+08:00'))
ok('v4-pro 09-14 12:00 仍 pro 空闲价（下线已撤销）', R(pro.entry,'2026-09-14T12:00:00+08:00') === 'off-peak|0.15/4.5/13.5', R(pro.entry,'2026-09-14T12:00:00+08:00'))
ok('v4-pro 09-14 15:00 仍 pro 高峰价', R(pro.entry,'2026-09-14T15:00:00+08:00') === 'peak|0.3/9/27', R(pro.entry,'2026-09-14T15:00:00+08:00'))
ok('v4-pro 09-15 10:00 仍 pro 高峰价', R(pro.entry,'2026-09-15T10:00:00+08:00') === 'peak|0.3/9/27', R(pro.entry,'2026-09-15T10:00:00+08:00'))
ok('flash 09-10 11:59 旧价高峰', R(fl.entry,'2026-09-10T11:59:00+08:00') === 'peak|0.1/3/9', R(fl.entry,'2026-09-10T11:59:00+08:00'))
ok('flash 09-10 12:00 新价空闲(12点非高峰)', R(fl.entry,'2026-09-10T12:00:00+08:00') === 'off-peak|0.02/1/4', R(fl.entry,'2026-09-10T12:00:00+08:00'))
ok('兜底价不随 09-14 下调（09-21 周一高峰仍 pro 高峰价）', R(cfg.fallbackPrice,'2026-09-21T10:00:00+08:00') === 'peak|0.3/9/27', R(cfg.fallbackPrice,'2026-09-21T10:00:00+08:00'))
ok('兜底价 10-15 周一高峰仍 pro 高峰价', R(cfg.fallbackPrice,'2026-10-15T10:00:00+08:00') === 'peak|0.3/9/27', R(cfg.fallbackPrice,'2026-10-15T10:00:00+08:00'))
ok('客户兜底窗口归一化与 host 一致', JSON.stringify(M.htmlTables('<table><tr><td>x</td></tr></table>')[0]) === JSON.stringify([['x']]))

console.log('\n=== C. 峰谷边界（分钟粒度）===')
const want = [['2026-09-11T08:59:00+08:00','off-peak'],['2026-09-11T09:00:00+08:00','peak'],['2026-09-11T11:59:00+08:00','peak'],['2026-09-11T12:00:00+08:00','off-peak'],['2026-09-11T12:30:00+08:00','off-peak'],['2026-09-11T14:00:00+08:00','peak'],['2026-09-11T17:59:00+08:00','peak'],['2026-09-11T18:00:00+08:00','off-peak'],['2026-09-12T10:00:00+08:00','off-peak'],['2026-09-13T10:00:00+08:00','off-peak'],['2026-09-14T10:00:00+08:00','peak']]
for (const [iso, exp] of want) ok(`${iso.slice(5,16)} → ${exp}`, M.rateAt(fl.entry, new Date(iso).getTime()).mode === exp, M.rateAt(fl.entry, new Date(iso).getTime()).mode)

console.log('\n=== C2. 法定节假日全天空闲（2026-09-19 官方说明）===')
{
  const H = (iso) => M.rateAt(fl.entry, new Date(iso).getTime()).mode
  // 官方口径：中国法定节假日全天按空闲价；当次通知＝中秋 09-25~27、国庆 10-01~07
  for (const [iso, label] of [
    ['2026-09-25T10:00:00+08:00', '中秋 周五 10:00'],
    ['2026-09-25T15:00:00+08:00', '中秋 周五 15:00'],
    ['2026-10-01T09:00:00+08:00', '国庆 周四 09:00'],
    ['2026-10-02T17:59:00+08:00', '国庆 周五 17:59'],
    ['2026-10-05T10:00:00+08:00', '国庆 周一 10:00'],
    ['2026-10-07T14:30:00+08:00', '国庆 周三 14:30'],
  ]) ok(`${label} → off-peak`, H(iso) === 'off-peak', H(iso))
  ok('节假日按空闲档计价 0.02/1/4', R(fl.entry, '2026-10-01T10:00:00+08:00') === 'off-peak|0.02/1/4', R(fl.entry, '2026-10-01T10:00:00+08:00'))
  // 调休上班的周末：周末规则已覆盖，新规同样要求空闲
  ok('09-20 周日补班 → off-peak', H('2026-09-20T10:00:00+08:00') === 'off-peak', H('2026-09-20T10:00:00+08:00'))
  ok('10-10 周六补班 → off-peak', H('2026-10-10T10:00:00+08:00') === 'off-peak', H('2026-10-10T10:00:00+08:00'))
  // 未收录的普通工作日不受影响（口径偏保守，不把工作日误判成空闲）
  for (const [iso, label] of [
    ['2026-09-22T10:00:00+08:00', '09-22 周二 10:00'],
    ['2026-09-24T15:00:00+08:00', '09-24 周四 15:00'],
    ['2026-09-28T10:00:00+08:00', '09-28 周一 10:00（中秋后）'],
    ['2026-10-08T10:00:00+08:00', '10-08 周四 10:00（国庆后）'],
  ]) ok(`${label} → peak`, H(iso) === 'peak', H(iso))
  // 节假日 vs 相邻工作日：同一钟点结论必须相反（防「整表被误当空闲」这类粗错）
  ok('节假日与相邻工作日同钟点结论相反', H('2026-10-01T10:00:00+08:00') === 'off-peak' && H('2026-10-08T10:00:00+08:00') === 'peak')
  // 空节假日表 / 关掉节假日规则 → 回落到峰谷判定，不误判空闲
  const noHol = { ...fl.entry, schedules: fl.entry.schedules.map((s) => ({ ...s, holidays: [] })) }
  ok('holidays 为空 → 工作日仍 peak', M.rateAt(noHol, new Date('2026-09-22T10:00:00+08:00').getTime()).mode === 'peak')
  const offSw = { ...fl.entry, schedules: fl.entry.schedules.map((s) => ({ ...s, holidays: ['2026-09-22'], holidayOffPeak: false })) }
  ok('holidayOffPeak=false → 工作日仍 peak', M.rateAt(offSw, new Date('2026-09-22T10:00:00+08:00').getTime()).mode === 'peak')
  // 日界按北京时间，不是 UTC
  ok('isStatutoryHoliday 按北京时间日界', M.isStatutoryHoliday(['2026-10-01'], Date.parse('2026-10-01T00:30:00+08:00'), 480) === true && M.isStatutoryHoliday(['2026-10-01'], Date.parse('2026-09-30T23:30:00+08:00'), 480) === false)
  // tide RPC 一并下发节假日规则，供客户端兜底自算
  const th = M.resolveTide(cfg, new Date('2026-10-01T10:00:00+08:00').getTime())
  ok('tide 10-01 isPeak=false', th.isPeak === false, JSON.stringify(th.mode))
  ok('tide 下发 holidayOffPeak=true', th.holidayOffPeak === true)
  ok('tide 下发 holidays 含 2026-10-01', Array.isArray(th.holidays) && th.holidays.includes('2026-10-01'), JSON.stringify(th.holidays))
  ok('tide 09-22 isPeak=true（对照）', M.resolveTide(cfg, new Date('2026-09-22T10:00:00+08:00').getTime()).isPeak === true)
}

console.log('\n=== C3. 客户端兜底口径与 host 一致（client/src/tide.ts）===')
{
  const ROOT = fileURLToPath(new URL('..', import.meta.url))
  const esbuild = process.env.ESBUILD ?? '/Users/van/dev/deepseek-harness/node_modules/.bin/esbuild'
  if (!fs.existsSync(esbuild)) {
    console.log(`  ⚠️ 跳过：未找到 esbuild（${esbuild}）`)
  } else {
    const tmp = path.join(os.tmpdir(), `dsh-billing-tide-${process.pid}.mjs`)
    execSync(`"${esbuild}" "${path.join(ROOT, 'client/src/tide.ts')}" --bundle --format=esm --platform=node --outfile="${tmp}"`, { stdio: 'ignore' })
    const C = await import(tmp)
    const samples = [
      '2026-09-20T10:00:00+08:00', '2026-09-22T10:00:00+08:00', '2026-09-25T10:00:00+08:00',
      '2026-09-25T20:00:00+08:00', '2026-09-26T10:00:00+08:00', '2026-10-01T09:00:00+08:00',
      '2026-10-05T15:00:00+08:00', '2026-10-08T10:00:00+08:00', '2026-10-10T10:00:00+08:00',
    ]
    let drift = 0
    for (const iso of samples) {
      const ms = new Date(iso).getTime()
      const hostPeak = M.rateAt(fl.entry, ms).mode === 'peak'
      const rules = M.resolveTide(cfg, ms)
      if (C.isPeakAt(new Date(ms), rules) !== hostPeak) drift++
      if (C.computeTide(new Date(ms), rules).isPeak !== hostPeak) drift++
    }
    ok(`${samples.length} 个样本：客户端兜底与 host 结论一致`, drift === 0, drift ? `${drift} 处漂移` : '')
    ok('客户端内置兜底表含国庆', (C.FALLBACK_RULES.holidays ?? []).includes('2026-10-01'))
    fs.rmSync(tmp, { force: true })
  }
}

console.log('\n=== D. 同步幂等 + 不回溯（M1 配套）===')
const layered = M.layerPricing(parsed ?? null, undefined, Date.now())
ok('flash 档数不变(2)', layered['deepseek-flash'].schedules.length === 2, String(layered['deepseek-flash'].schedules.length))
ok('pro 档数不变(1)', layered['deepseek-v4-pro'].schedules.length === 1, String(layered['deepseek-v4-pro'].schedules.length))
const old = layered['deepseek-v4-pro'].schedules.map(s => s.effectiveAt)
ok('pro 历史档未被改写', JSON.stringify(old) === JSON.stringify(['2026-08-17T00:00:00+08:00']), JSON.stringify(old))
// 官方降价场景：模拟页面报出更低价，应追加新档且不动历史
const cheap = { models: { 'deepseek-flash': { offPeak: {cacheHit:0.01,cacheMiss:0.5,output:2}, peak: {cacheHit:0.02,cacheMiss:1,output:4} } } }
const l2 = M.layerPricing(cheap, undefined, Date.now())
ok('官方改价 → 追加新档接管', l2['deepseek-flash'].schedules.length === 3, String(l2['deepseek-flash'].schedules.length))
ok('追加档从观察时刻生效', new Date(l2['deepseek-flash'].schedules.at(-1).effectiveAt).getTime() <= Date.now() + 1000)

console.log('\n=== E. tide RPC 载荷（M4）===')
const t = M.resolveTide(cfg, new Date('2026-09-11T10:00:00+08:00').getTime())
ok('周五 10:00 isPeak=true', t.isPeak === true, JSON.stringify(t))
ok('工作日 10:00 → peak', t.mode === 'peak')
ok('下发 windowsHours=[[9,12],[14,18]]', JSON.stringify(t.windowsHours) === '[[9,12],[14,18]]', JSON.stringify(t.windowsHours))
ok('下发 weekendOffPeak=true', t.weekendOffPeak === true)
ok('下发 timezoneOffsetMinutes=480', t.timezoneOffsetMinutes === 480)
const t2 = M.resolveTide(cfg, new Date('2026-09-12T10:00:00+08:00').getTime())
ok('周六 10:00 isPeak=false', t2.isPeak === false, JSON.stringify(t2.mode))

console.log('\n=== F. 真实会话回归 ===')
const files = execSync(`find /Users/van/.dsh/sessions -name "session.jsonl.zstd" | head -40`).toString().trim().split('\n').filter(Boolean)
const seen = new Map()
for (const f of files) {
  let raw; try { raw = execSync(`zstd -dc "${f}" 2>/dev/null`).toString() } catch { continue }
  const events = []
  for (const line of raw.split('\n')) { if (line.trim()) { try { events.push(JSON.parse(line)) } catch {} } }
  const steps = M.collectUsage(events); if (!steps.size) continue
  for (const row of M.summarize(steps, cfg, Date.now())) {
    const p = seen.get(row.model) ?? {steps:0,cost:0,priced:row.priced}
    p.steps+=row.steps; p.cost+=row.cost; seen.set(row.model,p)
  }
}
let tot = 0
for (const [m,s] of [...seen.entries()].sort()) { tot += s.cost; console.log(`  ${m.padEnd(46)} steps=${String(s.steps).padEnd(4)} ¥${s.cost.toFixed(4)} priced=${s.priced}`) }
console.log(`  合计 ¥${tot.toFixed(4)}`)
ok('全部会话均命中实价', [...seen.values()].every(s => s.priced))

console.log('\n=== H. 缓存节省 cacheSaved（推算值）===')
{
  // 周五 10:00（北京时间）＝高峰；flash 高峰价 0.04 / 2.0 / 8.0
  const peak = Date.parse('2026-09-18T10:00:00+08:00')
  const steps = new Map()
  steps.set('1:1', {
    turn: 1, step: 1, time: peak, model: 'deepseek-flash',
    usage: { inputTokens: 0, cacheReadTokens: 1_000_000, outputTokens: 0 },
  })
  const full = M.summarize(steps, cfg, peak)
  const row = full[0]
  ok('命中 100 万 tokens 只按命中价计费', Math.abs(row.cost - 0.04) < 1e-9, `cost=${row.cost}`)
  ok('节省 = 100万 × (未命中2.0 − 命中0.04)', Math.abs(row.savedCost - 1.96) < 1e-9, `savedCost=${row.savedCost}`)

  // 无缓存命中时不应凭空产生节省
  const steps2 = new Map()
  steps2.set('1:1', { turn: 1, step: 1, time: peak, model: 'deepseek-flash',
    usage: { inputTokens: 1_000_000, cacheReadTokens: 0, outputTokens: 0 } })
  ok('无缓存命中则节省为 0', M.summarize(steps2, cfg, peak)[0].savedCost === 0)
}

console.log('\n=== G. 跨会话聚合（lineage 去重 + 防撞车）===')
const mkUsage = (turn, step, input, output) => ({
  type: 'assistant/chunk',
  time: 1789000000000,
  data: { turn, step, chunk: { type: 'usage', usage: { inputTokens: input, outputTokens: output } } },
})
// 父会话 t1s1 = 100 输入；子会话日志 = 物理复制的父事件（继承）+ 自己的 t1s1 = 10 输入
const merged = M.mergeLineageUsage([
  { sessionId: 's-parent', events: [mkUsage(1, 1, 100, 1)], inheritedEventCount: 0 },
  { sessionId: 's-child', events: [mkUsage(1, 1, 100, 1), mkUsage(1, 1, 10, 1)], inheritedEventCount: 1 },
])
ok('跨会话合并后父子各 1 条', merged.size === 2, String(merged.size))
let sumIn = 0
for (const b of merged.values()) sumIn += b.usage.inputTokens
ok('继承事件被切片去重（100+10=110，不重复计）', sumIn === 110, String(sumIn))
ok('跨会话同名 turn:step 不撞车', merged.has('s-parent:1:1') && merged.has('s-child:1:1'), [...merged.keys()].join(','))
ok('无前缀调用向后兼容（key 为 turn:step）', M.collectUsage([mkUsage(2, 3, 5, 0)]).has('2:3'))

console.log('\n=== I. 峰谷拆分 summarizeTide（按每次请求的计费时刻分档）===')
{
  // flash 2026-09-10 12:00 后：高峰 0.04/2/8，低谷 0.02/1/4
  const peakT = Date.parse('2026-09-18T10:00:00+08:00') // 周五 10:00 → 高峰
  const offT = Date.parse('2026-09-18T12:30:00+08:00')  // 周五 12:30 → 低谷（12–14 非高峰窗口）
  const mk = (time, input) => ({
    turn: 1, step: 1, time, model: 'deepseek-flash',
    usage: { inputTokens: input, cacheReadTokens: 0, outputTokens: 0 },
  })

  const steps = new Map([['a', mk(peakT, 1_000_000)], ['b', mk(offT, 1_000_000)]])
  const tide = M.summarizeTide(steps, cfg, peakT)
  ok('高峰/低谷各成一行', tide.length === 2, JSON.stringify(tide.map(r => r.mode)))
  ok('排序为 高峰 → 低谷', tide[0]?.mode === 'peak' && tide[1]?.mode === 'off-peak')
  ok('高峰 100 万未命中 = ¥2.00（高峰 2.0 元/百万）', Math.abs(tide[0].cost - 2) < 1e-9, `cost=${tide[0]?.cost}`)
  ok('低谷 100 万未命中 = ¥1.00（低谷 1.0 元/百万）', Math.abs(tide[1].cost - 1) < 1e-9, `cost=${tide[1]?.cost}`)
  const byModelTotal = M.summarize(steps, cfg, peakT).reduce((s, r) => s + r.cost, 0)
  const byTideTotal = tide.reduce((s, r) => s + r.cost, 0)
  ok('按模型合计 === 按峰谷合计（同源计价，账要对得上）', Math.abs(byModelTotal - byTideTotal) < 1e-12, `${byModelTotal} vs ${byTideTotal}`)
  ok('token 数分档正确（各 100 万）', tide.every(r => r.inputTokens === 1_000_000), JSON.stringify(tide.map(r => r.inputTokens)))
  ok('请求次数分档正确（各 1 次）', tide.every(r => r.steps === 1))

  // 边界：12:00 是闭区间起点（低谷），11:59 仍高峰——同一会话跨边界必须分成两行
  const edge = new Map([
    ['x', mk(Date.parse('2026-09-18T11:59:00+08:00'), 1)],
    ['y', mk(Date.parse('2026-09-18T12:00:00+08:00'), 1)],
  ])
  const edgeTide = M.summarizeTide(edge, cfg, peakT)
  ok('11:59 / 12:00 跨边界分两档', edgeTide.length === 2 && edgeTide[0].mode === 'peak' && edgeTide[1].mode === 'off-peak', JSON.stringify(edgeTide.map(r => r.mode)))

  // 周末 / 法定节假日：全天空闲（官方 2026-09-19 说明），都要落低谷而不是高峰
  const wTide = M.summarizeTide(new Map([['w', mk(Date.parse('2026-09-19T10:00:00+08:00'), 1)]]), cfg, peakT)
  ok('周六 10:00 归低谷', wTide.length === 1 && wTide[0].mode === 'off-peak', JSON.stringify(wTide.map(r => r.mode)))
  const hTide = M.summarizeTide(new Map([['h', mk(Date.parse('2026-10-01T10:00:00+08:00'), 1)]]), cfg, peakT)
  ok('国庆 10-01 10:00 归低谷', hTide.length === 1 && hTide[0].mode === 'off-peak', JSON.stringify(hTide.map(r => r.mode)))

  // 2026-08-17 峰谷制之前：无峰谷档 → 单独成 flat，不得混进低谷谎报「全在低价时段」
  const fTide = M.summarizeTide(new Map([['f', mk(Date.parse('2026-08-01T10:00:00+08:00'), 1)]]), cfg, peakT)
  ok('峰谷制之前的请求 → flat（不谎报低谷）', fTide.length === 1 && fTide[0].mode === 'flat', JSON.stringify(fTide.map(r => r.mode)))

  // 无 usage 的桶不参与（与 summarize 同口径）
  const noUsage = new Map([['n', { turn: 1, step: 1, time: peakT, model: 'deepseek-flash', usage: null }]])
  ok('无 usage 的桶不计入', M.summarizeTide(noUsage, cfg, peakT).length === 0)

  // 跨会话（子代理）：每个桶带自己的时间，天然按各自时刻分档，不需要额外处理
  const mkEvents = (time, input) => [
    { type: 'assistant/chunk', time, data: { turn: 1, step: 1, chunk: { type: 'usage', usage: { inputTokens: input, cacheReadTokens: 0, outputTokens: 0 } } } },
    { type: 'assistant/message', time, data: { turn: 1, step: 1, message: { source: { provider: 'deepseek-official', model: 'deepseek-flash' } } } },
  ]
  const lineage = M.mergeLineageUsage([
    { sessionId: 's1', events: mkEvents(peakT, 1_000_000), inheritedEventCount: 0 },
    { sessionId: 's2', events: mkEvents(offT, 1_000_000), inheritedEventCount: 0 },
  ])
  const lTide = M.summarizeTide(lineage, cfg, peakT)
  ok(
    '跨会话按各自时刻分档（父高峰 ¥2 + 子低谷 ¥1）',
    lTide.length === 2 && Math.abs(lTide[0].cost - 2) < 1e-9 && Math.abs(lTide[1].cost - 1) < 1e-9,
    JSON.stringify(lTide.map(r => `${r.mode}:${r.cost}`)),
  )
}

console.log(`\n${fail.length === 0 ? '🎉 全部断言通过' : `❌ ${fail.length} 项失败：` + fail.join(' / ')}`)
process.exit(fail.length ? 1 : 0)
