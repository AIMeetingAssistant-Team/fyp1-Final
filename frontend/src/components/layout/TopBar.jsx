import { Menu } from "lucide-react";
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import logo from "../../assets/Logo.png";

export default function TopBar({ onToggleSidebar }) {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const isLoggedIn = !!user;

  // Don't show top bar for unauthenticated users on home/auth pages
  if (!isLoggedIn) return null;

  return (
    <header className="sticky top-0 z-30 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-soft">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left: Toggle button and logo (mobile) */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-6 h-6 text-gray-700" />
          </button>
          
          {/* Logo - visible on mobile when sidebar is closed */}
          <div
            onClick={() => navigate("/workspace")}
            className="flex items-center space-x-2 cursor-pointer lg:hidden"
          >
            <img
              src={logo}
              alt="Logo"
              className="w-8 h-8 object-contain"
            />
            <span className="text-lg font-bold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
              M&T
            </span>
          </div>
        </div>

        {/* Right: Additional top bar content can go here */}
        <div className="flex items-center space-x-4">
          {/* You can add notifications, search, etc. here */}
        </div>
      </div>
    </header>
  );
}
