const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// 内存存储验证码和用户信息
const codeMap = new Map(); // email -> { code, expires }
const userMap = new Map(); // email -> { email, createdAt }

// 配置nodemailer（QQ邮箱/谷歌邮箱）
// QQ邮箱示例：
const transporter = nodemailer.createTransport({
  service: 'qq',
  auth: {
    user: process.env.MAIL_USER, // QQ邮箱地址
    pass: process.env.MAIL_PASS  // QQ邮箱授权码
  }
});
// Gmail示例（如需切换）：
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.MAIL_USER,
//     pass: process.env.MAIL_PASS
//   }
// });

// 发送验证码
router.post('/send-code', async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(email)) {
    return res.status(400).json({ error: '邮箱格式不正确' });
  }
  // 生成6位验证码
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  codeMap.set(email, { code, expires: Date.now() + 10 * 60 * 1000 });
  try {
    await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: email,
      subject: 'PicShare 验证码',
      text: `您的验证码是：${code}，10分钟内有效。`
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '验证码发送失败，请稍后重试' });
  }
});

// 校验验证码并注册/登录
router.post('/verify-code', (req, res) => {
  const { email, code } = req.body;
  const record = codeMap.get(email);
  if (!record || record.code !== code) {
    return res.status(400).json({ error: '验证码错误' });
  }
  if (Date.now() > record.expires) {
    return res.status(400).json({ error: '验证码已过期' });
  }
  // 注册/登录
  let user = userMap.get(email);
  if (!user) {
    user = { email, createdAt: new Date() };
    userMap.set(email, user);
  }
  codeMap.delete(email);
  res.json({ success: true, user });
});

module.exports = router; 