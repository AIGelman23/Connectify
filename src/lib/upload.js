// pages/api/upload.js - API route for file upload
import { uploadFileToS3 } from "../../lib/s3";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
    });

    const [fields, files] = await form.parse(req);

    const file = files.file[0];
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Read file buffer
    const fileBuffer = fs.readFileSync(file.filepath);

    // Upload to S3
    const result = await uploadFileToS3(
      fileBuffer,
      file.originalFilename || "unnamed-file",
      file.mimetype || "application/octet-stream"
    );

    // Clean up temp file
    fs.unlinkSync(file.filepath);

    if (result.success) {
      res.status(200).json({
        message: "File uploaded successfully",
        url: result.url,
        key: result.key,
        fileName: file.originalFilename,
        size: file.size,
      });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Upload failed: " + error.message });
  }
}
