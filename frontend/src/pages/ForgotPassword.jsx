import { useState, useEffect } from "react";
import { Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [error, setError] = useState(""); // validation error
  const [loading, setLoading] = useState(false);

  // Auto-hide messages
  useEffect(() => {
    if (msg.text) {
      const timer = setTimeout(() => setMsg({ type: "", text: "" }), 5000);
      return () => clearTimeout(timer);
    }
  }, [msg]);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Clear previous error

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setMsg({ type: "", text: "" });
    const baseUrl = import.meta.env.VITE_BASE_URL;

    try {
      const res = await fetch(`${baseUrl}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setMsg({ type: "success", text: data.message });
        setEmail("");
      } else {
        setMsg({ type: "error", text: data.message || "Failed to send reset email" });
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
              <Mail className="w-8 h-8 text-cyan-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset Your Password</h1>
            <p className="text-gray-600">
              Enter your email address and we'll send you a reset link
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {msg.text && (
              <div
                className={`p-3 rounded-xl border text-sm font-medium flex items-center ${msg.type === "error"
                  ? "border-red-300 bg-red-50 text-red-700"
                  : "border-green-200 bg-green-50 text-green-700"
                  }`}
              >
                {msg.type === "error" ? (
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
                {msg.text}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(""); // clear error on typing
                  }}
                  className={`w-full px-4 py-3 pl-11 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all border-gray-200 ${error ? "border-red-300 focus:border-red-500" : ""
                    }`}
                  required
                />
                <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
              </div>
              {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 bg-gradient-to-r text-white shadow-sm hover:shadow-md py-3 rounded-xl font-medium transition-all duration-200 active:scale-[0.98]"
            >
              {loading ? "Sending..." : "Send Reset Link"}
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
