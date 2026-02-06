import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Mail } from "lucide-react";

export default function VerifyEmail() {
  const baseurl = import.meta.env.VITE_BASE_URL;
  const location = useLocation();
  const navigate = useNavigate();

  const [status, setStatus] = useState("initial"); // 'initial', 'loading', 'success', 'failed'
  const [message, setMessage] = useState(""); // Main status message
  const [error, setError] = useState(""); // Single error display
  const [email, setEmail] = useState("");
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const token = query.get("token");

    if (!token) {
      setStatus("initial");
      return;
    }

    setStatus("loading");
    setMessage("Verifying...");

    const verify = async () => {
      try {
        const res = await fetch(`${baseurl}/auth/verify-email?token=${token}`);
        const data = await res.json();

        if (data.success) {
          setStatus("success");
          setMessage("Email verified successfully!");

          const timer = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(timer);
                navigate("/signin");
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          setStatus("failed");
          setError(data.message || "Verification failed.");
        }
      } catch {
        setStatus("failed");
        setError("Error verifying email.");
      }
    };

    verify();
  }, [location.search, navigate]);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleResend = async () => {
    setError(""); // Clear previous error

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      const res = await fetch(`${baseurl}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (data.success) {
        setMessage("Verification email sent successfully! Please check your inbox.");
      } else {
        setError(data.message || "Failed to send verification email.");
      }
    } catch {
      setError("Error sending verification email.");
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
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Verification</h1>
            <p className="text-gray-600">
              {status === "loading"
                ? "Please wait while we verify your email"
                : status === "success"
                  ? "Your email has been verified"
                  : "Resend verification email"}
            </p>
          </div>

          {/* Status Content */}
          <div className="space-y-6">
            {status === "loading" && (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mb-4"></div>
                <div className="text-cyan-600 font-medium text-lg">Verifying your email...</div>
                <p className="text-gray-500 text-sm mt-2">This will only take a moment</p>
              </div>
            )}

            {status === "success" && (
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-full mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <div className="text-green-600 font-semibold text-lg mb-2">{message}</div>
                <div className="text-gray-700 text-sm mb-6">
                  Redirecting to login in{" "}
                  <span className="font-bold text-cyan-600">{countdown}</span> second{countdown !== 1 ? "s" : ""}
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-cyan-600 h-1.5 rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${(2 - countdown) * 50}%` }}
                  ></div>
                </div>
                <button
                  onClick={() => navigate("/signin")}
                  className="mt-6 from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 bg-gradient-to-r text-white shadow-sm hover:shadow-md font-medium text-sm"
                >
                  Click here to login immediately
                </button>
              </div>
            )}

            {(status === "initial" || status === "failed") && (
              <div className="space-y-6 pt-4">
                {(message || error) && (
                  <div
                    className={`p-4 rounded-xl border text-sm font-medium flex items-center ${error
                        ? "border-red-300 bg-red-50 text-red-700"
                        : "border-green-200 bg-green-50 text-green-700"
                      }`}
                  >
                    {error ? (
                      <XCircle className="w-4 h-4 mr-2" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    {error || message}
                  </div>
                )}


                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {status === "failed" ? "Enter your email to resend verification" : "Need a verification email?"}
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError(""); // Clear error on typing
                      }}
                      className={`w-full px-4 py-3 pl-11 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all ${error ? "border-red-300 focus:border-red-500" : "border-gray-200"
                        }`}
                    />
                    <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                  </div>
                </div>

                <button
                  onClick={handleResend}
                  className="w-full from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 bg-gradient-to-r text-white hover:shadow-md py-3 rounded-xl font-medium active:scale-[0.99] transition-all duration-200 shadow-lg shadow-cyan-500/20"
                >
                  Send Verification Email
                </button>

                <div className="pt-4 border-t border-gray-100">
                  <p className="text-gray-600 text-sm text-center">
                    Already verified?{" "}
                    <button onClick={() => navigate("/signin")} className="text-cyan-600 hover:text-cyan-700 font-medium">
                      Sign in here
                    </button>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 border-t border-gray-100">
          <p className="text-center text-gray-500 text-sm">
            Having issues? Check your spam folder or try again later.
          </p>
        </div>
      </div>
    </div>
  );
}