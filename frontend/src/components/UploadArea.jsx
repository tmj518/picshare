import React, { useState, useRef } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  LinearProgress, 
  List, 
  ListItem, 
  ListItemText, 
  IconButton, 
  Paper,
  Grid,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import { CloudUpload, Delete, Refresh, FileUpload } from '@mui/icons-material';
import { initUpload, uploadChunk, completeUpload } from '../services/imageService';
import ImageCard from './ImageCard';
import axios from 'axios';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useTranslation } from 'react-i18next';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB 分片大小
const MAX_RETRY_ATTEMPTS = 3; // 最大重试次数

const UploadArea = ({ onUploadSuccess, user }) => {
  const { t } = useTranslation();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadedImages, setUploadedImages] = useState([]);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false); // 拖拽高亮
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    setDragActive(false);
    const selectedFiles = Array.from(event.target.files).filter(file => 
      file.type.startsWith('image/')
    );
    setFiles(prevFiles => [...prevFiles, ...selectedFiles]);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const droppedFiles = Array.from(event.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    setFiles(prevFiles => [...prevFiles, ...droppedFiles]);
  };

  const uploadFile = async (file) => {
    try {
      // 初始化上传，带上userEmail
      let initResponse;
      try {
        initResponse = await initUpload(file, user?.email);
      } catch (error) {
        console.error('初始化上传失败:', error);
        throw new Error(`初始化上传失败: ${error.message || '未知错误'}`);
      }
      
      const { uploadId, chunkSize, totalChunks } = initResponse;
      
      // 更新进度状态
      setUploadProgress(prev => ({
        ...prev,
        [file.name]: { uploadId, progress: 0, totalChunks }
      }));

      // 分片上传，添加重试逻辑
      for (let partNumber = 1; partNumber <= totalChunks; partNumber++) {
        const start = (partNumber - 1) * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        let retryCount = 0;
        let success = false;
        
        // 添加重试逻辑
        while (!success && retryCount < MAX_RETRY_ATTEMPTS) {
          try {
            await uploadChunk(uploadId, partNumber, chunk);
            success = true;
          } catch (error) {
            retryCount++;
            console.warn(`上传分片 ${partNumber} 失败，尝试重试 (${retryCount}/${MAX_RETRY_ATTEMPTS})`, error);
            
            if (retryCount >= MAX_RETRY_ATTEMPTS) {
              throw new Error(`上传分片 ${partNumber} 失败，已达到最大重试次数`);
            }
            
            // 等待一段时间再重试
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        // 更新进度
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: {
            ...prev[file.name],
            progress: Math.round((partNumber / totalChunks) * 100)
          }
        }));
      }

      // 完成上传
      let completeResponse;
      try {
        completeResponse = await completeUpload(uploadId);
      } catch (error) {
        console.error('完成上传失败:', error);
        throw new Error(`完成上传失败: ${error.message || '未知错误'}`);
      }
      
      // 返回上传结果
      return {
        fileName: file.name,
        shortCode: completeResponse.shortCode,
        imageUrl: completeResponse.imageUrl
      };
    } catch (error) {
      console.error(`上传文件 ${file.name} 失败:`, error);
      throw error;
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);

    const results = [];
    let successCount = 0;
    try {
      for (const file of files) {
        try {
          const result = await uploadFile(file);
          results.push(result);
          successCount++;
        } catch (error) {
          setError(`上传文件 ${file.name} 失败: ${error.message || '请检查网络连接并重试'}`);
          console.error('上传失败:', error);
          break;
        }
      }
      if (results.length > 0) {
        setUploadedImages(prev => [...prev, ...results]);
        if (results.length === files.length) {
          setFiles([]);
          setUploadProgress({});
        } else {
          const successFileNames = results.map(r => r.fileName);
          setFiles(prev => prev.filter(file => !successFileNames.includes(file.name)));
        }
        // 新增：上传成功后调用onUploadSuccess，传递图片信息
        if (onUploadSuccess && successCount > 0) onUploadSuccess(successCount, results);
      }
    } catch (error) {
      setError('上传过程中发生错误，请重试');
      console.error('上传失败:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = (index) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const handleCloseError = () => {
    setError(null);
  };

  return (
    <Box sx={{ maxWidth: 980, mx: 'auto', my: 6, px: 2 }}>
      <Paper
        elevation={2}
        sx={{
          p: 6,
          border: dragActive ? '2.5px solid #1976d2' : '2.5px dashed #bdbdbd',
          borderRadius: 3,
          textAlign: 'center',
          cursor: 'pointer',
          background: dragActive ? 'rgba(227,242,253,0.98)' : 'rgba(250,250,250,0.97)',
          boxShadow: dragActive ? '0 6px 32px rgba(25,118,210,0.10)' : '0 2px 16px rgba(0,0,0,0.06)',
          minHeight: 320,
          minWidth: 720,
          maxWidth: 920,
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'box-shadow 0.2s, border 0.2s, background 0.2s',
          '&:hover': {
            borderColor: dragActive ? '#1976d2' : 'primary.main',
            boxShadow: dragActive ? '0 8px 40px rgba(25,118,210,0.13)' : '0 6px 32px rgba(0,0,0,0.10)',
            background: dragActive ? 'rgba(227,242,253,1)' : 'rgba(245,245,245,1)',
          },
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          multiple
          hidden
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/jpeg,image/png,image/gif,image/webp"
        />
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 2 }}>
          <CloudUpload sx={{ fontSize: 110, color: 'primary.main', mb: 2, opacity: 0.16, position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)', zIndex: 0, transition: 'color 0.2s' }} />
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<FileUpload />}
            sx={{ mb: 2, px: 6, py: 1.8, fontSize: '1.25rem', zIndex: 1, boxShadow: '0 2px 8px rgba(33,150,243,0.08)',
              transition: 'background 0.2s, box-shadow 0.2s, transform 0.1s',
              '&:hover': { background: '#1565c0', boxShadow: '0 4px 16px rgba(33,150,243,0.15)', transform: 'translateY(-2px) scale(1.03)' },
              '&:active': { background: '#0d47a1', transform: 'scale(0.98)' }
            }}
          >
            {t('浏览图像')}
          </Button>
          <Typography variant="body1" color="textSecondary" sx={{ zIndex: 1, fontWeight: 500, fontSize: 20 }}>
            {t('或把你的图像拖到这里')}
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1, zIndex: 1, fontSize: 16 }}>
            {t('支持 JPG, PNG, GIF, WebP 格式')}
          </Typography>
        </Box>
      </Paper>

      {files.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('已选择')} {files.length} {t('个文件')}
          </Typography>
          <List>
            {files.map((file, index) => (
              <ListItem
                key={index}
                secondaryAction={
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => handleRemoveFile(index)}
                    disabled={uploading}
                  >
                    <Delete />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={file.name}
                  secondary={
                    <Box>
                      <Typography variant="body2">
                        {`${(file.size / 1024 / 1024).toFixed(2)} MB`}
                      </Typography>
                      {uploadProgress[file.name] && (
                        <Box sx={{ width: '100%', mt: 1, display: 'flex', alignItems: 'center' }}>
                          <LinearProgress
                            variant="determinate"
                            value={uploadProgress[file.name].progress}
                            sx={{ height: 8, borderRadius: 5, flex: 1, mr: 2, background: '#e3eaf2', '& .MuiLinearProgress-bar': { transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)' } }}
                          />
                          <Typography variant="body2" color="primary" sx={{ minWidth: 38, fontWeight: 600, fontSize: 16, textAlign: 'right' }}>
                            {`${uploadProgress[file.name].progress}%`}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handleUpload}
            disabled={uploading}
            sx={{ mt: 2, fontWeight: 600, fontSize: 18, py: 1.2, transition: 'background 0.2s, box-shadow 0.2s, transform 0.1s',
              '&:hover': { background: '#1565c0', boxShadow: '0 4px 16px rgba(33,150,243,0.15)', transform: 'translateY(-2px) scale(1.03)' },
              '&:active': { background: '#0d47a1', transform: 'scale(0.98)' }
            }}
            startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {uploading ? t('上传中...') : t('开始上传')}
          </Button>
        </Box>
      )}

      {/* 上传成功的图片卡片 */}
      {uploadedImages.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            {t('上传成功')} ({uploadedImages.length}{t('张图片')})
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
            {uploadedImages.map((image, index) => (
              <ImageCard
                key={index}
                imageUrl={image.imageUrl}
                shortCode={image.shortCode}
                fileName={image.fileName}
              />
            ))}
          </Box>
        </Box>
      )}

      <Snackbar
        open={!!error}
        autoHideDuration={8000}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseError} 
          severity="error" 
          variant="filled"
          icon={<ErrorOutlineIcon fontSize="inherit" />}
          sx={{ width: '100%', alignItems: 'center', '& .MuiAlert-icon': { fontSize: 28 } }}
        >
          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: 16, mb: 0.5 }}>
              {t('上传失败')}
            </Typography>
            <Typography variant="body2">
              {error?.includes('初始化上传失败') 
                ? t('服务器连接问题，请检查网络或稍后重试。')
                : error?.includes('上传分片失败') 
                ? t('文件上传中断，请检查网络连接并重试。')
                : error || t('未知错误，请重试')}
            </Typography>
            {error?.includes('服务器') && (
              <Button color="inherit" size="small" sx={{ mt: 1, color: '#fff', borderColor: '#fff', fontSize: 13 }} variant="outlined" onClick={handleUpload}>
                {t('重试上传')}
              </Button>
            )}
          </Box>
        </Alert>
      </Snackbar>

      {/* 上传成功提示 */}
      {uploadedImages.length > 0 && (
        <Snackbar
          open={uploadedImages.length > 0}
          autoHideDuration={4000}
          onClose={() => {}}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          sx={{ top: 16 }}
        >
          <Alert 
            severity="success" 
            variant="filled"
            icon={<CheckCircleIcon fontSize="inherit" />}
            sx={{ width: '100%', alignItems: 'center', '& .MuiAlert-icon': { fontSize: 28 } }}
          >
            <Typography sx={{ fontWeight: 600, fontSize: 16 }}>
              {t('上传成功')}（{uploadedImages.length}{t('张图片')}）
            </Typography>
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
};

export default UploadArea; 