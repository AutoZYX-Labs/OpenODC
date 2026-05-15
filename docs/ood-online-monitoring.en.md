# OOD Online Monitoring and OpenODC

This note explains how explainable online OOD detectors such as DINO-R relate to OpenODC. The short answer is: they should not be part of the main ODC declaration table, and they should not be interpreted as official vendor operating boundaries. They can, however, be linked as runtime-monitor candidates that complement boundary combinations, SOTIF trigger-condition candidates, DRIVEResearch, and ROAM.

## What DINO-R Does

DINO-R is a recent research prototype titled Object-Aware and Explainable Out-of-Distribution Detection for Autonomous Vehicles. Its project page and anonymous code release describe a frozen DINOv3 ViT-B/16 visual backbone, a lightweight transformer reconstructor, Monte-Carlo token masking, token-level reconstruction error, pseudo-object grouping, and object-aware risk weighting. The output is an image-level OOD risk score and a spatial anomaly heatmap for autonomous-driving imagery.

As of 2026-05-15, the project page marks the paper and arXiv links as coming soon. The anonymous code is accessible, but the public GitHub repository was not cloneable from the terminal. OpenODC should therefore treat DINO-R as a research monitor candidate, not as a production dependency.

## Relationship to OpenODC

OpenODC is a static declaration layer. It records how public sources describe an ADAS or ADS function's road, weather, object, speed, driver-state, and vehicle-state boundaries.

DINO-R-style online OOD detection is a runtime observation layer. It asks whether the current perception input departs from the training or validation distribution, where the anomaly appears, and whether the risk is concentrated around objects, road boundaries, construction areas, small distant objects, or the driving corridor.

The relationship is complementary:

| Layer | Role in OpenODC | Role of DINO-R-like Methods |
|---|---|---|
| Single ODC element | Declares public boundaries for road, weather, markings, objects, and similar factors | Does not directly provide official ODC thresholds |
| Boundary combination | Marks typical multi-element boundary candidates | Can provide runtime anomaly signals for such combinations |
| SOTIF trigger condition | Turns public boundary combinations into trigger-condition candidates | Helps discover visual distribution shifts and explain their locations |
| ROAM anomaly record | Records boundary exceedance, remote assistance, intervention, and outcomes | Can become one piece of perception evidence for an anomaly event |
| DRIVEResearch exposure analysis | Estimates real-road frequency and parameter ranges for combinations | Can help mine visually anomalous clips at scale |

## What It Should Not Do

1. It should not turn an OOD score into a vendor ODC threshold.
2. It should not equate OOD detection with a mandatory ADS exit.
3. It should not transfer Cityscapes, nuScenes, BDD100K, or synthetic OOD benchmark results directly to a specific vehicle or city ODC.
4. It should not turn OpenODC into a model training or inference platform.

## Integration Direction

Near term, OpenODC should only add methodology notes:

- OpenODC keeps the ODC table and boundary-combination layer.
- DINO-R-like methods are linked as runtime-monitor candidates.
- The site must state clearly that they are not official ODC declarations.

Medium term, OpenODC can add an optional extension outside the required core schema:

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

Long term, the ecosystem can form a loop:

1. OpenODC declares public boundaries and boundary combinations.
2. DRIVEResearch estimates real-road exposure for those combinations.
3. DINO-R-like monitors identify visually OOD clips and anomaly regions.
4. ROAM records boundary exceedance, intervention, takeover, and incident outcomes.
5. High-value combinations feed back into OpenODC samples, evidence gaps, and test suggestions.

The key is to keep OpenODC lightweight: it publishes transparent, traceable, comparable boundary evidence. Runtime monitors provide evidence signals; they do not replace ODC declarations.

## References

- DINO-R project page: https://robosafe-lab.github.io/dino-r.page/
- DINO-R anonymous code README: https://anonymous.4open.science/r/dino-r-code/README.md
- DINO-R configuration file: https://anonymous.4open.science/r/dino-r-code/config/config.yaml
