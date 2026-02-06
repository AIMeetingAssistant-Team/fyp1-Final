import { useEffect, useState } from "react";
import { apiRequest } from "../../utils/api";

export default function ProfileCompleteness() {
  const [completeness, setCompleteness] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompleteness = async () => {
      try {
        setLoading(true);
        const res = await apiRequest("/auth/profile/completeness", "GET", null, localStorage.getItem("token"));
        if (res.success) setCompleteness(res.completeness);
      } catch (error) {
        console.error("Error fetching profile completeness:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCompleteness();
  }, []);

  const progressColor = () => {
    const percentage = completeness?.percentage || 0;
    if (percentage >= 80) return "bg-gradient-to-r from-cyan-600 to-blue-600";
    if (percentage >= 50) return "bg-gradient-to-r from-amber-500 to-orange-500";
    return "bg-gradient-to-r from-red-500 to-pink-500";
  };

  const statusText = () => {
    const percentage = completeness?.percentage || 0;
    if (percentage === 100) return "Profile Complete";
    if (percentage >= 80) return "Almost Complete";
    if (percentage >= 50) return "Good Progress";
    return "Needs Attention";
  };

  const getProgressIcon = () => {
    const percentage = completeness?.percentage || 0;
    if (percentage === 100) return (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
      </svg>
    );
    if (percentage >= 80) return (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    );
    if (percentage >= 50) return (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    );
    return (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
        <div className="flex flex-col items-center justify-center py-8">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-gray-100"></div>
            <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-transparent border-t-cyan-500 animate-spin"></div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-sm font-medium text-gray-600">Loading profile completeness</p>
            <p className="text-xs text-gray-500 mt-1">This will only take a moment</p>
          </div>
        </div>
      </div>
    );
  }

  if (!completeness) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-100 to-pink-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Data</h3>
          <p className="text-gray-600 mb-4">There was an issue loading your profile completeness</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
      {/* Header with subtle gradient accent */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 opacity-5"></div>
        <div className="relative px-6 md:px-8 pt-6 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Profile Completeness</h2>
              <p className="text-sm text-gray-600 mt-1">Complete your profile to unlock all features</p>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${completeness.percentage === 100 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
              <span className="text-sm font-medium">{statusText()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 md:px-8 pb-6">
        {/* Progress Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${progressColor()}`}>
                {getProgressIcon()}
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Current Progress</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">{completeness.percentage}%</span>
                  <span className="text-sm text-gray-500">complete</span>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative">
            <div className="overflow-hidden h-3 rounded-full bg-gray-100">
              <div
                style={{ width: `${completeness.percentage}%` }}
                className={`h-full rounded-full transition-all duration-1000 ease-out ${progressColor()}`}
              ></div>
            </div>
            
            {/* Progress markers */}
            <div className="flex justify-between mt-2 px-1">
              {[0, 25, 50, 75, 100].map((marker) => (
                <div key={marker} className="flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full ${completeness.percentage >= marker ? 'bg-cyan-500' : 'bg-gray-300'}`}></div>
                  <span className="text-xs text-gray-500 mt-1">{marker}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Missing Fields or Complete Message */}
        {completeness.missingFields.length > 0 ? (
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Required Information</h3>
            </div>
            
            <div className="space-y-3">
              {completeness.missingFields.map((field, index) => (
                <div 
                  key={field} 
                  className="group flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-cyan-300 transition-colors duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-medium rounded-lg">
                      {index + 1}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-900">{field}</span>
                      <p className="text-xs text-gray-500 mt-1">Complete this field to improve your profile</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium px-3 py-1 bg-red-100 text-red-700 rounded-full">
                    Required
                  </span>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-100">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-cyan-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-cyan-800">Complete these fields to reach 100%</p>
                  <p className="text-xs text-cyan-600 mt-1">
                    A complete profile increases your visibility and helps you connect better with others
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-t border-gray-200 pt-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Profile Complete</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Excellent work! Your profile is fully complete and optimized for the best experience.
              </p>
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                <p className="text-sm font-medium text-green-800">
                  Your complete profile enhances your credibility and helps build better connections
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-gray-500">
              Profile last updated: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"></div>
              <span className="text-xs font-medium bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 to-blue-600">
                Complete profiles perform better
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}