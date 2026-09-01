﻿# picture-zip 项目开发规范（PRD + 技术规范 v1.0）

> 本文档是 picture-zip 项目的唯一权威规范，覆盖产品需求、功能明细、用户故事、技术环境、架构、部署与运维监控。目标读者：AI 编码工具（Claude Code / Cursor 等）与开发者本人。
> 任何与本文档冲突的实现，以本文档为准；修改需求先改本文档再改代码。

---

## 1. 项目概述

### 1.1 一句话定位

picture-zip 是一个**纯浏览器本地处理**的批量图片压缩与格式转换工具：用户拖入任意数量的图片，在**不上传服务器**的前提下完成压缩、转格式、压到目标体积（如 ≤100KB），随后打包 ZIP 下载。中英双语，面向全球用户，通过 Google 自然搜索获取流量。

### 1.2 项目背景与目标

| 项目 | 内容 |
|---|---|
| 性质 | 个人运营的流量型工具网站，AI 辅助开发 |
| 商业目标 | 覆盖服务器成本（约 ¥30–60/月）；远期广告 + API 小额收益 |
| 运维目标 | 单机 Docker Compose 生产部署，落地 Prometheus + Grafana + Loki + Alertmanager 监控体系，积累真实运维经验 |
| SEO 目标 | 上线 1 周内提交 Google Search Console / Bing Webmaster；3 个月内 3–5 个场景词进入前 3 页 |
| 用户目标 | 3 个月内月 PV 达到 10,000+ |

### 1.3 成功指标（3 个月观察）

- 月 PV ≥ 10,000（umami 统计）
- 核心场景词（如 "compress image to 100kb"）至少 1 个进入 Google 前 3 页
- 广告收入 ≥ $5/月（即覆盖成本）
- 服务可用性 ≥ 99.5%（Uptime Kuma 月报）
- Lighthouse 性能分 ≥ 90（工具页）

---

## 2. 目标用户与需求分析

### 2.1 用户画像

| 画像 | 场景 | 典型诉求 |
|---|---|---|
| 考试/报名者 | 公务员、教资、签证等报名，照片有格式和体积上限（如 ≤50KB） | "把这个照片压到 50KB 以内还要清晰" |
| 站长/前端 | 做网站性能优化（Lighthouse 提分、Core Web Vitals） | "几百张 PNG 批量转 WebP，保透明，别让我一张张点" |
| 电商卖家 | 平台对主图有体积/格式限制 | "200 张主图批量压到 200KB 内" |
| 社交用户 | 表情包/GIF 体积超微信限制 | "把 GIF 压到 1MB 内还能看" |
| iPhone 用户 | HEIC 传到 Windows/微信打不开 | "HEIC 批量转 JPG" |
| 开发者 | 想在自动化脚本里调用压缩能力 | "有没有 API，别让我手点" |

### 2.2 现有竞品痛点（本项目机会）

| 竞品 | 痛点 | 本项目对策 |
|---|---|---|
| TinyPNG | 免费网页版一次 20 张、单张 ≤5MB，必须上传服务器 | 不限数量、不上传 |
| Squoosh | 一次只能一张，无批量 | 批量 + 队列 |
| 佐糖/图好快等 | 强制上传 + 广告密集 + 会员引导 | 本地处理 + 界面干净 |
| PicTech 等 | 功能单一、无场景化入口 | 场景落地页矩阵 |

### 2.3 用户故事（验收基准）

1. 作为考试报名者，我上传一张 5MB 证件照，输入"100KB"，10 秒内得到一张 ≤100KB 且人脸清晰可辨的照片，直接下载。
2. 作为站长，我一次拖入 200 张 PNG，全部转为 WebP（保透明），点一次 ZIP 下载全部，全程无上传动作（页面明确标注"本地处理，文件不离开设备"）。
3. 作为手机用户，我用手机浏览器打开网站，完成 HEIC→JPG 转换并下载，不跳应用商店。
4. 作为开发者，我查看 API 文档页，了解 API 配额与定价（占位页亦可）。
5. 作为任何用户，我不注册、不登录、不付费即可完成上述全部核心操作。

---

## 3. 功能需求明细

### 3.1 功能优先级总览

