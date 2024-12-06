import { Schema, model } from "mongoose";

const assignmentSchema = new Schema({
  subject: {
    type: String,
    required: true,
  },
  deadline: {
    type: String,
    required: true,
  },
  details: {
    type: String,
    required: true,
  },
});

const Assignment = model("Assignment", assignmentSchema);

export default Assignment;
