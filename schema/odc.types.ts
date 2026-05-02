// OpenODC TypeScript Types
// Generated to match schema/odc.schema.json
// Aligned with GB/T 45312-2025

export type ODCRequirement = 'permitted' | 'not_permitted'

export type ODCExitBehavior =
  | 'suppress_activation' // 会抑制 ADS 激活
  | 'trigger_exit'        // 会导致 ADS 退出
  | 'suppress_and_exit'   // 会抑制激活且导致退出
  | null

export type ODCSourceType =
  | 'official'              // 厂家官方声明
  | 'owner_manual'          // 车主手册
  | 'operating_rule'         // App / 运营服务规则
  | 'government_notice'      // 政府公告
  | 'media_test'            // 媒体测评
  | 'third_party_test'      // 第三方测试报告
  | 'regulatory_filing'     // 政府申报材料
  | 'academic'              // 学术论文
  | 'community_extracted'   // 社区从公开材料反推
  | 'inferred'              // 基于公开资料的推定

export type ODCConfidence = 'high' | 'medium' | 'low'

export type ODCReviewStatus =
  | 'draft'
  | 'community_reviewed'
  | 'vendor_confirmed'

export interface ODCSource {
  type: ODCSourceType
  url?: string
  confidence: ODCConfidence
  extracted_date?: string
}

export interface ODCEvidenceRef extends ODCSource {
  title?: string
  section?: string
  page?: number | string | null
  notes?: string
}

export interface ODCElement {
  /**
   * Element id from the schema/categories/*.json registry.
   * e.g. odd.road.type.highway.expressway
   */
  element_id: string
  requirement: ODCRequirement
  description?: string
  parameter_range?: string | null
  /**
   * Required when requirement === 'not_permitted'.
   * Per GB/T 45312-2025 clause 5.5.
   */
  exit_behavior?: ODCExitBehavior
  source?: ODCSource
  evidence_refs?: ODCEvidenceRef[]
}

export type ODCAssociationRelation =
  | 'requires_permitted'      // 主元素允许时，从元素也必须允许
  | 'requires_not_permitted'  // 主元素允许时，从元素必须不允许
  | 'limits_range'            // 主元素允许时，从元素的范围被限制

export interface ODCAssociation {
  primary_id: string
  dependent_id: string
  relation: ODCAssociationRelation
  description: string
}

export interface ODCMetadata {
  submitted_by: string
  submitted_at: string
  review_status: ODCReviewStatus
  sources?: string[]
  notes?: string
}

export interface ODCDocument {
  id: string
  spec_version?: string
  spec_source?: string
  vendor: string
  vendor_en?: string
  model: string
  model_en?: string
  function_name: string
  function_name_en?: string
  ads_level: 0 | 1 | 2 | 3 | 4 | 5
  software_version?: string | null
  hardware_config?: string | null
  effective_date: string
  elements: ODCElement[]
  associations?: ODCAssociation[]
  metadata: ODCMetadata
}

// Catalog types (used by schema/categories/*.json)

export type ODCElementLevel = 1 | 2 | 3 | 4 | 5

export interface ODCCatalogElement {
  id: string
  name_zh: string
  name_en: string
  level: ODCElementLevel
  parent_id?: string
  spec_section: string
  spec_reference?: string
  description_zh?: string
  description_en?: string
  requirement_template?: string
  enum_id?: string
  unit?: string
  options?: string[]
  classification?: Record<string, unknown>
  classification_dimensions?: Array<{
    dimension: string
    values: string[]
  }>
}

export interface ODCCategory {
  category_id: string
  name_zh: string
  name_en: string
  level: ODCElementLevel
  parent_id?: string
  spec_section: string
  spec_source: string
  elements: ODCCatalogElement[]
}

// Quantitative enum types (used by schema/enums/*.json)

export interface ODCEnumLevel {
  id: string
  label_zh: string
  label_en: string
  [key: string]: unknown
}

export interface ODCEnum {
  name_zh: string
  name_en: string
  spec_section: string
  spec_table?: string
  spec_tables?: string[]
  spec_reference?: string
  unit?: string
  unit_description?: string
  applies_to?: string[]
  levels?: ODCEnumLevel[]
  dimensions?: Record<string, string[]>
}
