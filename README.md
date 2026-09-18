# dsh-billing

DeepSeek Harness 插件：**账户余额** + **会话费用**（人民币），带 Web UI 悬浮显示。

## 功能

| 入口 | 用法 | 说明 |
| --- | --- | --- |
| UI 会话头部三胶囊 | 无需操作，常驻显示 | **余额 + 本会话费用 + 峰谷时段** 并排显示在会话标题旁；点击任一胶囊立即刷新两个 |
| 悬停明细 | 鼠标悬停 / 键盘聚焦 | **自定义浮层**（不再用原生 `title`）：余额（充值/赠金/美元）、会话费用（分模型拆分 + 占比条 + 缓存命中率 + 缓存节省）、峰谷规则原文 |
| 斜杠命令 `/balance` | 聊天框输入 `/balance` | 查询账户余额（人民币优先，附美元） |
| 斜杠命令 `/cost` | 聊天框输入 `/cost` | 当前会话费用明细 |
| 工具 `deepseek_billing` | 直接问模型"余额多少/花了多少钱" | query = `balance` / `cost` / `both` |

## 会话头部三胶囊

会话标题旁并排显示三个胶囊（适配 DSH 明暗模式，`--dsw-alias-*` design token）：

![dsh-billing 三胶囊](./docs/billing-pills.png)

- **余额**：人民币金额（点击刷新，悬停看充值/赠金/美元明细）
- **会话**：`¥费用(总 token 量)`。金额与 token 数字都带 **NumberFlow 逐位滚动动画**，且按链条时序：**金额先滚动，滚动结束后 token 数字随后滚动**；会话切换/加载中显示默认 `¥0.00(0)`（不残留上一个会话的数字），金额为 `¥0.00` 时 token 不动画
- **峰谷时段**：当前高峰/低谷 + 距下次切换的剩余时间

