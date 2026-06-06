import { useState, useContext, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/Logo.png";
import { AuthContext } from "../../context/AuthContext";

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);

  // Ref for dropdown to handle outside clicks
  const dropdownRef = useRef(null);
  const profileButtonRef = useRef(null);

  const isLoggedIn = !!user;

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate("/");
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        profileButtonRef.current &&
        !profileButtonRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 w-full bg-gray-900/95 backdrop-blur-md border-b border-gray-800 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 md:px-1 lg:px-7">
        <div className="flex items-center justify-between h-16">
          {/* Logo Section */}
          <div
            onClick={() => navigate("/")}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
              <img
                src={logo}
                alt="Logo"
                className="relative w-10 h-10 object-contain"
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-cyan-500 bg-clip-text text-transparent">
                M&T Assistant
              </h1>
              <p className="text-xs text-gray-400 hidden sm:block">
                Meeting & Task Management
              </p>
            </div>
          </div>

          {/* Navigation Section */}
          <nav className="flex items-center space-x-2 sm:space-x-4">
            {!isLoggedIn ? (
              <>
                <button
                  onClick={() => navigate("/signin")}
                  className="hidden sm:block px-5 py-2.5 text-sm font-medium text-cyan-400 hover:text-cyan-300 hover:bg-gray-800 rounded-lg transition-all duration-200 border border-gray-700 hover:border-cyan-500"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate("/signup")}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Get Started
                </button>
              </>
            ) : (
              <div className="relative">
                {/* User Profile Button */}
                <button
                  ref={profileButtonRef}
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center space-x-2 md:space-x-3 p-1.5 rounded-full hover:bg-gray-800 transition-all duration-200 border border-transparent hover:border-gray-700"
                >
                  <div className="relative">
                    <img
                      src={
                        user?.profilePicture ||
                        "https://cdn-icons-png.flaticon.com/512/3177/3177440.png"
                      }
                      alt="Profile"
                      className="relative w-8 h-8 md:w-9 md:h-9 rounded-full border-2 border-cyan-900"
                    />
                    <div className="absolute bottom-0 right-0 w-2 h-2 md:w-2.5 md:h-2.5 bg-green-500 border border-gray-900 rounded-full"></div>
                  </div>
                  <div className="hidden lg:flex flex-col items-start">
                    <span className="text-sm font-medium text-gray-200">
                      {user?.name?.split(" ")[0] || "User"}
                    </span>
                    <span className="text-xs text-gray-400">
                      {user?.email?.split("@")[0] || "Member"}
                    </span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""
                      }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Dropdown Menu - Perfectly Right Aligned */}
                {menuOpen && (
                  <div
                    ref={dropdownRef}
                    className="fixed top-16 right-0 z-50 w-[320px] max-w-[90vw] bg-gray-800 rounded-xl shadow-xl border border-gray-700 overflow-hidden"
                  >
                    {/* User Info Section */}
                    <div className="p-4 sm:p-6 bg-gradient-to-r from-gray-800 to-gray-900">
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="relative flex-shrink-0">
                          <img
                            src={
                              user?.profilePicture ||
                              "https://cdn-icons-png.flaticon.com/512/3177/3177440.png"
                            }
                            alt="User"
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-3 border-gray-800 shadow-md"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold text-white truncate">
                            {user?.name || "User Name"}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-300 truncate">
                            {user?.email || "example@email.com"}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          navigate("/profile");
                        }}
                        className="mt-3 sm:mt-4 w-full px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-cyan-400 border border-cyan-800 hover:bg-cyan-900/20 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                      >
                        <svg
                          className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                        <span>Edit Profile</span>
                      </button>
                    </div>

                    {/* Navigation Links */}
                    <div className="p-1 sm:p-4">
                      <div className="space-y-0">
                        {[{
                          icon: (
                            <svg
                              className="w-4 h-4 sm:w-5 sm:h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z"
                              />
                            </svg>
                          ),
                          label: "Workspace",
                          path: "/workspace"
                        },
                        {
                          icon: (
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          ),
                          label: "Meetings",
                          path: "/meetings"
                        },
                        {
                          icon: (
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          ),
                          label: "Documents",
                          path: "/documents"
                        },
                        {
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    label: "Analytics",
    path: "/analytics"
  },
                        {
                          icon: (
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          ),
                          label: "Tasks",
                          path: "/tasks"
                        },
                        {
                          icon: (
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          ),
                          label: "Calendar",
                          path: "/calendar"
                        },
                        {
                          icon: (
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          ),
                          label: "Settings",
                          path: "/settings"
                        },
                        ].map((item) => (
                          <button
                            key={item.path}
                            onClick={() => {
                              setMenuOpen(false);
                              navigate(item.path);
                            }}
                            className="w-full flex items-center space-x-3 px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-gray-300 hover:bg-gray-700 rounded-lg transition-colors duration-200 group"
                          >
                            <div className="text-cyan-400 group-hover:text-cyan-300 transition-colors duration-200 flex-shrink-0">
                              {item.icon}
                            </div>
                            <span className="text-xs sm:text-sm">{item.label}</span>
                            <svg
                              className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-auto text-gray-400 group-hover:text-cyan-500 transition-colors duration-200 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Logout Section */}
                    <div className="p-3 sm:p-4 border-t border-gray-700">
                      <button
                        onClick={handleLogout}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center space-x-2"
                      >
                        <svg
                          className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}