const express = require('express');
const router = express.Router();
const multer = require('multer');
const crypto = require('crypto');
const AWS = require('aws-sdk');
const mongoose = require('mongoose');
const QRCode = require('qrcode');
const path = require('path');
const sharp = require('sharp');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const multerS3Transform = require('multer-s3-transform');
const geoip = require('geoip-lite');
const UAParser = require('ua-parser-js');
const fileManager = require('../services/fileManager');

// 配置AWS S3客户端
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// 图片访问统计模型
const ImageStatsSchema = new mongoose.Schema({
  imageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Image' },
  shortCode: String,
  visits: { type: Number, default: 0 },
  uniqueVisitors: { type: Number, default: 0 },
  referrers: [{
    domain: String,
    count: Number
  }],
  devices: [{
    type: String,
    count: Number
  }],
  countries: [{
    code: String,
    count: Number
  }],
  dailyStats: [{
    date: Date,
    visits: Number,
    uniqueVisitors: Number
  }],
  lastVisit: Date
});

const ImageStats = mongoose.model('ImageStats', ImageStatsSchema);

// 图片处理配置
const imageProcessingConfig = {
  compression: {
    quality: 80,
    maxWidth: 1920,
    maxHeight: 1080,
    progressive: true // 添加渐进式加载支持
  },
  watermark: {
    text: '© Your Brand',
    fontSize: 24,
    color: 'rgba(255, 255, 255, 0.5)'
  },
  formats: {
    jpeg: { quality: 80, progressive: true },
    webp: { quality: 80, effort: 6 },
    png: { compressionLevel: 9, progressive: true }
  }
};

// 添加分片上传配置
const chunkConfig = {
  chunkSize: 5 * 1024 * 1024, // 5MB 分片大小
  maxChunks: 100 // 最大分片数
};

// 添加分片上传状态模型
const ChunkUploadSchema = new mongoose.Schema({
  uploadId: String,
  filename: String,
  originalName: String,
  mimetype: String,
  size: Number,
  chunks: [{
    partNumber: Number,
    etag: String,
    uploaded: Boolean
  }],
  status: {
    type: String,
    enum: ['pending', 'uploading', 'completed', 'failed'],
    default: 'pending'
  },
  progress: {
    type: Number,
    default: 0
  },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) } // 24小时后过期
});

const ChunkUpload = mongoose.model('ChunkUpload', ChunkUploadSchema);

// 配置Multer存储引擎 - S3存储
const storage = multerS3({
  s3: s3Client,
  bucket: process.env.AWS_BUCKET_NAME,
  contentType: multerS3.AUTO_CONTENT_TYPE,
  metadata: function (req, file, cb) {
    cb(null, { fieldName: file.fieldname });
  },
  key: function (req, file, cb) {
    const ext = file.originalname.split('.').pop();
    const filename = crypto.randomBytes(8).toString('hex');
    cb(null, `uploads/${filename}.${ext}`);
  },
  transform: function (req, file, cb) {
    // 图片处理管道
    const pipeline = sharp()
      .resize(imageProcessingConfig.compression.maxWidth, imageProcessingConfig.compression.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: imageProcessingConfig.compression.quality })
      .composite([{
        input: {
          text: {
            text: imageProcessingConfig.watermark.text,
            font: imageProcessingConfig.watermark.fontSize,
            rgba: true
          }
        },
        gravity: 'southeast'
      }]);

    cb(null, pipeline);
  }
});

// 配置Multer - 内存存储
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型，仅支持JPG、PNG、GIF、WebP'), false);
    }
  }
});

// 图片模型
const ImageSchema = new mongoose.Schema({
  filename: String,
  originalName: String,
  mimetype: String,
  size: Number,
  shortCode: String,
  uploadDate: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  platformTags: [String],
  seoMeta: {
    title: String,
    description: String,
    keywords: [String]
  },
  batchId: String,
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  uploadProgress: {
    type: Number,
    default: 0
  }
});

const Image = mongoose.model('Image', ImageSchema);

// 生成短码
function generateShortCode() {
  return crypto.randomBytes(3).toString('hex');
}

// 处理图片上传进度
const handleUploadProgress = (req, res, next) => {
  let progress = 0;
  const fileSize = req.headers['content-length'];
  
  req.on('data', (chunk) => {
    progress += chunk.length;
    const percentage = Math.round((progress / fileSize) * 100);
    
    // 更新上传进度
    if (req.file) {
      Image.findOneAndUpdate(
        { filename: req.file.filename },
        { 'uploadProgress': percentage },
        { new: true }
      ).exec();
    }
  });
  
  next();
};

