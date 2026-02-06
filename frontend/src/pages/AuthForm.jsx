import { useState, useContext, useEffect, useRef } from "react";
import { useGoogleAuth } from "../hooks/useGoogleAuth";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { Eye, EyeOff } from "lucide-react";
import logo from "../assets/logo.png";

export default function AuthForm({ mode = "signin" }) {
  const baseurl = import.meta.env.VITE_BASE_URL || ''
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  // Form state
  const [form, setForm] = useState(
    mode === "signup"
      ? { name: "", email: "", password: "" }
      : { email: "", password: "" }
  );
  const [errors, setErrors] = useState({});
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (msg.text) {
      const timer = setTimeout(() => setMsg({ type: "", text: "" }), 5000);
      return () => clearTimeout(timer);
    }
  }, [msg]);

  // Handle credential returned by Google Identity Services
  const handleGoogleCredential = async (response) => {
    if (!response?.credential) return;
    setLoading(true);
    try {
      const res = await fetch(`${baseurl}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: response.credential })
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok || !data.success) {
        setMsg({ type: 'error', text: data.message || 'Google login failed' });
        return;
      }
      login(data.user, data.token);
      navigate('/workspace');
    } catch (err) {
      console.error('Google sign-in error:', err);
      setMsg({ type: 'error', text: 'Google sign-in failed' });
    } finally {
      setLoading(false);
    }
  }
  const googleBtnRef = useRef(null);

  useGoogleAuth(
    googleClientId,
    handleGoogleCredential,
    googleBtnRef
  );


  // Input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    // setMsg("");
  };

  // Validators
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (password) => {
    const errs = [];
    if (password.length < 6) errs.push("At least 6 characters.");
    if (password.length > 20) errs.push("No more than 20 characters.");
    if (!/[A-Z]/.test(password)) errs.push("At least 1 uppercase letter.");
    if (!/[a-z]/.test(password)) errs.push("At least 1 lowercase letter.");
    if (!/[0-9]/.test(password)) errs.push("At least 1 number.");
    if (!/[!@#$%^&*]/.test(password))
      errs.push("At least 1 special character (!@#$%^&*).");
    return errs;
  };

  // Handle blur validation
  const handleBlur = (field) => {
    if (field === "name" && mode === "signup") {
      if (!form.name || !form.name.trim())
        setErrors((prev) => ({ ...prev, name: "Name is required." }));
      else if (form.name.trim().length < 2)
        setErrors((prev) => ({ ...prev, name: "Name must be at least 3 characters." }));
      else if (form.name.trim().length > 30)
        setErrors((prev) => ({ ...prev, name: "Name must be less than 30 characters." }));
    }

    if (field === "email") {
      if (!form.email)
        setErrors((prev) => ({ ...prev, email: "Email is required." }));
      else if (!validateEmail(form.email))
        setErrors((prev) => ({ ...prev, email: "Invalid email address." }));
    }

    if (field === "password") {
      if (!form.password)
        setErrors((prev) => ({ ...prev, password: "Password is required." }));
      else {
        const passwordErrors = validatePassword(form.password);
        if (passwordErrors.length)
          setErrors((prev) => ({
            ...prev,
            password: passwordErrors.join(" "),
          }));
      }
    }
  };

  // Check if form is valid
  const isFormValid = () => {
    if (mode === "signup" && (!form.name || !form.name.trim())) return false;
    if (!form.email || !validateEmail(form.email)) return false;
    if (!form.password || validatePassword(form.password).length) return false;
    return true;
  };


  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });

    // Final validation
    const newErrors = {};
    if (mode === "signup" && !form.name.trim())
      newErrors.name = "Name is required.";
    if (!form.email) newErrors.email = "Email is required.";
    else if (!validateEmail(form.email)) newErrors.email = "Invalid email.";
    if (!form.password) newErrors.password = "Password is required.";
    else {
      const passwordErrors = validatePassword(form.password);
      if (passwordErrors.length) newErrors.password = passwordErrors.join(" ");
    }

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const url =
        mode === "signup"
          ? `${baseurl}/auth/register`
          : `${baseurl}/auth/login`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      // 🔥 VERIFY-EMAIL HANDLING
      if (!res.ok || !data.success) {
        if (data.message === "Please verify your email before logging in.") {
          setMsg({ type: 'error', text: data.message });
          navigate("/verify-email");
        } else {
          setMsg({ type: 'error', text: data.message || "Operation failed" });
        }
        return;
      }

      // Success actions
      login(data.user, data.token);

      if (mode === "signup") {
        setMsg({ type: "success", text: "Account created! Check your email for verification." });
        setTimeout(() => navigate("/signin"), 2500);
      } else {
        navigate("/workspace");
      }
    } catch (err) {
      console.error("Auth error:", err);
      setMsg({ type: "error", text: "An error occurred." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-gray-50 to-cyan-50 px-4">
      <div className="mb-10 text-center">
        <div className="relative">
          <div className="absolute inset-0 w-20 h-20 mx-auto bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
          <img
            src={logo}
            alt="Logo"
            className="relative w-20 h-20 object-contain mx-auto"
          />
        </div>
        <h1 className="text-4xl font-bold text-gray-800">
          AI M&T Assistant
        </h1>
        <p className="text-gray-500 mt-2">
          {mode === "signup"
            ? "Join thousands using AI to make meetings smarter & faster."
            : "Sign in to access your dashboard and smart meetings."}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg space-y-5 px-6 md:px-0"
      >
        {msg.text && (
          <p className={`text-center text-sm p-2 rounded ${msg.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-100 text-red-600'}`}>
            {msg.text}
          </p>
        )}


        {mode === "signup" && (
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              id="name"
              value={form.name || ""}
              onChange={handleChange}
              onBlur={() => handleBlur("name")}
              placeholder="Your name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:outline-none bg-white"
              required
            />
            {errors.name && (
              <p className="text-red-600 text-sm mt-1">{errors.name}</p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            name="email"
            id="email"
            value={form.email}
            onChange={handleChange}
            onBlur={() => handleBlur("email")}
            placeholder="you@example.com"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:outline-none bg-white"
            required
          />
          {errors.email && (
            <p className="text-red-600 text-sm mt-1">{errors.email}</p>
          )}
        </div>

        <div className="relative">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            id="password"
            value={form.password}
            onChange={handleChange}
            onBlur={() => handleBlur("password")}
            placeholder="Enter password"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:outline-none bg-white pr-10"
            required
          />
          <span
            className="absolute right-3 top-9 cursor-pointer text-gray-500"
            onClick={() => setShowPassword((prev) => !prev)}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </span>
          {errors.password && (
            <p className="text-red-600 text-sm mt-1">{errors.password}</p>
          )}
        </div>


        <button
          type="submit"
          disabled={loading || !isFormValid()}
          className="w-full py-2.5 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 bg-gradient-to-r text-white shadow-sm hover:shadow-md"
        >
          {loading
            ? mode === "signup"
              ? "Creating Account..."
              : "Signing In..."
            : mode === "signup"
              ? "Sign Up"
              : "Sign In"}
        </button>

        <div className={`flex ${mode === "signin" ? "justify-between" : "justify-end"} text-sm mt-2`}>
          {mode === "signin" && (
            <Link
              to="/forgot-password"
              className="text-cyan-600 hover:underline"
            >
              Forgot password?
            </Link>
          )}
          <Link
            to={mode === "signup" ? "/signin" : "/signup"}
            className="text-cyan-600 hover:underline"
          >
            {mode === "signup"
              ? "Already have an account? Sign In"
              : "Create account"}
          </Link>
        </div>
      </form>

      {
        googleClientId && (
          <>
            <div className="flex items-center gap-3 my-6 w-full max-w-lg px-6 md:px-0">
              <div className="flex-1 h-0.5 bg-gray-200"></div>
              <span className="text-sm text-gray-500">OR</span>
              <div className="flex-1 h-0.5 bg-gray-200"></div>
            </div>

            <div className="w-full mt-4 max-w-lg mx-auto">
              <div className="w-full" ref={googleBtnRef} />
            </div>
          </>
        )
      }
    </div>
  );
}
