// enrich-evidence.mjs
// Adds per-element provenance to curated sample records and tightens
// unsupported quantitative claims. This does not make a record
// vendor-confirmed; it marks it as community-reviewed against public sources.

import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')

const today = '2026-05-02'

function ref(type, confidence, url, title, section, page, notes) {
  return Object.fromEntries(Object.entries({ type, confidence, url, title, section, page, extracted_date: today, notes }).filter(([, v]) => v !== undefined))
}

const profiles = {
  'tesla-fsd-us-v13': {
    sources: [
      'Tesla Model Y Owner Manual · Full Self-Driving (Supervised): https://www.tesla.com/ownersmanual/modely/en_us/GUID-2CB60804-9CEA-4F4B-8B04-09B991368DC5.html',
      'Tesla Model Y Owner Manual · Speed Assist: https://www.tesla.com/ownersmanual/modely/en_us/GUID-5D3D4014-4E98-45D7-8BBC-F76BCA9CEC05.html',
      'Tesla Model Y Owner Manual PDF: https://www.tesla.com/ownersmanual/modely/en_us/Owners_Manual.pdf',
      'Tesla FSD Supervised support page: https://www.tesla.com/support/fsd',
      'NotATeslaApp release-note mirror, supplementary only: https://www.notateslaapp.com/software-updates/version/2025.14.6/release-notes'
    ],
    notes: 'OpenODC 社区已按 2026-05-02 可访问的 Tesla 官方 Model Y 手册、FSD Supervised 说明与补充版本线索复核。本条仍不是 Tesla 官方 ODC 声明。手册可高置信支撑驾驶员持续监管、FSD 激活速度 <85 mph (140 km/h)、车灯/雨刮/摄像头/安全带/接管等条件；天气、曲率、坡度等没有量化阈值，不能推定为完整 ODD。',
    manual: ref('owner_manual', 'high', 'https://www.tesla.com/ownersmanual/modely/en_us/GUID-2CB60804-9CEA-4F4B-8B04-09B991368DC5.html', 'Tesla Model Y Owner Manual · Full Self-Driving (Supervised)', 'Autopilot / Full Self-Driving (Supervised)'),
    official: ref('official', 'high', 'https://www.tesla.com/support/fsd', 'Tesla FSD Supervised support page', 'FSD Supervised'),
    curated: ref('community_extracted', 'medium', 'https://www.tesla.com/ownersmanual/modely/en_us/GUID-2CB60804-9CEA-4F4B-8B04-09B991368DC5.html', 'OpenODC extraction from Tesla manual', 'Autopilot limitations and warnings'),
    inferred: ref('inferred', 'low', 'https://www.tesla.com/ownersmanual/modely/en_us/GUID-2CB60804-9CEA-4F4B-8B04-09B991368DC5.html', 'OpenODC inference from Tesla manual', 'Manual states qualitative limitation but no quantitative threshold')
  },
  'tesla-autopilot-china-basic': {
    sources: [
      'Tesla 中国 Model Y 车主手册（简体中文）: https://www.tesla.cn/ownersmanual/modely/zh_cn_us/',
      'Tesla 中国 Model Y 车主手册 PDF: https://www.tesla.cn/ownersmanual/modely/zh_cn_us/Owners_Manual.pdf',
      'Tesla 中国 · 辅助驾驶功能使用说明和警示: https://www.tesla.cn/support/autopilot-notes',
      'Tesla 中国 Model Y 产品页: https://www.tesla.cn/modely',
      'Tesla 中国 Model Y L 产品页: https://www.tesla.cn/modely-L'
    ],
    notes: 'OpenODC 社区已按 2026-05-02 可访问的 Tesla 中国车主手册和辅助驾驶警示页复核。本条描述中国市场基础 Autopilot（TACC + Autosteer），不包含 FSD 中国付费功能包。手册可高置信支撑驾驶员持续监管、速度上限、车道线/天气/施工/安全带等限制；未公开 mm/h、曲率半径、坡度等量化 ODC。',
    manual: ref('owner_manual', 'high', 'https://www.tesla.cn/ownersmanual/modely/zh_cn_us/Owners_Manual.pdf', 'Tesla 中国 Model Y 车主手册 PDF', 'Autopilot 自动辅助驾驶'),
    official: ref('official', 'high', 'https://www.tesla.cn/support/autopilot-notes', 'Tesla 中国辅助驾驶功能使用说明和警示', 'Autopilot notes'),
    curated: ref('community_extracted', 'medium', 'https://www.tesla.cn/ownersmanual/modely/zh_cn_us/', 'OpenODC extraction from Tesla China manual', 'Autopilot 自动辅助驾驶'),
    inferred: ref('inferred', 'low', 'https://www.tesla.cn/ownersmanual/modely/zh_cn_us/', 'OpenODC inference from Tesla China manual', 'Manual states qualitative limitation but no quantitative threshold')
  },
  'huawei-ads4-aito-m9': {
    sources: [
      '问界 M9 2025 款纯电使用说明书（2026-03-17 版官方 PDF）: https://aito.auto/dam/content/dam/aito/cn/service/pdf/m9-2025-ev-product-manual-20260317.pdf',
      '问界 M9 2025 款纯电使用说明书（2025-04 版官方 PDF）: https://aito.auto/dam/content/dam/aito/cn/service/pdf/m9-2025-ev-product-manual-20250414.pdf',
      '问界 M9 官方产品页（ADS 4 与辅助驾驶责任说明）: https://aito.auto/model/m9/',
      '问界 M9 参数配置表（AITO 官方）: https://aito.auto/model/m9/configuration/',
      '华为乾崑智驾官方页（2026-05 已更新为 ADS 5，用于核验辅助驾驶责任边界）: https://auto.huawei.com/cn/ads'
    ],
    notes: 'OpenODC 社区已按 2026-05-02 可访问的 AITO 官方 M9 产品页、配置表和 2026-03-17 版官方使用说明书复核。本条是问界 M9 2025 款 ADS 4 辅助驾驶样例，不等同于 2026-04-23 发布的 ADS 5，也不包含监管试点中的 L3 能力。手册可高置信支撑 NCA 适用道路、驾驶员责任、NCA 最高目标车速 130 km/h、初始目标车速下限 30 km/h、新手考试/里程条件、脱手检测与降级逻辑；雨雪雾没有 mm/h 或能见度量化阈值。',
    manual: ref('owner_manual', 'high', 'https://aito.auto/dam/content/dam/aito/cn/service/pdf/m9-2025-ev-product-manual-20260317.pdf', '问界 M9 2025 款纯电使用说明书（2026-03-17）', '了解 ADS / 领航辅助 NCA', '235, 269, 275'),
    official: ref('official', 'high', 'https://aito.auto/model/m9/', '问界 M9 官方产品页', '华为乾崑智驾 ADS 4 / 免责声明'),
    curated: ref('community_extracted', 'medium', 'https://aito.auto/dam/content/dam/aito/cn/service/pdf/m9-2025-ev-product-manual-20260317.pdf', 'OpenODC extraction from AITO manual', 'ADS limitations and NCA conditions'),
    inferred: ref('inferred', 'low', 'https://aito.auto/dam/content/dam/aito/cn/service/pdf/m9-2025-ev-product-manual-20260317.pdf', 'OpenODC inference from AITO manual', 'Manual states qualitative limitation but no quantitative threshold')
  },
  'baidu-apollogo-wuhan': {
    sources: [
      '萝卜快跑 Apollo Go 官方门户: https://www.apollogo.com/ch/',
      '武汉经开区 · 自动驾驶装备商业化试点管理办法发布说明: https://www.whkfq.gov.cn/xwzx/yw/kfqyw/qnxw/202409/t20240924_2458453.html',
      '武汉经开区 · 智能网联汽车道路测试与示范应用管理办法（2024-09）: https://www.whkfq.gov.cn/xxgk/zc/gfxwj/202409/t20240920_2457091.html',
      '武汉经开区 · 交通部智能交通先导应用试点: https://www.whkfq.gov.cn/gzfw/jt/202404/t20240424_2392967.html',
      '武汉经开区 · 3000 平方公里城市实验室报道: https://www.whkfq.gov.cn/xwzx/yw/kfqyw/qnxw/202504/t20250422_2570742.html',
      'Baidu Apollo RT6 官方发布稿（PR Newswire 镜像）: https://www.prnewswire.com/news-releases/baidu-unveils-next-gen-autonomous-vehicle-ready-to-provide-driverless-robotaxi-half-of-taxi-fares-301590644.html'
    ],
    notes: 'OpenODC 社区已按 2026-05-02 可访问的武汉经开区政府文件、武汉智能交通试点公告、Apollo Go 官方入口与 RT6 官方发布稿复核。本条为武汉示范运营样例；Robotaxi 没有车主手册，权威证据优先级为政府运营规则、示范应用管理文件、官方运营规则和 App 实时电子围栏。公开网页不能支撑统一运行速度上限、具体雨量/能见度停运阈值或完整乘客年龄规则，因此这些项目保留为公开资料未明确或中置信运营规则线索。',
    manual: ref('government_notice', 'high', 'https://www.whkfq.gov.cn/xxgk/zc/gfxwj/202409/t20240920_2457091.html', '武汉经开区智能网联汽车道路测试与示范应用管理办法', '测试、示范应用与安全员管理'),
    official: ref('government_notice', 'high', 'https://www.whkfq.gov.cn/xwzx/yw/kfqyw/qnxw/202409/t20240924_2458453.html', '武汉经开区自动驾驶装备商业化试点管理办法发布说明', '商业化试点管理办法'),
    curated: ref('community_extracted', 'medium', 'https://www.apollogo.com/ch/', 'OpenODC extraction from Apollo Go public portal and government notices', 'Robotaxi operating boundary'),
    inferred: ref('inferred', 'low', 'https://www.whkfq.gov.cn/gzfw/jt/202404/t20240424_2392967.html', 'OpenODC inference from Wuhan pilot information', 'Operational details not fully public')
  },
  'pony-ai-gen7-robotaxi': {
    sources: [
      '小马智行官网（中文）: https://pony.ai/?lang=zh',
      'Pony.ai Gen-7 fully-driverless commercial services official PDF: https://ir.pony.ai/node/7506/pdf',
      'Pony.ai 投资者关系: https://ir.pony.ai',
      '深圳前海管理局 · 小马智行前海全无人商业化运营: https://qh.sz.gov.cn/sygnan/qhzx/dtzx/content/mpost_12077869.html',
      'NVIDIA Blog · Pony.ai Gen-7 DRIVE Orin: https://blogs.nvidia.com/blog/pony-ai-robotaxi-fleet-drive-orin/'
    ],
    notes: 'OpenODC 社区已按 2026-05-02 可访问的小马智行官网、IR 官方 PDF、深圳前海政府页面和硬件合作方资料复核。本条可高置信支撑 Gen-7 全无人商业化运营城市、L4 Robotaxi 服务属性、车内无安全员、硬件/算力方向；具体 geofence、速度上限、天气停运阈值、乘客规则和远程协助 SOP 未公开。',
    manual: ref('official', 'high', 'https://ir.pony.ai/node/7506/pdf', 'Pony.ai Gen-7 fully-driverless commercial services official PDF', 'Gen-7 Robotaxi commercial operations'),
    official: ref('official', 'high', 'https://ir.pony.ai/node/7506/pdf', 'Pony.ai official release PDF', 'Gen-7 Robotaxi commercial operations'),
    curated: ref('community_extracted', 'medium', 'https://pony.ai/?lang=zh', 'OpenODC extraction from Pony.ai public sources', 'Robotaxi operating boundary'),
    inferred: ref('inferred', 'low', 'https://ir.pony.ai/node/7506/pdf', 'OpenODC inference from Pony.ai official release', 'Operational details not fully public')
  },
  'xpeng-xngp-p7plus-2026': {
    sources: [
      '2026 款小鹏 P7+ 产品页: https://www.xiaopeng.com/p7_plus_2026.html',
      '2026 款小鹏 P7+ 参数配置表: https://www.xiaopeng.com/p7_plus_2026/configuration.html',
      '2026 小鹏全球新品发布会新闻稿: https://www.xiaopeng.com/news/company_news/5529.html',
      '小鹏图灵 AI 芯片页: https://www.xiaopeng.com/turingaichip.html',
      'XNGP 快速上手指南（小鹏官方社区）: https://bbs.xiaopeng.com/article/2834581',
      'G6 高速 NGP 上手指南（小鹏官方社区）: https://bbs.xiaopeng.com/article/1799825'
    ],
    notes: 'OpenODC 社区已按 2026-05-02 可访问的小鹏 P7+ 官方产品页、配置表、官方新闻稿和官方社区指南复核。本条为 L2 辅助驾驶样例。官方页面可支撑 P7+ AI 辅助驾驶硬件、城市/高速 NGP、车位到车位、人机共驾、AEB/AES 130 km/h 等主动安全参数和驾驶员责任提示；公开资料未给出 XNGP 统一运行速度上限、雨量/能见度/坡度等量化 ODC 阈值。',
    manual: ref('official', 'high', 'https://www.xiaopeng.com/p7_plus_2026/configuration.html', '2026 款小鹏 P7+ 参数配置表', 'AI辅助驾驶 / 全域安全'),
    official: ref('official', 'high', 'https://www.xiaopeng.com/p7_plus_2026.html', '2026 款小鹏 P7+ 产品页', 'AI辅助驾驶 / 页面注释'),
    curated: ref('community_extracted', 'medium', 'https://bbs.xiaopeng.com/article/2834581', 'XNGP 快速上手指南（小鹏官方社区）', 'XNGP user guidance'),
    inferred: ref('inferred', 'low', 'https://www.xiaopeng.com/p7_plus_2026.html', 'OpenODC inference from XPeng official pages', 'Official pages state qualitative limitation but no quantitative threshold')
  }
}

