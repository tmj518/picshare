const { S3Client, PutBucketCorsCommand, PutBucketLifecycleConfigurationCommand, PutBucketPolicyCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// CORS 配置
const corsConfig = {
  CORSRules: [
    {
      AllowedHeaders: ['*'],
      AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
      AllowedOrigins: [process.env.FRONTEND_URL || '*'],
      ExposeHeaders: ['ETag'],
      MaxAgeSeconds: 3600
    }
  ]
};

// 生命周期规则配置
const lifecycleConfig = {
  Rules: [
    {
      ID: 'DeleteExpiredChunks',
      Status: 'Enabled',
      Filter: {
        Prefix: 'chunks/'
      },
      Expiration: {
        Days: 1 // 1天后删除分片文件
      }
    },
    {
      ID: 'DeleteOldVersions',
      Status: 'Enabled',
      Filter: {
        Prefix: 'uploads/'
      },
      NoncurrentVersionExpiration: {
        NoncurrentDays: 30 // 30天后删除旧版本
      }
    },
    {
      ID: 'TransitionToIA',
      Status: 'Enabled',
      Filter: {
        Prefix: 'uploads/'
      },
      Transitions: [
        {
          Days: 90, // 90天后转换到 IA 存储
          StorageClass: 'STANDARD_IA'
        }
      ]
    }
  ]
};

// 存储桶策略配置
const bucketPolicy = {
  Version: '2012-10-17',
  Statement: [
    {
      Sid: 'PublicReadGetObject',
      Effect: 'Allow',
      Principal: '*',
      Action: 's3:GetObject',
      Resource: `arn:aws:s3:::${process.env.AWS_BUCKET_NAME}/*`
    },
    {
      Sid: 'AuthenticatedUserAccess',
      Effect: 'Allow',
      Principal: {
        AWS: process.env.AWS_USER_ARN
      },
      Action: [
        's3:PutObject',
        's3:DeleteObject',
        's3:ListBucket'
      ],
      Resource: [
        `arn:aws:s3:::${process.env.AWS_BUCKET_NAME}`,
        `arn:aws:s3:::${process.env.AWS_BUCKET_NAME}/*`
      ]
    }
  ]
};

// 初始化 S3 配置
async function initializeS3Config() {
  try {
    // 配置 CORS
    await s3Client.send(new PutBucketCorsCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      CORSConfiguration: corsConfig
    }));
    console.log('CORS 配置已更新');

    // 配置生命周期规则
    await s3Client.send(new PutBucketLifecycleConfigurationCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      LifecycleConfiguration: lifecycleConfig
    }));
    console.log('生命周期规则已更新');

    // 配置存储桶策略
    await s3Client.send(new PutBucketPolicyCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Policy: JSON.stringify(bucketPolicy)
    }));
    console.log('存储桶策略已更新');

    return true;
  } catch (error) {
    console.error('S3 配置初始化失败:', error);
    return false;
  }
}

module.exports = {
  s3Client,
  initializeS3Config
}; 