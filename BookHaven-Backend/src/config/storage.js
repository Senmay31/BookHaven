const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET;

// ─── MULTER MEMORY STORAGE ───
// Files are first held in memory, then we stream them to S3
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedBookTypes = [".pdf", ".epub", ".mobi"];
  const allowedImageTypes = [".jpg", ".jpeg", ".png", ".webp"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (file.fieldname === "book" && allowedBookTypes.includes(ext)) {
    cb(null, true);
  } else if (file.fieldname === "cover" && allowedImageTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type: ${ext}. Books must be PDF/EPUB/MOBI, covers must be images.`,
      ),
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
});

/**
 * Upload a file buffer to S3
 * Returns the S3 URL — the "address" of the book in your off-site warehouse
 */
const uploadToS3 = async (buffer, originalName, folder = "books") => {
  const ext = path.extname(originalName).toLowerCase();
  const key = `${folder}/${uuidv4()}${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: getMimeType(ext),
    // Books are stored privately — readers must be authenticated to access them
    ACL: folder === "covers" ? "public-read" : "private",
  });

  await s3Client.send(command);

  // Covers are public URLs, book files are private (require signed URLs)
  if (folder === "covers") {
    return `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  }

  return key; // Store just the key for private files
};

// Generate a temporary signed URL for accessing a private book file
const getSignedBookUrl = async (key, expiresIn = 3600) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
};

// Delete a file from S3
const deleteFromS3 = async (key) => {
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
  await s3Client.send(command);
};

const getMimeType = (ext) => {
  const types = {
    ".pdf": "application/pdf",
    ".epub": "application/epub+zip",
    ".mobi": "application/x-mobipocket-ebook",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
  };
  return types[ext] || "application/octet-stream";
};

module.exports = { upload, uploadToS3, getSignedBookUrl, deleteFromS3 };
