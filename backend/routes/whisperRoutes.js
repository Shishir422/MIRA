const express = require('express');
const router = express.Router();
const multer = require('multer');
const { transcribeAudio } = require('../controllers/whisperController');
const { protect } = require('../middleware/authMiddleware');

// Configure multer for audio file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit (OpenAI Whisper limit)
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/') || file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'), false);
    }
  }
});

// Transcribe audio route (protected)
router.post('/transcribe', protect, (req, res, next) => {
  upload.single('audio')(req, res, (err) => {
    if (err) {
      // Handle multer errors
      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          success: false,
          message: `File upload error: ${err.message}`,
          data: null
        });
      }
      // Handle other upload errors
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload error',
        data: null
      });
    }
    // No error, proceed to controller
    next();
  });
}, transcribeAudio);

module.exports = router;

