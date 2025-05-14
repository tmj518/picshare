import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, CircularProgress, Grid } from '@mui/material';
import axios from 'axios';
import ImageCard from '../components/ImageCard';

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

  if (!user) return <Typography sx={{ mt: 4 }}>请先登录</Typography>;

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>历史上传记录</Typography>
      {loading ? <CircularProgress /> : (
        list.length === 0 ? (
          <Typography color="textSecondary">暂无历史上传</Typography>
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