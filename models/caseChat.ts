import { Schema, model, models } from "mongoose";

const ChatMessageSchema = new Schema(
  {
    id: { type: String, required: true },
    role: { type: String, enum: ["user", "ai"], required: true },
    content: { type: String, required: true },
  },
  { _id: false }
);

const CaseChatSchema = new Schema(
  {
    ai_case_id: { type: String, required: true },
    audience: { type: String, enum: ["admin", "investigator"], required: true },
    messages: { type: [ChatMessageSchema], default: [] },
  },
  { timestamps: true }
);

CaseChatSchema.index({ ai_case_id: 1, audience: 1 }, { unique: true });

export default models.CaseChat || model("CaseChat", CaseChatSchema);
