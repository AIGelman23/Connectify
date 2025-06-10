// lib/s3.js - S3 configuration and utility functions
import AWS from "aws-sdk";
require("dotenv").config({ path: ".env.local" });

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_S3_REGION,
});

export const uploadFileToS3 = async (fileBuffer, fileName, mimeType) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: `uploads/${Date.now()}-${fileName}`,
    Body: fileBuffer,
    ContentType: mimeType,
    ACL: "public-read", // Make file publicly accessible
  };

  try {
    const data = await s3.upload(params).promise();
    return {
      success: true,
      url: data.Location,
      key: data.Key,
    };
  } catch (error) {
    console.error("S3 upload error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

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