// 初始化分片上传
router.post('/upload/init', async (req, res) => {
  try {
    const { filename, mimetype, size } = req.body;
    
    if (!filename || !mimetype || !size) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 创建分片上传记录
    const uploadId = crypto.randomBytes(16).toString('hex');
    const chunks = Array.from({ length: Math.ceil(size / chunkConfig.chunkSize) }, (_, i) => ({
      partNumber: i + 1,
      uploaded: false
    }));

    const chunkUpload = new ChunkUpload({
      uploadId,
      filename,
      originalName: filename,
      mimetype,
      size,
      chunks,
      status: 'pending'
    });

    await chunkUpload.save();

    res.status(200).json({
      success: true,
      uploadId,
      chunkSize: chunkConfig.chunkSize,
      totalChunks: chunks.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '初始化上传失败' });
  }
});

// 上传分片
router.post('/upload/chunk/:uploadId/:partNumber', upload.single('chunk'), async (req, res) => {
  try {
    const { uploadId, partNumber } = req.params;
    const chunkUpload = await ChunkUpload.findOne({ uploadId });

    if (!chunkUpload) {
      return res.status(404).json({ error: '上传任务不存在' });
    }

    if (!req.file) {
      return res.status(400).json({ error: '未接收到分片数据' });
    }

    // 处理并上传分片
    const chunkKey = `chunks/${uploadId}/${partNumber}`;
    await fileManager.processAndUploadImage(req.file.buffer, chunkKey, {
      format: path.extname(chunkUpload.originalName).slice(1),
      quality: imageProcessingConfig.compression.quality
    });

    // 更新分片状态
    const chunk = chunkUpload.chunks.find(c => c.partNumber === parseInt(partNumber));
    if (chunk) {
      chunk.uploaded = true;
      chunk.etag = req.file.etag;
    }

    // 计算上传进度
    const uploadedChunks = chunkUpload.chunks.filter(c => c.uploaded).length;
    chunkUpload.progress = Math.round((uploadedChunks / chunkUpload.chunks.length) * 100);

    await chunkUpload.save();

    res.status(200).json({
      success: true,
      progress: chunkUpload.progress
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '分片上传失败' });
  }
});

// 完成分片上传
router.post('/upload/complete/:uploadId', async (req, res) => {
  try {
    const { uploadId } = req.params;
    const chunkUpload = await ChunkUpload.findOne({ uploadId });

    if (!chunkUpload) {
      return res.status(404).json({ error: '上传任务不存在' });
    }

    // 检查是否所有分片都已上传
    const allChunksUploaded = chunkUpload.chunks.every(c => c.uploaded);
    if (!allChunksUploaded) {
      return res.status(400).json({ error: '部分分片未上传完成' });
    }

    // 合并分片
    const ext = path.extname(chunkUpload.originalName);
    const shortCode = generateShortCode();
    const finalKey = `uploads/${shortCode}${ext}`;

    // 合并分片并处理图片
    const chunks = await Promise.all(
      chunkUpload.chunks.map(async chunk => {
        const chunkKey = `chunks/${uploadId}/${chunk.partNumber}`;
        const chunkData = await fileManager.getFileData(chunkKey);
        return chunkData;
      })
    );

    const finalBuffer = Buffer.concat(chunks);
    await fileManager.processAndUploadImage(finalBuffer, finalKey, {
      format: ext.slice(1),
      watermark: imageProcessingConfig.watermark
    });

    // 创建图片记录
    const image = new Image({
      filename: finalKey,
      originalName: chunkUpload.originalName,
      mimetype: chunkUpload.mimetype,
      size: chunkUpload.size,
      shortCode,
      processingStatus: 'completed'
    });

    await image.save();

    // 清理分片文件
    await Promise.all(
      chunkUpload.chunks.map(chunk => {
        const chunkKey = `chunks/${uploadId}/${chunk.partNumber}`;
        return fileManager.deleteFile(chunkKey);
      })
    );

    // 删除分片上传记录
    await chunkUpload.remove();

    // 生成预签名URL
    const imageUrl = await fileManager.generatePresignedGetUrl(finalKey);

    res.status(200).json({
      success: true,
      imageUrl,
      shortCode,
      imageId: image._id
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '完成上传失败' });
  }
});

