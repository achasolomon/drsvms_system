import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler';
import { logger } from '../utils/logger';

// Ensure upload directories exist
const createUploadDirs = () => {
  const dirs = [
    'uploads/evidence',
    'uploads/evidence/thumbnails',
    'uploads/temp'
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createUploadDirs();

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Store in memory for processing

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check file type
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Maximum 5 files
  }
});

// Process and save uploaded images
export const processEvidencePhotos = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return next();
    }

    const processedFiles: string[] = [];
    const userId = req.user?.userId || 'unknown';
    const timestamp = Date.now();

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const fileName = `evidence_${userId}_${timestamp}_${i + 1}.jpg`;
      const filePath = path.join('uploads/evidence', fileName);
      const thumbnailPath = path.join('uploads/evidence/thumbnails', fileName);

      try {
        // Process main image (resize and compress)
        await sharp(file.buffer)
          .resize(1200, 1200, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .jpeg({ 
            quality: 85,
            progressive: true 
          })
          .toFile(filePath);

        // Create thumbnail
        await sharp(file.buffer)
          .resize(300, 300, { 
            fit: 'cover' 
          })
          .jpeg({ 
            quality: 80 
          })
          .toFile(thumbnailPath);

        processedFiles.push(fileName);
        logger.info(`Evidence photo processed: ${fileName}`);

      } catch (error) {
        logger.error(`Failed to process image ${fileName}:`, error);
        // Continue with other files
      }
    }

    // Add processed file names to request body
    req.body.evidencePhotos = processedFiles;
    next();

  } catch (error) {
    logger.error('Evidence photo processing error:', error);
    next(createError('Failed to process evidence photos', 500));
  }
};

// Delete evidence photos (cleanup)
export const deleteEvidencePhotos = async (fileNames: string[]): Promise<void> => {
  for (const fileName of fileNames) {
    try {
      const filePath = path.join('uploads/evidence', fileName);
      const thumbnailPath = path.join('uploads/evidence/thumbnails', fileName);

      // Delete main image
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete thumbnail
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }

      logger.info(`Evidence photo deleted: ${fileName}`);
    } catch (error) {
      logger.error(`Failed to delete evidence photo ${fileName}:`, error);
    }
  }
};

// Export configured upload middleware
export const uploadEvidencePhotos = upload.array('evidencePhotos', 5);