const express = require('express');
const router = express.Router();
const multer = require('multer');
const Settings = require('../models/Settings');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const {
  makeStoragePath,
  uploadBuffer,
  deleteObject,
  parseStoragePath,
} = require('../utils/supabaseStorage');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

// Get current settings (Public or protected? Better protected for consistency, but public for navbar)
router.get('/', async (req, res) => {
  try {
    const settings = await Settings.getOne();
    res.json(settings);
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update settings (Admin only)
router.post('/', auth, requireRole('admin'), (req, res, next) => {
  upload.single('logo')(req, res, async (err) => {
    if (err) {
      console.error('Logo upload error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Logo image is too large. Please use a smaller file.' });
      }
      return res.status(400).json({ message: err.message || 'Invalid logo upload' });
    }

    try {
      const { companyName, clearLogo, logoDataUrl: logoDataUrlFromBody } = req.body;
      if (!companyName) {
        return res.status(400).json({ message: 'Company name is required' });
      }

      const current = await Settings.getOne();
      let logoDataUrl;

      if (clearLogo === '1' || clearLogo === 'true') {
        logoDataUrl = null;
        const previousStoragePath = parseStoragePath(current?.logoDataUrl);
        if (previousStoragePath) {
          await deleteObject(previousStoragePath);
        }
      } else if (req.file) {
        const storedName = makeStoragePath('logos', req.file.originalname);
        const uploaded = await uploadBuffer({
          path: storedName,
          buffer: req.file.buffer,
          contentType: req.file.mimetype,
        });
        logoDataUrl = uploaded.publicUrl;
        const previousStoragePath = parseStoragePath(current?.logoDataUrl);
        if (previousStoragePath && previousStoragePath !== storedName) {
          await deleteObject(previousStoragePath);
        }
      } else if (typeof logoDataUrlFromBody === 'string' && logoDataUrlFromBody.trim()) {
        const trimmedLogo = logoDataUrlFromBody.trim();
        if (!trimmedLogo.startsWith('data:image/') && !trimmedLogo.startsWith('http')) {
          return res.status(400).json({ message: 'Invalid logo image data' });
        }
        logoDataUrl = trimmedLogo;
      }

      const updated = await Settings.update({
        companyName,
        ...(typeof logoDataUrl !== 'undefined' ? { logoDataUrl } : {}),
      });
      return res.json(updated);
    } catch (error) {
      console.error('Error updating settings:', error);
      return res.status(500).json({ message: error.message || 'Server error' });
    }
  });
});

module.exports = router;