| 优先级 | 模块 | 说明 |
|---|---|---|
| P0 | 图片压缩 | 质量/格式/尺寸调整 |
| P0 | 目标大小模式 | 压到 ≤X KB |
| P0 | 格式转换 | JPEG/PNG/WebP/AVIF 输出 |
| P0 | 批量队列 + ZIP 打包下载 | 核心体验 |
| P0 | 中英双语 | zh / en，浏览器语言自动识别 |
| P0 | SEO 基建 | 场景落地页、sitemap、meta、结构化数据 |
| P1 | HEIC 输入支持 | iPhone 图 |
| P1 | 手机端适配 | 完整可用 |
| P1 | 隐私与 FAQ 页 | 信任建设 |
| P1 | API 占位页 | SEO/商业意图占位 |
| P2 | PWA / 前后对比 | 加分项 |
| P2 | API 实际开通 | 流量验证后 |

### 3.2 P0：图片压缩核心

**F-01 拖拽/选择上传（本地）**
- 拖拽多选 + 点击选择 + 整文件夹拖入/选择（`webkitdirectory`）；粘贴 Ctrl+V（P1）
- 支持输入格式：JPEG、PNG、WebP、GIF（P1 支持 AVIF、HEIC 输入）
- 单文件大小上限：**无**（本地处理不做硬限制）；仅对 >80MB 文件提示"超大文件可能较慢/占用内存"
- 数量上限：**无**；超过 200 张提示"任务较多，建议分批或使用排队模式"

**F-02 压缩设置面板**
- 输出格式：Auto（同源）、JPEG、PNG、WebP、AVIF
- 质量滑杆 1–100，默认 75；实时显示预估输出体积（P1 预估，P0 显示原始大小）
- 调整尺寸：最大宽度/高度（等比缩放），默认不缩放
- 预设：Web 优化（WebP Q75）、极致（AVIF Q50）、兼容（JPEG Q80）

**F-03 目标大小模式（杀手锏，必须做好）**
- 用户输入目标体积（KB），如 100、50、200
- 实现：二分搜索编码质量 + 必要时等比降分辨率，直到输出 ≤ 目标值
- 结果显示"达标 ✓ 98KB"；若无法在不低于 300×300 分辨率下达标，显示"已压到最小 42KB（分辨率已降）"
- GIF 不支持目标大小模式（置灰并说明）

**F-04 批量处理引擎**
- Web Worker 并行：`max(1, min(4, hardwareConcurrency - 1))` 个 worker
- 队列状态机：`pending → processing → done / failed / skipped`
- 单张失败不中断批次；失败原因显示（格式不支持/内存不足）
- 支持暂停/继续/取消全部
- 处理顺序：先进先处理；存在未下载任务时页面刷新/关闭弹 `beforeunload` 确认

**F-05 结果与下载**
- 每张显示：缩略图、文件名、原大小→新大小、压缩率徽章（如 -78%）
- 单张下载；全部打包 ZIP（`fflate`）下载；文件名规则：`原名_compressed.webp`，重名自动加序号
- 全部完成后顶部显示总压缩量："已节省 45.3 MB（83.2%）"
- 前后对比（P2）：单张拖动分割线查看画质

### 3.3 P0：页面与 SEO

**F-06 页面清单（首发 7 页）**

| 页面 | 路径（en / zh 同结构） | 目标关键词 |
|---|---|---|
| 首页+工具 | `/` | image compressor, bulk image compression |
| 指定大小 | `/compress-to-100kb`（50/200 同理） | compress image to 100kb / 50kb / 200kb |
| PNG→WebP | `/png-to-webp` | png to webp, transparent webp |
| HEIC→JPG | `/heic-to-jpg` | heic to jpg |
| GIF 压缩 | `/gif-compressor` | compress gif |
| API | `/api` | image compression api |
| 关于/隐私 | `/about`, `/privacy` | 品牌词 |

- 每个场景页 = 同一工具组件 + 预置参数（如 100kb 页自动锁定目标大小模式 =100KB）+ 场景文案 + FAQ
- URL 结构：英文默认 `picture-zip.com/png-to-webp`；中文 `picture-zip.com/zh/png-to-webp`；默认语言按 `navigator.language` 自动识别（带 hreflang 互链）
- 域名：`picture-zip.com`（如已被注册则备选 picturezip.app 等，注册前先查询可用性）

