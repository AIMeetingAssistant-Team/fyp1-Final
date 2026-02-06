import mongoose from "mongoose";

const verificationTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
  token: { type: String, required: true },
  expiresAt: { type: Date, default: () => Date.now() + 3600000 } // 1 hour
});

export default mongoose.model("VerificationToken", verificationTokenSchema);
