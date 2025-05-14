require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const qrcode = require('qrcode');
const authRouter = require('./routes/auth');
const { images } = require('./services/imageStore');
const historyRouter = require('./routes/history');

const app = express();
const PORT = process.env.PORT || 3000;

// 确保上传目录存在
const uploadsDir = path.join(__dirname, 'uploads');
const chunksDir = path.join(__dirname, 'chunks');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(chunksDir)) fs.mkdirSync(chunksDir, { recursive: true });

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 设置内存存储，用于处理小文件
const storage = multer.memoryStorage();
const upload = multer({ storage });

// 内存中存储
const uploads = new Map(); // 上传任务
const imageStats = new Map(); // 图片访问统计

// 接口前缀 - 同时支持旧路径和新路径
const API_PREFIX = '/api';

// API路由
// 1. 初始化上传 - 同时支持两种路径
app.post(['/upload/init', `${API_PREFIX}/upload/init`], (req, res) => {
  try {
    const { filename, size, mimetype } = req.body;
    if (!filename || !size) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(mimetype)) {
      return res.status(400).json({ success: false, error: '不支持的文件类型' });
    }

    const chunkSize = 5 * 1024 * 1024; // 5MB
    const totalChunks = Math.ceil(size / chunkSize);
    const uploadId = uuidv4();
    
    // 创建存储分片的文件夹
    const uploadDir = path.join(chunksDir, uploadId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 存储上传任务信息
    uploads.set(uploadId, {
      filename,
      mimetype,
      size,
      chunkSize,
      totalChunks,
      receivedChunks: 0,
      status: 'initialized',
      uploadDir,
      originalName: filename
    });

    res.json({
      success: true,
      uploadId,
      chunkSize,
      totalChunks
    });
  } catch (error) {
    console.error('初始化上传失败:', error);
    res.status(500).json({ success: false, error: '初始化上传失败' });
  }
});

// 2. 上传分片 - 同时支持两种路径
app.post(['/upload/chunk/:uploadId/:partNumber', `${API_PREFIX}/upload/chunk/:uploadId/:partNumber`], upload.single('chunk'), (req, res) => {
  try {
    const { uploadId, partNumber } = req.params;
    const partNum = parseInt(partNumber, 10);

    if (!uploadId || isNaN(partNum)) {
      return res.status(400).json({ success: false, error: '无效的上传ID或分片编号' });
    }

    const uploadInfo = uploads.get(uploadId);
    if (!uploadInfo) {
      return res.status(404).json({ success: false, error: '上传任务不存在' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: '未接收到文件分片' });
    }

    // 保存分片
    const chunkPath = path.join(uploadInfo.uploadDir, `${partNum}`);
    fs.writeFileSync(chunkPath, req.file.buffer);

    // 更新接收分片数量
    uploadInfo.receivedChunks++;
    uploads.set(uploadId, uploadInfo);

    res.json({
      success: true,
      uploadId,
      partNumber: partNum,
      received: uploadInfo.receivedChunks,
      total: uploadInfo.totalChunks
    });
  } catch (error) {
    console.error('上传分片失败:', error);
    res.status(500).json({ success: false, error: '上传分片失败' });
  }
});

