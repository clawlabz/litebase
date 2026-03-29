# LiteBase - Implementation Plan

## Phase Overview

| Phase | Content | Duration | Deliverable |
|-------|---------|----------|-------------|
| **Phase 1** | Docker Compose + Studio 骨架 + 项目管理 | 2-3 天 | 可创建/管理多项目的基础平台 |
| **Phase 2** | SQL Editor + Table Editor | 2-3 天 | 可视化数据库管理 |
| **Phase 3** | Auth 管理 + 邮件配置 | 2 天 | 用户管理 + 邮件模板可视化编辑 |
| **Phase 4** | API 文档 + 连接信息 + 日志 | 1-2 天 | 完整的开发者体验 |
| **Phase 5** | 打磨 + 文档 + 开源发布 | 1-2 天 | GitHub 发布 + README + Demo |

---

## Phase 1: Docker Compose + Studio 骨架 + 项目管理

### 1.1 Docker Compose 编排

**目标**: `docker compose up -d` 一键启动全部服务

**Tasks:**
- [ ] 创建 `docker-compose.yml`（PG17 + PgBouncer + Studio）
- [ ] 创建 `.env.example` 配置模板
- [ ] 创建 `scripts/init.sh` 初始化脚本（首次运行创建 litebase schema）
- [ ] Studio Dockerfile（Next.js standalone 模式）
- [ ] 健康检查配置（所有服务）

**关键决策:**
- GoTrue 和 PostgREST 不放在 docker-compose 里静态配置，而是由 Studio 动态管理
- Studio 通过 Docker Socket（`/var/run/docker.sock`）创建/管理项目容器
- PgBouncer 配置由 Studio 动态更新

### 1.2 Studio Next.js 项目初始化

**Tasks:**
- [ ] `npx create-next-app studio` (App Router + Tailwind + TypeScript)
- [ ] 安装 shadcn/ui 组件库
- [ ] 配置暗色主题（Supabase 风格深色 UI）
- [ ] 创建 layout：左侧边栏导航 + 顶部项目切换器
- [ ] 登录页（STUDIO_PASSWORD 验证）
- [ ] Session 管理（httpOnly cookie）

**UI 参考 Supabase Studio:**
```
┌──────────────────────────────────────────────┐
│  🔲 LiteBase    Project: my-app  ▼    [+]   │
├──────────┬───────────────────────────────────┤
│          │                                   │
│ 📊 Home  │   Dashboard Content Area          │
│ 📋 Table │                                   │
│    Editor│                                   │
│ 🔤 SQL   │                                   │
│    Editor│                                   │
│ 👤 Auth  │                                   │
│ 📄 API   │                                   │
│    Docs  │                                   │
│ ⚙️ Settings                                  │
│ 📝 Logs  │                                   │
│          │                                   │
├──────────┴───────────────────────────────────┤
│  LiteBase v1.0.0          base.example.com   │
└──────────────────────────────────────────────┘
```

### 1.3 项目管理 (CRUD)

**Tasks:**
- [ ] `litebase.projects` 元数据表创建
- [ ] API: `POST /studio/api/projects` — 创建项目
  - CREATE DATABASE
  - 创建 GoTrue Docker 容器（动态端口分配）
  - 创建 PostgREST Docker 容器
  - 更新 PgBouncer 配置
  - 生成 JWT Secret + API Keys (anon/service_role)
  - 创建 auth schema（执行 GoTrue 迁移）
  - 授权 anon/service_role/authenticated 角色
- [ ] API: `GET /studio/api/projects` — 列表
- [ ] API: `DELETE /studio/api/projects/:id` — 删除（确认弹窗）
- [ ] API: `POST /studio/api/projects/:id/pause` — 暂停（停容器）
- [ ] API: `POST /studio/api/projects/:id/resume` — 恢复
- [ ] 项目列表页面 UI
- [ ] 项目 Dashboard 页面（概览统计）
- [ ] 项目连接信息展示（连接串、API URL、Keys）

**Phase 1 交付物:**
- `docker compose up -d` 启动 Studio + PG + PgBouncer
- 通过 Studio 创建项目，自动初始化完整后端
- 获取 Supabase 兼容的连接信息

---

## Phase 2: SQL Editor + Table Editor

### 2.1 SQL Editor

**Tasks:**
- [ ] 集成 Monaco Editor（@monaco-editor/react）
- [ ] SQL 语法高亮 + 自动补全（表名、列名）
- [ ] 执行 SQL 按钮 (Ctrl+Enter 快捷键)
- [ ] 结果表格展示（TanStack Table）
- [ ] 多 Tab 支持（多个查询窗口）
- [ ] 查询历史记录
- [ ] 保存/收藏查询
- [ ] 错误提示（行号定位）
- [ ] 执行时间显示

### 2.2 Table Editor

**Tasks:**
- [ ] 左侧表列表（按 schema 分组）
- [ ] 表数据电子表格视图
  - 虚拟滚动（大数据量）
  - 内联编辑（双击单元格）
  - 类型感知渲染（boolean → checkbox, jsonb → JSON 编辑器, timestamp → date picker）
  - 新增行（底部空行）
  - 删除行（复选框 + 批量删除）
