const express = require('express');
const router = express.Router();
const multer = require('multer');
const AWS = require('aws-sdk');
const sharp = require('sharp');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const Image = require('../models/Image'); // Mongoose模型

// S3 配置
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});
const s3 = new AWS.S3();

// Multer配置
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('只允许上传图片文件'));
    }
    cb(null, true);
  }
});

// 限流
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: '操作太频繁，请稍后再试'
});

router.post('/upload', limiter, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '未检测到上传文件' });

    // 图片压缩
    const buffer = await sharp(req.file.buffer)
      .resize({ width: 1024, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const ext = 'webp';
    const fileName = `${uuidv4()}.${ext}`;
    const s3Key = `uploads/${fileName}`;

    const uploadResult = await s3.upload({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: s3Key,
      Body: buffer,
      ContentType: 'image/webp',
      ACL: 'public-read'
    }).promise();

    const newImage = new Image({
      imageUrl: uploadResult.Location,
      originalName: req.file.originalname,
      shortCode: uuidv4().slice(0, 8),
      uploadedBy: req.body.userEmail || 'anonymous',
      createdAt: new Date()
    });
    await newImage.save();

    res.json({
      success: true,
      imageUrl: uploadResult.Location,
      shortCode: newImage.shortCode
    });
  } catch (err) {
    console.error('图片上传出错:', err);
    res.status(500).json({ error: '图片上传失败: ' + err.message });
  }
});

module.exports = router;
