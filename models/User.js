import mongoose from "mongoose";
const { Schema } = mongoose;
const UserSchema = new Schema({
  name: { type: String, reqiured: true },
  email: { type: String, reqiured: true },
  password: { type: String, reqiured: true },
  googleLogin: { type: Boolean, default: false },
  image: Buffer,
  imageBuffer: String,
  date: { type: Date, default: Date.now },
});
var User = mongoose.model("User", UserSchema);
export default User;