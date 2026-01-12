// middlewares/upload.js
import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // Keep original extension
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// Export helpers
export const uploadSingle = (fieldName = "file") =>
  multer({ storage }).single(fieldName);
export const uploadMulti = (fieldName = "files") =>
  multer({ storage }).array(fieldName);

// Optional: default export if you want generic usage
export const upload = multer({ storage });
