import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { apiRequest } from "../../utils/api";

export default function ChangePassword() {
    const [formData, setFormData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

    const [errors, setErrors] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

    const [message, setMessage] = useState({ type: "", text: "" });
    const [loading, setLoading] = useState(false);

    const [show, setShow] = useState({
        current: false,
        new: false,
        confirm: false
    });

    // Auto hide message
    useEffect(() => {
        if (message.text) {
            const timer = setTimeout(() => {
                setMessage({ type: "", text: "" });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const validatePassword = (password) => {
        const errs = [];
        if (password.length < 8) errs.push("At least 8 characters.");
        if (password.length > 20) errs.push("Less than 20 characters.");
        if (!/[A-Z]/.test(password)) errs.push("At least one uppercase letter.");
        if (!/[0-9]/.test(password)) errs.push("At least one number.");
        if (!/[!@#$%^&*]/.test(password)) errs.push("At least one special character (!@#$%^&*).");
        return errs;
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });

        // Remove error while typing
        setErrors({ ...errors, [e.target.name]: "" });
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;

        if (!value.trim()) {
            setErrors((prev) => ({ ...prev, [name]: "This field is required." }));
            return;
        }

        if (name === "newPassword") {
            const valErrors = validatePassword(value);
            if (valErrors.length > 0) {
                setErrors((prev) => ({
                    ...prev,
                    newPassword: valErrors.join(" ")
                }));
            }
        }

        if (name === "confirmPassword" && value !== formData.newPassword) {
            setErrors((prev) => ({
                ...prev,
                confirmPassword: "Passwords do not match."
            }));
        }
    };

    const handleSave = async () => {
        const newErrors = {};

        if (!formData.currentPassword.trim())
            newErrors.currentPassword = "This field is required.";
        if (!formData.newPassword.trim())
            newErrors.newPassword = "This field is required.";
        if (!formData.confirmPassword.trim())
            newErrors.confirmPassword = "This field is required.";

        const pwErrs = validatePassword(formData.newPassword);
        if (pwErrs.length > 0)
            newErrors.newPassword = pwErrs.join(" ");

        if (
            formData.newPassword &&
            formData.confirmPassword !== formData.newPassword
        ) {
            newErrors.confirmPassword = "Passwords do not match.";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            const data = await apiRequest(
                "/auth/profile/password",
                "PUT",
                formData,
                token
            );
            setLoading(false);

            if (data.success) {
                setMessage({ type: "success", text: data.message });
                setFormData({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: ""
                });
            } else {
                setMessage({
                    type: "error",
                    text: data.message || "Failed to change password."
                });
            }
        } catch (err) {
            setLoading(false);
            setMessage({
                type: "error",
                text: "Something went wrong. Try again."
            });
        }
    };

    const isFormValid =
        formData.currentPassword.trim().length > 0 &&
        formData.newPassword.trim().length > 0 &&
        formData.confirmPassword.trim().length > 0 &&
        errors.newPassword === "" &&
        errors.confirmPassword === "" &&
        errors.currentPassword === "";

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
                <p className="text-sm text-gray-600 mt-1">Update your account password</p>
            </div>

            {/* Message Display */}
            {message.text && (
                <div className={`mb-6 p-4 rounded-lg ${message.type === "success" 
                    ? "bg-green-50 text-green-700 border border-green-200" 
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                    <div className="flex items-center">
                        <span className={`mr-3 ${message.type === "success" ? 'text-green-500' : 'text-red-500'}`}>
                            {message.type === "success" ? "✓" : "⚠"}
                        </span>
                        <span className="font-medium">{message.text}</span>
                    </div>
                </div>
            )}

            {/* Password Requirements Note */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Password Requirements</h3>
                <ul className="text-xs text-gray-600 space-y-1">
                    <li className="flex items-center">
                        <svg className="w-3 h-3 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Minimum 8 characters, maximum 20 characters
                    </li>
                    <li className="flex items-center">
                        <svg className="w-3 h-3 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        At least one uppercase letter (A-Z)
                    </li>
                    <li className="flex items-center">
                        <svg className="w-3 h-3 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        At least one number (0-9)
                    </li>
                    <li className="flex items-center">
                        <svg className="w-3 h-3 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        At least one special character (!@#$%^&*)
                    </li>
                </ul>
            </div>

            {/* Form Fields */}
            <div className="space-y-5">
                {/* Current Password */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <input
                            type={show.current ? "text" : "password"}
                            name="currentPassword"
                            value={formData.currentPassword}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={`w-full px-4 py-3 bg-white text-gray-900 placeholder-gray-500 border ${errors.currentPassword ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all pr-12`}
                            placeholder="Enter current password"
                        />
                        <button
                            type="button"
                            onClick={() => setShow({ ...show, current: !show.current })}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                            {show.current ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    {errors.currentPassword && (
                        <p className="text-red-600 text-sm mt-1.5 flex items-center">
                            <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {errors.currentPassword}
                        </p>
                    )}
                </div>

                {/* New Password */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <input
                            type={show.new ? "text" : "password"}
                            name="newPassword"
                            value={formData.newPassword}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={`w-full px-4 py-3 bg-white text-gray-900 placeholder-gray-500 border ${errors.newPassword ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all pr-12`}
                            placeholder="Enter new password"
                        />
                        <button
                            type="button"
                            onClick={() => setShow({ ...show, new: !show.new })}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                            {show.new ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    {errors.newPassword && (
                        <p className="text-red-600 text-sm mt-1.5 flex items-center">
                            <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {errors.newPassword}
                        </p>
                    )}
                </div>

                {/* Confirm Password */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <input
                            type={show.confirm ? "text" : "password"}
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={`w-full px-4 py-3 bg-white text-gray-900 placeholder-gray-500 border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all pr-12`}
                            placeholder="Confirm new password"
                        />
                        <button
                            type="button"
                            onClick={() => setShow({ ...show, confirm: !show.confirm })}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                            {show.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    {errors.confirmPassword && (
                        <p className="text-red-600 text-sm mt-1.5 flex items-center">
                            <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {errors.confirmPassword}
                        </p>
                    )}
                </div>
            </div>

            {/* Action Button */}
            <div className="mt-8">
                <button
                    onClick={handleSave}
                    disabled={!isFormValid || loading}
                    className={`w-full px-6 py-3 text-sm font-medium text-white rounded-lg transition-all duration-200 ${
                        isFormValid && !loading
                            ? "bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 shadow-sm hover:shadow"
                            : "bg-gray-900/95 cursor-not-allowed"
                    } flex items-center justify-center`}
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Updating...
                        </>
                    ) : (
                        "Change Password"
                    )}
                </button>
                <p className="text-gray-500 text-xs text-center mt-4">
                    Required fields are marked with <span className="text-red-500">*</span>
                </p>
            </div>
        </div>
    );
}