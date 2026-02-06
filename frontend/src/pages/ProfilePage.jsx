import { useEffect, useState } from "react";
import { apiRequest } from "../utils/api";
import ProfileInfo from "../components/profile/ProfileInfo";
import ProfilePicture from "../components/profile/ProfilePicture";
import ChangePassword from "../components/profile/ChangePassword";
import ProfileCompleteness from "../components/profile/ProfileCompleteness";


export default function ProfilePage() {
  const [myProfile, setMyProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");

  // Fetch user info on mount
  useEffect(() => {
    const fetchUser = async () => {
      const res = await apiRequest("/auth/me", "GET", null, localStorage.getItem("token"));
      if (res.success) setMyProfile(res.user);
    };
    fetchUser();
  }, []);

  if (!myProfile) {
    return (
      <div className="max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "profile", label: "Profile Info" },
    { id: "picture", label: "Profile Picture" },
    { id: "password", label: "Change Password" },
    { id: "completeness", label: "Profile Completeness" },
  ];

  return (
    <div className="max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Edit Profile</h1>
        <p className="text-lg text-gray-600">Manage your account settings and preferences</p>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-gray-200 overflow-hidden">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 px-6 bg-gray-50/50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`relative px-6 py-4 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "text-primary-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600"></span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 md:p-8">
          {activeTab === "profile" && <ProfileInfo myProfile={myProfile} setMyProfile={setMyProfile} />}
          {activeTab === "picture" && <ProfilePicture myProfile={myProfile} setMyProfile={setMyProfile} />}
          {activeTab === "password" && <ChangePassword />}
          {activeTab === "completeness" && <ProfileCompleteness />}
        </div>
      </div>
    </div>
  );
}
