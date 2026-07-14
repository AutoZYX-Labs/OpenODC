export type LocalizedText = { zh: string; en: string }

export type RoadRuleSourceType = 'law' | 'administrative_regulation' | 'national_standard'
export type RoadRuleCategory =
  | 'traffic_signal'
  | 'road_traffic'
  | 'vehicle_operation'
  | 'priority_interaction'
  | 'special_risk'
export type ODCMappingRelation = 'direct' | 'contextual' | 'supporting'
export type EngineeringDerivationType = 'engineering_interpretation' | 'engineering_candidate'
export type NormativeSubjectKind = 'road_user' | 'motor_vehicle_driver' | 'vehicle_owner_or_operator' | 'traffic_management_body'
export type EvidenceCandidate =
  | 'requirements_trace'
  | 'model_or_code_review'
  | 'simulation'
  | 'proving_ground'
  | 'road_test'
  | 'event_log'
  | 'human_review'

export interface RoadRuleSource {
  id: string
  type: RoadRuleSourceType
  title: LocalizedText
  authority: LocalizedText
  status: 'current'
  url: string
  checked_on: string
  version_evidence: {
    official_repository: LocalizedText
    record_identifier: string
    fingerprint_scope: LocalizedText
    reference_fingerprint_sha256: string
  }
}

export interface EvidenceReference {
  source_id: string
  clauses: string[]
  interpretation: LocalizedText
}

export interface ODCRuleMapping {
  element_id: string
  relation: ODCMappingRelation
  rationale: LocalizedText
}

export interface ApplicabilityCondition {
  id: string
  condition: LocalizedText
  odc_element_ids: string[]
}

export interface ScenarioHook {
  id: string
  trigger: LocalizedText
  expected_response: LocalizedText
  evidence_candidates: EvidenceCandidate[]
}

export interface RoadRuleObligation {
  id: string
  order: number
  category: RoadRuleCategory
  title: LocalizedText
  normative_rule: LocalizedText
  normative_subject: {
    kind: NormativeSubjectKind
    label: LocalizedText
    legal_boundary: LocalizedText
  }
  summary: LocalizedText
  derivation: {
    type: EngineeringDerivationType
    statement: LocalizedText
  }
  source_refs: EvidenceReference[]
  odc_mappings: ODCRuleMapping[]
  applicability: ApplicabilityCondition[]
  scenario_hooks: ScenarioHook[]
  review: {
    status: 'public_source_and_engineering_mapping_reviewed'
    reviewer_role: LocalizedText
    reviewed_on: string
    scope: LocalizedText
  }
}

export interface RoadRuleProfile {
  schema_version: '0.1.0'
  profile: {
    id: 'openodc-road-rules-cn'
    version: '0.5.0'
    title: LocalizedText
    description: LocalizedText
    jurisdiction: 'CN'
    source_status: 'current-public-sources'
    reviewed_on: string
    disclaimer: LocalizedText
  }
  sources: RoadRuleSource[]
  obligations: RoadRuleObligation[]
}
