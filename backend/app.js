const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { initializeS3Config } = require('./config/s3Config');

// 初始化应用
async function initializeApp() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('数据库连接成功');

    // 初始化 S3 配置
    const s3Initialized = await initializeS3Config();
    if (!s3Initialized) {
      console.error('S3 配置初始化失败，请检查配置');
    }

    // 启动服务器
    app.listen(process.env.PORT || 3000, () => {
      console.log(`服务器运行在端口 ${process.env.PORT || 3000}`);
    });
  } catch (error) {
    console.error('应用初始化失败:', error);
    process.exit(1);
  }
}

initializeApp(); 
const uploadRouter = require('./routes/upload');
app.use('/', uploadRouter); // 或 app.use('/upload', uploadRouter);
