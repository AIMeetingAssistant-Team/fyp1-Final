import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock } from "lucide-react";

export default function ResetPassword() {
  const baseurl = import.meta.env.VITE_BASE_URL;
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({ password: "", confirmPassword: "" });
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (msg.text) {
      const timer = setTimeout(() => setMsg({ type: "", text: "" }), 5000);
      return () => clearTimeout(timer);
    }
  }, [msg]);

  const validatePassword = (pwd) => {
    const errs = [];
    if (pwd.length < 6) errs.push("At least 6 characters.");
    if (pwd.length > 20) errs.push("No more than 20 characters.");
    if (!/[A-Z]/.test(pwd)) errs.push("At least one uppercase letter.");
    if (!/[a-z]/.test(pwd)) errs.push("At least one lowercase letter.");
    if (!/[0-9]/.test(pwd)) errs.push("At least one digit.");
    if (!/[!@#$%^&*]/.test(pwd)) errs.push("At least one special character (!@#$%^&*).");
    return errs;
  };

  const handleBlur = (field) => {
    if (field === "password") {
      const pwdErrors = validatePassword(password);
      setErrors((prev) => ({ ...prev, password: pwdErrors.join(" ") }));
    } else if (field === "confirmPassword") {
      if (confirmPassword !== password) {
        setErrors((prev) => ({ ...prev, confirmPassword: "Passwords do not match." }));
      } else {
        setErrors((prev) => ({ ...prev, confirmPassword: "" }));
      }
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    const pwdErrors = validatePassword(password);
    const confError = password !== confirmPassword ? "Passwords do not match." : "";

    if (pwdErrors.length || confError) {
      setErrors({ password: pwdErrors.join(" "), confirmPassword: confError });
      return;
    }

    setLoading(true);
    setMsg({ type: "", text: "" });

    try {
      const res = await fetch(`${baseurl}/auth/reset-password/${token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok) {
        setMsg({ type: "success", text: data.message });
        setPassword("");
        setConfirmPassword("");
        setErrors({ password: "", confirmPassword: "" });

        setTimeout(() => navigate("/signin"), 3000);
      } else {
        setMsg({ type: "error", text: data.message || "Failed to reset password" });
      }
    } catch {
      setMsg({ type: "error", text: "Something went wrong. Try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-cyan-50 rounded-full mb-4">
              <Lock className="w-8 h-8 text-cyan-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h1>
            <p className="text-gray-600">
              Enter your new password to reset your account password
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleReset} className="space-y-6">
            {msg.text && (
              <div
                className={`p-3 rounded-xl border text-sm font-medium flex items-center ${msg.type === "error"
                  ? "border-red-300 bg-red-50 text-red-700"
                  : "border-green-200 bg-green-50 text-green-700"
                  }`}
              >
                {msg.type === "error" ? (
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {msg.text}
              </div>
            )}

            {/* Password Field */}
            <div className="relative">
              <label className="block text-sm font-medium mb-1">New Password</label>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => (setPassword(e.target.value), setErrors((prev) => ({ ...prev, password: "" })))}
                onBlur={() => handleBlur("password")}
                required
                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all border-gray-200`}
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[38px] text-gray-500"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password}</p>}
            </div>

            {/* Confirm Password Field */}
            <div className="relative">
              <label className="block text-sm font-medium mb-1">Confirm Password</label>
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => (setConfirmPassword(e.target.value), setErrors((prev) => ({ ...prev, confirmPassword: "" })))}
                onBlur={() => handleBlur("confirmPassword")}
                required
                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all border-gray-200`}
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-[38px] text-gray-500"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              {errors.confirmPassword && (
                <p className="text-red-600 text-sm mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 bg-gradient-to-r text-white py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>

          <p className="mt-6 text-gray-500 text-sm text-center">
            Remembered your password?{" "}
            <button
              onClick={() => navigate("/signin")}
              className="text-cyan-600 hover:text-cyan-700 font-medium"
            >
              Sign In
            </button>
          </p>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 border-t border-gray-100 text-center">
          <p className="text-gray-500 text-sm">
            Having issues? Check your spam folder or try again later.
          </p>
        </div>
      </div>
    </div>
  );
}