**F-07 SEO 技术要求**
- 全静态渲染，每页独立 title/description/canonical/OG 标签
- `sitemap.xml` 自动生成；`robots.txt` 允许全部
- JSON-LD：`WebApplication` + 每页 `FAQPage` 结构化数据
- 性能预算：工具页首屏 JS ≤ 200KB gzipped（WASM 按需加载不计入首屏）、LCP < 2.5s、CLS < 0.1
- 图标全部内联 SVG 或本地资源；不依赖外部字体（中文用系统中文字体栈，英文用系统字体栈）

**F-08 国际化（i18n）**
- 语言：en（默认）、zh-CN
- 文案集中在 `src/i18n/en.json` / `zh.json`，AI 生成后人工校对
- `<html lang>` 动态正确；`hreflang` 互链；语言切换器在页头
- 数字与大小显示：`1.2 MB` / `1,234 KB` 格式化函数统一处理

### 3.4 P1 功能

- **F-09 HEIC 输入**：引入 `libheif-js` WASM 解码；HEIC 仅支持作为输入转出 JPEG/WebP，不支持输出 HEIC
- **F-10 移动端完整适配**：核心流程手机可用；拖拽区兼容 `input[type=file]` 调起系统相册
- **F-11 隐私页 + FAQ 页**：明确写"所有处理在您的浏览器本地完成，文件不会上传到服务器"；FAQ 覆盖"压缩会损坏画质吗/有数量限制吗/数据安全吗"
- **F-12 API 占位页**：展示"HTTP API coming soon + 邮件订阅（mailto 或表单占位）"，含 SoftwareApplication 结构化数据
- **F-13 GIF 支持**：输入 GIF；输出 GIF 帧级压缩（P2：GIF→MP4/WebM 提示）

### 3.5 P2（明确不做/延后）

- 用户系统、登录、支付（MVP 不做）
- 云端压缩、API 实际服务、CMS 插件（流量验证后立项）
- AI 超分/抠图等增值功能（远期）

---

## 4. 技术环境与架构

### 4.1 技术栈选型（含理由）

| 层 | 选型 | 理由 |
|---|---|---|
| 框架 | **Astro 5.x** 静态站 | 零 JS 默认、内容页 SEO 极佳、支持 Islands 注入交互组件 |
| 前端交互 | 原生 TS + Preact islands（按需） | 体积小；工具组件复杂度可控 |
| 图像编解码 | **@jsquash 系列**（jamsinclair/jSquash，WASM） | Squoosh 官方开源编解码器（MozJPEG/OxiPNG/WebP/AVIF），质量与安全背书 |
| ZIP | fflate | 无依赖、体积小、同步打包快 |
| HEIC | libheif-js | 成熟的 WASM 方案 |
| 样式 | 原生 CSS + CSS 变量 | 不引 UI 框架，控制体积；如用 Tailwind 必须 purge |
| 服务器 | 2C2G VPS + Docker Compose | 单机即可；本地处理使带宽压力极小 |
| 反代 | Caddy 2 | 自动 HTTPS、配置极简 |
| CDN | Cloudflare 免费版 | 全球加速 + 基础防护 |
| 分析 | umami 自托管 | 无 Cookie、轻量、数据自持 |
| 监控 | Prometheus + Grafana + Loki + Alertmanager + Uptime Kuma | 见第 6 节 |
| CI/CD | GitHub Actions → SSH 部署 | push main 自动构建上线 |

### 4.2 本地开发环境要求

| 项 | 要求 |
|---|---|
| OS | Windows 10/11（当前机器）或任意 |
| Node.js | ≥ 20 LTS（含 npm） |
| 包管理 | pnpm（推荐）或 npm |
| 编辑器 | VS Code / Cursor（AI 辅助编码） |
| 浏览器 | Chrome 最新版（开发调试）+ Safari 移动模拟测试 |
| Git | 必需，仓库托管 GitHub（私有仓库） |

```bash
# 本地启动（预期命令）
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # 产出 dist/
pnpm preview    # 本地预览产物
```

### 4.3 目录结构（约定）

