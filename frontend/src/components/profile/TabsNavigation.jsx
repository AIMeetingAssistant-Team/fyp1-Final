import { useState } from "react";
import ProfileInfo from "./ProfileInfo";
import ChangePassword from "./ChangePassword";
import ProfilePicture from "./ProfilePicture";

export default function ProfilePage({ user, login }) {
  const [activeTab, setActiveTab] = useState("basic");

  return (
    <div className="max-w-4xl mx-auto mt-8 p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-semibold mb-6">Edit Profile</h2>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b pb-2">
        
        <button
          className={activeTab === "info" ? "border-b-2 border-cyan-600 pb-1" : ""}
          onClick={() => setActiveTab("info")}
        >
          Enhanced Info
        </button>
        <button
          className={activeTab === "password" ? "border-b-2 border-cyan-600 pb-1" : ""}
          onClick={() => setActiveTab("password")}
        >
          Change Password
        </button>
        <button
          className={activeTab === "picture" ? "border-b-2 border-cyan-600 pb-1" : ""}
          onClick={() => setActiveTab("picture")}
        >
          Profile Picture
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "info" && <ProfileInfo user={user} login={login} />}
      {activeTab === "password" && <ChangePassword user={user} />}
      {activeTab === "picture" && <ProfilePicture user={user} login={login} />}
    </div>
  );
}
