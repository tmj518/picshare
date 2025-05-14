const express = require('express');
const router = express.Router();

// 假设图片信息都存储在内存Map images（与server.js一致）
const { images } = require('../services/imageStore');

// 获取某用户的历史上传记录
router.get('/:email', (req, res) => {
  const { email } = req.params;
  if (!email) return res.status(400).json({ error: '缺少邮箱参数' });
  // 查找所有该用户上传的图片
  const list = Array.from(images.values()).filter(img => img.userEmail === email);
  res.json({ success: true, list });
});

module.exports = router; 