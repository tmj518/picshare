import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardMedia, Typography, Box, IconButton, Tooltip, Button, Grid, Dialog, DialogTitle, DialogContent, Paper } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import ShareIcon from '@mui/icons-material/Share';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import axios from 'axios';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';

// 使用相对路径
const API_BASE_URL = '';

const ImageCard = ({ imageUrl, shortCode, fileName }) => {
  const [visitCount, setVisitCount] = useState('-');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [showCopyTip, setShowCopyTip] = useState(false);

  const shareUrl = `${window.location.origin}/i/${shortCode}`;

  useEffect(() => {
    // 获取访问量和统计数据
    axios.get(`/api/stats/${shortCode}`)
      .then(res => {
        setVisitCount(res.data?.stats?.totalVisits || 0);
        setStats(res.data?.stats || null);
      })
      .catch(() => setVisitCount('-'));
    // 获取二维码图片地址
    setQrCodeUrl(`/api/qrcode/${shortCode}`);
  }, [shortCode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setShowCopyTip(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleShareToWeChat = () => {
    // 微信分享需要在微信环境内，这里只显示二维码让用户扫码分享
    setShareDialogOpen(true);
  };

  const handleShareToQQ = () => {
    const qqShareUrl = `https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(fileName)}&pics=${encodeURIComponent(imageUrl)}`;
    window.open(qqShareUrl, '_blank');
  };

  const handleShareToFacebook = () => {
    const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(fbShareUrl, '_blank');
  };

  const handleShareToTwitter = () => {
    const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${fileName} ${shareUrl}`)}`;
    window.open(twitterShareUrl, '_blank');
  };

  const handleShareToX = () => {
    // X.com使用相同的分享URL格式
    const xShareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(`${fileName} ${shareUrl}`)}`;
    window.open(xShareUrl, '_blank');
  };

  const handleOpenStats = () => {
    setStatsDialogOpen(true);
  };

  return (
    <>
      <Card sx={{ 
        maxWidth: 320, 
        m: 2, 
        display: 'inline-block', 
        verticalAlign: 'top',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 6px 12px rgba(0,0,0,0.15)'
        }
      }}>
        <CardMedia
          component="img"
          height="180"
          image={imageUrl}
          alt={fileName}
          sx={{ objectFit: 'contain', bgcolor: '#fafafa' }}
        />
        <CardContent>
          <Typography variant="subtitle1" noWrap>{fileName}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <Typography variant="body2" sx={{ flex: 1 }}>
              访问量: {visitCount}
            </Typography>
            <Tooltip title="查看详细统计">
              <IconButton onClick={handleOpenStats} size="small">
                <AnalyticsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={copied ? '已复制' : '复制短链接'}>
              <Button
                variant="outlined"
                color={copied ? 'success' : 'primary'}
                size="small"
                sx={{ ml: 1, minWidth: 90, fontWeight: 600, borderRadius: 2, fontSize: 15, px: 2, py: 0.5,
                  bgcolor: copied ? '#e8f5e9' : '#e3f2fd',
                  '&:hover': { bgcolor: copied ? '#c8e6c9' : '#bbdefb', color: '#0d47a1', borderColor: '#1976d2' },
                  transition: 'all 0.18s',
                }}
                onClick={handleCopy}
                startIcon={<ContentCopyIcon fontSize="small" />}
              >
                {copied ? '已复制' : '复制短链'}
              </Button>
            </Tooltip>
          </Box>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            <a href={shareUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#3f51b5' }}>
              {window.location.host}/i/{shortCode}
            </a>
          </Typography>
          
          {/* 二维码区域 */}
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, mb: 1 }}>
            <Paper elevation={1} sx={{ p: 0.5, borderRadius: 1, cursor: 'pointer' }} onClick={() => setQrDialogOpen(true)}>
              <img src={qrCodeUrl} alt="二维码" style={{ width: 48, height: 48 }} />
            </Paper>
            <Typography variant="body2" color="textSecondary" sx={{ ml: 1 }}>扫码分享</Typography>
          </Box>
          
          {/* 社交分享按钮 */}
          <Grid container spacing={1} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Button 
                fullWidth 
                variant="contained" 
                startIcon={<ShareIcon />}
                sx={{ bgcolor: '#3f51b5', color: 'white' }}
                onClick={() => setShareDialogOpen(true)}
              >
                一键分享
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 分享对话框 */}
      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)}>
        <DialogTitle>分享到社交媒体</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1, p: 1 }}>
            <Grid item xs={6}>
              <Button 
                fullWidth 
                variant="contained" 
                color="success"
                onClick={handleShareToWeChat}
                sx={{ p: 1 }}
              >
                微信
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button 
                fullWidth 
                variant="contained" 
                color="primary"
                onClick={handleShareToQQ}
                sx={{ p: 1 }}
              >
                QQ
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button 
                fullWidth 
                variant="contained" 
                sx={{ bgcolor: '#1877F2', color: 'white', p: 1 }}
                onClick={handleShareToFacebook}
                startIcon={<FacebookIcon />}
              >
                Facebook
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button 
                fullWidth 
                variant="contained" 
                sx={{ bgcolor: '#000000', color: 'white', p: 1 }}
                onClick={handleShareToX}
                startIcon={<TwitterIcon />}
              >
                X.com
              </Button>
            </Grid>
            <Grid item xs={12} sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
                <Paper elevation={2} sx={{ p: 1, borderRadius: 2, mb: 1 }}>
                  <img src={qrCodeUrl} alt="二维码" style={{ width: 120, height: 120 }} />
                </Paper>
                <Typography variant="body2">扫描二维码在微信中分享</Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', mt: 2 }}>
                <Typography variant="body2" sx={{ flex: 1, p: 1, border: '1px solid #eee', borderRadius: 1 }}>
                  {shareUrl}
                </Typography>
                <Button 
                  variant="outlined" 
                  sx={{ ml: 1 }}
                  onClick={handleCopy}
                >
                  {copied ? '已复制' : '复制'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
      </Dialog>

      {/* 数据统计对话框 */}
      <Dialog open={statsDialogOpen} onClose={() => setStatsDialogOpen(false)}>
        <DialogTitle>访问数据统计</DialogTitle>
        <DialogContent>
          {stats ? (
            <Box sx={{ p: 1 }}>
              <Typography variant="h6">总览</Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body1">总访问量</Typography>
                    <Typography variant="h4">{stats.totalVisits || 0}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body1">独立访客</Typography>
                    <Typography variant="h4">{stats.uniqueVisitors || 0}</Typography>
                  </Paper>
                </Grid>

                {stats.countries && stats.countries.length > 0 && (
                  <Grid item xs={12} sx={{ mt: 2 }}>
                    <Typography variant="h6">访问国家/地区</Typography>
                    {stats.countries.map((country, index) => (
                      <Box key={index} sx={{ display: 'flex', mt: 1 }}>
                        <Typography variant="body2" sx={{ flex: 1 }}>{country.code}</Typography>
                        <Typography variant="body2">{country.count}次</Typography>
                      </Box>
                    ))}
                  </Grid>
                )}

                {stats.devices && stats.devices.length > 0 && (
                  <Grid item xs={12} sx={{ mt: 2 }}>
                    <Typography variant="h6">设备类型</Typography>
                    {stats.devices.map((device, index) => (
                      <Box key={index} sx={{ display: 'flex', mt: 1 }}>
                        <Typography variant="body2" sx={{ flex: 1 }}>{device.type}</Typography>
                        <Typography variant="body2">{device.count}次</Typography>
                      </Box>
                    ))}
                  </Grid>
                )}

                {stats.referrers && stats.referrers.length > 0 && (
                  <Grid item xs={12} sx={{ mt: 2 }}>
                    <Typography variant="h6">流量来源</Typography>
                    {stats.referrers.map((referrer, index) => (
                      <Box key={index} sx={{ display: 'flex', mt: 1 }}>
                        <Typography variant="body2" sx={{ flex: 1 }}>{referrer.domain}</Typography>
                        <Typography variant="body2">{referrer.count}次</Typography>
                      </Box>
                    ))}
                  </Grid>
                )}
              </Grid>
            </Box>
          ) : (
            <Typography variant="body1">暂无访问数据</Typography>
          )}
        </DialogContent>
      </Dialog>

      {/* 二维码放大弹窗 */}
      <Dialog open={qrDialogOpen} onClose={() => setQrDialogOpen(false)} maxWidth="xs">
        <DialogContent sx={{ p: 2, textAlign: 'center', bgcolor: '#222' }}>
          <img src={qrCodeUrl} alt="二维码大图" style={{ width: 220, height: 220, margin: '0 auto', background: '#fff', borderRadius: 8 }} />
          <Typography variant="body2" color="#fff" sx={{ mt: 2 }}>长按或扫码分享</Typography>
        </DialogContent>
      </Dialog>

      <Snackbar open={showCopyTip} autoHideDuration={1800} onClose={() => setShowCopyTip(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <MuiAlert onClose={() => setShowCopyTip(false)} severity="success" sx={{ width: '100%' }}>
          短链已复制到剪贴板！
        </MuiAlert>
      </Snackbar>
    </>
  );
};

export default ImageCard; 