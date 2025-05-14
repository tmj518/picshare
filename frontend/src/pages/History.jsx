import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, CircularProgress, Grid, Button } from '@mui/material';
import axios from 'axios';
import ImageCard from '../components/ImageCard';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';

const History = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    axios.get(`/api/history/${encodeURIComponent(user.email)}`)
      .then(res => {
        setList(res.data.list || []);
        setError('');
      })
      .catch(err => {
        setError('获取历史记录失败');
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return (
    <Box sx={{ mt: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 4 }}>
      <PersonOutlineIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2, opacity: 0.6 }} />
      <Typography variant="h6" sx={{ mb: 2 }}>请先登录</Typography>
      <Typography variant="body1" color="textSecondary" sx={{ textAlign: 'center', maxWidth: 400, mb: 3 }}>
        登录后可以查看您的历史上传记录，管理图片，跟踪数据统计
      </Typography>
      <Button variant="contained" color="primary" onClick={() => window.location.href='#/login'} sx={{ borderRadius: 2 }}>
        立即登录/注册
      </Button>
    </Box>
  );

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>历史上传记录</Typography>
      {loading ? <CircularProgress /> : (
        list.length === 0 ? (
          <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 4 }}>
            <PhotoLibraryOutlinedIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2, opacity: 0.6 }} />
            <Typography variant="h6" sx={{ mb: 2 }}>暂无历史上传</Typography>
            <Typography variant="body1" color="textSecondary" sx={{ textAlign: 'center', maxWidth: 400, mb: 3 }}>
              您还没有上传过任何图片，点击下方按钮开始您的第一次上传吧！
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<CloudUploadOutlinedIcon />}
              onClick={() => window.location.href='/'} 
              sx={{ borderRadius: 2 }}
            >
              回到首页上传
            </Button>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {list.map((img, idx) => (
              <Grid item key={img.shortCode || idx} xs={12} sm={6} md={4} lg={3}>
                <ImageCard
                  imageUrl={img.imageUrl}
                  shortCode={img.shortCode}
                  fileName={img.originalName}
                />
              </Grid>
            ))}
          </Grid>
        )
      )}
      {error && <Paper sx={{ mt: 2, p: 2, color: 'red' }}>{error}</Paper>}
    </Box>
  );
};

export default History;