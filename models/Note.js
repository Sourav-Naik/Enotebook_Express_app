import mongoose from "mongoose";
const { Schema } = mongoose;
const NoteSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User" },
  title: { type: String, reqiured: true },
  content: { type: String, reqiured: true },
  description: { type: String, reqiured: true },
  tag: { type: String, default: "General" },
  date: { type: Date, default: Date.now },
});
var Note = mongoose.model("Note", NoteSchema);
export default Note;
