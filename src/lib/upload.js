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
      maxFileSize: 50 * 1024 * 1024, // 50MB limit
      keepExtensions: true, // preserve file extension
    });

    // Wrap form.parse in a Promise
    const parseForm = (req) =>
      new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) reject(err);
          else resolve([fields, files]);
        });
      });

    const [fields, files] = await parseForm(req);
    const getFile = (fileField) =>
      Array.isArray(fileField) ? fileField[0] : fileField;
    const file =
      getFile(files.profilePicture) ||
      getFile(files.coverPhoto) ||
      getFile(files.resume) ||
      getFile(files.file);

    console.log("DEBUG: Uploaded file details:", file); // <-- diagnostic log

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Read file buffer
    let fileBuffer;
    try {
      fileBuffer = fs.readFileSync(file.filepath);
    } catch (err) {
      console.error("Error reading uploaded file:", err);
      return res.status(500).json({ error: "Failed to read uploaded file" });
    }

    // Upload to S3
    let result;
    try {
      result = await uploadFileToS3(
        fileBuffer,
        file.originalFilename || "unnamed-file",
        file.mimetype || "application/octet-stream"
      );
    } catch (err) {
      console.error("Error uploading to S3:", err);
      return res.status(500).json({ error: "Failed to upload to S3" });
    }

    // Clean up temp file
    try {
      fs.unlinkSync(file.filepath);
    } catch (err) {
      console.warn("Failed to clean up temp file:", err);
    }

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