```
picture-zip/
├── astro.config.mjs
├── package.json
├── public/
│   ├── favicon.svg
│   └── robots.txt
├── src/
│   ├── components/        # Uploader / QueueList / SettingsPanel / ResultCard / ZipButton
│   ├── lib/
│   │   ├── codecs.ts      # jsquash 封装：各格式 encode/decode
│   │   ├── compress.ts    # 压缩流水线：decode →(resize)→ encode
│   │   ├── targetSize.ts  # 二分搜索目标大小
│   │   ├── queue.ts       # 任务队列 + Worker 池
│   │   └── i18n.ts        # 语言检测与切换
│   ├── workers/
│   │   └── compress.worker.ts
│   ├── i18n/
│   │   ├── en.json
│   │   └── zh.json
│   ├── layouts/Layout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── png-to-webp.astro
│   │   ├── heic-to-jpg.astro
│   │   ├── compress-to-100kb.astro   # 50/200kb 同理
│   │   ├── gif-compressor.astro
│   │   ├── api.astro
│   │   ├── about.astro
│   │   ├── privacy.astro
│   │   └── zh/...                    # 中文路由
│   └── styles/global.css
└── docker/                # 部署用（见第 5 节）
    ├── Dockerfile
    ├── Caddyfile
    └── docker-compose.yml
```

### 4.4 核心数据流（文字版架构）

```
用户拖入文件 → File 对象数组（不离开浏览器）
  → 队列（pending）
  → Worker 池并行消费
      → createImageBitmap / jsquash decode
      → (可选 resize)
      → encode（质量参数 或 二分目标大小）
  → 结果 Blob（内存中）
  → 单张下载 / fflate 打包 ZIP 下载
  → 释放内存（URL.revokeObjectURL）
```

硬性约束：
- 全流程对用户文件**零网络请求**（除静态资源与 umami 统计）；代码中禁止出现把用户文件内容写入任何 fetch/XHR body 的路径
- 内存管理：处理完成并下载后立即释放 Blob 引用；>200 张时引导用户分批
- WASM 按格式懒加载：仅当用到该编解码器时 `import()`

---

## 5. 部署规范

### 5.1 生产架构建议（优先）

> 图片完全在浏览器处理，服务器不承载图片上传、编码和存储。静态站使用 VPS 只会增加 Docker、证书、补丁和故障维护成本。

**推荐方案：Cloudflare Pages**

| 组件 | 方案 |
|---|---|
| 网站 | Astro dist 部署到 Cloudflare Pages |
| 域名/DNS/CDN | Cloudflare（免费版） |
| HTTPS | Cloudflare 自动处理，SSL 模式必须设为 Full (strict) |
| 统计 | Umami 单独部署在小 VPS 或使用第三方（Plausible Cloud） |
| 监控 | UptimeRobot / BetterStack 外部拨测 |

**备选方案：单机 Docker（学习/运维实践）**

| 组件 | 规格 |
|---|---|
| Web + Umami + PostgreSQL + Uptime Kuma | 2 vCPU / 4GB RAM / 50GB NVMe |
| 加上完整监控栈（Prometheus + Grafana + Loki + Promtail + Alertmanager） | 4 vCPU / 8GB RAM |

⚠️ 2C2G 不适合运行完整监控栈，容易内存告警甚至 OOM。

**节点选择：**
- 全球英文用户：Hetzner 欧洲/美国、DigitalOcean、Linode
- 亚洲用户：Vultr 东京/新加坡、Linode 东京/新加坡
- 中文用户占比高：阿里云香港/日本、腾讯云国际
- 不建议 Oracle Always Free 作为唯一生产依赖

### 5.2 服务器要求（Docker 方案）

| 项 | 要求 |
|---|---|
| VPS | 2C4G 起步（推荐 4C8G 如运行监控栈），香港/日本/美国节点 |
| 系统 | Ubuntu 22.04/24.04 LTS |
| 依赖 | Docker + Docker Compose 插件 |
| 域名 | picture-zip.com（DNS 托管 Cloudflare） |
| SSH | 仅密钥认证，禁用密码登录，配置主机指纹校验 |

### 5.3 docker-compose 拓扑

```
caddy (80/443) ──> web (Astro 静态产物, nginx:alpine 托管 dist/)
              ├──> umami (+ PostgreSQL)
              └──> uptime-kuma (状态页)

# 监控栈（可选，--profile monitoring）
              ├──> prometheus / node_exporter / blackbox_exporter
              ├──> grafana / loki / promtail / alertmanager
```

- 静态产物多阶段 Docker 构建：`node:20 build → nginx:alpine 托管 dist/`
- CI 构建 Docker image 推送到 GHCR，服务器拉取指定版本（不再在 VPS 上重新构建）
- Caddy 自动 HTTPS（Let's Encrypt）；HTTP 强制跳转 HTTPS；启用 HSTS
- Cloudflare 代理开启；SSL 模式设为 Full (strict)；源站防火墙仅放行 CF IP 段 + SSH 白名单
- 管理服务（Grafana、Prometheus、Alertmanager）不直接暴露公网，通过 SSH 隧道或 Tailscale 访问
- 所有密码和密钥使用 `${VAR:?must_set}` 强制设置，不提供默认值
- 镜像固定版本或 digest，不使用 `latest` 标签
- 所有服务配置 healthcheck

