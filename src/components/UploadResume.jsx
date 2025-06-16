"use client";

import { UploadButton } from "uploadthing/react";
import "@uploadthing/react/styles.css";

export default function UploadResume({ onUpload }) {
  return (
    <div className="my-4">
      <UploadButton
        endpoint="resumeUploader"
        onClientUploadComplete={(res) => {
          if (res && res.length > 0) {
            console.log("Resume uploaded:", res[0].url);
            onUpload(res[0].url); // Pass URL to parent
          }
        }}
        onUploadError={(error) => alert(`Upload failed: ${error.message}`)}
      />
    </div>
  );
}
