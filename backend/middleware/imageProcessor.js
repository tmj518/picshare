const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const FormData = require('form-data');
const axios = require('axios');

// 图片压缩中间件
const compressImage = async (req, res, next) => {
  try {
    if (!req.file) return next();

    const inputPath = req.file.path;
    const outputPath = path.join(
      path.dirname(inputPath),
      'compressed_' + path.basename(inputPath)
    );

    // 根据不同平台设置不同的压缩参数
    let quality = 80;
    let width = 1920; // 默认最大宽度
    
    if (req.body.platform === 'wechat') {
      // 微信平台优化：更小尺寸，更高压缩率
      quality = 60;
      width = 1080;
    } else if (req.body.platform === 'facebook') {
      // Facebook平台优化
      quality = 70;
      width = 1200;
    }

    // 使用sharp进行图片压缩
    await sharp(inputPath)
      .resize(width)
      .jpeg({ quality })
      .toFile(outputPath);

    // 替换原始文件
    await fs.unlink(inputPath);
    await fs.rename(outputPath, inputPath);

    // 更新文件信息
    const stats = await fs.stat(inputPath);
    req.file.size = stats.size;
    req.file.compressed = true;

    next();
  } catch (error) {
    console.error('图片压缩失败:', error);
    // 压缩失败不影响上传流程，继续执行
    next();
  }
};

// 添加水印中间件
const addWatermark = async (req, res, next) => {
  try {
    if (!req.file) return next();

    // 检查是否需要添加水印
    if (req.body.watermark !== 'true') return next();

    const inputPath = req.file.path;
    const outputPath = path.join(
      path.dirname(inputPath),
      'watermarked_' + path.basename(inputPath)
    );

    // 获取水印配置（实际应用中可能从配置文件或数据库获取）
    const watermarkConfig = {
      text: req.body.watermarkText || 'Your Brand',
      font: 'Arial',
      fontSize: 24,
      color: '#ffffff',
      opacity: 0.5,
      position: req.body.watermarkPosition || 'bottomRight' // topLeft, topRight, bottomLeft, bottomRight
    };

    // 创建水印图片
    const watermarkImage = await sharp({
      create: {
        width: 300,
        height: 100,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([{
        input: Buffer.from(`
          <svg width="300" height="100">
            <text x="150" y="60" font-family="${watermarkConfig.font}" 
                  font-size="${watermarkConfig.fontSize}" fill="${watermarkConfig.color}" 
                  text-anchor="middle" opacity="${watermarkConfig.opacity}">
              ${watermarkConfig.text}
            </text>
          </svg>
        `),
        top: 0,
        left: 0
      }])
      .png()
      .toBuffer();

    // 添加水印到原图
    await sharp(inputPath)
      .composite([{
        input: watermarkImage,
        gravity: getGravity(watermarkConfig.position)
      }])
      .toFile(outputPath);

    // 替换原始文件
    await fs.unlink(inputPath);
    await fs.rename(outputPath, inputPath);

    next();
  } catch (error) {
    console.error('添加水印失败:', error);
    next();
  }
};

// 辅助函数：将位置字符串转换为sharp重力参数
function getGravity(position) {
  switch (position) {
    case 'topLeft': return 'northwest';
    case 'topRight': return 'northeast';
    case 'bottomLeft': return 'southwest';
    case 'bottomRight': return 'southeast';
    default: return 'southeast';
  }
}

// 图片内容审核（对接腾讯云/百度AI等）
const imageContentModeration = async (req, res, next) => {
  try {
    if (!req.file) return next();

    // 检查是否需要内容审核
    if (process.env.ENABLE_CONTENT_MODERATION !== 'true') return next();

    const imageBuffer = await fs.readFile(req.file.path);
    
    // 这里使用腾讯云图像审核API示例
    const formData = new FormData();
    formData.append('image', imageBuffer, req.file.originalname);
    
    const response = await axios.post(
      'https://api.example.com/image-moderation',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${process.env.MODERATION_API_KEY}`
        }
      }
    );

    // 检查审核结果
    if (response.data.result === 'blocked') {
      // 删除违规图片
      await fs.unlink(req.file.path);
      return res.status(400).json({ error: '图片包含违规内容，上传失败' });
    }

    next();
  } catch (error) {
    console.error('图片内容审核失败:', error);
    // 审核失败不影响上传流程（可以记录日志并标记为待审核）
    next();
  }
};

module.exports = {
  compressImage,
  addWatermark,
  imageContentModeration
};    