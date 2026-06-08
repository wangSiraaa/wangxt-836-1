# 工单 SLA 升级仲裁系统 - 交付说明

## 一、项目概述

工单 SLA 升级仲裁系统是一个全栈 Web 应用，实现客户工单全生命周期管理，核心功能包括：
- 工单创建、处理、暂停、恢复、升级、仲裁、关闭
- SLA 时钟实时跟踪，超时自动升级
- 暂停原因强制校验（无原因无法保存）
- 升级记录和仲裁结果完整追溯
- 基于角色的权限控制

## 二、技术栈

- **前端**: React 18 + TypeScript + Vite + Tailwind CSS + Zustand
- **后端**: Express 4 + TypeScript + better-sqlite3
- **定时任务**: node-cron（每分钟扫描超时工单）
- **认证**: bcrypt 密码哈希 + Token 会话管理
- **容器化**: Docker + docker-compose

## 三、测试账户

系统初始化时自动创建以下测试账户，密码均为 `123456`：

| 用户名      | 角色     | 姓名   | 权限说明                     |
|-------------|----------|--------|------------------------------|
| agent1      | agent    | 张客服 | 工单查看、创建、处理、暂停   |
| supervisor1 | supervisor | 李主管 | 全部客服权限 + 升级工单     |
| arbitrator1 | arbitrator | 王仲裁 | 工单查看、升级、仲裁         |
| admin1      | admin    | 赵管理员 | 全部权限 + 用户管理         |

## 四、快速启动

### 方式一：Docker 容器启动（推荐）

```bash
# 1. 启动服务
docker-compose up -d

# 2. 查看服务状态
docker-compose ps

# 3. 查看日志
docker-compose logs -f

# 4. 停止服务
docker-compose down
```

启动后访问：
- 前端应用: http://localhost:3000
- 后端 API: http://localhost:3001

### 方式二：本地开发启动

```bash
# 1. 安装依赖
pnpm install

# 2. 重新构建原生模块（bcrypt, better-sqlite3）
pnpm rebuild bcrypt better-sqlite3

# 3. 启动前后端（并发）
pnpm dev

# 或分别启动
# 后端服务 (端口 3001)
pnpm server:dev
# 前端开发 (端口 5173, 代理 /api 到 3001)
pnpm client:dev
```

## 五、数据初始化

### 数据库位置
- Docker 环境: `./data/app.db`（自动挂载）
- 本地环境: `./data/app.db`

### 初始化内容
应用首次启动时自动执行以下初始化：

1. **建表**（6张表 + 4个索引）：
   - `users` - 用户表
   - `tickets` - 工单表
   - `pause_reasons` - 暂停原因表
   - `escalation_records` - 升级记录表
   - `arbitration_results` - 仲裁结果表
   - `sla_config` - SLA配置表

2. **种子数据**：
   - 4个测试用户（见测试账户）
   - SLA配置：默认24小时，80%阈值，自动升级开启
   - 3个测试工单：
     - t1: 处理中，SLA剩余24小时
     - t2: 待处理，SLA剩余2小时（即将超时）
     - t3: 待处理，已超时1小时（会被自动升级）

### 重置数据
```bash
# 删除数据库文件，重启应用自动重建
rm -rf ./data/app.db
```

## 六、健康检查

### 健康检查端点
```
GET /api/health
```

### 响应示例
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": "connected",
  "slaWorker": "running",
  "version": "1.0.0"
}
```

### Docker 健康检查配置
在 `docker-compose.yml` 中已配置：
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 10s
```

## 七、核心功能验证

### 验证一：暂停无原因的工单并验证无法保存

**测试步骤**：

1. 登录系统（使用 agent1 / 123456）
2. 进入工单列表，点击任意工单进入详情
3. 点击「暂停」按钮
4. 在弹窗中**不填写暂停原因**或**填写少于5个字符**（如"测试"）
5. 点击「确认暂停」

**预期结果**：
- ✅ 前端弹出错误提示：「暂停原因不能为空」或「暂停原因至少5个字符」
- ✅ 工单状态保持不变，未被暂停
- ✅ 网络请求被前端拦截，未发送到后端

**进一步验证（绕过前端）**：