// 获取上传进度
router.get('/upload/progress/:uploadId', async (req, res) => {
  try {
    const chunkUpload = await ChunkUpload.findOne({ uploadId: req.params.uploadId });
    if (!chunkUpload) {
      return res.status(404).json({ error: '上传任务不存在' });
    }

    res.status(200).json({
      success: true,
      progress: chunkUpload.progress,
      status: chunkUpload.status
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '获取上传进度失败' });
  }
});

// 批量上传图片
router.post('/upload/batch', handleUploadProgress, upload.array('images', 100), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '未上传图片' });
    }

    const batchId = crypto.randomBytes(4).toString('hex');
    
    const images = await Promise.all(
      req.files.map(async file => {
        let shortCode;
        do {
          shortCode = generateShortCode();
        } while (await Image.findOne({ shortCode }));

        const ext = path.extname(file.originalname);
        const key = `uploads/${shortCode}${ext}`;

        // 处理并上传图片
        await fileManager.processAndUploadImage(file.buffer, key, {
          format: ext.slice(1),
          watermark: {
            text: '© Your Brand',
            fontSize: 24
          }
        });

        const image = new Image({
          filename: key,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          shortCode,
          batchId,
          userId: req.user ? req.user._id : null,
          processingStatus: 'completed',
          uploadProgress: 100
        });

        return await image.save();
      })
    );

    const batchUrl = `${req.protocol}://${req.get('host')}/batch/${batchId}`;
    const qrCodeDataUrl = await QRCode.toDataURL(batchUrl);

    // 生成所有图片的预签名URL
    const imageUrls = await Promise.all(images.map(async img => {
      const url = await fileManager.generatePresignedGetUrl(img.filename);
      return {
        url,
        shortCode: img.shortCode,
        imageId: img._id,
        processingStatus: img.processingStatus
      };
    }));

    res.status(201).json({
      success: true,
      count: images.length,
      batchId,
      batchUrl,
      qrCode: qrCodeDataUrl,
      images: imageUrls
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '批量上传失败，请稍后再试' });
  }
});

// 获取上传进度
router.get('/upload/progress/:imageId', async (req, res) => {
  try {
    const image = await Image.findById(req.params.imageId);
    if (!image) {
      return res.status(404).json({ error: '图片不存在' });
    }

    res.status(200).json({
      success: true,
      progress: image.uploadProgress,
      status: image.processingStatus
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '获取上传进度失败' });
  }
});