const overrides = {
  'tesla-fsd-us-v13': {
    'odd.road.lane.width': {
      description: '[手册明确] 手册将狭窄道路、有迎面车辆或双排停放车辆的场景列为 FSD / Autopilot 需要驾驶员特别注意或可能干预的限制条件；未给出最小车道宽度阈值。',
      parameter_range: '[公开资料未量化] 最小车道宽度未公开。'
    },
    'vehicle.motion.speed.operating': {
      parameter_range: '[手册明确] FSD Supervised 可在车速低于 85 mph（140 km/h）时启用；运行中目标速度受道路限速、速度配置、交通流和驾驶员干预影响。公开手册未给出一个可等同于 FSD ODC 的统一最高巡航阈值。'
    },
    'vehicle.motion.speed.activation': {
      parameter_range: '[手册明确] FSD Supervised 可在车速低于 85 mph（140 km/h）时启用，包括车辆静止时；从驻车触摸屏启动还要求合适驾驶员在座、安全带、车门/前后备箱/充电状态等条件满足。'
    }
  },
  'tesla-autopilot-china-basic': {
    'odd.road.type.urban_road.arterial': {
      description: '[手册明确] 中国 Model Y 手册说明 Autopilot/智能辅助转向属于辅助驾驶，不能实现自动驾驶或取代驾驶员身份；城市主干路如满足车道线、速度、车灯等条件可使用相关辅助功能，但路口、信号灯、行人和复杂交通仍由驾驶员负责。'
    },
    'vehicle.motion.speed.operating': {
      parameter_range: '[手册明确] 中国 Model Y 手册公开页显示智能辅助转向 / Autosteer 典型可用速度为 30–140 km/h；无前方车辆时低于 30 km/h 不可启用。超过 80 km/h 时 TACC 对静止车辆识别存在限制。'
    },
    'vehicle.motion.speed.activation': {
      parameter_range: '[手册明确] Autosteer / 智能辅助转向可在 30–140 km/h 范围启用；若前方至少约 1.5 m 有车辆，可在更低车速启用。'
    }
  },
  'huawei-ads4-aito-m9': {
    'odd.road.type.area': {
      description: '[官方声明] AITO 问界 M9 官方产品页明确该车型搭载华为乾崑智驾 ADS 4，并以“全国都能开、车位到车位、园区闸机、环岛、高速 ETC”等方式描述可用场景；具体城市、道路、版本开通范围应以车机/官方配置和实时提示为准。本样例不纳入 L3 试点能力。'
    },
    'odd.road.type.urban_road': {
      description: '[官方声明] AITO 官方产品页将 ADS 4 描述为可覆盖城市通勤、环岛、园区闸机等复杂场景；公开资料未给出可用城市/路段的完整机器可读清单，实际边界以车机提示和版本开通范围为准。'
    },
    'odd.road.type.highway': {
      description: '[官方声明] AITO 官方产品页明确 ADS 4 支持高速 ETC 连贯通过等导航辅助场景；公开资料未给出全国高速覆盖率或每条高速路段清单，实际可用边界以车机提示、导航路线和道路条件为准。'
    },
    'odd.road.geometry.plane.curve': {
      description: '[公开资料未明确] AITO 官方使用说明书未给出 NCA 可通行曲率半径阈值。不能把行业典型道路半径反推为 ADS 4 ODC。',
      parameter_range: null
    },
    'odd.road.geometry.profile.uphill': {
      description: '[公开资料未明确] 官方手册未给出 NCA 上坡坡度阈值。',
      parameter_range: null
    },
    'odd.road.geometry.profile.downhill': {
      description: '[公开资料未明确] 官方手册未给出 NCA 下坡坡度阈值。',
      parameter_range: null
    },
    'odd.road.lane.width': {
      description: '[公开资料未明确] 官方手册未给出 NCA 最小/最大车道宽度阈值。',
      parameter_range: null
    },
    'odd.road.intersection.ramp': {
      description: '[手册明确] NCA 可在导航辅助驾驶场景下处理部分匝道/进出高速类动作；具体匝道速度、曲率和可用路段以车机提示、导航路线和实时道路条件为准。',
      parameter_range: '[公开资料未量化] 匝道速度阈值未公开。'
    },
    'odd.targets.obstacle': {
      description: '[手册明确] AITO 使用说明书和产品页说明车辆具备多传感器感知与主动安全能力，可对车辆、行人、骑行者和部分障碍物进行提示或制动辅助；公开资料未给出 ADS 4 对小障碍物的统一尺寸阈值。',
      parameter_range: '[公开资料未量化] 小障碍物尺寸阈值未公开。'
    },
    'odd.weather.atmospheric.rain': {
      description: '[手册明确] 官方使用说明书和产品页均提示 ADS 不能应对所有天气，驾驶员需保持主动控制；公开资料未给出降雨 mm/h 阈值。不得把国标雨量分级反推为 ADS 4 的允许/降级/退出阈值。',
      parameter_range: '[公开资料未量化] 雨量阈值未公开；雨雪湿滑场景需谨慎使用并随时接管。'
    },
    'odd.weather.atmospheric.snow.snowfall': {
      description: '[手册明确] 官方使用说明书将雨雪、湿滑、低能见度等列为需要谨慎/人工干预的条件；未给出降雪量或积雪深度阈值。',
      parameter_range: '[公开资料未量化] 降雪/积雪阈值未公开。'
    },
    'odd.weather.particles.fog': {
      description: '[手册明确] 官方资料提示 ADS 不能应对所有天气和交通情况；浓雾/低能见度会影响感知与驾驶判断，未给出能见度米数阈值。',
      parameter_range: '[公开资料未量化] 能见度阈值未公开。'
    },
    'personnel.driver.takeover.attention': {
      description: '[手册明确] 使用 ADS / NCA 时驾驶员应始终手握方向盘，注意仪表和声音提示，做好随时干预或控制车辆的准备；系统会进行脱手检测并触发提醒。'
    },
    'odd.weather.temperature': {
      description: '[公开资料未明确] AITO 官方使用说明书未给出 ADS / NCA 独立工作温度范围；整车环境适应性不能直接等同于 ADS ODC。',
      parameter_range: null
    },
    'vehicle.motion.speed.operating': {
      parameter_range: '[手册明确] NCA 最高目标车速 130 km/h；激活 NCA 最小初始目标车速 30 km/h。车辆最高车速 200 km/h 不是 NCA 的 ODC 上限。'
    },
    'vehicle.motion.speed.activation': {
      parameter_range: '[手册明确] NCA 激活最小初始目标车速 30 km/h，最高目标车速 130 km/h；ACC、LCC、AEB、AES 等子功能各自速度范围不应合并成 NCA 的统一 ODC。'
    },
    'vehicle.motion.acceleration.activation': {
      description: '[公开资料未明确] 官方手册未给出 NCA 可接受纵向加速度阈值；舒适性或控制策略推定值不能作为公开 ODC。',
      parameter_range: null
    },
    'vehicle.ads_state': {
      description: '[手册明确] 当传感器受遮挡、功能不可用或驾驶员未按提示接管时，系统会提示、降级或退出；公开资料未给出统一电量阈值、传感器健康量化阈值或软件状态阈值。',
      parameter_range: '[公开资料未量化] 车辆状态量化阈值未公开。'
    }
  },
  'baidu-apollogo-wuhan': {
    'vehicle.motion.speed.operating': {
      description: '[公开资料未明确] 武汉政府与 Apollo Go 公开网页未披露萝卜快跑武汉服务的统一运营速度上限；不得用道路限速、车辆最高车速或媒体体验速度替代 ODC 阈值。',
      parameter_range: null
    },
    'odd.road.type.highway.expressway': {
      description: '[政府公告] 武汉跨区城市出行服务自动驾驶先导应用试点涉及城市出行和跨区服务；具体高速/快速路服务边界、可运营时段和电子围栏需以政府备案与 App 实时显示为准。',
      parameter_range: '[公开资料未量化] 公开网页未给出统一高速/快速路速度阈值。'
    },
    'odd.road.geometry.plane.curve': {
      description: '[公开资料未明确] 武汉政府文件要求申请材料说明设计运行条件和道路交通要素对应关系，但公开网页未披露萝卜快跑武汉的曲率半径阈值。',
      parameter_range: null
    },
    'odd.road.geometry.profile.uphill': {
      description: '[公开资料未明确] 公开政府文件和 Apollo Go 门户未披露武汉服务坡度阈值。',
      parameter_range: null
    },
    'odd.road.geometry.profile.downhill': {
      description: '[公开资料未明确] 公开政府文件和 Apollo Go 门户未披露武汉服务坡度阈值。',
      parameter_range: null
    },
    'odd.weather.atmospheric.rain': {
      description: '[公开资料未明确] 公开资料可确认 Robotaxi 服务受运营规则、监管许可和实时调度约束，但未披露统一降雨量停运阈值。',
      parameter_range: null
    },
    'odd.weather.particles.fog': {
      description: '[公开资料未明确] 公开资料未披露武汉服务能见度阈值；雾、低能见度等天气边界应以运营方实时停运规则和监管备案为准。',
      parameter_range: null
    },
    'personnel.passenger.other': {
      description: '[公开资料未明确] 乘客年龄、实名认证、监护人陪同等细则主要体现在 Apollo Go App 实时规则或本地服务说明中，目前缺少可公开下载、可长期引用的官方规则文件。'
    },
    'vehicle.motion.speed.activation': {
      description: '[公开资料未明确] 武汉政府文件和 Apollo Go 公开门户未披露萝卜快跑武汉服务的统一启用/运行速度阈值。',
      parameter_range: null
    }
  },
  'pony-ai-gen7-robotaxi': {
    'odd.road.type.area': {
      description: '[官方声明] Pony.ai 官方 IR PDF 确认 Gen-7 Robotaxi 已在广州、深圳、北京启动全无人商业化服务，并称其 Robotaxi 服务覆盖北京、上海、广州、深圳四个一线城市；具体 geofence、站点和时段需以各地监管许可与 App 实时显示为准。'
    },
    'personnel.driver.takeover.attention': {
      description: '[官方声明] Gen-7 Robotaxi 属于全无人商业化服务，车内无安全员；公开资料未披露远程协助接管阈值和 MRM SOP。'
    },
    'odd.road.geometry.plane.curve': {
      description: '[公开资料未明确] Pony.ai 官方 IR PDF 和政府页面未披露 Gen-7 Robotaxi 的曲率半径阈值。',
      parameter_range: null
    },
    'vehicle.motion.speed.activation': {
      description: '[公开资料未明确] Pony.ai Gen-7 中国全无人商业化服务公开资料未披露统一启用/运行速度上限；应以各城市许可、电子围栏和 App 实时规则为准。',
      parameter_range: null
    }
  },
  'xpeng-xngp-p7plus-2026': {
    'vehicle.motion.speed.operating': {
      description: '[公开资料未明确] 小鹏官方页面和配置表未公开 XNGP 统一运行速度上限；实际目标车速受道路限速、功能策略、驾驶员设置和车机提示约束。',
      parameter_range: null
    },
    'odd.weather.atmospheric.rain': {
      description: '[公开资料未明确] 小鹏官方页面提示辅助驾驶不能应对所有交通、天气和路况，但未公开降雨 mm/h 阈值。'
    },
    'odd.weather.particles.fog': {
      description: '[公开资料未明确] 公开资料未给出 XNGP 能见度阈值；低能见度下应以车机提示和驾驶员接管为准。'
    },
    'odd.targets.obstacle': {
      description: '[公开资料未明确] 小鹏官方产品页和配置表披露主动安全、摄像头/雷达和辅助驾驶功能，但未给出 XNGP 对小障碍物的统一尺寸阈值。',
      parameter_range: null
    },
    'personnel.driver.takeover.other': {
      description: '[公开资料未明确] 公开产品页未披露 XNGP 自动超车触发阈值；具体策略以车机版本和实际提示为准。'
    },
    'vehicle.motion.speed.activation': {
      description: '[公开资料未明确] 小鹏官方页面披露 AEB/AES 等主动安全速度能力和 XNGP 功能配置，但未公开 XNGP 统一启用/运行速度阈值；AEB/AES 130 km/h 不应替代 XNGP ODC。',
      parameter_range: null
    }
  }
}

