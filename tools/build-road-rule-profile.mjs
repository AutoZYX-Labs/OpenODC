import { mkdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')
const output = join(repoRoot, 'data', 'road-rules', 'obligations.json')

const text = (zh, en) => ({ zh, en })
const fingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const ref = (source_id, clauses, zh, en) => ({
  source_id,
  clauses,
  interpretation: text(zh, en)
})
const mapping = (element_id, relation, zh, en) => ({
  element_id,
  relation,
  rationale: text(zh, en)
})
const obligation = ({
  id,
  order,
  category,
  zh,
  en,
  summaryZh,
  summaryEn,
  refs,
  mappings,
  conditionZh,
  conditionEn,
  triggerZh,
  triggerEn,
  responseZh,
  responseEn,
  normativeZh,
  normativeEn,
  subjectKind = 'motor_vehicle_driver',
  subjectZh = '机动车驾驶人及相关道路交通参与者',
  subjectEn = 'Motor-vehicle drivers and relevant road users',
  derivationType = 'engineering_interpretation',
  derivationZh = 'ODC、场景触发点、期望响应和候选证据属于基于公开规则形成的工程解释，不扩展法律责任主体，也不构成符合性结论。',
  derivationEn = 'The ODC mapping, scenario trigger, expected response, and evidence candidates are an engineering interpretation of public rules. They do not expand the legal subject or constitute a compliance conclusion.',
  evidence = ['requirements_trace', 'simulation', 'human_review']
}) => ({
  id,
  order,
  category,
  title: text(zh, en),
  normative_rule: text(normativeZh || refs[0].interpretation.zh, normativeEn || refs[0].interpretation.en),
  normative_subject: {
    kind: subjectKind,
    label: text(subjectZh, subjectEn),
    legal_boundary: text(
      '法律义务主体以原始公开来源为准；OpenODC 不把自动驾驶系统本身表述为法律责任主体。',
      'The legal subject is defined only by the original public source; OpenODC does not describe the automated-driving system itself as the legally responsible subject.'
    )
  },
  summary: text(summaryZh, summaryEn),
  derivation: {
    type: derivationType,
    statement: text(derivationZh, derivationEn)
  },
  source_refs: refs,
  odc_mappings: mappings,
  applicability: [{
    id: `${id}.applicability`,
    condition: text(conditionZh, conditionEn),
    odc_element_ids: [...new Set(mappings.map(item => item.element_id))]
  }],
  scenario_hooks: [{
    id: `${id}.scenario`,
    trigger: text(triggerZh, triggerEn),
    expected_response: text(responseZh, responseEn),
    evidence_candidates: evidence
  }],
  review: {
    status: 'public_source_and_engineering_mapping_reviewed',
    reviewer_role: text('OpenODC 维护者', 'OpenODC maintainer'),
    reviewed_on: '2026-07-14',
    scope: text(
      '核对公开来源、条款引用、法律主体边界、ODC 语义映射和工程推导标记。',
      'Reviewed public sources, clause references, legal-subject boundaries, ODC semantic mappings, and engineering-derivation labels.'
    )
  }
})

const source = ({ id, type, titleZh, titleEn, authorityZh, authorityEn, url, repositoryZh, repositoryEn, recordIdentifier }) => {
  const checked_on = '2026-07-14'
  const reference = { id, type, titleZh, titleEn, authorityZh, authorityEn, url, checked_on, recordIdentifier }
  return {
    id,
    type,
    title: text(titleZh, titleEn),
    authority: text(authorityZh, authorityEn),
    status: 'current',
    url,
    checked_on,
    version_evidence: {
      official_repository: text(repositoryZh, repositoryEn),
      record_identifier: recordIdentifier,
      fingerprint_scope: text(
        '对官方公开记录的标识、题名、发布主体、版本、URL 和核验日期生成元数据指纹；不是网页正文副本。',
        'Metadata fingerprint over the official record ID, title, authority, version, URL, and review date; it is not a copy of the webpage body.'
      ),
      reference_fingerprint_sha256: fingerprint(reference)
    }
  }
}

const sources = [
  source({
    id: 'cn-rtsa-2021',
    type: 'law',
    titleZh: '《中华人民共和国道路交通安全法》（2021年修正）',
    titleEn: 'Road Traffic Safety Law of the People’s Republic of China (2021 revision)',
    authorityZh: '全国人民代表大会常务委员会',
    authorityEn: 'Standing Committee of the National People’s Congress',
    url: 'https://flk.npc.gov.cn/detail?fileId=&id=ff8081817ab231eb017abd617ef70519&title=%E4%B8%AD%E5%8D%8E%E4%BA%BA%E6%B0%91%E5%85%B1%E5%92%8C%E5%9B%BD%E9%81%93%E8%B7%AF%E4%BA%A4%E9%80%9A%E5%AE%89%E5%85%A8%E6%B3%95&type=',
    repositoryZh: '国家法律法规数据库',
    repositoryEn: 'National Database of Laws and Regulations',
    recordIdentifier: 'ff8081817ab231eb017abd617ef70519; 2021 revision'
  }),
  source({
    id: 'cn-rtsa-reg-2017',
    type: 'administrative_regulation',
    titleZh: '《中华人民共和国道路交通安全法实施条例》（2017年修订）',
    titleEn: 'Regulation on the Implementation of the Road Traffic Safety Law (2017 revision)',
    authorityZh: '国务院',
    authorityEn: 'State Council of the People’s Republic of China',
    url: 'https://xzfg.moj.gov.cn/front/law/detail?LawID=75&Query=%E9%81%93%E8%B7%AF%E4%BA%A4%E9%80%9A%E5%AE%89%E5%85%A8%E6%B3%95%E5%AE%9E%E6%96%BD%E6%9D%A1%E4%BE%8B',
    repositoryZh: '国家行政法规库',
    repositoryEn: 'National Administrative Regulations Database',
    recordIdentifier: 'LawID=75; 2017 revision'
  }),
  source({
    id: 'gb5768-current',
    type: 'national_standard',
    titleZh: 'GB 5768《道路交通标志和标线》现行系列',
    titleEn: 'Current GB 5768 series: Road Traffic Signs and Markings',
    authorityZh: '国家标准化管理委员会',
    authorityEn: 'Standardization Administration of China',
    url: 'https://openstd.samr.gov.cn/bzgk/std/std_list?p.p1=0&p.p2=GB+5768&p.p90=circulation_date&p.p91=desc',
    repositoryZh: '全国标准信息公共服务平台',
    repositoryEn: 'National Public Service Platform for Standards Information',
    recordIdentifier: 'GB 5768 current-series query; checked 2026-07-14'
  }),
  source({
    id: 'gbt45312-2025',
    type: 'national_standard',
    titleZh: 'GB/T 45312-2025《智能网联汽车 自动驾驶系统设计运行条件》',
    titleEn: 'GB/T 45312-2025 Operational design condition for automated driving system',
    authorityZh: '国家标准化管理委员会',
    authorityEn: 'Standardization Administration of China',
    url: 'https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=0BECACFD363C754F6869F970BC78EE5A',
    repositoryZh: '全国标准信息公共服务平台',
    repositoryEn: 'National Public Service Platform for Standards Information',
    recordIdentifier: 'GB/T 45312-2025; hcno=0BECACFD363C754F6869F970BC78EE5A'
  })
]

const obligations = [
  obligation({
    id: 'rr.signal.police', order: 1, category: 'traffic_signal',
    zh: '服从交通警察指挥', en: 'Follow traffic-police directions',
    summaryZh: '现场交通警察指挥优先于其他交通信号；系统必须识别不能可靠处理的指挥并进入受控响应。',
    summaryEn: 'On-site police directions take precedence over other traffic signals; the system must detect unsupported directions and enter a controlled response.',
    refs: [ref('cn-rtsa-2021', ['第三十八条'], '车辆和行人应按交通信号通行，遇现场指挥时按交通警察指挥通行。', 'Road users follow traffic signals and on-site police directions.')],
    mappings: [
      mapping('odd.infrastructure.traffic_control', 'contextual', 'OpenODC 目前仅有交通控制设施上位类，尚未独立建模警察手势。', 'OpenODC currently has only the traffic-control parent class and does not model police gestures separately.'),
      mapping('odd.targets.pedestrian', 'supporting', '交通警察首先表现为需要感知、分类和跟踪的人员目标。', 'A traffic officer is also a human target that must be perceived, classified, and tracked.')
    ],
    conditionZh: '存在现场交通警察，或固定信号与现场指挥发生冲突。', conditionEn: 'An on-site traffic officer is present, or the direction conflicts with fixed signals.',
    triggerZh: '警察给出停止、转弯、变道或靠边指挥。', triggerEn: 'An officer gives a stop, turn, lane-change, or pull-over direction.',
    responseZh: '优先服从可确认的指挥；无法可靠解释时减速、保持安全间距并进入最小风险处置。', responseEn: 'Follow confirmed directions; if interpretation is unreliable, slow down, preserve clearance, and enter a minimum-risk response.',
    subjectKind: 'road_user',
    subjectZh: '车辆和行人等道路交通参与者',
    subjectEn: 'Vehicles, pedestrians, and other road users',
    derivationType: 'engineering_candidate',
    derivationZh: '服从现场指挥是公开规则；识别置信度不足时的减速和最小风险处置是 OpenODC 提出的工程候选，不是条文直接规定的 ADS 行为。',
    derivationEn: 'Following on-site directions is the public rule. Slowing and minimum-risk handling under uncertain recognition are OpenODC engineering candidates, not ADS behavior directly prescribed by the clause.'
  }),
  obligation({
    id: 'rr.signal.light', order: 2, category: 'traffic_signal',
    zh: '遵守交通信号灯与停止线', en: 'Obey traffic lights and stop lines',
    summaryZh: '依据灯色、方向指示、车道信号和停止线确定通行、停车与转向行为。',
    summaryEn: 'Use signal color, directional indications, lane signals, and stop lines to determine movement, stopping, and turning.',
    refs: [
      ref('cn-rtsa-2021', ['第二十五条', '第二十六条', '第三十八条'], '交通信号灯属于统一交通信号，车辆应按信号通行。', 'Traffic lights are part of the unified signal system and road users must obey them.'),
      ref('cn-rtsa-reg-2017', ['第三十八条至第四十三条'], '实施条例细化机动车、行人、车道、闪光警告及铁路道口信号。', 'The regulation details vehicle, pedestrian, lane, warning-flash, and railway-crossing signals.')
    ],
    mappings: [
      mapping('odd.infrastructure.traffic_control.signal', 'direct', '交通信号灯是直接 ODC 环境要素。', 'Traffic signals are a direct ODC environment element.'),
      mapping('odd.road.lane.marking.type', 'supporting', '停止线和导向线的类型影响信号行为解释。', 'Stop-line and guide-marking types affect signal interpretation.')
    ],
    conditionZh: '道路设置机动车、车道、方向、人行横道或闪光警告信号灯。', conditionEn: 'Vehicle, lane, directional, pedestrian, or warning-flash signals are present.',
    triggerZh: '信号发生绿黄红转换，或停止线被遮挡、磨损。', triggerEn: 'The signal changes state, or the stop line is obscured or worn.',
    responseZh: '按可确认信号和停止线约束行驶；对冲突或低置信度信号采取保守处置。', responseEn: 'Drive within confirmed signal and stop-line constraints; resolve conflicts or low confidence conservatively.'
  }),
  obligation({
    id: 'rr.signal.sign', order: 3, category: 'traffic_signal',
    zh: '遵守道路交通标志', en: 'Obey road traffic signs',
    summaryZh: '识别并执行禁令、指示、警告及临时交通标志所表达的道路规则。',
    summaryEn: 'Recognize and follow prohibitory, mandatory, warning, and temporary road signs.',
    refs: [
      ref('cn-rtsa-2021', ['第二十五条', '第三十八条'], '交通标志属于交通信号，车辆和行人应按其通行。', 'Road signs are traffic signals and must be followed.'),
      ref('gb5768-current', ['GB 5768.1-2025', 'GB 5768.2-2022'], '现行国家标准规定道路交通标志的一般和具体表达。', 'Current national standards define general and specific road-sign expressions.')
    ],
    mappings: [mapping('odd.infrastructure.traffic_control.sign', 'direct', '道路交通标志与 OpenODC 标志要素直接对应。', 'Road signs map directly to the OpenODC sign element.')],
    conditionZh: 'ODC 内存在固定、可变或临时交通标志。', conditionEn: 'Fixed, variable, or temporary signs exist within the ODC.',
    triggerZh: '出现限速、禁行、让行、施工或车道用途标志。', triggerEn: 'A speed, prohibition, yield, work-zone, or lane-use sign appears.',
    responseZh: '将标志约束纳入路径、速度和动作决策，并保留识别证据。', responseEn: 'Apply the sign constraint to route, speed, and maneuver decisions and retain recognition evidence.'
  }),
  obligation({
    id: 'rr.signal.marking', order: 4, category: 'traffic_signal',
    zh: '遵守道路交通标线', en: 'Obey road traffic markings',
    summaryZh: '依据标线类型、颜色和质量约束车道保持、变道、停车和转向。',
    summaryEn: 'Use marking type, color, and quality to constrain lane keeping, lane changes, stopping, and turning.',
    refs: [
      ref('cn-rtsa-2021', ['第二十五条', '第三十八条'], '交通标线属于交通信号，车辆和行人应按其通行。', 'Road markings are traffic signals and must be followed.'),
      ref('gb5768-current', ['GB 5768.1-2025', 'GB 5768.3-2025'], '现行国家标准规定道路交通标线的一般和具体表达。', 'Current national standards define general and specific road-marking expressions.')
    ],
    mappings: [
      mapping('odd.road.lane.marking.type', 'direct', '标线类型直接决定跨越和行驶约束。', 'Marking type directly constrains crossing and travel.'),
      mapping('odd.road.lane.marking.color', 'direct', '标线颜色承载车道边界和临时规则语义。', 'Marking color carries lane-boundary and temporary-rule semantics.'),
      mapping('odd.road.lane.marking.quality', 'direct', '标线质量影响可感知性与规则判读置信度。', 'Marking quality affects perception and interpretation confidence.')
    ],
    conditionZh: '车道边界、导向、停止或禁停等标线存在。', conditionEn: 'Lane-boundary, guide, stop, or no-stopping markings are present.',
    triggerZh: '实虚线变化、标线磨损、临时标线与永久标线冲突。', triggerEn: 'Solid/dashed patterns change, markings are worn, or temporary and permanent markings conflict.',
    responseZh: '优先采用可确认且具有当前交通效力的标线；无法判定时禁止激进行为。', responseEn: 'Use the confirmed currently effective marking; avoid aggressive maneuvers when uncertain.'
  }),
  obligation({
    id: 'rr.road.lane-use', order: 5, category: 'road_traffic',
    zh: '右侧通行与分道行驶', en: 'Keep right and use designated lanes',
    summaryZh: '按照道路划分在机动车道内通行，并处理无分道、混行与特殊车道结构。',
    summaryEn: 'Travel in designated motor-vehicle lanes and handle undivided, mixed-traffic, and special lane layouts.',
    refs: [ref('cn-rtsa-2021', ['第三十五条至第三十七条', '第五十七条'], '规定右侧通行、分道通行、专用车道和非机动车通行位置。', 'Defines right-side traffic, lane separation, reserved lanes, and non-motorized positioning.')],
    mappings: [
      mapping('odd.road.lane.type.motor', 'direct', '机动车道直接限定机动车通行空间。', 'Motor-vehicle lanes directly define travel space.'),
      mapping('odd.road.lane.type.non_motor', 'direct', '非机动车道影响分道和交互边界。', 'Non-motorized lanes affect separation and interactions.'),
      mapping('odd.road.lane.type.mixed', 'direct', '混行车道需要更强的交互约束。', 'Mixed lanes require stronger interaction constraints.')
    ],
    conditionZh: '存在分道、无分道或机非混行道路。', conditionEn: 'The road is divided, undivided, or mixed with non-motorized traffic.',
    triggerZh: '车道类型改变、道路变窄或非机动车道被占用。', triggerEn: 'Lane type changes, the road narrows, or a non-motorized lane is obstructed.',
    responseZh: '保持合法通行位置，对临时借道和混行参与者实施减速与间距控制。', responseEn: 'Maintain a lawful lane position and control speed and clearance for temporary lane borrowing and mixed traffic.'
  }),
  obligation({
    id: 'rr.road.safe-speed', order: 6, category: 'road_traffic',
    zh: '遵守限速并保持安全车速', en: 'Observe speed limits and maintain a safe speed',
    summaryZh: '同时满足标志标线限速、道路结构、天气能见度和风险条件下的安全速度要求。',
    summaryEn: 'Satisfy posted limits and adapt speed to road geometry, weather, visibility, and risk conditions.',
    refs: [
      ref('cn-rtsa-2021', ['第四十二条'], '不得超过限速标志速度；危险路段、夜间和恶劣天气应降低速度。', 'Do not exceed posted limits and reduce speed at night, on hazardous roads, and in adverse weather.'),
      ref('cn-rtsa-reg-2017', ['第四十五条', '第四十六条', '第七十八条', '第八十一条'], '细化普通道路、高速公路和低能见度条件下速度阈值。', 'Details speed thresholds on ordinary roads, expressways, and under low visibility.'),
      ref('gb5768-current', ['GB 5768.5-2017'], '现行标准规定限制速度标志和设置语义。', 'The current standard defines speed-limit signs and their semantics.')
    ],
    mappings: [
      mapping('vehicle.motion.speed.operating', 'direct', '运行速度是规则执行和证据记录的核心车辆状态。', 'Operating speed is the core vehicle state for execution and evidence.'),
      mapping('odd.weather.particles.fog', 'contextual', '雾和能见度影响安全速度。', 'Fog and visibility affect safe speed.'),
      mapping('odd.road.geometry.plane.curve', 'supporting', '弯道等几何特征影响安全速度选择。', 'Curves and other geometry affect safe-speed selection.')
    ],
    conditionZh: '存在限速、低能见度、弯坡或其他需要降速的风险条件。', conditionEn: 'A speed limit, low visibility, curve/grade, or another speed-reduction condition exists.',
    triggerZh: '限速变化，或天气和道路条件使当前速度不再安全。', triggerEn: 'The limit changes, or weather and road conditions make the current speed unsafe.',
    responseZh: '在约束生效前平顺降速，并持续记录限速来源、目标速度和实际速度。', responseEn: 'Reduce speed smoothly before the constraint applies and log source, target, and actual speed.'
  }),
  obligation({
    id: 'rr.road.special-lanes', order: 7, category: 'road_traffic',
    zh: '遵守专用车道与应急车道规则', en: 'Respect reserved and emergency-lane rules',
    summaryZh: '根据车道用途、时段和交通控制决定专用、潮汐、避险及应急车道是否可用。',
    summaryEn: 'Use lane purpose, time, and traffic control to determine access to reserved, reversible, escape, and emergency lanes.',
    refs: [
      ref('cn-rtsa-2021', ['第三十七条'], '专用车道只准规定车辆通行。', 'Reserved lanes are limited to designated vehicles.'),
      ref('cn-rtsa-reg-2017', ['第八十二条'], '非紧急情况不得在高速公路应急车道行驶或停车。', 'Expressway emergency lanes cannot be used or stopped in except for emergencies.')
    ],
    mappings: [
      mapping('odd.road.lane.type.bus', 'direct', '公交专用车道是明确的 ODC 车道类型。', 'Bus lanes are an explicit ODC lane type.'),
      mapping('odd.road.lane.type.tidal', 'direct', '潮汐车道具有时变方向和准入条件。', 'Reversible lanes have time-varying direction and access.'),
      mapping('odd.road.lane.type.escape', 'direct', '避险车道只用于特定风险处置。', 'Escape lanes are for specific risk handling.'),
      mapping('odd.road.lane.type.emergency', 'direct', '应急车道具有严格准入边界。', 'Emergency lanes have strict access boundaries.')
    ],
    conditionZh: '道路存在专用、潮汐、避险或应急车道。', conditionEn: 'Reserved, reversible, escape, or emergency lanes are present.',
    triggerZh: '车道用途标志、信号或开放时段变化。', triggerEn: 'Lane-use signs, signals, or opening periods change.',
    responseZh: '只在明确授权或紧急处置条件成立时进入，并保存准入依据。', responseEn: 'Enter only when explicitly authorized or under a valid emergency condition, retaining the basis for access.'
  }),
  obligation({
    id: 'rr.road.railway-crossing', order: 8, category: 'road_traffic',
    zh: '安全通过铁路道口', en: 'Traverse railway crossings safely',
    summaryZh: '服从道口信号和管理人员指挥；无信号时减速或停车确认安全。',
    summaryEn: 'Follow crossing signals and personnel; slow or stop to confirm safety where no signal exists.',
    refs: [
      ref('cn-rtsa-2021', ['第二十七条', '第四十六条'], '铁路道口应设置警示，机动车按信号或管理指挥通行。', 'Railway crossings require warnings and vehicles follow signals or personnel.'),
      ref('cn-rtsa-reg-2017', ['第四十三条'], '规定铁路道口红灯信号语义。', 'Defines red-signal semantics at railway crossings.'),
      ref('gb5768-current', ['GB 5768.6-2017'], '现行标准规定铁路道口交通标志和标线。', 'The current standard defines railway-crossing signs and markings.')
    ],
    mappings: [
      mapping('odd.infrastructure.special.railway_crossing', 'direct', '铁路交叉设施与规则场景直接对应。', 'Railway-crossing facilities map directly to the rule scenario.'),
      mapping('odd.infrastructure.traffic_control.signal', 'supporting', '道口信号决定通行许可。', 'Crossing signals determine permission to proceed.')
    ],
    conditionZh: '路线穿越有人或无人看守铁路道口。', conditionEn: 'The route crosses a guarded or unguarded railway crossing.',
    triggerZh: '道口灯闪烁、栏杆关闭、人员指挥或视距受限。', triggerEn: 'Crossing lights flash, barriers close, personnel direct traffic, or sight distance is limited.',
    responseZh: '在道口外停车或减速确认，不在轨道区域内停留。', responseEn: 'Stop or slow before the crossing, confirm safety, and never remain in the track zone.'
  }),
  obligation({
    id: 'rr.operation.following-distance', order: 9, category: 'vehicle_operation',
    zh: '保持安全跟车距离', en: 'Maintain a safe following distance',
    summaryZh: '根据速度、路面、天气、能见度和前车运动保持足以制动的距离。',
    summaryEn: 'Maintain enough braking distance based on speed, surface, weather, visibility, and lead-vehicle motion.',
    refs: [
      ref('cn-rtsa-2021', ['第四十三条'], '后车应与前车保持足以采取紧急制动的安全距离。', 'A following vehicle must retain enough distance for emergency braking.'),
      ref('cn-rtsa-reg-2017', ['第八十条', '第八十一条'], '细化高速公路跟车距离及低能见度阈值。', 'Details expressway following distance and low-visibility thresholds.')
    ],
    mappings: [
      mapping('odd.targets.motor_vehicle', 'contextual', '前车属于核心交互目标。', 'The lead vehicle is a core interaction target.'),
      mapping('vehicle.motion.speed.operating', 'supporting', '速度是安全距离计算的关键输入。', 'Speed is a key input to safe-distance calculation.')
    ],
    conditionZh: '同车道存在前车或汇入车辆。', conditionEn: 'A lead or merging vehicle is present in the lane.',
    triggerZh: '时距下降、前车制动或路面附着和能见度恶化。', triggerEn: 'Time headway drops, the lead vehicle brakes, or friction/visibility deteriorates.',
    responseZh: '提前减速并恢复可验证的安全时距，不以碰撞避免作为唯一通过标准。', responseEn: 'Decelerate early and restore a verifiable safe headway; collision avoidance alone is not the only pass criterion.'
  }),
  obligation({
    id: 'rr.operation.lane-change', order: 10, category: 'vehicle_operation',
    zh: '安全变更车道', en: 'Change lanes safely',
    summaryZh: '确认目标车道间隙、优先关系和标线约束，不影响相关车道正常行驶。',
    summaryEn: 'Confirm target-lane gaps, priority, and marking constraints without disrupting traffic in the target lane.',
    refs: [ref('cn-rtsa-reg-2017', ['第四十四条'], '变更车道不得影响相关车道内机动车正常行驶。', 'A lane change must not affect normal travel in the target lane.')],
    mappings: [
      mapping('odd.road.lane.type.entrance', 'contextual', '入口和加速车道形成典型汇入变道。', 'Entrances and acceleration lanes create merge lane changes.'),
      mapping('odd.road.lane.type.exit', 'contextual', '出口和减速车道形成典型分流变道。', 'Exits and deceleration lanes create diverge lane changes.'),
      mapping('odd.road.lane.marking.type', 'supporting', '实虚线决定是否允许跨越。', 'Solid/dashed markings determine whether crossing is allowed.')
    ],
    conditionZh: '存在可变更的相邻车道、入口或出口。', conditionEn: 'An adjacent lane, entrance, or exit is available for a lane change.',
    triggerZh: '导航、障碍、车道结束或交通组织要求变道。', triggerEn: 'Navigation, an obstruction, a lane ending, or traffic organization requires a lane change.',
    responseZh: '检查标线与间隙，发出信号，平顺完成或在条件不足时取消。', responseEn: 'Check markings and gaps, signal, and execute smoothly or abort when conditions are insufficient.'
  }),
  obligation({
    id: 'rr.operation.overtaking', order: 11, category: 'vehicle_operation',
    zh: '合法且安全地超车', en: 'Overtake lawfully and safely',
    summaryZh: '只在允许路段、足够视距与安全间隙下超车，并避开明令禁止的道路结构和对象。',
    summaryEn: 'Overtake only on permitted roads with sufficient sight distance and gaps, avoiding prohibited structures and targets.',
    refs: [
      ref('cn-rtsa-2021', ['第四十三条'], '规定安全距离及不得超车的前车状态、特殊车辆和道路位置。', 'Defines safe distance and conditions where overtaking is prohibited.'),
      ref('cn-rtsa-reg-2017', ['第四十七条'], '规定超车信号、方向和安全间距。', 'Defines overtaking signals, direction, and clearance.')
    ],
    mappings: [
      mapping('odd.targets.motor_vehicle', 'contextual', '被超车辆和对向车辆构成关键交互对象。', 'The overtaken and oncoming vehicles are key interaction targets.'),
      mapping('odd.road.geometry.plane.curve', 'supporting', '弯道视距影响超车适用性。', 'Curve sight distance affects overtaking applicability.'),
      mapping('odd.infrastructure.special.tunnel', 'supporting', '隧道属于法规列举的无超车条件位置。', 'Tunnels are listed as locations without overtaking conditions.')
    ],
    conditionZh: '存在慢车且道路、标线、视距和对向间隙均允许超车。', conditionEn: 'A slower vehicle is present and road, markings, sight distance, and oncoming gap permit overtaking.',
    triggerZh: '前车减速，或道路进入弯道、窄桥、隧道、交叉口等禁超区域。', triggerEn: 'The lead vehicle slows, or the road enters a prohibited curve, narrow bridge, tunnel, or intersection.',
    responseZh: '仅在完整安全窗口内执行；窗口关闭即取消，不强行完成。', responseEn: 'Execute only within a complete safe window; abort rather than force completion when it closes.'
  }),
  obligation({
    id: 'rr.operation.turning', order: 12, category: 'vehicle_operation',
    zh: '安全转弯与掉头', en: 'Turn and make U-turns safely',
    summaryZh: '依据导向车道、信号、标线、让行关系和道路结构完成转弯或掉头。',
    summaryEn: 'Use guide lanes, signals, markings, priority, and road structure to execute turns or U-turns.',
    refs: [ref('cn-rtsa-reg-2017', ['第四十九条至第五十二条'], '规定掉头、倒车以及有无信号交叉口的转弯和让行行为。', 'Defines U-turns, reversing, and turning/priority at controlled and uncontrolled intersections.')],
    mappings: [
      mapping('odd.road.intersection.at_grade', 'direct', '平面交叉是转向行为的主要结构。', 'At-grade intersections are the primary structure for turning.'),
      mapping('odd.road.intersection.roundabout.normal', 'contextual', '环岛需要进入、环行和驶出决策。', 'Roundabouts require entry, circulation, and exit decisions.'),
      mapping('odd.road.intersection.ramp', 'contextual', '匝道转向涉及曲率、速度和汇入关系。', 'Ramp turns involve curvature, speed, and merging.')
    ],
    conditionZh: '路线要求左转、右转、掉头或环岛通行。', conditionEn: 'The route requires a left turn, right turn, U-turn, or roundabout traversal.',
    triggerZh: '到达导向车道、停止线、冲突点或允许掉头位置。', triggerEn: 'The vehicle reaches a guide lane, stop line, conflict point, or permitted U-turn point.',
    responseZh: '提前选道和示意，遵守禁止性约束并让行冲突交通。', responseEn: 'Select the lane and signal early, obey prohibitions, and yield to conflicting traffic.'
  }),
  obligation({
    id: 'rr.priority.intersection', order: 13, category: 'priority_interaction',
    zh: '遵守交叉口优先关系', en: 'Respect intersection priority',
    summaryZh: '在有信号和无信号交叉口识别优先通行方，并对行人和冲突车辆让行。',
    summaryEn: 'Identify priority at controlled and uncontrolled intersections and yield to pedestrians and conflicting vehicles.',
    refs: [
      ref('cn-rtsa-2021', ['第四十四条'], '交叉口按信号通行；无信号时减速并让行人和优先车辆先行。', 'Follow signals at intersections; otherwise slow and yield to pedestrians and priority traffic.'),
      ref('cn-rtsa-reg-2017', ['第五十一条', '第五十二条'], '细化环岛、左右转和无控制交叉口的优先关系。', 'Details roundabout, turning, and uncontrolled-intersection priority.')
    ],
    mappings: [
      mapping('odd.road.intersection.at_grade', 'direct', '平面交叉定义冲突空间。', 'At-grade intersections define the conflict space.'),
      mapping('odd.infrastructure.traffic_control.signal', 'supporting', '信号状态决定通行权。', 'Signal state determines right of way.'),
      mapping('odd.infrastructure.special.crosswalk', 'supporting', '人行横道引入行人优先约束。', 'Crosswalks introduce pedestrian-priority constraints.')
    ],
    conditionZh: '进入有信号或无信号的交叉口。', conditionEn: 'The vehicle approaches a controlled or uncontrolled intersection.',
    triggerZh: '检测到冲突车辆、行人、放行信号或右侧来车。', triggerEn: 'Conflicting vehicles, pedestrians, a release signal, or right-side traffic are detected.',
    responseZh: '建立冲突区通行序列，只在优先关系和安全间隙均明确时进入。', responseEn: 'Establish a conflict-zone sequence and enter only when priority and safe gap are clear.'
  }),
  obligation({
    id: 'rr.priority.merge', order: 14, category: 'priority_interaction',
    zh: '排队通行与交替汇入', en: 'Queue orderly and merge alternately',
    summaryZh: '拥堵或车道减少时不穿插、不借道抢行，并按规则依次或交替通行。',
    summaryEn: 'In congestion or lane reductions, do not cut in or use opposing lanes; proceed in order or alternate merges.',
    refs: [ref('cn-rtsa-2021', ['第四十五条'], '排队缓行时不得穿插；车道减少或无控制路口应依次交替通行。', 'Do not cut into queues; alternate at lane reductions or uncontrolled junctions.')],
    mappings: [
      mapping('odd.road.lane.type.entrance', 'contextual', '入口形成汇入和排队交互。', 'Entrances create merging and queuing interactions.'),
      mapping('odd.road.lane.count', 'supporting', '车道数量减少是交替通行的适用条件。', 'Lane-count reduction is an applicability condition for alternating merge.'),
      mapping('odd.infrastructure.temporary.construction', 'supporting', '施工常造成临时车道减少。', 'Work zones often cause temporary lane reductions.')
    ],
    conditionZh: '拥堵、车道减少或施工导改形成排队汇入。', conditionEn: 'Congestion, lane reduction, or work-zone diversion creates a queued merge.',
    triggerZh: '相邻车辆在汇入点竞争同一通行空间。', triggerEn: 'Adjacent vehicles compete for the same space at a merge point.',
    responseZh: '保持队列秩序和可解释的交替策略，不以迫使他车制动换取通行。', responseEn: 'Maintain queue order and an explainable alternating strategy without forcing another vehicle to brake.'
  }),
  obligation({
    id: 'rr.priority.pedestrian', order: 15, category: 'priority_interaction',
    zh: '在人行横道和横穿场景让行', en: 'Yield at crosswalks and pedestrian crossings',
    summaryZh: '接近人行横道减速，对正在通过或横穿道路的行人停车或避让。',
    summaryEn: 'Slow near crosswalks and stop or yield to pedestrians crossing or entering the road.',
    refs: [
      ref('cn-rtsa-2021', ['第四十七条', '第六十一条至第六十四条'], '规定机动车在人行横道和无信号横穿场景的减速、停车和避让义务。', 'Defines slowing, stopping, and yielding duties at crosswalks and unsignalized crossings.'),
      ref('cn-rtsa-reg-2017', ['第七十五条'], '细化行人横过机动车道的通行行为。', 'Details pedestrian road-crossing behavior.')
    ],
    mappings: [
      mapping('odd.targets.pedestrian', 'direct', '行人是直接交通参与者要素。', 'Pedestrians are a direct traffic-participant element.'),
      mapping('odd.infrastructure.special.crosswalk', 'direct', '人行横道是直接道路设施要素。', 'Crosswalks are a direct road-facility element.')
    ],
    conditionZh: '人行横道、路口或无设施路段出现行人横穿意图。', conditionEn: 'A pedestrian intends to cross at a crosswalk, junction, or road section without a facility.',
    triggerZh: '行人进入路缘、横道或预计冲突区域。', triggerEn: 'A pedestrian enters the curb, crosswalk, or predicted conflict zone.',
    responseZh: '提前减速并建立停车能力，对脆弱或不确定行为保留更大安全裕度。', responseEn: 'Slow early and preserve stopping capability, with larger margins for vulnerable or uncertain behavior.'
  }),
  obligation({
    id: 'rr.priority.non-motor', order: 16, category: 'priority_interaction',
    zh: '处理非机动车与混合交通', en: 'Handle non-motorized and mixed traffic',
    summaryZh: '识别非机动车合法通行空间、临时借道和交叉口优先关系。',
    summaryEn: 'Recognize lawful non-motorized travel space, temporary lane borrowing, and intersection priority.',
    refs: [
      ref('cn-rtsa-2021', ['第五十七条', '第五十八条'], '规定非机动车通行位置和部分速度要求。', 'Defines non-motorized travel position and selected speed requirements.'),
      ref('cn-rtsa-reg-2017', ['第六十八条至第七十条'], '细化非机动车交叉口、横穿和车道受阻时的行为及机动车让行。', 'Details non-motorized intersection, crossing, and blocked-lane behavior and motor-vehicle yielding.')
    ],
    mappings: [
      mapping('odd.targets.non_motor_vehicle', 'direct', '非机动车是直接交通参与者要素。', 'Non-motorized vehicles are a direct participant element.'),
      mapping('odd.road.lane.type.non_motor', 'direct', '非机动车道定义正常通行空间。', 'Non-motorized lanes define normal travel space.'),
      mapping('odd.road.lane.type.mixed', 'direct', '机非混行提高横向交互复杂度。', 'Mixed lanes increase lateral-interaction complexity.')
    ],
    conditionZh: '存在自行车、电动自行车或其他非机动车及其通行空间。', conditionEn: 'Bicycles, e-bikes, or other non-motorized users and their travel space are present.',
    triggerZh: '非机动车汇入、横穿、绕障或临时借用机动车道。', triggerEn: 'A non-motorized user merges, crosses, avoids an obstacle, or temporarily uses a motor lane.',
    responseZh: '降低相对速度、扩大横向间距并保留可预测的让行空间。', responseEn: 'Reduce relative speed, increase lateral clearance, and preserve predictable yielding space.'
  }),
  obligation({
    id: 'rr.risk.emergency-vehicle', order: 17, category: 'special_risk',
    zh: '避让执行紧急任务的车辆', en: 'Yield to emergency vehicles',
    summaryZh: '识别警报器、标志灯具和紧急任务车辆，及时创造安全通行空间。',
    summaryEn: 'Recognize sirens, warning lights, and emergency vehicles and create safe passage promptly.',
    refs: [ref('cn-rtsa-2021', ['第五十三条'], '执行紧急任务的特种车辆享有优先通行，其他车辆和行人应当让行。', 'Emergency vehicles on active duty have priority and other road users must yield.')],
    mappings: [
      mapping('odd.targets.motor_vehicle', 'contextual', '现有目录以机动车上位类承载紧急车辆，后续可扩展子类型。', 'The current catalog represents emergency vehicles under the motor-vehicle parent class and can later add subtypes.'),
      mapping('odd.weather.lighting.headlight', 'supporting', '标志灯具是识别紧急状态的视觉线索之一。', 'Warning lights are a visual cue for emergency status.')
    ],
    conditionZh: '警车、消防车、救护车或工程救险车执行紧急任务。', conditionEn: 'Police, fire, ambulance, or rescue vehicles are performing an emergency task.',
    triggerZh: '检测到接近的警报器、标志灯或紧急车辆轨迹。', triggerEn: 'An approaching siren, warning light, or emergency-vehicle trajectory is detected.',
    responseZh: '提前减速并选择合法安全位置让行，不阻断其路径。', responseEn: 'Slow early and yield in a lawful safe location without blocking the vehicle’s path.'
  }),
  obligation({
    id: 'rr.risk.temporary-control', order: 18, category: 'special_risk',
    zh: '应对施工、事故与临时交通管制', en: 'Handle work zones, incidents, and temporary traffic control',
    summaryZh: '识别临时标志、锥桶、人员指挥、事故现场和改道，并按当前交通组织通行。',
    summaryEn: 'Recognize temporary signs, cones, personnel, incident scenes, and diversions and follow the current traffic organization.',
    refs: [
      ref('cn-rtsa-2021', ['第三十二条', '第三十九条', '第四十条'], '道路施工应设置警示；公安机关可实施限制、禁止和交通管制。', 'Road works require warnings and authorities may impose restrictions or traffic control.'),
      ref('cn-rtsa-reg-2017', ['第三十五条', '第八十四条'], '规定施工标志、防护、绕行和机动车通过作业路段时减速。', 'Defines work-zone signs, protection, diversion, and reduced speed.'),
      ref('gb5768-current', ['GB 5768.4-2017', 'GB 5768.9-2025'], '现行标准规定作业区和交通事故管理区的交通控制表达。', 'Current standards define traffic control for work zones and incident-management areas.')
    ],
    mappings: [
      mapping('odd.infrastructure.temporary.construction', 'direct', '道路施工是直接临时设施要素。', 'Road construction is a direct temporary-facility element.'),
      mapping('odd.infrastructure.temporary.accident_site', 'direct', '事故现场是直接临时设施要素。', 'Incident sites are a direct temporary-facility element.'),
      mapping('odd.infrastructure.temporary.traffic_control', 'direct', '临时交通管制直接改变可用道路空间。', 'Temporary traffic control directly changes available road space.')
    ],
    conditionZh: '道路存在施工、事故处置、临时封闭或改道。', conditionEn: 'Road works, incident handling, temporary closure, or diversion is present.',
    triggerZh: '永久地图与现场锥桶、标志、人员或车道布局不一致。', triggerEn: 'The permanent map conflicts with cones, signs, personnel, or the current lane layout.',
    responseZh: '以可确认的现场交通组织为准，降速通过；无法建立可靠通道时安全停止或退出。', responseEn: 'Follow confirmed on-site organization at reduced speed; stop safely or exit when no reliable path can be established.'
  }),
  obligation({
    id: 'rr.risk.signalling', order: 19, category: 'special_risk',
    zh: '正确使用灯光、转向信号与警示', en: 'Use lights, turn signals, and warnings correctly',
    summaryZh: '在转向、变道、低能见度、故障和紧急停车中使用相应灯光与信号。',
    summaryEn: 'Use the appropriate lights and signals for turns, lane changes, low visibility, faults, and emergency stops.',
    refs: [
      ref('cn-rtsa-2021', ['第五十二条'], '车辆故障停车应使用危险报警闪光灯并设置警告。', 'A disabled vehicle must use hazard lights and warnings.'),
      ref('cn-rtsa-reg-2017', ['第四十七条', '第五十七条至第六十条', '第八十一条'], '细化超车、转向、夜间会车和低能见度灯光使用。', 'Details lights and signals for overtaking, turning, night encounters, and low visibility.')
    ],
    mappings: [
      mapping('odd.weather.lighting.headlight', 'contextual', '外部光照条件决定照明需求。', 'External lighting conditions determine illumination needs.'),
      mapping('vehicle.ads_state', 'supporting', '灯光和信号执行状态属于车辆控制与监测证据。', 'Light and signal actuation belongs to vehicle-control and monitoring evidence.')
    ],
    conditionZh: '发生转向、变道、超车、夜间、低能见度、故障或紧急停车。', conditionEn: 'Turning, lane changing, overtaking, night, low visibility, fault, or emergency stopping occurs.',
    triggerZh: '动作开始前、环境照度下降或系统检测到故障。', triggerEn: 'Before a maneuver, when illumination drops, or when a fault is detected.',
    responseZh: '按场景及时激活正确灯光和信号，并监测执行反馈。', responseEn: 'Activate the correct lights and signals in time and monitor actuation feedback.'
  }),
  obligation({
    id: 'rr.risk.safe-stop', order: 20, category: 'special_risk',
    zh: 'ODC 边界、故障与安全停车', en: 'ODC boundary, fault handling, and safe stop',
    summaryZh: '当环境超出已声明 ODC、关键系统故障或无法继续合法安全通行时，执行受控降级、退出或安全停车。',
    summaryEn: 'When conditions leave the declared ODC, a critical system faults, or lawful safe travel cannot continue, perform controlled degradation, exit, or a safe stop.',
    refs: [
      ref('cn-rtsa-2021', ['第二十一条', '第五十二条'], '车辆不应带安全隐患上路；道路故障停车需要警示并避免妨碍交通。', 'Vehicles should not operate with safety hazards; roadside fault stops require warning and must avoid obstructing traffic.'),
      ref('gbt45312-2025', ['ODC 元素分类'], 'ODC 分类为运行边界监测提供统一输入，但不等同于法规符合性结论。', 'The ODC taxonomy provides common inputs for boundary monitoring but is not a legal-compliance conclusion.')
    ],
    mappings: [
      mapping('vehicle.ads_state', 'direct', 'ADS 和关键子系统状态决定是否可继续执行动态驾驶任务。', 'ADS and subsystem states determine whether the dynamic driving task may continue.'),
      mapping('vehicle.motion.speed.operating', 'supporting', '降级和停车需要可验证的速度轨迹。', 'Degradation and stopping require a verifiable speed profile.'),
      mapping('odd.road.lane.type.emergency', 'contextual', '应急车道可能是特定场景的停车候选，但不是默认目的地。', 'An emergency lane may be a stopping candidate in specific scenarios but is not the default destination.')
    ],
    conditionZh: 'ODC 条件越界、关键感知/控制故障或合法路径不可建立。', conditionEn: 'An ODC boundary is exceeded, a critical perception/control fault occurs, or no lawful path can be established.',
    triggerZh: '边界预测将被突破、健康监测报警或连续低置信度无法恢复。', triggerEn: 'A boundary is predicted to be exceeded, health monitoring alerts, or persistent low confidence cannot recover.',
    responseZh: '选择风险最低且合法的降级路径，向相关人员提示，完成安全停车并保留全过程证据。', responseEn: 'Choose the lowest-risk lawful fallback, notify relevant people, complete a safe stop, and retain end-to-end evidence.',
    subjectKind: 'vehicle_owner_or_operator',
    subjectZh: '机动车驾驶人以及依法承担车辆安全管理责任的相关主体',
    subjectEn: 'Motor-vehicle drivers and parties legally responsible for vehicle safety management',
    derivationType: 'engineering_candidate',
    derivationZh: '道路故障警示和避免妨碍交通来自公开规则；ODC 监测、受控降级、退出和最小风险停车是面向自动驾驶开发的工程候选，不是条文直接规定的系统行为。',
    derivationEn: 'Roadside-fault warning and avoiding traffic obstruction come from public rules. ODC monitoring, controlled degradation, exit, and minimum-risk stopping are engineering candidates for ADS development, not system behavior directly prescribed by the clauses.',
    evidence: ['requirements_trace', 'model_or_code_review', 'simulation', 'proving_ground', 'event_log', 'human_review']
  })
]

const payload = {
  schema_version: '0.1.0',
  profile: {
    id: 'openodc-road-rules-cn',
    version: '0.5.0',
    title: text('OpenODC 中国道路规则义务映射', 'OpenODC China Road-Rule Obligation Mapping'),
    description: text(
      '把现行公开法规中的道路规则义务连接到 ODC 适用条件、场景触发点和候选证据。',
      'Connects road-rule obligations from current public sources to ODC applicability, scenario triggers, and evidence candidates.'
    ),
    jurisdiction: 'CN',
    source_status: 'current-public-sources',
    reviewed_on: '2026-07-14',
    disclaimer: text(
      '本数据用于工程研究、需求追溯和测试设计，不构成法律意见、认证结论或任何车型的符合性判定。',
      'This dataset supports engineering research, requirements traceability, and test design. It is not legal advice, certification, or a compliance determination for any vehicle.'
    )
  },
  sources,
  obligations
}

mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, JSON.stringify(payload, null, 2) + '\n')
console.log(`Wrote ${obligations.length} road-rule obligations to ${output}`)
