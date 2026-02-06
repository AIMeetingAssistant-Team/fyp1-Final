import { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

/**
 * Layout wraps the whole app. It keeps header fixed and controls sidebar state.
 * Pass `children` (page content) into it.
 */
export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-[#f8fafc] text-gray-900">
      {/* Sidebar slide-over (hidden on wide screens; toggled) */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main column */}
      <div className="flex-1 flex flex-col">
        <Header onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <main className="flex-1 p-8">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
