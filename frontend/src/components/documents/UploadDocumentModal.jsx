import React, { useState, useEffect } from "react";
import Modal from "..//layout/Modal"; // your existing modal

export default function UploadDocumentModal({ isOpen, onClose, meeting }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [canUpload, setCanUpload] = useState(true);

  useEffect(() => {
    // Disable upload for completed or cancelled meetings
    if (!meeting) return;
    if (meeting.status === "completed" || meeting.status === "cancelled") {
      setCanUpload(false);
    } else {
      setCanUpload(true);
    }
  }, [meeting]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError("");
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("document", file);

      const res = await fetch(`${import.meta.env.VITE_BASE_URL}/meetings/${meeting._id}/documents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed.");
      alert("Document uploaded successfully!");
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to upload document. Try again.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Upload Document"
      onClose={onClose}
      size="md"
      actions={[
        { label: "Cancel", onClick: onClose, className: "bg-gray-300" },
        {
          label: "Upload",
          onClick: handleUpload,
          className: "bg-blue-600 text-white",
          disabled: !canUpload,
        },
      ]}
    >
      <div className="flex flex-col gap-4">
        {!canUpload && (
          <p className="text-red-500">
            Documents cannot be uploaded for completed or cancelled meetings.
          </p>
        )}
        {error && <p className="text-red-500">{error}</p>}
        <input type="file" onChange={handleFileChange} disabled={!canUpload} />
      </div>
    </Modal>
  );
}
