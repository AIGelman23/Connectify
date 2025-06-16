// lib/s3.js - S3 configuration and utility functions
import S3 from "aws-sdk/clients/s3";

const s3 = new S3({
  region: process.env.AWS_S3_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export async function uploadFileToS3(fileBuffer, originalFilename, mimeType) {
  // Sanitize the filename (remove spaces) and prefix with a timestamp to prevent collisions
  const timestamp = Date.now();
  const sanitizedFilename = originalFilename.replace(/\s+/g, "-");
  const key = `${timestamp}-${sanitizedFilename}`;

  try {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
    };
    const data = await s3.upload(params).promise();
    return { success: true, url: data.Location, key };
  } catch (error) {
    console.error("S3 upload error:", error);
    return { success: false, error: error.message };
  }
}

export const deleteFileFromS3 = async (key) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
  };

  try {
    await s3.deleteObject(params).promise();
    return { success: true };
  } catch (error) {
    console.error("S3 delete error:", error);
    return { success: false, error: error.message };
  }
};
