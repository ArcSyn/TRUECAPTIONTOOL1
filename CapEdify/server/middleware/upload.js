const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// Make sure the uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => {
    const ext          = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `video-${uniqueSuffix}${ext}`);
  }
});

// Only allow video mime types
const fileFilter = (req, file, cb) => {
  const allowed = [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm'
  ];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else                                  cb(new Error('Only video files allowed'), false);
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 * 1024 } // 50 GB
});
