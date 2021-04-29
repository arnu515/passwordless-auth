import { Schema, model } from "mongoose";

export const UserSchema = new Schema({
  email: String,
  username: String,
  role: { type: String, default: "member" },
});

const User = model("User", UserSchema);

export default User;