// 图片处理函数
async function processImage(buffer, format = 'jpeg') {
  let pipeline = sharp(buffer)
    .resize(imageProcessingConfig.compression.maxWidth, imageProcessingConfig.compression.maxHeight, {
      fit: 'inside',
      withoutEnlargement: true
    });

  // 添加水印
  const watermark = await sharp({
    create: {
      width: 300,
      height: 100,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite([{
    input: {
      text: {
        text: imageProcessingConfig.watermark.text,
        font: imageProcessingConfig.watermark.fontSize,
        rgba: true
      }
    },
    gravity: 'southeast'
  }])
  .toBuffer();

  // 根据格式处理图片
  switch (format.toLowerCase()) {
    case 'webp':
      pipeline = pipeline.webp(imageProcessingConfig.formats.webp);
      break;
    case 'png':
      pipeline = pipeline.png(imageProcessingConfig.formats.png);
      break;
    default:
      pipeline = pipeline.jpeg(imageProcessingConfig.formats.jpeg);
  }

  // 添加水印
  pipeline = pipeline.composite([{
    input: watermark,
    gravity: 'southeast'
  }]);

  return pipeline.toBuffer();
}

// 更新访问统计
async function updateImageStats(imageId, shortCode, req) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats = await ImageStats.findOne({ imageId }) || new ImageStats({ imageId, shortCode });
  
  // 更新访问次数
  stats.visits += 1;
  stats.lastVisit = new Date();

  // 更新每日统计
  const dailyStat = stats.dailyStats.find(d => d.date.getTime() === today.getTime());
  if (dailyStat) {
    dailyStat.visits += 1;
  } else {
    stats.dailyStats.push({ date: today, visits: 1, uniqueVisitors: 0 });
  }

  // 更新来源统计
  const referrer = req.headers.referer || 'direct';
  const domain = referrer === 'direct' ? 'direct' : new URL(referrer).hostname;
  const referrerStat = stats.referrers.find(r => r.domain === domain);
  if (referrerStat) {
    referrerStat.count += 1;
  } else {
    stats.referrers.push({ domain, count: 1 });
  }

  // 更新设备统计
  const ua = new UAParser(req.headers['user-agent']);
  const deviceType = ua.getDevice().type || 'desktop';
  const deviceStat = stats.devices.find(d => d.type === deviceType);
  if (deviceStat) {
    deviceStat.count += 1;
  } else {
    stats.devices.push({ type: deviceType, count: 1 });
  }

  // 更新国家统计
  const ip = req.ip;
  const geo = geoip.lookup(ip);
  if (geo) {
    const countryStat = stats.countries.find(c => c.code === geo.country);
    if (countryStat) {
      countryStat.count += 1;
    } else {
      stats.countries.push({ code: geo.country, count: 1 });
    }
  }

  await stats.save();
  return stats;
}

// 获取图片统计信息
router.get('/stats/:shortCode', async (req, res) => {
  try {
    const image = await Image.findOne({ shortCode: req.params.shortCode });
    if (!image) {
      return res.status(404).json({ error: '图片不存在' });
    }

    const stats = await ImageStats.findOne({ imageId: image._id });
    if (!stats) {
      return res.status(404).json({ error: '统计信息不存在' });
    }

    res.status(200).json({
      success: true,
      stats: {
        totalVisits: stats.visits,
        uniqueVisitors: stats.uniqueVisitors,
        referrers: stats.referrers,
        devices: stats.devices,
        countries: stats.countries,
        dailyStats: stats.dailyStats,
        lastVisit: stats.lastVisit
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '获取统计信息失败' });
  }
});

// 修改获取图片信息的路由，添加统计功能
router.get('/:shortCode', async (req, res) => {
  try {
    const image = await Image.findOne({ shortCode: req.params.shortCode });
    if (!image) {
      return res.status(404).json({ error: '图片不存在' });
    }

    // 更新访问统计
    await updateImageStats(image._id, image.shortCode, req);

    // 生成预签名URL
    const imageUrl = await fileManager.generatePresignedGetUrl(image.filename);

    // 获取文件元数据
    const metadata = await fileManager.getFileMetadata(image.filename);

    res.status(200).json({
      success: true,
      imageUrl,
      details: {
        ...image.toObject(),
        metadata
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '获取图片信息失败' });
  }
});

// 微信外链处理
router.get('/wechat/:shortCode', async (req, res) => {
  try {
    const image = await Image.findOne({ shortCode: req.params.shortCode });
    if (!image) {
      return res.status(404).json({ error: '图片不存在' });
    }

    // 判断是否在微信浏览器中
    const isWechat = req.headers['user-agent'].includes('MicroMessenger');
    
    if (isWechat) {
      // 返回微信专用页面，提示用户长按图片保存
      res.render('wechat-link', { 
        imageUrl: `${req.protocol}://${req.get('host')}/images/${image.filename}`,
        imageId: image._id
      });
    } else {
      // 非微信浏览器直接跳转
      res.redirect(`${req.protocol}://${req.get('host')}/images/${image.filename}`);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '处理微信链接失败' });
  }
});

// 获取批次图片
router.get('/batch/:batchId', async (req, res) => {
  try {
    const images = await Image.find({ batchId: req.params.batchId });
    if (!images || images.length === 0) {
      return res.status(404).json({ error: '批次不存在' });
    }

    const imageUrls = images.map(img => ({
      url: `${req.protocol}://${req.get('host')}/images/${img.shortCode}`,
      shortCode: img.shortCode,
      imageId: img._id
    }));

    res.status(200).json({
      success: true,
      count: images.length,
      images: imageUrls
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '获取批次图片失败' });
  }
});

// 生成单个图片的二维码
router.get('/:shortCode/qrcode', async (req, res) => {
  try {
    const image = await Image.findOne({ shortCode: req.params.shortCode });
    if (!image) {
      return res.status(404).json({ error: '图片不存在' });
    }

    const imageUrl = `${req.protocol}://${req.get('host')}/images/${image.shortCode}`;
    const qrCodeDataUrl = await QRCode.toDataURL(imageUrl);

    res.status(200).json({
      success: true,
      qrCode: qrCodeDataUrl
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '生成二维码失败' });
  }
});

// 删除图片
router.delete('/:shortCode', async (req, res) => {
  try {
    const image = await Image.findOne({ shortCode: req.params.shortCode });
    if (!image) {
      return res.status(404).json({ error: '图片不存在' });
    }

    // 删除S3中的文件
    await fileManager.deleteFile(image.filename);

    // 删除数据库记录
    await image.remove();

    // 删除统计信息
    await ImageStats.findOneAndDelete({ imageId: image._id });

    res.status(200).json({
      success: true,
      message: '图片已删除'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '删除图片失败' });
  }
});

// 其他平台链接处理可以类似添加

module.exports = router;    