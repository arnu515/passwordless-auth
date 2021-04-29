import { Schema, model } from "mongoose";

export const CodeSchema = new Schema({
  code: Number,
  email: String,
  expiresAt: Number,
  // Exists only if the user is logging in.
  userId: { type: String, nullable: true },
});

const Code = model("Code", CodeSchema);

export default Code;