- [ ] 表结构视图
  - 列列表（名称、类型、nullable、默认值、约束）
  - 添加/删除/修改列
  - 索引管理
  - 外键关系可视化
- [ ] 创建新表向导
- [ ] CSV 导入/导出
- [ ] 分页 + 排序 + 筛选

**Phase 2 交付物:**
- 完整的 SQL 执行环境
- 电子表格式的数据浏览编辑

---

## Phase 3: Auth 管理 + 邮件配置

### 3.1 Auth 用户管理

**Tasks:**
- [ ] 用户列表（分页、搜索、筛选）
  - 列: email, created_at, last_sign_in, confirmed, provider
- [ ] 用户详情面板
  - 基本信息
  - raw_app_meta_data / raw_user_meta_data (JSON 编辑)
  - 登录历史
- [ ] 操作: 创建用户、禁用/启用、删除、重置密码、确认邮箱
- [ ] Auth 审计日志查看

### 3.2 Auth 设置

**Tasks:**
- [ ] 基本设置
  - 允许注册 (enable/disable)
  - 自动确认 (autoconfirm)
  - JWT 过期时间
  - 密码最小长度
- [ ] Redirect URL 管理
  - 白名单列表 (CRUD)
  - 支持通配符 (*.example.com)
- [ ] SMTP 配置
  - Host, Port, User, Password
  - 发送者名称和邮箱
  - 测试发送按钮
- [ ] OAuth Provider 配置
  - GitHub: Client ID + Secret
  - Google: Client ID + Secret
  - 更多 providers...

### 3.3 邮件模板编辑器

**Tasks:**
- [ ] 四种模板: Confirmation, Recovery, Magic Link, Invite
- [ ] 可视化编辑器
  - HTML 代码编辑（Monaco）
  - 实时预览面板（iframe）
  - 变量插入工具栏（{{ .Token }}, {{ .ConfirmationURL }}, etc.）
- [ ] 邮件标题编辑（支持 {{ .Token }} 变量）
- [ ] 默认模板（LiteBase 品牌暗色模板）
- [ ] 测试发送按钮（发到指定邮箱预览效果）
- [ ] 重置为默认模板

**Phase 3 交付物:**
- 完整的用户管理界面
- 可视化邮件模板编辑器
- SMTP 和 OAuth 配置面板

---

## Phase 4: API 文档 + 连接信息 + 日志

### 4.1 API 文档自动生成

**Tasks:**
- [ ] 从 PostgREST schema 读取表结构
- [ ] 为每个表生成 CRUD 端点文档
- [ ] 代码示例（curl, JavaScript/supabase-js, Python）
- [ ] RPC 函数文档
- [ ] 认证说明（anon key vs service_role key）
- [ ] 可交互的 API playground（输入参数，发送请求，看响应）

### 4.2 数据库设置

**Tasks:**
- [ ] 连接信息页面
  - 直连字符串
  - 连接池字符串（PgBouncer）
  - SSL 配置说明
- [ ] 数据库统计
  - 大小、表数量、行数
  - 索引使用情况
  - 慢查询 top 10
- [ ] 扩展管理（启用/禁用 PG 扩展）

### 4.3 日志查看器

**Tasks:**
- [ ] Auth 事件日志（signup, login, password_reset, token_refresh）
- [ ] API 请求日志（path, method, status, duration, IP）
- [ ] 实时日志流（WebSocket）
- [ ] 日志筛选（时间范围、级别、关键词）

**Phase 4 交付物:**
- 自动生成的交互式 API 文档
- 数据库统计和管理
- 实时日志查看

---

## Phase 5: 打磨 + 文档 + 开源发布

### 5.1 打磨

**Tasks:**
- [ ] 响应式设计（移动端可用）
- [ ] 键盘快捷键（Cmd+K 命令面板）
- [ ] 暗色/亮色主题切换
- [ ] 加载状态和错误处理优化
- [ ] 性能优化（大表虚拟滚动、查询结果分页）

### 5.2 文档

**Tasks:**
- [ ] README.md（安装、快速开始、截图）
- [ ] DEPLOYMENT.md（生产部署指南）
- [ ] MIGRATION.md（从 Supabase 迁移指南）
- [ ] CONTRIBUTING.md
- [ ] API 文档

### 5.3 开源发布

**Tasks:**
- [ ] GitHub repo: github.com/clawlabz/litebase
- [ ] Docker Hub: litebase/studio
- [ ] 社交媒体发布（Twitter/X, Reddit, Hacker News）
- [ ] Demo 实例部署

---

## Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Docker Socket 安全 | Studio 有完全 Docker 控制权 | 文档标注风险，可选 Docker Socket Proxy |
| GoTrue PG17 兼容性 | 迁移脚本有 enum bug | 内置修复脚本，自动化处理 |
| 多 GoTrue 实例资源 | 每个项目 ~100MB | 限制项目数，或用单 GoTrue 多 audience |
| PostgREST schema reload | 表结构变更后需 notify | 自动发送 NOTIFY pgrst |

## Success Metrics

- GitHub Stars: 1000+ (6 months)
- Docker pulls: 5000+ (6 months)
- 从 `git clone` 到创建第一个项目 < 3 分钟
- 单机支持 10+ 个项目同时运行
- RAM < 1GB（3 个项目）