数字变化时逐位滚动（[NumberFlow](https://number-flow.barvian.me)，odometer 式：**只滚动值变化的位，未变的位静止**），含 `prefers-reduced-motion` 守卫（NumberFlow 内置 `respectMotionPreference`）。

## 0.6.4：悬停明细改为自定义浮层（不再用原生 `title`）

原生 `title` 的体验短板：延迟约 1 秒、纯文本、数字无法对齐、暗色模式下样式不可控、模型一多就糊成一块。本版把三个胶囊的悬停明细全部换成自定义浮层（暗底，沿用 DSH 的 `--dsw-alias-tooltip-bg`）：

- **会话费用浮层**：分模型拆分（模型名 + 金额 + 请求次数 + 缓存命中率）；多于 1 个模型时给 3px 占比条与内联图例；底部给出「缓存节省」与「未命中则需」的对照价——让「一个会话里 A 模型 + B 模型」的动态累加一眼可见
- **缓存节省是推算值**：`命中 token 数 ×（未命中价 − 命中价）`，由宿主算好随 `costPayload.cacheSaved` 下发。客户端只有金额与 token 数、没有单价，**算不出来**，故必须宿主提供。口径假设这些 token 若未命中会按未命中价计费，**不是账单值**
- **余额浮层**：人民币 / 美元的总额、充值、赠金；接口报 `is_available=false` 时直接标注「当前不可用」
- **峰谷浮层**：当前时段、距切换时长、官方规则原文
- **胶囊本体状态色**：改用官方 state token（`--dsw-alias-state-success-primary` / `state-warn-label` / `state-error-primary`），取代旧版硬编码的 `#43b97f` / `#e08a3e`——那两个色既不随主题切换，也偏离官方语义。余额低于阈值（`LOW_BALANCE_CNY`，默认 ¥5）标红
- **可访问性**：移除 `title` 后补 `aria-label`，并支持键盘聚焦展开浮层
- **构建**：`scripts/build.sh` 补 `--jsx-fragment=Fragment`（浮层用到 Fragment，缺它会编译成不在作用域的 `React.Fragment`）
- **回归**：`scripts/verify-pricing.mjs` 新增 H 段（缓存节省口径 3 项断言），共 51 项
- **设计稿**：`docs/mockup/`（A/B/C 三方向 + 选定的 D 版「克制版仪表盘」）
- **刷新策略如实化**：旧注释写的「轮次中每完成 10 步刷新一次」与实现不符——新版会话快照只暴露 `running`、不暴露 turn/step，这条能力拿不到，已从代码注释中移除（README 本就未记载）

## 0.6.2：会话费用聚合子代理（含去重）

主会话的费用/ token 统计从「仅本会话」改为「本会话 + 全部子代理后代会话」（含孙代理，递归）：

- **谱系发现**：`sessionQuery.traceSession` 一次拿到完整后代树；不可用或失败时降级为只统计本会话
- **继承去重**：子代理会话是 fork 出来的，日志开头物理复制了继承的父会话事件（`inheritedEventCount`），直接相加会重复计费——聚合时每个会话只取 `[inheritedEventCount:]` 之后自己产生的事件
- **key 防撞车**：跨会话合并时 stepKey 加会话 id 前缀（`collectUsage(events, keyPrefix)`），防止主/子会话同名 `turn:step` 互相覆盖
- **鲁棒性**：单个子会话日志读取失败跳过并计数（输出 ⚠️ 提示），绝不因个别损坏会话拖垮整体
- 三个入口统一：`/cost` 命令、`deepseek_billing` 工具、Web 胶囊 `/billing/cost` RPC（payload 新增 `subagentSessions`、`failedSessions` 字段）
- 回归新增 G 段：继承切片去重、跨会话防撞车、无前缀向后兼容

## 0.6.1：撤销 V4 Pro 下线切价（2026-09-13 校准）

官方 2026-09-13 在价格页脚注 (2) 更新公告：原定 **2026-09-14 的 V4 Pro 下线计划取消，9 月 14 日之后继续提供 V4 Pro API 服务、计费方式保持不变**。0.6.0 预置的「09-14 12:00 v4-pro 按 Flash 价计费」档与官方最终口径相反（若保留，9-14 之后 v4-pro 会**低估约 3.4 倍**），本版本已删除该档：

- `host.js`：`PRO_SERIES_RATES` 只保留 2026-08-17 起的 pro 价档（空闲 `0.15 / 4.5 / 13.5`，高峰 `0.30 / 9 / 27`），v4-pro 不再有切价档
- `scripts/verify-pricing.mjs`：同步更新断言（09-14 12:00 之后 v4-pro 仍 pro 价、pro 档数为 1），回归全绿
- 教训：**未来生效档的预置基于「官方公告」，公告随时可能被官方自己推翻**；预置后仍应在临近生效前复核价格页脚注，确认公告未被撤销

## 0.6.0：对齐官方现行价与模型下线计划（2026-09-11 校准，其中 V4 Pro 下线计划已被官方 09-13 公告撤销，见上节 0.6.1）

官方依据（定价页脚注原文）：
- 推荐模型名改为 **`deepseek-flash`**；旧名 `deepseek-v4-flash`、`deepseek-v4-flash-vision-exp` 已下线，仍可调用但由 V4.1-Flash 提供服务、**按 Flash 价计费**
- **V4 Pro 有序下线**：北京时间 **2026-09-14 12:00 之后**，`deepseek-v4-pro` 的请求全部路由到 V4.1 Flash，**并按 V4.1 Flash 价计费**
- 高峰定义：北京时间**周一至周五** 9:00–12:00、14:00–18:00，其余（含周末全天）为空闲；空闲价 = 高峰价的一半

本版本改动：

- **修掉「在线同步静默失效」**（关键）：官方表头写作 `deepseek-flash<sup>(1)</sup>`，剥标签后是 `deepseek-flash(1)`，旧解析器要求整串正则匹配 → 模型列识别为空 → 每次同步都返回 null。**同步机制一直在跑，但从未生效过**，费用一直吃内置硬编码表。现改为归一化后取模型名（容忍脚注角标 `(1)`、`[*]`、大小写），指标列也容忍 `<br>` 折行，同步真正生效
- **内置表补官方现行名**：新增 `deepseek-flash` 精确键（此前只靠 id 含 "flash" 命中系列锚点才碰巧算对）；`deepseek-v4-flash*` 归 flash 系列（官方口径同价）
- **预置 2026-09-14 12:00 v4-pro 按 Flash 价计费**：pro 系列新增一档，到点自动从 `0.30 / 9 / 27` 切到 `0.04 / 2 / 8`（空闲档 `0.15 / 4.5 / 13.5` → `0.02 / 1 / 4`）。不预置的话 9-14 之后 v4-pro 会**高估约 3.4 倍**
- **兜底价钉死**：仍为 pro 最高价 `0.15 / 4.5 / 13.5`，且**不再复用 pro 系列价目**——否则 9-14 会跟着降到 flash 价，把「未知模型」往低估方向带
- **峰谷判定改为分钟粒度**：窗口端点 12:00 / 18:00 是闭区间起点，旧的「只比小时」实现与新的分钟实现在**当前整点窗口下结果等价**（严谨性提升，为将来分钟级窗口预留）
- **客户端不再自己编时段口径**：峰谷窗口改由宿主 `/billing/tide` 下发（含 `weekendOffPeak`、时区偏移），客户端随分钟自算翻转；宿主判定权与客户端展示口径同源，杜绝两边漂移
- **新增 `scripts/verify-pricing.mjs`**：51 项断言（解析器 / 内置价表 / 峰谷边界 / 同步幂等不回溯 / tide 载荷 / 真实会话回归 / 缓存节省口径 / 跨会话聚合去重），改价或改代码后一条命令回归

## 0.5.0：定价对齐官方最新价（2026-09-09 校准）

- **内置价表按「定价系列」组织**：flash 系列（官方现行名 `deepseek-flash`，以及已下线但仍可调用的 `deepseek-v4-flash`、`deepseek-v4-flash-vision-exp`、限时内测的 `deepseek-v4.1-flash-*`）与 pro 系列各自维护历史价目
- **补全本机在用模型**：`deepseek-v4-flash-vision-exp`、`deepseek-v4.1-flash-expires-on-0910`——此前未收录，会话费用一直按兜底价估算（`/cost` 会标「未配置单价」）
- **系列匹配**：官方按系列定价，故官方价格页尚未收录的内测模型（如 `deepseek-v4.1-flash`）自动归入所属系列，不再落兜底价
- **预置 2026-09-10 12:00 flash 系列降价**：空闲 `0.02 / 1 / 4`，高峰 `0.04 / 2 / 8`（缓存命中降幅 60%），到点自动切换，无需改代码
- **兜底价**：钉死为 pro 最高价（`0.15 / 4.5 / 13.5`；高峰 `0.30 / 9 / 27`）：未知模型宁可略高估，不低估。**刻意不跟随 pro 系列价目**，免得 9-14 后连带下调
- **在线同步不再回溯历史**：同步到的价作为「首次观察时刻起生效」的新档追加，官方改价只影响之后的请求
- **旧模型** `deepseek-chat` / `deepseek-reasoner` 保留（官方价格页已下架），仅历史会话可能命中，不随系列调价

## 本版本适配（新版 dsh alpha）

适配当前 dsh alpha（0.1.2-alpha.4）插件 API，并补充峰谷定价与 UI 动画：

- **host.js**：兼容新版 dsh（RPC handle 签名、`sessionQuery` 读取会话事件）
- **host.js**：价格同步——保留「每 12 小时自动同步 + 启动立即 + 失败重试」机制，并**修复官方价格页解析 bug**（原版本同步机制在跑，但解析出的单价是错的：模型列错位、峰谷价表未解析），使同步结果准确（含峰谷价）
- **host.js**：新增 2026-08-23 起周末（周六/周日）全天执行低谷价
- **client.js**：会话头部三胶囊 + 明暗模式适配 + 数字 NumberFlow 逐位滚动
- **package.json / cordis.patch.yml**：条件导出 + `dsh.client.inject` 声明 + 修复 `!!js` 表达式

## 结构

- `host.js` — 宿主插件：命令 + 工具 + `/billing/{balance,cost,tide}` RPC 通道（供浏览器胶囊读取）
- `client.js` — 浏览器 bundle（**构建产物**，`__ModuleLoader__` 工厂格式，仅依赖平台共享的 react；NumberFlow 已内联）
- `client/src/` — 客户端源码（`index.tsx` 主组件 + 三个浮层：会话费用 / 余额 / 峰谷 / `rolling.tsx` NumberFlow 封装 / `format.ts` 金额位数 / `tide.ts` 峰谷兜底自算 / `pills.css` 胶囊与浮层样式）
- `scripts/build.sh` — 构建脚本：esbuild 打包 `client/src/index.tsx` → `client.js`
  - `conversation.session.header.actions` 槽位（负数 order = 静态会话上下文）→ 余额 + 会话费用 + 峰谷时段三胶囊
- `scripts/verify-pricing.mjs` — 定价回归脚本（`node scripts/verify-pricing.mjs`），官方页在线抓取，失败回退本地缓存
- `package.json` — 声明 `dsh.bundle`（空 patch）+ `dsh.client`（web 平台）
- `cordis.patch.yml` — 空层；本插件由 profile 的 `cordis.patch.yml` 插入行激活

## 安装（一条命令）

组合包自带激活层（`cordis.patch.yml`），安装后自动生效，无需手改任何配置：

```sh
# 从本地目录安装
dsh plugin --profile web add ./deepseek-billing

# 或从打包产物安装（跨机器分发推荐）
dsh plugin --profile web add ./dsh-billing-0.5.0.tgz

# 或从 npm / git 安装（发布后）
dsh plugin --profile web add dsh-billing
dsh plugin --profile web add github:you/dsh-billing
```

安装后**重启 `dsh web`**，再刷新浏览器页面（F5）使新 boot graph 生效。
宿主侧 API key 使用 `DEEPSEEK_API_KEY` 凭据引用（在 Web 模型设置页保存即可）。

## 配置（全部可选）

`config.pricing` 按模型覆盖单价（元/百万 tokens），支持峰谷价自动切换（见 `host.js` 顶部默认值）。例如：

```yaml
config:
  pricing:
    deepseek-v4-pro:
      cacheHit: 0.15
      cacheMiss: 4.5
      output: 13.5
      schedules:
        - effectiveAt: '2026-08-17T00:00:00+08:00'
          timezoneOffsetMinutes: 480
          peakWindows: [[9, 12], [14, 18]]
          weekendOffPeak: true
          offPeak: { cacheHit: 0.15, cacheMiss: 4.5, output: 13.5 }
          peak: { cacheHit: 0.30, cacheMiss: 9.0, output: 27.0 }
```

## 更新频率（事件驱动）

- **会话运行结束**（running 由 true → false）：刷新一次，结算本轮
- **挂载 / 切换会话 / 点击任意胶囊 / 页面从后台切回可见**：立即刷新
- **空闲时不发网络请求**：不做定时轮询，仅上述事件发生时请求（峰谷时段胶囊每分钟更新一次本地时间，不产生网络请求）
- 服务端通过 `sessionQuery` 读取会话事件（含历史/持久日志）计算费用，无后台常驻任务

## 价格自动同步（官方改价怎么办）

- 启动时 + 每 12 小时自动拉取官方价格页（https://api-docs.deepseek.com/zh-cn/quick_start/pricing/）解析最新单价（含峰谷价）
- **模型列识别需容错**：官方表头把模型名写成 `deepseek-flash<sup>(1)</sup>`（脚注角标），指标列用 `<br>` 折行。0.6.0 前解析器要求整串精确匹配 → 模型列为空 → 同步静默返回 null（机制在跑，但从未生效）。改价后若发现「单价来源：内置默认」，先怀疑这里
- **生效时间口径**：同步到的价以「首次观察到它的同步时刻」生效（新追加一档），官方改价不会回溯改写历史会话的费用
- **预置未来档**：内置价表可预置已知的降价档（如 2026-09-10 12:00 的 flash 降价），到点自动切换；若官方价格页显示的价与当前生效档不符，则以官方为准并丢弃已被证伪的预置未来档。注意：未来档源于官方公告，公告可能被撤销（0.6.0 预置的 V4 Pro 下线切价档即被官方 09-13 公告推翻），临近生效前应复核
- 解析失败自动回退：上次成功在线值 → 内置默认值；费用输出会标注当前来源与同步时间
- 优先级：**用户显式配置 > 官方在线同步 > 内置默认**（用户对某个模型写过 pricing 就永远以它为准）
- 可在 `config.priceSync` 关闭或调整：`{ enabled: true, url: "...", intervalMs: 43200000 }`

## 计费口径

- token 取自会话日志中 provider 上报的 `usage`（含缓存命中拆分；失败重试也计入）
- 单价内置官方价格：2026-08-17 起按北京时间峰谷价（**高峰＝周一至周五 9:00–12:00、14:00–18:00，其余含周末全天空闲**；空闲价 = 高峰价的一半），2026-09-10 12:00 起 flash 系列降价；V4 Pro 原定 2026-09-14 下线已由官方撤销，**继续按 pro 价计费**
- 峰谷判定**分钟粒度**，窗口端点（12:00 / 18:00）为闭区间起点
- 模型按「定价系列」匹配（flash / pro），官方价格页未收录的内测模型也能算准
- 主会话统计含全部子代理后代会话（递归聚合，fork 继承事件已去重）；子代理会话单独看时只统计自己
- 输出为估算值，实际扣费以 DeepSeek 官方账单为准

## 维护提示

- 改 `client/src/*` 后：先 `bash scripts/build.sh` 重新构建 `client.js`（**勿手改产物**），再刷新页面
- 构建依赖 `@number-flow/react`（`npm install`，仅构建时需要，产物已内联）
- 改 `host.js` 后：跑 `node scripts/verify-pricing.mjs` 回归（在线抓官方页，失败用缓存），再重启 `dsh web`；若热重载未生效（Node ESM 缓存），可改文件名/包名触发重导入
- 官方改价后的处理顺序：跑回归脚本看 A 段解析结果 → 若官方价与内置最新档不一致，同步机制会自动追加新档；若是**未来生效**的公告价（下线/降价计划），则手工预置一条 schedule 档更稳

官方文档：
- 查询余额：https://api-docs.deepseek.com/zh-cn/api/get-user-balance/
- 模型 & 价格：https://api-docs.deepseek.com/zh-cn/quick_start/pricing/
- Harness 客户端模块：https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/client-modules
