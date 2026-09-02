export type CasePriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type CaseStatus = "ACTIVE" | "UNDER_REVIEW" | "CLOSED";
export type SourceCategory = "DOCUMENTS" | "CSV_EXCEL" | "IMAGES" | "TEXT_NOTES" | "URL_SOURCES";
export type EntityType = "PERSON" | "ORGANIZATION" | "VEHICLE" | "LOCATION" | "PHONE" | "BANK_ACCOUNT" | "OTHER";
export type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "MEDIUM_HIGH" | "LOW" | "WITNESS";

export interface Case {
  id: string;
  case_code: string;
  title: string;
  priority: CasePriority;
  status: CaseStatus;
  assigned_investigator: string;
  entities_count: number;
  last_signal_at: string;
  created_at: string;
}

export interface Alert {
  id: string;
  case_id: string;
  title: string;
  description: string;
  severity: CasePriority;
  created_at: string;
  cases?: { case_code: string; title: string };
}

export interface Source {
  id: string;
  case_id: string;
  file_name: string;
  file_category: SourceCategory;
  file_url: string | null;
  file_size: number | null;
  uploaded_at: string;
}

export interface Entity {
  id: string;
  case_id: string;
  entity_code: string | null;
  name: string;
  entity_type: EntityType;
  role: string | null;
  age: number | null;
  occupation: string | null;
  risk_level: RiskLevel | null;
  criminal_history: string | null;
  verification: "VERIFIED" | "UNVERIFIED";
  confidence: number | null;
  first_detected: string | null;
  last_detected: string | null;
}

export interface EntityConnection {
  id: string;
  case_id: string;
  from_entity: string;
  to_entity: string;
  relationship: string;
  confidence: number | null;
  evidence_summary: string | null;
}

export interface Evidence {
  id: string;
  case_id: string;
  category: string;
  title: string;
  summary: string | null;
  event_date: string | null;
}

export interface TimelineEvent {
  id: string;
  case_id: string;
  event_date: string;
  event_time: string | null;
  title: string;
  details: string | null;
}


export interface EntityConnectionWithNames extends EntityConnection {
  from_name?: string;
  to_name?: string;
  to_entity_type?: EntityType;
}

export interface PhoneRecord {
  id: string;
  case_id: string;
  entity_id: string;
  number: string;
  pattern_summary: string;
}

export interface FinancialTransaction {
  id: string;
  case_id: string;
  from_entity: string;
  to_entity: string;
  amount: number;
  label: string;
  significance: string;
  transaction_date: string;
}

// ── Add these to your existing src/types/netra.ts ──
// (Keep your existing Case / Evidence / Source types as-is, just append below)

export type Relevance = "HIGH" | "MEDIUM" | "LOW";

// Raw row shapes — match the Supabase table columns exactly
export interface DbEntity {
  id: string;
  case_id: string;
  name: string;
  type: EntityType;
  relevance: Relevance;
  confidence: number;
  source_count: number;
  mention_count: number;
  ai_insight: string | null;
  verification: "VERIFIED" | "UNVERIFIED";
  first_detected: string | null;
  last_detected: string | null;
  created_at: string;
}

export interface DbEntityConnection {
  id: string;
  case_id: string;
  source_entity_id: string;
  target_entity_id: string;
  relationship: string;
  relevance: Relevance;
  confidence: number;
  source_count: number;
  evidence_note: string | null;
  created_at: string;
}

export interface DbEntitySourceRef {
  id: string;
  entity_id: string;
  source_id: string | null;
  name: string;
  icon: string | null;
  meta: string | null;
  added_date: string | null;
  created_at: string;
}

export interface DbEntityEvidence {
  id: string;
  entity_id: string;
  source_name: string;
  snippet: string;
  meta: string | null;
  created_at: string;
}