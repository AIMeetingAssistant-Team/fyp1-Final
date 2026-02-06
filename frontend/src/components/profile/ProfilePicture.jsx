import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";

// Default Profile Icon SVG Component
const DefaultProfileIcon = ({ className = "w-full h-full" }) => (
  <svg 
    className={className} 
    viewBox="0 0 100 100" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Background Circle */}
    <circle cx="50" cy="50" r="50" fill="#1E40AF" />
    
    {/* Head */}
    <circle cx="50" cy="35" r="15" fill="#E5E7EB" />
    
    {/* Body */}
    <path 
      d="M30 50 C30 70, 70 70, 70 50 L70 80 C70 90, 30 90, 30 80 L30 50" 
      fill="#E5E7EB" 
    />
  </svg>
);

export default function ProfilePicture({ myProfile, setMyProfile }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showModal, setShowModal] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const baseurl = import.meta.env.VITE_BASE_URL
  const { updateUserProfile } = useContext(AuthContext);

  // Auto-hide messages
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Handle file selection with preview
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleUpload = async () => {
    setMessage({ type: "", text: "" });
    if (!file) return setMessage({ type: "error", text: "Please select an image file." });

    const validExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"];
    const fileExt = file.name.split(".").pop().toLowerCase();

    if (!(file.type.startsWith("image/") || validExtensions.includes(fileExt))) {
      return setMessage({ type: "error", text: "Only image files are allowed!" });
    }

    if (file.size > 2 * 1024 * 1024) {
      return setMessage({ type: "error", text: "Image size must be less than 2MB." });
    }

    const formData = new FormData();
    formData.append("profilePicture", file);

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${baseurl}/auth/profile/picture`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      setLoading(false);

      if (data.success) {
        setMessage({ type: "success", text: data.message });
        setMyProfile((prev) => ({ ...prev, profilePicture: { url: data.profilePicture } }));
        updateUserProfile({ profilePicture: data.profilePicture });
        setFile(null);
        setImagePreview(null);
      } else {
        setMessage({ type: "error", text: data.message || "Failed to upload picture." });
      }
    } catch (err) {
      setLoading(false);
      console.error(err);
      setMessage({ type: "error", text: "Something went wrong. Please try again." });
    }
  };

  const handleDelete = async () => {
    setShowModal(false);
    setMessage({ type: "", text: "" });

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${baseurl}/auth/profile/picture`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setLoading(false);

      if (data.success) {
        setMessage({ type: "success", text: data.message });
        setMyProfile((prev) => ({ ...prev, profilePicture: { url: null } }));
        updateUserProfile({ profilePicture: null });
        setImagePreview(null);
      } else {
        setMessage({ type: "error", text: data.message || "Failed to delete picture." });
      }
    } catch (err) {
      setLoading(false);
      console.error(err);
      setMessage({ type: "error", text: "Something went wrong. Please try again." });
    }
  };

  // Check if user has a profile picture
  const hasProfilePicture = myProfile.profilePicture?.url || myProfile.profilePicture;
  const displayImage = imagePreview || hasProfilePicture;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Profile Picture</h2>
        <p className="text-sm text-gray-600 mt-1">Upload or update your profile photo</p>
      </div>

      {/* Current Picture Display - Bigger with dark blue border */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative mb-4">
          <div className="w-40 h-40 rounded-full border-4 border-gray-900/95">
            {displayImage ? (
              <img
                src={imagePreview || hasProfilePicture}
                alt=""
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <div className="w-full h-full rounded-full overflow-hidden">
                <DefaultProfileIcon />
              </div>
            )}
          </div>
          {/* Camera icon overlay */}
          <div className="absolute bottom-2 right-2 bg-gradient-to-r from-cyan-400 to-cyan-500 text-white rounded-full p-2 shadow-md">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-700">
            {hasProfilePicture 
              ? "Your current profile picture" 
              : "No profile picture set"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Recommended: 400×400 pixels, max 2MB
          </p>
        </div>
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`mb-4 p-3 rounded ${message.type === "success" 
          ? "bg-green-50 text-green-700 border border-green-200" 
          : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          <div className="flex items-center">
            <span className={`mr-2 ${message.type === "success" ? 'text-green-500' : 'text-red-500'}`}>
              {message.type === "success" ? "✓" : "⚠"}
            </span>
            <span className="text-sm">{message.text}</span>
          </div>
        </div>
      )}

      {/* File Upload Section */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Choose New Picture
        </label>
        
        {/* File Input Styled */}
        <div className="space-y-3">
          <div className="flex items-center">
            <label className="flex items-center justify-center px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg border border-gray-700 cursor-pointer hover:bg-gray-800 transition-colors">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Select File
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {file && (
              <div className="ml-3 flex-1">
                <div className="text-sm text-gray-700 truncate">{file.name}</div>
                <div className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
              </div>
            )}
          </div>
          
          {file && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setImagePreview(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <button                                      
          onClick={handleUpload}
          disabled={loading || !file}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-300 to-gray-900/95 hover:from-cyan-600 hover:to-cyan-700 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading...
            </>
          ) : (
            "Upload Picture"
          )}
        </button>
        
        <button
          onClick={() => setShowModal(true)}
          disabled={loading || !hasProfilePicture}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm">
            <div className="p-5">
              <div className="flex items-center justify-center w-10 h-10 mx-auto mb-4 bg-red-100 rounded-full">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h3 className="text-base font-medium text-gray-900 text-center mb-2">
                Delete Profile Picture?
              </h3>
              
              <p className="text-sm text-gray-500 text-center mb-5">
                This action cannot be undone.
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-lg transition-all duration-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}