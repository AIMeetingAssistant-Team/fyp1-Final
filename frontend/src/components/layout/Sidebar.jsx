import React from "react";

export default function Sidebar({ visible }) {
  return (
    <div
      className={`fixed top-0 left-0 h-full w-56 bg-gray-100 shadow-lg transition-transform duration-300 ${
        visible ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="p-4 font-semibold text-blue-600 border-b">Menu</div>
      <ul className="space-y-2 px-4 mt-2">
        <li className="hover:bg-gray-200 p-2 rounded cursor-pointer">Meetings</li>
        <li className="hover:bg-gray-200 p-2 rounded cursor-pointer">Minutes</li>
        <li className="hover:bg-gray-200 p-2 rounded cursor-pointer">Tasks</li>
        <li className="hover:bg-gray-200 p-2 rounded cursor-pointer">Documents</li>
        <li className="hover:bg-gray-200 p-2 rounded cursor-pointer">Settings</li>
      </ul>
    </div>
  );
}
