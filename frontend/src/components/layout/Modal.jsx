import React from "react";
import { X } from "lucide-react";

export default function Modal({ 
  isOpen, 
  title, 
  children, 
  onClose, 
  actions, 
  size = "md" // small, md, lg
}) {
  if (!isOpen) return null;

  // Modal width classes based on size
  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg w-full ${sizeClasses[size]} relative flex flex-col max-h-[90vh]`}>
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 z-10"
        >
          <X size={20} />
        </button>

        {/* Title */}
        {title && <h2 className="text-xl font-semibold mb-4 pt-2 px-6">{title}</h2>}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 mb-4">
          {children}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex justify-end gap-3 px-6 pb-4">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={`px-4 py-2 rounded ${action.className || "bg-gray-200"}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
