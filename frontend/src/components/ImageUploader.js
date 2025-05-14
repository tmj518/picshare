import React, { useState } from 'react';
import { Button, Upload, message, Spin, Tabs } from 'antd';
import { UploadOutlined, LoadingOutlined } from '@ant-design/icons';
import { 
  uploadImage, 
  uploadImages, 
  generateWechatLink,
  generateQzoneLink,
  generateFacebookLink,
  generateTwitterLink
} from '../services/imageService';

const { TabPane } = Tabs;

const ImageUploader = () => {
  const [loading, setLoading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [currentPlatform, setCurrentPlatform] = useState('default');

  // 处理单图上传
  const handleUpload = async (file) => {
    setLoading(true);
    try {
      const result = await uploadImage(file, currentPlatform);
      setUploadedImages([...uploadedImages, result]);
      message.success('图片上传成功');
    } catch (error) {
      message.error(error);
    } finally {
      setLoading(false);
    }
    return false; // 阻止默认上传行为
  };

  // 处理批量上传
  const handleBatchUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    try {
      const result = await uploadImages(Array.from(files), currentPlatform);
      setUploadedImages([...uploadedImages, ...result.images]);
      message.success(`成功上传 ${result.count} 张图片`);
    } catch (error) {
      message.error(error);
    } finally {
      setLoading(false);
      e.target.value = ''; // 重置文件输入
    }
  };

  // 复制链接到剪贴板
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => message.success('链接已复制到剪贴板'))
      .catch(err => message.error('复制失败，请手动复制'));
  };

  // 平台切换
  const handlePlatformChange = (key) => {
    setCurrentPlatform(key);
  };

  // 上传按钮图标
  const uploadButton = (
    <div>
      {loading ? <LoadingOutlined /> : <UploadOutlined />}
      <div className="ant-upload-text">上传图片</div>
    </div>
  );

  return (
    <div className="image-uploader-container">
      <Tabs onChange={handlePlatformChange} activeKey={currentPlatform}>
        <TabPane tab="通用" key="default" />
        <TabPane tab="微信" key="wechat" />
        <TabPane tab="QQ空间" key="qzone" />
        <TabPane tab="Facebook" key="facebook" />
        <TabPane tab="Twitter" key="twitter" />
      </Tabs>

      <div className="upload-area">
        <Upload
          name="image"
          showUploadList={false}
          beforeUpload={handleUpload}
        >
          <Button icon={<UploadOutlined />}>上传单张图片</Button>
        </Upload>

        <div className="batch-upload">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleBatchUpload}
            className="hidden"
            id="batchUpload"
          />
          <label htmlFor="batchUpload" className="batch-upload-label">
            <Button icon={<UploadOutlined />}>批量上传图片</Button>
          </label>
        </div>
      </div>

      {loading && (
        <div className="loading-container">
          <Spin size="large" />
          <p>正在上传图片...</p>
        </div>
      )}

      {uploadedImages.length > 0 && (
        <div className="upload-results">
          <h3>上传结果</h3>
          <div className="image-grid">
            {uploadedImages.map((image, index) => (
              <div key={index} className="image-card">
                <img 
                  src={image.imageUrl} 
                  alt={image.shortCode} 
                  className="preview-image"
                />
                <div className="links-container">
                  <div className="link-item">
                    <span>通用链接:</span>
                    <input 
                      type="text" 
                      value={image.imageUrl} 
                      readOnly 
                      onClick={(e) => e.target.select()}
                    />
                    <Button 
                      type="primary" 
                      size="small" 
                      onClick={() => copyToClipboard(image.imageUrl)}
                    >
                      复制
                    </Button>
                  </div>
                  
                  {currentPlatform === 'wechat' && (
                    <div className="link-item">
                      <span>微信链接:</span>
                      <input 
                        type="text" 
                        value={generateWechatLink(image.shortCode)} 
                        readOnly 
                        onClick={(e) => e.target.select()}
                      />
                      <Button 
                        type="primary" 
                        size="small" 
                        onClick={() => copyToClipboard(generateWechatLink(image.shortCode))}
                      >
                        复制
                      </Button>
                    </div>
                  )}
                  
                  {/* 其他平台链接类似添加 */}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;    