import { Schema, model, models } from "mongoose";

const SourceSchema = new Schema(
  {
    type: { type: String, enum: ["DOCUMENT", "CSV", "IMAGE", "NOTES", "URL"], required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    uploaded_at: { type: Date, default: Date.now },
  }
);

const CaseSchema = new Schema(
  {
    case_code: { type: String, unique: true, required: true },
    title: { type: String, required: true },
    case_type: { type: String, required: true },
    priority: { 
      type: String, 
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], 
      default: "MEDIUM" 
    },
    status: { 
      type: String, 
      enum: ["ACTIVE", "UNDER_REVIEW", "CLOSED"], 
      default: "ACTIVE" 
    },
    assigned_investigator: { type: String, default: "Netra Investigator" },
    investigation_summary: { type: String, default: "" },
    last_signal_at: { type: Date, default: Date.now },
    sources: [SourceSchema],
    // AI backend identifiers and cached results
    ai_case_id: { type: String, default: null },
    ai_extracted_data: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

export default models.Case || model("Case", CaseSchema);