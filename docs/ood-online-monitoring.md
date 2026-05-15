# OOD 在线监测器与 OpenODC

本文说明 DINO-R 这类可解释 OOD 在线检测器与 OpenODC 的关系。结论很明确：它不应进入 OpenODC 的 ODC 主表，也不应被解释为厂家官方运行边界；但它可以作为运行时监测候选，与边界组合、SOTIF 触发条件、DRIVEResearch 和 ROAM 形成互补。

## DINO-R 做了什么

DINO-R 是王成博士团队近期公开的研究原型，全称为 Object-Aware and Explainable Out-of-Distribution Detection for Autonomous Vehicles。其项目页和匿名代码说明显示，该方法使用冻结的 DINOv3 ViT-B/16 视觉骨干网络、轻量 transformer reconstructor、Monte-Carlo token masking、token-level reconstruction error、pseudo-object grouping 和 object-aware risk weighting，为自动驾驶图像生成 OOD 风险分数和空间异常热力图。

截至 2026-05-15，项目页显示 paper 和 arXiv 仍为 Coming Soon；匿名代码可访问，但公开 GitHub 仓库尚不能从终端克隆。因此，在 OpenODC 中应把它作为研究型监测候选，而不是生产依赖。

## 与 OpenODC 的关系

OpenODC 的主体是静态声明：某个辅助驾驶或自动驾驶功能，在公开资料中如何声明道路、天气、目标物、速度、驾驶员状态、车辆状态等 ODC 要素。

DINO-R 这类在线 OOD 检测器关注的是运行时观测：当前感知输入是否偏离训练或验证分布，异常区域在哪里，风险是否集中在目标物、道路边界、施工区域、远处小目标或视觉走廊附近。

两者的关系不是替代，而是互补：

| 层级 | OpenODC 中的角色 | DINO-R 类方法的角色 |
|---|---|---|
| 单项 ODC 要素 | 声明道路、天气、标线、目标物等公开边界 | 不能直接给出官方 ODC 阈值 |
| 边界组合 | 标出多个 ODC 要素叠加后的典型边界候选 | 可为组合边界提供运行时异常信号 |
| SOTIF 触发条件 | 从公开边界组合中提炼触发条件候选 | 可帮助发现视觉分布异常和解释异常位置 |
| ROAM 异常记录 | 记录越界、远程接管、运营干预和结果 | 可作为异常事件中的感知证据之一 |
| DRIVEResearch 暴露评估 | 估计组合场景在真实道路中的频次和参数分布 | 可用于批量筛选视觉 OOD 片段 |

## 不应怎么用

1. 不应把 OOD 分数写成 ODC 主表中的厂家阈值。
2. 不应把 OOD 检测等同于系统必须退出。
3. 不应把 Cityscapes、nuScenes、BDD100K 或合成 OOD 测试结果直接外推为某款车在某城市的 ODC。
4. 不应把 OpenODC 做成模型训练或推理平台。

## 可以怎么融合

短期只在方法论中增加说明：

- OpenODC 继续维护 ODC 主表和边界组合。
- DINO-R 类方法作为运行时监测候选，用于解释某些组合边界为什么值得关注。
- 页面和文档中明确它不是官方 ODC 声明。

中期可以在文档模型中增加可选扩展字段，不进入核心 Schema 的强制要求：

```json
{
  "monitor_id": "dino-r-like-visual-ood",
  "monitor_type": "visual_ood_online_detector",
  "source_url": "https://robosafe-lab.github.io/dino-r.page/",
  "observes_element_ids": [
    "odd.targets.traffic_participant.vru",
    "odd.road.infrastructure.lane_marking",
    "odd.road.work_zone"
  ],
  "linked_boundary_combination_ids": [
    "construction-temporary-lane-low-marking",
    "night-rain-small-object"
  ],
  "runtime_signal": {
    "name": "object-aware OOD risk score",
    "explanation": "image-level score with spatial anomaly map"
  },
  "validation_domain": [
    "Cityscapes-S",
    "nuScenes-S",
    "nuScenes-B"
  ],
  "limitations": [
    "research prototype",
    "not a vendor ODC declaration",
    "thresholds require target-domain calibration"
  ]
}
```

长期可以形成一个闭环：

1. OpenODC 声明公开边界和边界组合。
2. DRIVEResearch 估计这些组合在真实交通中的暴露频次。
3. DINO-R 类在线监测器识别视觉 OOD 片段和异常区域。
4. ROAM 记录越界、干预、接管和事故后果。
5. 高价值组合反向更新 OpenODC 的样例、证据缺口和测试建议。

这个融合方向的关键是保持 OpenODC 的轻量定位：OpenODC 负责公开、可追溯、可比较的边界表达；运行时监测器负责提供证据线索，而不是替代 ODC 声明。

## 参考资料

- DINO-R 项目页：https://robosafe-lab.github.io/dino-r.page/
- DINO-R 匿名代码 README：https://anonymous.4open.science/r/dino-r-code/README.md
- DINO-R 配置文件：https://anonymous.4open.science/r/dino-r-code/config/config.yaml