// 3. 完成上传 - 同时支持两种路径
app.post(['/upload/complete/:uploadId', `${API_PREFIX}/upload/complete/:uploadId`], async (req, res) => {
  try {
    const { uploadId } = req.params;
    const uploadInfo = uploads.get(uploadId);
    
    if (!uploadInfo) {
      return res.status(404).json({ success: false, error: '上传任务不存在' });
    }

    if (uploadInfo.receivedChunks !== uploadInfo.totalChunks) {
      return res.status(400).json({ 
        success: false, 
        error: '分片未完全上传',
        received: uploadInfo.receivedChunks,
        total: uploadInfo.totalChunks
      });
    }

    // 合并分片
    const outputPath = path.join(uploadsDir, `${uploadId}_${uploadInfo.filename}`);
    const outputStream = fs.createWriteStream(outputPath);
    
    for (let i = 1; i <= uploadInfo.totalChunks; i++) {
      const chunkPath = path.join(uploadInfo.uploadDir, `${i}`);
      const chunkBuffer = fs.readFileSync(chunkPath);
      outputStream.write(chunkBuffer);
    }
    
    outputStream.end();
    
    // 等待文件写入完成
    await new Promise((resolve) => {
      outputStream.on('finish', resolve);
    });

    // 生成短码
    const shortCode = generateShortCode();
    
    // 存储图片信息
    const imageInfo = {
      originalName: uploadInfo.originalName,
      filename: `${uploadId}_${uploadInfo.filename}`,
      mimetype: uploadInfo.mimetype,
      size: uploadInfo.size,
      shortCode,
      userId: 'anonymous',
      userEmail: req.body.userEmail || 'anonymous',
      uploadDate: new Date()
    };
    
    images.set(shortCode, imageInfo);
    
    // 初始化统计数据
    const stats = {
      shortCode,
      totalVisits: 0,
      uniqueVisitors: 0,
      referrers: [],
      devices: [],
      countries: [],
      dailyStats: [],
      lastVisit: null
    };
    
    imageStats.set(shortCode, stats);
    
    // 清理分片文件
    setTimeout(() => {
      try {
        fs.rmSync(uploadInfo.uploadDir, { recursive: true, force: true });
        uploads.delete(uploadId);
      } catch (e) {
        console.error('清理分片文件失败:', e);
      }
    }, 1000);

    // 返回结果
    res.json({
      success: true,
      shortCode,
      imageUrl: `/uploads/${uploadId}_${uploadInfo.filename}`,
      originalName: uploadInfo.originalName
    });
  } catch (error) {
    console.error('完成上传失败:', error);
    res.status(500).json({ success: false, error: '完成上传失败' });
  }
});

// 4. 获取上传进度 - 同时支持两种路径
app.get(['/upload/progress/:uploadId', `${API_PREFIX}/upload/progress/:uploadId`], (req, res) => {
  const { uploadId } = req.params;
  const uploadInfo = uploads.get(uploadId);
  
  if (!uploadInfo) {
    return res.status(404).json({ success: false, error: '上传任务不存在' });
  }
  
  res.json({
    success: true,
    progress: Math.round((uploadInfo.receivedChunks / uploadInfo.totalChunks) * 100),
    receivedChunks: uploadInfo.receivedChunks,
    totalChunks: uploadInfo.totalChunks,
    status: uploadInfo.status
  });
});

// 5. 获取图片信息 - 同时支持两种路径
app.get(['/:shortCode', `${API_PREFIX}/images/:shortCode`], (req, res) => {
  try {
    const { shortCode } = req.params;
    const image = images.get(shortCode);
    
    if (!image) {
      return res.status(404).json({ success: false, error: '图片不存在' });
    }
    
    // 记录访问
    updateImageStats(req, shortCode);
    
    res.json({
      success: true,
      image: {
        originalName: image.originalName,
        mimetype: image.mimetype,
        size: image.size,
        shortCode: image.shortCode,
        imageUrl: `/uploads/${image.filename}`,
        uploadDate: image.uploadDate
      }
    });
  } catch (error) {
    console.error('获取图片信息失败:', error);
    res.status(500).json({ success: false, error: '获取图片信息失败' });
  }
});

// 6. 获取统计数据 - 同时支持两种路径
app.get(['/stats/:shortCode', `${API_PREFIX}/stats/:shortCode`], (req, res) => {
  try {
    const { shortCode } = req.params;
    const stats = imageStats.get(shortCode);
    
    if (!stats) {
      return res.status(404).json({ success: false, error: '统计数据不存在' });
    }
    
    res.json({
      success: true,
      stats: {
        totalVisits: stats.totalVisits,
        uniqueVisitors: stats.uniqueVisitors,
        referrers: stats.referrers,
        devices: stats.devices,
        countries: stats.countries,
        dailyStats: stats.dailyStats,
        lastVisit: stats.lastVisit
      }
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ success: false, error: '获取统计数据失败' });
  }
});