### 5.4 CI/CD

- GitHub Actions：push → main → CI 构建 + Docker 镜像构建 → 推送 GHCR → SSH 到 VPS 拉取指定版本 → 容器重启 → 健康检查
- 部署失败自动回滚（保留上一版本镜像 tag）
- **部署前必须通过 CI**（`pnpm audit` 高危即失败，不再 `|| true`）
- 密钥全部走 GitHub Secrets，不进仓库
- SSH 部署使用主机指纹校验（`StrictHostKeyChecking`）
- 部署后执行本地源站健康检查 + 外部拨测

### 5.5 安全要求

- `.dockerignore` 排除 `.git`、测试文件、截图、`.env` 等非必要文件
- Cloudflare SSL 模式：Full (strict)（不接受 Flexible）
- SSH 主机指纹校验，禁止首次连接自动接受未知主机密钥
- PostgreSQL / Umami 数据库定期 offsite 备份（restic → B2 或另一台 VPS）
- 管理面板（Grafana、Umami 后台）不直接暴露公网，通过 Cloudflare Access、Tailscale 或 SSH 隧道访问
- CSP 头：`default-src 'self'`，WASM 允许 `wasm-unsafe-eval`，Umami 脚本允许自托管域名

---

## 6. 监控与运维（学习目标 = 生产保障）

### 6.1 分阶段上线计划

| 阶段 | 组件 | 目的 |
|---|---|---|
| Day 1 | Uptime Kuma | 拨测 + 对外状态页（status.子域） |
| Week 2 | Prometheus + node_exporter + blackbox_exporter | 主机指标 + HTTP 拨测 |
| Week 3 | Grafana + Loki + Promtail | 可视化看板 + 日志聚合 |
| Week 4 | Alertmanager | Telegram 告警闭环 |
| 持续 | umami + restic 每日备份 + GH Actions | 统计/备份/部署自动化 |

### 6.2 监控指标基线

- 主机：CPU、内存、磁盘（>80% 告警）、负载
- HTTP：状态码、TTFB、证书剩余天数（<14 天告警）
- 容器：各服务 up 状态、重启次数
- 业务：umami PV/UV、热门落地页、来源关键词

### 6.3 告警规则（初始）

| 条件 | 级别 | 通道 |
|---|---|---|
| 站点连续 2 分钟不可达 | P0 | Telegram 即时 |
| 证书 <14 天 | P1 | Telegram |
| 磁盘 >80% | P1 | Telegram |
| 内存 >90% 持续 5 分钟 | P1 | Telegram |

---

## 7. 质量要求与验收标准

### 7.1 功能验收

- [ ] 100 张 PNG（混合 1–10MB）批量转 WebP，全程无卡死；DevTools Network 面板验证除静态资源外无文件上传请求
- [ ] 目标大小模式：5MB 证件照 → ≤100KB，尽可能达到目标；无法达到时返回最小可达结果并说明实际参数（分辨率、质量）（50 张随机图片测试）
- [ ] 透明 PNG → WebP 透明保留（视觉验证 alpha 通道）
- [ ] ZIP 解压后文件名/格式正确，重名不覆盖
- [ ] 中英切换完整、hreflang 正确、`<html lang>` 正确
- [ ] 手机 Safari/Chrome 全流程可用
- [ ] Lighthouse：Performance ≥ 90 / SEO ≥ 95 / Best Practices ≥ 95

### 7.2 兼容性

- 浏览器：Chrome/Edge/Firefox/Safari 最近 2 个大版本
- 移动端：iOS Safari 16.4+（需要 `createImageBitmap` 和 Canvas 支持）、Android Chrome 100+
- 不支持 `createImageBitmap` 或 Canvas 的浏览器：显示特性检测提示，引导升级
- Worker 中 OffscreenCanvas 不可用时自动回退到主线程 Canvas 处理
- 不支持 WASM 的过旧浏览器：显示引导升级页（<0.1% 流量，可接受）

### 7.3 安全与隐私