使用 curl 直接调用后端 API，验证后端也会拦截：
```bash
# 1. 登录获取 token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"agent1","password":"123456"}' | jq -r '.token')

# 2. 尝试不填原因暂停工单（应该失败）
curl -s -X POST http://localhost:3001/api/tickets/t1/pause \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"reason":"","pausedBy":"u1"}'

# 预期响应: {"error":"暂停原因不能为空"}

# 3. 尝试原因过短（应该失败）
curl -s -X POST http://localhost:3001/api/tickets/t1/pause \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"reason":"测","pausedBy":"u1"}'

# 预期响应: {"error":"暂停原因至少5个字符"}

# 4. 正常填写原因（应该成功）
curl -s -X POST http://localhost:3001/api/tickets/t1/pause \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"reason":"客户需要补充材料，暂停处理","pausedBy":"u1"}'

# 预期响应: {"message":"工单已暂停"}
```

**验证点**：
- 前后端双重校验
- 原因不能为空
- 原因至少5个字符
- 暂停操作使用数据库事务（工单状态变更 + 暂停原因记录 原子性）

---

### 验证二：SLA 超时自动升级

**测试步骤**：

1. 查看初始化数据中的工单 t3（已超时1小时）
2. 启动应用，等待 SLA Worker 执行（每分钟一次，或启动5秒后首次执行）
3. 查看工单状态和升级记录

**预期结果**：
- ✅ 工单 t3 状态自动变为「已升级」
- ✅ 升级等级 Lv.1（自动升级标记）
- ✅ 生成升级记录，原因：「SLA超时自动升级」
- ✅ 升级记录标记为「自动升级」

**手动验证**：

```bash
# 1. 查看 t3 工单当前状态
curl -s http://localhost:3001/api/tickets/t3 \
  -H "Authorization: Bearer $TOKEN" | jq '.status, .escalationLevel'

# 预期: "escalated", 1

# 2. 查看升级记录
curl -s http://localhost:3001/api/tickets/t3 \
  -H "Authorization: Bearer $TOKEN" | jq '.escalationRecords[0]'

# 预期:
# {
#   "reason": "SLA超时自动升级",
#   "level": 1,
#   "isAutoEscalation": true,
#   "escalationLevel": 1
# }
```

**查看 SLA Worker 日志**：
```bash
# Docker 环境
docker-compose logs app | grep "SLA Worker"

# 本地环境
# 查看控制台输出:
# [2024-01-15T10:30:00.000Z] 开始检查超时工单...
# 自动升级了 1 个超时工单
# 工单 t3 已自动升级: 网络连接异常
```

**验证点**：
- SLA Worker 每分钟自动执行
- 只扫描非关闭、非暂停、未升级、已超时的工单
- 升级操作使用数据库事务（工单状态变更 + 升级记录 原子性）
- 自动升级等级为 Lv.1，手动升级等级为 Lv.2

## 八、API 接口清单

### 认证接口
| 方法 | 路径           | 说明       |
|------|----------------|------------|
| POST | /api/auth/login | 登录获取token |
| POST | /api/auth/logout | 登出       |
| GET  | /api/auth/me    | 获取当前用户 |

### 工单接口
| 方法   | 路径                              | 说明           |
|--------|-----------------------------------|----------------|
| GET    | /api/tickets                      | 获取工单列表   |
| GET    | /api/tickets/:id                  | 获取工单详情   |
| POST   | /api/tickets                      | 创建工单       |
| POST   | /api/tickets/:id/process          | 开始处理工单   |
| POST   | /api/tickets/:id/pause            | 暂停工单       |
| POST   | /api/tickets/:id/resume           | 恢复工单       |
| POST   | /api/tickets/:id/escalate         | 手动升级工单   |
| POST   | /api/tickets/:id/arbitrate        | 仲裁工单       |
| POST   | /api/tickets/:id/close            | 关闭工单       |

### 管理接口
| 方法 | 路径           | 说明       | 权限 |
|------|----------------|------------|------|
| GET  | /api/users     | 用户列表   | admin |
| GET  | /api/sla-config | SLA配置 | admin |
| PUT  | /api/sla-config | 更新SLA配置 | admin |

## 九、权限控制矩阵

| 功能/角色   | agent | supervisor | arbitrator | admin |
|-------------|-------|------------|------------|-------|
| 查看工单    | ✅    | ✅         | ✅         | ✅    |
| 创建工单    | ✅    | ✅         | ❌         | ✅    |
| 处理工单    | ✅    | ✅         | ❌         | ✅    |
| 暂停工单    | ✅    | ✅         | ❌         | ✅    |
| 恢复工单    | ✅    | ✅         | ❌         | ✅    |
| 关闭工单    | ✅    | ✅         | ❌         | ✅    |
| 升级工单    | ❌    | ✅         | ✅         | ✅    |
| 仲裁工单    | ❌    | ❌         | ✅         | ✅    |
| 用户管理    | ❌    | ❌         | ❌         | ✅    |
| SLA配置     | ❌    | ❌         | ❌         | ✅    |