function classify(e) {
  const text = `${e.description || ''} ${e.parameter_range || ''}`
  if (text.includes('[结构性类别]')) return 'structural'
  if (text.includes('[公开资料未明确]') || text.includes('[手册未涉及]')) return 'gap'
  if (text.includes('[手册明确]')) return 'manual'
  if (text.includes('[官方声明]') || text.includes('[政府公告]') || text.includes('[运营规则]')) return 'official'
  if (text.includes('[推定]')) return 'inferred'
  return 'curated'
}

function applyDoc(file) {
  const path = join(repoRoot, 'data', 'examples', file)
  const doc = JSON.parse(readFileSync(path, 'utf8'))
  const profile = profiles[doc.id]
  if (!profile) return 0

  doc.metadata.review_status = 'community_reviewed'
  doc.metadata.sources = profile.sources
  doc.metadata.notes = profile.notes

  let touched = 0
  const docOverrides = overrides[doc.id] || {}
  for (const e of doc.elements) {
    if (docOverrides[e.element_id]) {
      Object.assign(e, docOverrides[e.element_id])
      if (docOverrides[e.element_id].parameter_range === null) delete e.parameter_range
    }

    const coverage = classify(e)
    if (coverage === 'structural') {
      delete e.source
      delete e.evidence_refs
      continue
    }
    if (coverage === 'gap') {
      delete e.source
      delete e.evidence_refs
      continue
    }

    const evidence = profile[coverage] || profile.curated
    e.source = {
      type: evidence.type,
      url: evidence.url,
      confidence: evidence.confidence,
      extracted_date: today
    }
    e.evidence_refs = [evidence]
    touched++
  }

  writeFileSync(path, JSON.stringify(doc, null, 2) + '\n', 'utf8')
  return touched
}

let total = 0
for (const file of Object.keys(profiles).map(id => `${id}.json`)) {
  const n = applyDoc(file)
  total += n
  console.log(`${file}: evidence refs on ${n} elements`)
}
console.log(`Total evidence-linked elements: ${total}`)