- 全站 HTTPS + HSTS；无第三方追踪脚本（umami 自托管）
- CSP 基线：`default-src 'self'`，WASM 允许 `wasm-unsafe-eval`；Umami 脚本允许自托管域名
- 所有内联脚本已移至外部 JS 模块，不依赖 `'unsafe-inline'`（仅 `style-src` 保留 `'unsafe-inline'` 用于 Astro 作用域样式）
- 无 Cookie（umami 免 Cookie 模式），无需欧盟 Cookie 横幅
- 依赖锁版本（pnpm-lock.yaml），CI 中 `pnpm audit` 高危漏洞即失败（不使用 `|| true`）
- Docker 镜像固定版本或 digest，不使用 `latest`
- 所有密码/密钥使用 `${VAR:?must_set}` 强制设置
- 管理面板不暴露公网（通过 SSH 隧道/Tailscale 访问）
- `.dockerignore` 排除 `.git`、测试文件、截图、`.env`
- PostgreSQL / Umami 数据库 offsite 备份
- SSH 主机指纹校验，禁止自动接受未知主机密钥
- Cloudflare SSL 模式：Full (strict)

### 7.4 性能预算

| 项 | 预算 |
|---|---|
| 首屏 JS（工具页） | ≤ 200KB gzipped（WASM 懒加载另计） |
| LCP | < 2.5s（4G 模拟） |
| CLS | < 0.1 |
| 静态资源缓存 | 一年 immutable + 文件名 hash |

---

## 8. 项目里程碑

| 里程碑 | 时间 | 交付物 |
|---|---|---|
| M1 骨架 | 第 1 周前半 | Astro 初始化、Layout、i18n 框架、首页+工具可用（单张压缩） |
| M2 核心 | 第 1 周后半 | 批量队列 + Worker 并行 + ZIP 打包 + 目标大小模式 |
| M3 页面矩阵 | 第 2 周 | 7 个页面全部上线 + SEO 基建（sitemap/meta/JSON-LD/hreflang） |
| M4 部署 | 第 2 周末 | VPS + Caddy + Cloudflare + 域名 HTTPS 上线，CI/CD 跑通 |
| M5 监控 | 第 3–4 周 | Uptime Kuma → Prometheus/Grafana/Loki → Alertmanager 告警闭环 |
| M6 迭代 | 第 2 月起 | HEIC/GIF 支持、前后对比；SEO 内容迭代；广告位接入 |
| M7 变现 | 第 2–3 月 | AdSense 申请接入；API 占位页；流量复盘 |

---

## 9. 给 AI 编码工具的分步执行指令

> 把本节连同第 3、4 节一起喂给 Claude Code / Cursor 等工具，按顺序执行，每步验收后再进入下一步。

**Step 1（M1 骨架）**
```
用 Astro 5 + TypeScript 初始化项目 picture-zip。要求：
- pnpm；strict TS；ESM
- src/layouts/Layout.astro：含 <html lang> 动态、SEO head 组件（title/description/canonical/OG/hreflang）
- src/i18n/{en,zh}.json + src/lib/i18n.ts：en 默认，zh 路由 /zh/...；页头语言切换器
- 首页 index.astro：Hero 区（标题 + 一句话价值 + 徽章"100% Local Processing / 文件不离开设备"）+ Uploader 组件占位
- styles/global.css：CSS 变量设计系统（色板、间距、圆角、阴影），无外部字体
验收：pnpm dev 可打开，中英切换正常
```

**Step 2（M2 核心引擎，最重要）**
```
实现 src/lib/{codecs,compress,targetSize,queue}.ts + workers/compress.worker.ts：
- 用 @jsquash 系列（jamsinclair/jSquash） 实现 decode/encode：jpeg(mozjpeg)、png(oxipng)、webp、avif；WASM 按需动态 import
- compress(file, options)：options={format:'auto'|'jpeg'|'png'|'webp'|'avif', quality:1-100, maxWidth?, maxHeight?}
- targetSize 模式：输入目标 KB，二分 quality（必要时配合等比 resize，分辨率下限 300px），返回 {blob, width, height, qualityUsed, resized}
- 队列：Worker 池数量 = max(1, min(4, hardwareConcurrency-1))；状态机 pending→processing→done/failed/skipped；支持 pause/resume/cancelAll
- 全流程禁止任何网络请求
验收：单张 5MB PNG → WebP Q75 成功；目标 100KB 模式输出 ≤100KB
```