// 7. 生成二维码 - 同时支持两种路径
app.get(['/qrcode/:shortCode', `${API_PREFIX}/qrcode/:shortCode`], async (req, res) => {
  try {
    const { shortCode } = req.params;
    const url = `${req.protocol}://${req.get('host')}/i/${shortCode}`;
    
    const qrCodeOptions = {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    };
    
    const qrCodeData = await qrcode.toDataURL(url, qrCodeOptions);
    const qrCodeBuffer = Buffer.from(qrCodeData.split(',')[1], 'base64');
    
    res.set('Content-Type', 'image/png');
    res.send(qrCodeBuffer);
  } catch (error) {
    console.error('生成二维码失败:', error);
    res.status(500).json({ success: false, error: '生成二维码失败' });
  }
});

// 辅助函数: 更新图片访问统计
function updateImageStats(req, shortCode) {
  try {
    // 获取访问信息
    const userAgent = req.headers['user-agent'] || '';
    const referer = req.headers.referer || 'direct';
    const ip = req.ip || req.connection.remoteAddress;
    
    // 简单的设备类型检测
    let deviceType = 'unknown';
    if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) {
      deviceType = 'mobile';
    } else if (/windows|macintosh|linux/i.test(userAgent)) {
      deviceType = 'desktop';
    }
    
    // 简单的来源域名提取
    let referrerDomain = 'direct';
    if (referer && referer !== 'direct') {
      try {
        const url = new URL(referer);
        referrerDomain = url.hostname;
      } catch (e) {
        referrerDomain = 'unknown';
      }
    }
    
    // 简化的国家检测
    const country = { code: 'CN', name: 'China' };
    
    // 当前日期（不含时间）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 更新统计
    const stats = imageStats.get(shortCode);
    if (!stats) return;
    
    // 更新总访问次数
    stats.totalVisits += 1;
    
    // 更新最后访问时间
    stats.lastVisit = new Date();
    
    // 更新设备统计
    const deviceIndex = stats.devices.findIndex(d => d.type === deviceType);
    if (deviceIndex >= 0) {
      stats.devices[deviceIndex].count += 1;
    } else {
      stats.devices.push({ type: deviceType, count: 1 });
    }
    
    // 更新来源统计
    const referrerIndex = stats.referrers.findIndex(r => r.domain === referrerDomain);
    if (referrerIndex >= 0) {
      stats.referrers[referrerIndex].count += 1;
    } else {
      stats.referrers.push({ domain: referrerDomain, count: 1 });
    }
    
    // 更新国家/地区统计
    const countryIndex = stats.countries.findIndex(c => c.code === country.code);
    if (countryIndex >= 0) {
      stats.countries[countryIndex].count += 1;
    } else {
      stats.countries.push({ code: country.code, count: 1 });
    }
    
    // 更新每日统计
    const dailyStatIndex = stats.dailyStats.findIndex(d => {
      const date = new Date(d.date);
      return date.getTime() === today.getTime();
    });
    
    if (dailyStatIndex >= 0) {
      stats.dailyStats[dailyStatIndex].visits += 1;
    } else {
      stats.dailyStats.push({
        date: today,
        visits: 1,
        uniqueVisitors: 1
      });
    }
    
    imageStats.set(shortCode, stats);
  } catch (error) {
    console.error('更新统计数据失败:', error);
  }
}

// 生成短码
function generateShortCode(length = 6) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let shortCode = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    shortCode += charset[randomIndex];
  }
  
  return shortCode;
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`提示: 您可以访问 http://localhost:${PORT}/uploads 查看上传的图片`);
});

app.use('/api/auth', authRouter);
app.use('/api/history', historyRouter); 