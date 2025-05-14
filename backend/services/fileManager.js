const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const sharp = require('sharp');
const path = require('path');

class FileManager {
  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    this.bucket = process.env.AWS_BUCKET_NAME;
    this.cacheControl = 'public, max-age=31536000'; // 1年缓存
  }

  // 生成预签名URL（用于上传）
  async generatePresignedUrl(key, contentType) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      CacheControl: this.cacheControl
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
  }

  // 生成预签名URL（用于下载/查看）
  async generatePresignedGetUrl(key, expiresIn = 3600) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  // 删除文件
  async deleteFile(key) {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key
    });

    await this.s3Client.send(command);
  }

  // 列出文件
  async listFiles(prefix = '') {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix
    });

    const response = await this.s3Client.send(command);
    return response.Contents || [];
  }

  // 获取文件数据
  async getFileData(key) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key
    });

    const response = await this.s3Client.send(command);
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  // 处理图片并上传
  async processAndUploadImage(buffer, key, options = {}) {
    const {
      format = 'jpeg',
      quality = 80,
      maxWidth = 1920,
      maxHeight = 1080,
      watermark = null,
      progressive = true
    } = options;

    let pipeline = sharp(buffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });

    // 根据格式处理图片
    switch (format.toLowerCase()) {
      case 'webp':
        pipeline = pipeline.webp({ quality, effort: 6 });
        break;
      case 'png':
        pipeline = pipeline.png({ compressionLevel: 9, progressive });
        break;
      default:
        pipeline = pipeline.jpeg({ quality, progressive });
    }

    // 添加水印
    if (watermark) {
      const watermarkBuffer = await this.createWatermark(watermark);
      pipeline = pipeline.composite([{
        input: watermarkBuffer,
        gravity: 'southeast'
      }]);
    }

    const processedBuffer = await pipeline.toBuffer();

    // 上传到S3
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: processedBuffer,
      ContentType: `image/${format}`,
      CacheControl: this.cacheControl,
      Metadata: {
        'x-amz-meta-original-format': format,
        'x-amz-meta-processed': 'true',
        'x-amz-meta-progressive': progressive.toString()
      }
    });

    await this.s3Client.send(command);
    return key;
  }

  // 创建水印
  async createWatermark(options) {
    const {
      text = '© Your Brand',
      fontSize = 24,
      color = 'rgba(255, 255, 255, 0.5)'
    } = options;

    return await sharp({
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
          text,
          font: fontSize,
          rgba: true
        }
      },
      gravity: 'southeast'
    }])
    .toBuffer();
  }

  // 批量删除文件
  async deleteFiles(keys) {
    const deletePromises = keys.map(key => this.deleteFile(key));
    await Promise.all(deletePromises);
  }

  // 获取文件元数据
  async getFileMetadata(key) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key
    });

    const response = await this.s3Client.send(command);
    return {
      contentType: response.ContentType,
      lastModified: response.LastModified,
      size: response.ContentLength,
      metadata: response.Metadata
    };
  }
}

module.exports = new FileManager(); 