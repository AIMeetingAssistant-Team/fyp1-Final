import mongoose from "mongoose";

const loginHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  action: {
    type: String,
    enum: ["login", "logout", "password_reset", "login_google"],
    required: true,
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("LoginHistory", loginHistorySchema);