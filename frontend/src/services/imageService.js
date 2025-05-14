import axios from 'axios';

// 使用相对路径，解决跨域问题
const API_BASE_URL = ''; // 使用相对路径

// 设置axios默认超时时间
axios.defaults.timeout = 30000;

// 上传单张图片
export const uploadImage = async (imageFile, platform = 'default') => {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('platform', platform);

    const response = await axios.post(`${API_BASE_URL}/api/images/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  } catch (error) {
    console.error('上传图片失败:', error);
    throw error.response?.data?.error || error.message || '上传图片失败';
  }
};

// 批量上传图片
export const uploadImages = async (imageFiles, platform = 'default') => {
  try {
    const formData = new FormData();
    imageFiles.forEach((file, index) => {
      formData.append('images', file);
    });
    formData.append('platform', platform);

    const response = await axios.post(`${API_BASE_URL}/api/images/upload/batch`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  } catch (error) {
    console.error('批量上传图片失败:', error);
    throw error.response?.data?.error || error.message || '批量上传图片失败';
  }
};

// 获取图片信息
export const getImageInfo = async (shortCode) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/images/${shortCode}`);
    return response.data;
  } catch (error) {
    console.error('获取图片信息失败:', error);
    throw error.response?.data?.error || error.message || '获取图片信息失败';
  }
};

// 生成微信分享链接
export const generateWechatLink = (shortCode) => {
  return `${window.location.origin}/api/images/wechat/${shortCode}`;
};

// 生成QQ空间分享链接
export const generateQzoneLink = (shortCode) => {
  return `${window.location.origin}/api/images/qzone/${shortCode}`;
};

// 生成Facebook分享链接
export const generateFacebookLink = (shortCode) => {
  return `${window.location.origin}/api/images/facebook/${shortCode}`;
};

// 生成Twitter分享链接
export const generateTwitterLink = (shortCode) => {
  return `${window.location.origin}/api/images/twitter/${shortCode}`;
};

// 初始化上传
export const initUpload = async (file, userEmail) => {
  try {
    const response = await axios.post(`/upload/init`, {
      filename: file.name,
      size: file.size,
      mimetype: file.type,
      userEmail: userEmail || ''
    });
    return response.data;
  } catch (error) {
    console.error('初始化上传失败:', error);
    throw error.response?.data?.error || error.message || '初始化上传失败';
  }
};

// 上传分片
export const uploadChunk = async (uploadId, partNumber, chunk) => {
  try {
    const formData = new FormData();
    formData.append('chunk', chunk);
    
    const response = await axios.post(
      `/upload/chunk/${uploadId}/${partNumber}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          return percentCompleted;
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error(`上传分片 ${partNumber} 失败:`, error);
    throw error.response?.data?.error || error.message || '上传分片失败';
  }
};

// 完成上传
export const completeUpload = async (uploadId) => {
  try {
    const response = await axios.post(`/upload/complete/${uploadId}`);
    return response.data;
  } catch (error) {
    console.error('完成上传失败:', error);
    throw error.response?.data?.error || error.message || '完成上传失败';
  }
};

// 获取上传进度
export const getUploadProgress = async (uploadId) => {
  try {
    const response = await axios.get(`/upload/progress/${uploadId}`);
    return response.data;
  } catch (error) {
    console.error('获取上传进度失败:', error);
    throw error.response?.data?.error || error.message || '获取上传进度失败';
  }
};    