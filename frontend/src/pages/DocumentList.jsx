import { useState, useEffect } from "react";
import { apiRequest } from "../utils/api";
import { FileText, Calendar, User, Download, Filter } from "lucide-react";

export default function DocumentList() {
  const [documents, setDocuments] = useState([]);
  const [allDocuments, setAllDocuments] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setMsg("");

      try {
        const docData = await apiRequest(
          `/documents/my-documents`,
          "GET",
          null,
          localStorage.getItem("token")
        );

        if (docData.success) {
          const docs = docData.documents;
          setAllDocuments(docs);
          setDocuments(docs);

          // Extract unique meetings
          const meetingMap = {};
          docs.forEach((doc) => {
            if (doc.meeting) meetingMap[doc.meeting._id] = doc.meeting;
          });
          setMeetings(Object.values(meetingMap));
        } else {
          setMsg(docData.message || "Failed to load documents");
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setMsg("Server error. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter by selected meeting
  useEffect(() => {
    const filtered = selectedMeeting
      ? allDocuments.filter((doc) => doc.meeting?._id === selectedMeeting)
      : allDocuments;

    setDocuments(filtered);
  }, [selectedMeeting, allDocuments]);

  const openDocument = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const baseURL = import.meta.env.VITE_BASE_URL || 'http://localhost:5000';

      // Remove trailing slash if present and create clean URL
      const cleanBaseURL = baseURL.replace(/\/$/, '');

      // Check if baseURL already contains /api
      let downloadUrl;
      if (cleanBaseURL.includes('/api')) {
        // If baseURL already has /api, don't add it again
        downloadUrl = `${cleanBaseURL}/documents/${id}/download`;
      } else {
        // If baseURL doesn't have /api, add it
        downloadUrl = `${cleanBaseURL}/api/documents/${id}/download`;
      }

      console.log('Making request to:', downloadUrl);
      const response = await fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });


      if (!response.ok) {
        const errorText = await response.text();
        console.error('Download failed:', response.status, errorText);
        alert(`Download failed: ${response.status} ${response.statusText}`);
        return;
      }

      // Get the blob (the actual file)
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      // Get filename from content-disposition header or use document name
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `document-${id}`;

      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, '');
        }
      } else {
        // If no content-disposition, try to get the document info first
        try {
          const docInfo = await apiRequest(
            `/documents/${id}`,
            "GET",
            null,
            token
          );
          if (docInfo.success && docInfo.document) {
            filename = docInfo.document.name || docInfo.document.originalName || filename;
            // Add extension if not present
            if (docInfo.document.format && !filename.includes('.')) {
              filename = `${filename}.${docInfo.document.format}`;
            }
          }
        } catch (e) {
          console.warn('Could not get document info for filename:', e);
        }
      }

      // Create download link
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 100);

    } catch (err) {
      console.error("Download error:", err);
      alert("Server error while downloading");
    }
  };
  // Loading State
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto w-full">
        <div className="mb-8">
          <div className="h-10 bg-gray-200 rounded-lg w-64 mb-3 animate-pulse"></div>
          <div className="h-6 bg-gray-200 rounded-lg w-96 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  // Empty State
  if (!documents.length && !msg) {
    return (
      <div className="max-w-7xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">My Documents</h1>
          <p className="text-lg text-gray-600">Browse and download your meeting documents</p>
        </div>
        <div className="bg-white rounded-2xl shadow-soft border border-gray-200 p-12 flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-2xl w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <FileText className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Documents Yet</h3>
            <p className="text-gray-600">Upload your first document to get started.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <FileText className="w-10 h-10 text-primary-600" />
          My Documents
        </h1>
        <p className="text-lg text-gray-600">Browse and download your meeting documents</p>
      </div>

      {/* Meeting Filter */}
      {meetings.length > 0 && (
        <div className="mb-6 bg-white p-5 rounded-2xl shadow-soft border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex items-center gap-2 text-gray-700 font-medium">
              <Filter className="w-5 h-5 text-primary-600" />
              Filter by Meeting
            </div>
            <select
              value={selectedMeeting}
              onChange={(e) => setSelectedMeeting(e.target.value)}
              className="flex-1 min-w-0 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white"
            >
              <option value="">All Meetings</option>
              {meetings.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.title}
                </option>
              ))}
            </select>
            {selectedMeeting && (
              <button
                onClick={() => setSelectedMeeting("")}
                className="px-4 py-2.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-xl transition whitespace-nowrap font-medium text-gray-700"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>
      )}

      {/* Document Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {documents.map((doc) => (
          <div
            key={doc._id}
            onClick={() => openDocument(doc._id)}
            className="group bg-white rounded-2xl shadow-soft hover:shadow-large transition-all duration-300 cursor-pointer overflow-hidden border border-gray-200 transform hover:-translate-y-1"
          >
            {/* File Icon & Type Badge */}
            <div className="p-6 bg-gradient-to-br from-primary-50 to-accent-50 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="bg-white p-3 rounded-xl shadow-sm">
                  <FileText className="w-8 h-8 text-primary-600" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary-700 bg-primary-100 px-3 py-1.5 rounded-full">
                  {doc.category}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-5">
              <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition">
                {doc.name}
              </h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {doc.description || "No description available"}
              </p>

              {/* Meta Info */}
              <div className="space-y-2 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="truncate">{doc.uploadedBy.name}</span>
                </div>
                {doc.meeting && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span className="truncate">{doc.meeting.title}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-3">
                  <span className="font-medium">{(doc.size / 1024).toFixed(1)} KB</span>
                  <Download className="w-4 h-4 text-primary-600 group-hover:scale-110 transition" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Error Message */}
      {msg && (
        <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-center">
          {msg}
        </div>
      )}
    </div>
  );
}