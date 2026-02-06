export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-600 via-blue-800 to-gray-900 relative overflow-hidden">
      {/* floating glow shapes */}
      <div className="absolute w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl top-10 left-10 animate-pulse" />
      <div className="absolute w-80 h-80 bg-blue-500/20 rounded-full blur-3xl bottom-10 right-10 animate-pulse" />

      {/* glass form card */}
      <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
