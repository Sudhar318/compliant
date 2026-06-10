import fs from "fs";
import path from "path";
import { env } from "../config/env.ts";

export interface StorageUploadResult {
  url: string;
  publicId: string;
}

// Ensure local uploads directory exists
const localUploadsDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(localUploadsDir)) {
  fs.mkdirSync(localUploadsDir, { recursive: true });
}

export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<StorageUploadResult> {
  const hasCloudinary =
    env.CLOUDINARY_CLOUD_NAME &&
    env.CLOUDINARY_API_KEY &&
    env.CLOUDINARY_API_SECRET;

  if (hasCloudinary) {
    try {
      // Lazy load cloudinary SDK
      const { v2: cloudinary } = await import("cloudinary");
      cloudinary.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
      });

      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: "auto",
            public_id: path.parse(fileName).name + "_" + Date.now(),
          },
          (error, result) => {
            if (error || !result) {
              return reject(error || new Error("Cloudinary upload failed"));
            }
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            });
          }
        );
        uploadStream.end(fileBuffer);
      });
    } catch (err) {
      console.error("❌ Cloudinary upload failed, falling back to local storage:", err);
    }
  }

  // Local storage fallback for live preview / workspaces
  const uniqueName = `${Date.now()}-${fileName.replace(/\s+/g, "_")}`;
  const savePath = path.join(localUploadsDir, uniqueName);

  fs.writeFileSync(savePath, fileBuffer);

  return {
    url: `/uploads/${uniqueName}`,
    publicId: `local_${uniqueName}`,
  };
}
