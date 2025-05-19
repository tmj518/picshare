import React, { useRef, useState } from 'react';
import { Box, Button, LinearProgress, Typography } from '@mui/material';
import axios from 'axios';

const MAX_SIZE = 5 * 1024 * 1024;

const UploadArea = ({ onUploadSuccess }) => {
  const fileInputRef = useRef();
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    if (!selected.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }
    if (selected.size > MAX_SIZE) {
      setError('图片不能超过5MB');
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setError('');
  };

  const handleUpload = async () => {
    if (!file) {
      setError('请先选择图片');
      return;
    }
    setError('');
    setProgress(0);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: e => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
      setFile(null);
      setPreview(null);
      setProgress(0);
      if (onUploadSuccess) onUploadSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.error || '上传失败');
      setProgress(0);
    }
  };

  return (
    <Box>
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <Button variant="contained" onClick={() => fileInputRef.current.click()}>
        选择图片
      </Button>
      {preview && (
        <Box mt={2}>
          <img src={preview} alt="预览" style={{ maxWidth: 200, maxHeight: 200, borderRadius: 8 }} />
        </Box>
      )}
      <Box mt={2}>
        <Button variant="outlined" color="primary" onClick={handleUpload} disabled={!file}>
          上传
        </Button>
      </Box>
      {progress > 0 && <LinearProgress variant="determinate" value={progress} />}
      {error && (
        <Typography color="error" mt={2}>{error}</Typography>
      )}
    </Box>
  );
};

export default UploadArea;
