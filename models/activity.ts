import { Schema, model, models } from "mongoose";

const ActivitySchema = new Schema(
  {
    case_code: { type: String, default: null },
    event_type: { type: String, required: true },
    description: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default models.Activity || model("Activity", ActivitySchema);