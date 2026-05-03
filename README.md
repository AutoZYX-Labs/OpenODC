# OpenODC

> 自动驾驶系统运行设计条件开源平台
> Open Platform for Automated Driving Operational Design Conditions

让公开资料中的辅助驾驶与自动驾驶运行边界透明、可对比、机器可读，对齐 GB/T 45312—2025。

[English README →](./README.en.md) · [Architecture →](./ARCHITECTURE.md) · [Contributing →](./CONTRIBUTING.md)

---

## 这是什么

OpenODC 是一个开源的 ODC（Operational Design Condition，设计运行条件）标准化定义、对比、查阅平台，基于国家标准 GB/T 45312—2025《智能网联汽车 自动驾驶系统设计运行条件》。

OpenODC 衡量的是运行边界被公开资料说清楚了多少，不是给智驾能力排名，也不是安全认证。除非记录标记为 `vendor_confirmed`，否则样例均为社区基于公开资料提取。

它解决三个问题：

1. 行业内 ODC 没有统一的输出格式，每家自己造表
2. 第三方机构、监管、消费者无法横向对比不同车型的 ODC 边界
3. 标准本身的层级化结构没有机器可读的对应物

OpenODC 提供：

- 与 GB/T 45312—2025 严格对齐的 JSON Schema
- 一个 Web 编辑器，让厂家或社区填写一份标准化 ODC 表格
- 一个公开样例库（Gallery），目前包含 6 个基于公开资料提取的典型辅助驾驶 / ADS / Robotaxi 样例
- 一个横向矩阵视图，把 144 个国标要素逐项对齐到不同系统
- 同一份数据的两种视图：开发者 / 消费者
- 厂家直填工作台 MVP，用于演示 OEM / Tier 1 内部管理 ODC 并在 SOP 阶段公开发布的流程

## 为什么要有这个

辅助驾驶和自动驾驶的建议使用条件、退出条件和服务边界，目前是行业内最不透明、最容易引发误解的一块。OEM 各自用自己的格式声明 ODC，监管难以穿透，消费者看不到。

OpenODC 的目标不是"取代厂家自己的 ODC 文档系统"。实际上，OEM 已经会在使用手册和车机教学里告诉用户"智驾什么时候建议使用、什么时候不应使用"。问题是每家都用自己的写法、自己的分类、自己的术语，没有统一规范。

OpenODC 提供一个统一的、机器可读的格式和公开样例库，让设计运行条件可查、可比、可复用。公开样例先行，再推动 OEM 按统一格式发布官方版本。

重要语义边界：L2 样例描述功能适用条件，驾驶员仍需持续负责动态驾驶任务；L3/L4 样例才涉及 ADS 在 ODD 内承担动态驾驶任务。详见网站的 [方法与标准](https://openodc.autozyx.com/methodology.html) 页面。

## 当前状态

`v0.4.0 (Phase 0–4 MVP)`

- ✅ 完整转录 GB/T 45312—2025 的 ODC 元素层级（144 个元素 / 7 类）
- ✅ JSON Schema + TypeScript 类型定义
- ✅ 量化分级表机器可读化（风力 12 级、雨量 4 级、降雪/积雪/能见度等）
- ✅ Web 编辑器：层级树勾选、实时 JSON、导出 / 复制 / 本地保存
- ✅ 公开样例库：Tesla FSD（美国当前公开版本）、Tesla 中国区辅助驾驶、华为 ADS 4、百度萝卜快跑、小鹏 XNGP、小马智行 Gen-7 Robotaxi
- ✅ 144 要素公开资料覆盖统计：Gallery 会显示每条样例的公开资料覆盖率和证据核验日期；该数字不是厂家披露率
- ✅ 双视图渲染：开发者视图 / 消费者视图
- ✅ 横向矩阵：144 个国标要素 × 6 个样例逐项对比
- ✅ 厂家直填 Workbench MVP：内部状态管理、编辑器联动、生成 GitHub PR 提交包
- ⏳ Phase 4 后端：账号体系、Supabase 存储、签名发布、GitHub App 自动创建 PR

完整路线图见 [ARCHITECTURE.md](./ARCHITECTURE.md)。公开传播口径见 [Methodology](https://openodc.autozyx.com/methodology.html)。

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
│       ├── huawei-ads4-aito-m9.json
│       ├── tesla-fsd-us-current.json
│       ├── tesla-assisted-driving-china-current.json
│       ├── baidu-apollogo-wuhan.json
│       ├── xpeng-xngp-p7plus-2026.json
│       └── pony-ai-gen7-robotaxi.json
├── site/                             # 静态网站：Gallery / Editor / Matrix / Workbench
└── tools/                            # manifest 构建、覆盖率补齐、元素引用检查
```

## 快速使用

校验一份 ODC 文档（需先安装 [ajv-cli](https://github.com/ajv-validator/ajv-cli)）：

```bash
npx ajv-cli validate --spec=draft2019 --strict=false --validate-formats=false -s schema/odc.schema.json -d data/examples/huawei-ads4-aito-m9.json
node tools/check-references.mjs
node tools/build-manifest.mjs
node tools/check-source-links.mjs
```

在 TypeScript 项目中使用：

```typescript
import type { ODCDocument } from './schema/odc.types'

const doc: ODCDocument = require('./data/examples/huawei-ads4-aito-m9.json')
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
| 公开样例库 | `data/examples/*.json`（社区提取样例，逐项显示公开资料覆盖与缺口） |
| L2 / L3 / L4 语义边界 | `site/methodology.html` |
| 量化分级表 5–14 | `schema/enums/quantitative_scales.json` |

## 贡献

欢迎以下三类贡献：

1. 新增样例数据：基于公开材料（车主手册、运营规则、政府公告、第三方测评）提取某车型的 ODC，标注 `source.type` 和 `source.confidence`
2. 厂家官方版本：OEM 提交官方声明版本，覆盖社区提取版本，将 `review_status` 标记为 `vendor_confirmed`
3. Schema 完善：补充国际化映射（ISO 34503 / ASAM OpenODD / BSI PAS 1883）、修复元素层级错误

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

- [ROAM](https://autozyx.github.io/ROAM/) — L4 Robotaxi 远程运营事故数据库
- [DRIVEResearch](https://www.driveresearch.tech/) — 航测自然驾驶数据集

三者构成 AD 安全开源工具栈：ROAM（事故端）+ OpenODC（设计边界端）+ DRIVEResearch（实测分布端）。

## 联系

- Issues: https://github.com/AutoZYX-Labs/OpenODC/issues
- 维护者: [Zhang Yuxin](https://www.linkedin.com/in/zhangyuxin312/) (吉林大学 / 卓驭科技 / 驭研科技)
