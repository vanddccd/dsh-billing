import { collectUsage, summarize } from './host.js'
import fs from 'node:fs'

const raw = fs.readFileSync('/tmp/sess.jsonl', 'utf8')
const events = raw.split('\n').filter(Boolean).map(l => JSON.parse(l))
const session = { events }

const cfg = {
  pricing: {
    'deepseek-v4-flash': {
      cacheHit: 0.02, cacheMiss: 1, output: 2,
      schedules: [{
        effectiveAt: '2026-08-17T00:00:00+08:00',
        timezoneOffsetMinutes: 480,
        peakWindows: [[9,12],[14,18]],
        weekendOffPeak: true,
        offPeak: { cacheHit: 0.05, cacheMiss: 1.5, output: 4.5 },
        peak: { cacheHit: 0.1, cacheMiss: 3.0, output: 9.0 },
      }],
    },
  },
  fallbackPrice: { cacheHit: 0.025, cacheMiss: 3, output: 6 },
}

const steps = collectUsage(session)
console.log('collectUsage 步骤数:', steps.size)
const rows = summarize(steps, cfg, Date.now())
let total = 0
console.log('=== summarize 结果 ===')
for (const r of rows) {
  total += r.cost
  console.log(`model=${r.model} steps=${r.steps} in=${r.inputTokens} cache=${r.cacheReadTokens} out=${r.outputTokens} cost=¥${r.cost.toFixed(6)} priced=${r.priced}`)
}
console.log(`合计: ¥${total.toFixed(4)}`)