**Step 3（M2 UI）**
```
实现组件（原生 TS 渐进增强或 Preact island）：
- Uploader：拖拽/多选/整文件夹；显示数量与总大小；>80MB 单文件提示
- SettingsPanel：输出格式/质量滑杆/尺寸限制/预设/目标大小模式（KB 输入；启用目标模式时锁定质量滑杆）
- QueueList：每项缩略图+原名+大小变化+压缩率徽章+状态；失败行内原因；暂停/继续/全部取消
- ResultBar：总节省量统计；单张下载/全部 ZIP（fflate）；文件名 _compressed 后缀防重
- 空态/处理中/完成/失败四种 UI 状态齐备；i18n 全覆盖
验收：100 张混合图片批量处理不卡 UI，ZIP 可解压
```

**Step 4（M3 页面矩阵）**
```
按 3.3 节清单生成页面：compress-to-100kb（+50/200）、png-to-webp、heic-to-jpg（HEIC 支持上线前显示"即将支持"，但保留 WebP/JPEG 能力）、gif-compressor、api、about、privacy；
每页：独立 meta/canonical/OG + FAQ 区块 + FAQPage JSON-LD + WebApplication JSON-LD + sitemap 纳管；中文版在 /zh/ 路由
验收：Lighthouse SEO ≥ 95；sitemap 含全部页面
```

**Step 5（M4 部署）**
```
编写 docker/{Dockerfile,Caddyfile,docker-compose.yml} 与 .github/workflows/deploy.yml：
- 多阶段构建；Caddy 反代 + 自动 HTTPS + HSTS；compose 含 web/umami(+postgresql)
- CI 构建 Docker 镜像 → 推送 GHCR → SSH 到 VPS 拉取指定版本 → 健康检查
- .dockerignore 排除 .git/测试/截图/.env
- 密码使用 ${VAR:?must_set}，镜像固定版本不使用 latest
- pnpm audit 高危即失败（不用 || true）
- SSH 主机指纹校验
- Cloudflare SSL: Full (strict)
（前置：VPS 装 Ubuntu 22.04+Docker；域名解析到 Cloudflare 并开代理）
验收：push 一次代码自动上线，https 可访问，管理面板不暴露公网
```

**Step 6（M5 监控）**
```
在同一 VPS 用 docker compose --profile monitoring 部署 prometheus + node_exporter + blackbox_exporter + grafana + loki + promtail + alertmanager + uptime-kuma；
prometheus.yml 抓取本机指标 + blackbox http_2xx 拨测 https://域名；
告警规则按 6.3 表配置，Telegram 通知（Alertmanager --config.expand-env 展开 $TELEGRAM_BOT_TOKEN）；
Grafana 导入 Node Exporter Full + 黑盒拨测看板；
Grafana/Prometheus/Alertmanager 不暴露公网，通过 SSH 隧道访问；
所有监控服务配置 healthcheck；Promtail 挂载 /var/run/docker.sock。
验收：手动 stop web 容器 → 2 分钟内收到 Telegram 告警
```

---

## 10. 运营与后续迭代备忘

- 上线当天：提交 Google Search Console + Bing Webmaster；提交 sitemap
- 每周新增 1–2 个场景页（用 GSC 找词：印象高、排名 8–30 的词优先）
- 第 2 月接入 AdSense（隐私页与足量内容是前置条件，见 F-11）
- API 页收集邮箱验证需求，再决定开发（配额建议：免费 500 张/月，$5/月起档）
- 每周复盘一次：umami 流量曲线 + GSC 查询词 + Prometheus 可用性

---

## 11. 风险与对策

| 风险 | 对策 |
|---|---|
| SEO 沙盒期长（2–3 月无流量） | 预期管理：持续加场景页；用 GSC 数据迭代；不轻易换域名 |
| 大图/大量图导致内存溢出 | 分批引导 + 及时释放内存 + 队列串行兜底 |
| Safari AVIF 编码性能差 | 特性检测，过慢时提示改用 WebP |
| jsquash 部分 WASM 体积大 | 懒加载 + 处理前预加载提示 |
| 被竞品复制 | 快速叠场景页与长尾；工具矩阵化提高壁垒 |
| 服务器单点故障 | restic 每日备份到外部存储（B2/另一台 VPS），可快速重建 |

---

*文档版本：v1.0 · 2026-08-30 · 维护人：项目所有者*
