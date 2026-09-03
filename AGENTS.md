# AGENTS.md — 项目协作规范

## Git 分支规范（必须遵守）

- `dev` 是日常开发分支，所有代码改动必须在 dev 分支上进行
- `master` 是发布分支，只通过合并 dev 更新，**禁止直接在 master 上开发**
- 远程主分支是 `master`（origin/HEAD 指向 master）

### 改动完成后的推送流程（强制顺序）

1. 在 dev 分支提交改动：
   ```
   git add <files>
   git commit -m "<type>: <描述>"
   git push origin dev
   ```
2. 用 master 分支合并 dev 分支：
   ```
   git checkout master
   git pull origin master
   git merge dev
   git push origin master
   git checkout dev
   ```
3. 保持本地 dev 与 master 同步，最后切回 dev 继续开发

### 提交信息规范

格式：`<type>: <简短描述>`

- `feat:` 新功能
- `fix:` 缺陷修复
- `refactor:` 重构（不改行为）
- `change:` 配置/流程变更
- `add:` 新增文件或配置

### 注意事项

- 推送前必须自检通过：`npx vitest run` + `npx astro check`
- 不要直接推 `main` 分支（本项目没有 main，主分支是 master）
- 合并前确认工作区干净，避免把无关改动带进提交

## 开发环境约定

- 本地构建/预览：`node node_modules/astro/astro.js build` + `preview --host`（dev server 的 vite 动态 import 会卡住导致 `client:only` 组件不 hydrate，是 vite dev 问题非代码问题）
- 技术栈：Astro + Preact + TypeScript + 传统 CSS（global.css）
- 代码风格：camelCase 变量、PascalCase 组件文件、Preact hooks、最小改动 + 可验证