## 十、项目结构

```
.
├── api/                          # 后端代码
│   ├── controllers/              # 控制器层
│   │   ├── AuthController.ts
│   │   └── TicketController.ts
│   ├── cron/                     # 定时任务
│   │   └── slaWorker.ts
│   ├── database/                 # 数据库
│   │   └── init.ts
│   ├── middleware/               # 中间件
│   │   └── auth.ts
│   ├── repositories/             # 数据访问层
│   │   ├── TicketRepository.ts
│   │   ├── UserRepository.ts
│   │   ├── PauseReasonRepository.ts
│   │   ├── EscalationRecordRepository.ts
│   │   ├── ArbitrationResultRepository.ts
│   │   └── SlaConfigRepository.ts
│   ├── routes/                   # 路由
│   │   ├── auth.ts
│   │   └── tickets.ts
│   ├── services/                 # 业务服务层
│   │   ├── AuthService.ts
│   │   └── TicketService.ts
│   ├── app.ts                    # 应用入口
│   └── server.ts                 # 服务启动
├── src/                          # 前端代码
│   ├── components/               # 组件
│   ├── pages/                    # 页面
│   │   ├── Login.tsx
│   │   ├── TicketList.tsx
│   │   ├── TicketDetail.tsx
│   │   ├── ArbitrationCenter.tsx
│   │   └── UsersPage.tsx
│   ├── store/                    # 状态管理
│   │   ├── authStore.ts
│   │   └── ticketStore.ts
│   ├── lib/                      # 工具库
│   │   └── api.ts
│   └── App.tsx                   # 路由配置
├── shared/                       # 共享类型
│   └── types.ts
├── data/                         # 数据库文件目录
├── docker-compose.yml            # Docker编排
├── Dockerfile                    # Docker镜像
├── DELIVERY.md                   # 本文档
└── package.json
```

## 十一、核心业务流程

### 工单处理主流程
```
创建工单 → 处理中 → (暂停→恢复) → 处理完成 → 关闭
                         ↓
                    SLA超时 → 自动升级(Lv.1) → 仲裁中心 → 仲裁(批准/驳回/调整) → 关闭
                         ↑
                    手动升级(Lv.2)
```

### 暂停拦截流程
```
点击暂停按钮 → 弹出原因输入框 → 前端校验(非空+≥5字符) → 后端校验(重复) → 事务执行(更新工单+插入原因) → 返回成功
                         ↓ (校验失败)
                    显示错误，拦截操作
```

### SLA自动升级流程
```
SLA Worker(每分钟) → 查询超时工单 → 遍历处理 → 事务执行(更新工单+插入升级记录) → 记录日志
```

## 十二、部署注意事项

1. **数据持久化**：Docker 环境下 `./data` 目录已挂载，删除容器不会丢失数据
2. **环境变量**：可通过 `.env` 文件配置端口、数据库路径等
3. **安全配置**：
   - 生产环境请修改默认密码
   - 生产环境请配置 HTTPS
   - helmet 已启用安全头
4. **性能优化**：
   - 数据库已启用 WAL 模式
   - 常用查询字段已建立索引
   - SLA 扫描仅查询必要字段

## 十三、异常分支覆盖清单

✅ **暂停必须有原因**
- 前端校验：空值、长度<5字符
- 后端校验：空值、长度<5字符
- 数据库事务：工单状态和暂停记录原子性

✅ **SLA超时自动升级**
- 定时任务：每分钟扫描
- 条件过滤：非关闭、非暂停、未升级、已超时
- 自动标记：isAutoEscalation=true, level=1
- 日志记录：每次执行记录升级数量

✅ **权限控制**
- 路由守卫：未登录跳登录页
- 角色控制：无权限页面403
- API中间件：每个接口校验token和权限

✅ **数据一致性**
- 所有写操作使用数据库事务
- 外键约束：删除工单级联删除关联记录
- 状态约束：CHECK约束确保合法状态流转

---

**文档版本**: v1.0  
**最后更新**: 2024-01-15
