export type CasePriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type CaseStatus = "ACTIVE" | "UNDER_REVIEW" | "CLOSED";

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


export type SourceCategory = "DOCUMENTS" | "CSV_EXCEL" | "IMAGES" | "TEXT_NOTES" | "URL_SOURCES";

export interface Source {
  id: string;
  case_id: string;
  file_name: string;
  file_category: SourceCategory;
  file_url: string | null;
  file_size: number | null;
  uploaded_at: string;
}