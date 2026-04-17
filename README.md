# OpenODC

> 自动驾驶系统运行设计条件公共平台
> Open Platform for Automated Driving Operational Design Conditions

让自动驾驶系统的运行设计条件透明、可对比、机器可读，对齐 GB/T 45312—2025。

[English README →](./README.en.md) · [Architecture →](./ARCHITECTURE.md) · [Contributing →](./CONTRIBUTING.md)

---

## 这是什么

OpenODC 是一个开源的 ODC（Operational Design Condition，设计运行条件）标准化定义、对比、查阅平台，基于国家标准 GB/T 45312—2025《智能网联汽车 自动驾驶系统设计运行条件》。

它解决三个问题：

1. 行业内 ODC 没有统一的输出格式，每家自己造表
2. 第三方机构、监管、消费者无法横向对比不同车型的 ODC 边界
3. 标准本身的层级化结构没有机器可读的对应物

OpenODC 提供：

- 与 GB/T 45312—2025 严格对齐的 JSON Schema
- 一个 Web 编辑器，让厂家或社区填写一份标准化 ODC 表格
- 一个公开样例库（Gallery），按车型/功能/等级浏览和对比
- 同一份数据的四种视图：开发者 / 测试 / 监管 / 消费者

## 为什么要有这个

辅助驾驶和自动驾驶的"能用"和"不能用"边界，目前是行业内最不透明、最容易引发误解的一块。OEM 各自用自己的格式声明 ODC，监管难以穿透，消费者看不到。

OpenODC 的目标不是"取代厂家自己的 ODC 文档"，而是建立一个面向对外发布的标准化格式 + 公开样例库，类似 caniuse.com 之于浏览器特性 —— 让设计运行条件变得可查、可比、可复用。

## 当前状态

`v0.1.0 (Phase 0)`

- ✅ 完整转录 GB/T 45312—2025 的 ODC 元素层级（约 80 个第 5 层级元素）
- ✅ JSON Schema + TypeScript 类型定义
- ✅ 量化分级表机器可读化（风力 12 级、雨量 4 级、降雪/积雪/能见度等）
- ✅ 标准附录 A L3 高速 ODC 示例完整转录为 JSON
- ⏳ Web 编辑器（Phase 1）
- ⏳ 公开样例库 Gallery（Phase 1）
- ⏳ 多视图渲染（Phase 2）

完整路线图见 [PLAN.md](../PLAN.md)。

## 仓库结构

```
OpenODC/
├── schema/                           # ODC 标准的机器可读化
│   ├── odc.schema.json               # JSON Schema 主文件
│   ├── odc.types.ts                  # TypeScript 类型定义
│   ├── categories/                   # ODC 元素分类目录
│   │   ├── odd_road.json             # 道路（约 50 个元素）
│   │   ├── odd_road_infrastructure.json  # 道路设施
│   │   ├── odd_targets.json          # 目标物
│   │   ├── odd_weather.json          # 天气环境
│   │   ├── odd_digital_info.json     # 数字信息
│   │   ├── personnel_state.json      # 驾乘人员状态
│   │   └── vehicle_state.json        # 车辆状态
│   └── enums/
│       └── quantitative_scales.json  # 量化分级表（风力/雨量/能见度等）
├── data/
│   └── examples/
│       └── gb45312-appendix-a-l3-highway.json  # 标准附录 A 示例
├── site/                             # Landing Page（Phase 0 静态版）
└── docs/                             # 文档（计划中）
```

## 快速使用

校验一份 ODC 文档（需先安装 [ajv-cli](https://github.com/ajv-validator/ajv-cli)）：

```bash
npx ajv-cli validate -s schema/odc.schema.json -d data/examples/gb45312-appendix-a-l3-highway.json
```

在 TypeScript 项目中使用：

```typescript
import type { ODCDocument } from './schema/odc.types'

const doc: ODCDocument = require('./data/examples/gb45312-appendix-a-l3-highway.json')
```

## 与标准的对应关系

| 标准章节 | OpenODC 对应 |
|---|---|
| GB/T 45312—2025 §5 一般要求 | `schema/odc.schema.json` 的 ODCElement 定义 |
| §6.1 ODC 基础元素层级 | `schema/categories/*.json` 树形结构 |
| §6.2 ODD（道路、设施、目标物、天气、数字信息） | `odd_*.json` 5 个分类文件 |
| §6.3 驾乘人员状态 | `personnel_state.json` |
| §6.4 车辆状态 | `vehicle_state.json` |
| §5.4.b 允许/不允许 | `requirement: 'permitted' \| 'not_permitted'` |
| §5.4.c 元素关联关系 | `associations[]` 字段 |
| §5.5 不允许的退出行为 | `exit_behavior` 字段 |
| 附录 A 示例 | `data/examples/gb45312-appendix-a-l3-highway.json` |
| 量化分级表 5–14 | `schema/enums/quantitative_scales.json` |

## 贡献

欢迎以下三类贡献：

1. **新增样例数据**：基于公开材料（车主手册、申报公告、第三方测评）反推某车型的 ODC，标注 `source.type` 和 `source.confidence`
2. **厂家官方版本**：OEM 提交"官方声明"版本，覆盖社区反推版本，将 `review_status` 标记为 `vendor_confirmed`
3. **Schema 完善**：补充国际化映射（ISO 34503 / BSI PAS 1883）、修复元素层级错误

详见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 许可证

- 代码：[Apache License 2.0](./LICENSE)
- 数据（`data/`）：[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)，引用请注明 OpenODC

## 引用

如果在学术论文中使用 OpenODC，请引用：

```
Zhang, Y. (2026). OpenODC: An open registry of operational design conditions
for automated driving systems. https://openodc.autozyx.com
```

## 相关项目

- [ROAM](https://github.com/AutoZYX/ROAM) — L4 Robotaxi 远程运营事故数据库
- [DRIVEResearch](https://www.driveresearch.tech/) — 航测自然驾驶数据集

三者构成 AD 安全开源工具栈：ROAM（事故端）+ OpenODC（设计边界端）+ DRIVEResearch（实测分布端）。

## 联系

- Issues: https://github.com/AutoZYX/OpenODC/issues
- 维护者: [Zhang Yuxin](https://www.linkedin.com/in/zhangyuxin312/) (吉林大学 / 卓驭科技 / 驭研科技)
