import React, { useState, useEffect, useRef } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Container, 
  Box, 
  Button, 
  IconButton,
  CssBaseline,
  ThemeProvider,
  createTheme,
  Paper,
  Grid,
  Avatar,
  Menu,
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import GitHubIcon from '@mui/icons-material/GitHub';
import TwitterIcon from '@mui/icons-material/Twitter';
import LanguageIcon from '@mui/icons-material/Language';
import HomeIcon from '@mui/icons-material/Home';
import UploadArea from './components/UploadArea';
import AuthDialog from './components/AuthDialog';
import History from './pages/History';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import HistoryIcon from '@mui/icons-material/History';
import ImageCard from './components/ImageCard';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import XIcon from '@mui/icons-material/Twitter';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import PaletteIcon from '@mui/icons-material/Palette';
import CloseIcon from '@mui/icons-material/Close';
import Fab from '@mui/material/Fab';
import Zoom from '@mui/material/Zoom';
import Slide from '@mui/material/Slide';
import Fade from '@mui/material/Fade';
import Grow from '@mui/material/Grow';
import ChatIcon from '@mui/icons-material/Chat';
import LanguageSwitcher from './components/LanguageSwitcher';

// 创建自定义主题
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#fb8c00',
    },
    background: {
      default: '#f5f5f5',
      paper: '#fff',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      // 添加对不同语言脚本的字体支持
      '"Noto Sans"',
      '"Noto Sans SC"', // 简体中文
      '"Noto Sans TC"', // 繁体中文
      '"Noto Sans JP"', // 日语
      '"Noto Sans KR"', // 韩语
      '"Noto Sans Arabic"', // 阿拉伯语
      '"Noto Sans Hebrew"', // 希伯来语
      '"Noto Sans Thai"', // 泰语
      '"Noto Sans Devanagari"', // 印地语等北印度语系
      '"Noto Sans Bengali"', // 孟加拉语
      '"Noto Sans Urdu"', // 乌尔都语
      '"Noto Sans Persian"', // 波斯语
      '"Noto Sans Russian"', // 俄语
      '"Noto Sans Malayalam"', // 马拉雅拉姆语
      '"Noto Sans Tamil"', // 泰米尔语
      '"Noto Sans Georgian"', // 格鲁吉亚语
      '"Noto Sans Armenian"', // 亚美尼亚语
      '"Noto Sans Ethiopic"', // 埃塞俄比亚语系
    ].join(','),
    h4: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

function App() {
  const [platformStats, setPlatformStats] = useState({
    totalUploads: 0,
    startDate: '2023年1月1日'
  });
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [page, setPage] = useState('home'); // 'home' or 'history'
  const [latestImages, setLatestImages] = useState([]);
  const latestImagesRef = useRef([]);
  const { t, i18n } = useTranslation();
  const [previewImg, setPreviewImg] = useState(null); // 放大预览图片
  const [themeMode, setThemeMode] = useState(localStorage.getItem('picshare_theme') || 'pattern'); // 'clean', 'pattern', 'gradient'
  const [themePickerOpen, setThemePickerOpen] = useState(false);

  useEffect(() => {
    // 这里可以添加获取平台统计数据的API调用
    // 暂时使用模拟数据
    setPlatformStats({
      totalUploads: 12385,
      startDate: '2023年1月1日'
    });
    // 检查本地登录状态
    const saved = localStorage.getItem('picshare_user');
    if (saved) setUser(JSON.parse(saved));
    localStorage.setItem('picshare_theme', themeMode);
  }, []);

  // 上传成功后，更新最新上传图片
  const handleUploadSuccess = (count = 1, images = []) => {
    setPlatformStats(stats => ({
      ...stats,
      totalUploads: stats.totalUploads + count
    }));
    if (images && images.length > 0) {
      // 只保留最新8张
      latestImagesRef.current = [...images, ...latestImagesRef.current].slice(0, 8);
      setLatestImages([...latestImagesRef.current]);
    }
  };

  // 登录成功回调
  const handleLoginSuccess = (userInfo) => {
    setUser(userInfo);
    localStorage.setItem('picshare_user', JSON.stringify(userInfo));
  };

  // 退出登录
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('picshare_user');
    setAnchorEl(null);
  };

  // 右侧"最新上传"区内容
  const renderLatestImages = () => (
    latestImages.length === 0 ? (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 3, px: 2 }}>
        <ImageOutlinedIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2, opacity: 0.6 }} />
        <Typography variant="body1" color="textSecondary" sx={{ textAlign: 'center', fontWeight: 500, mb: 1 }}>
          {t('暂无最近上传记录')}
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', maxWidth: 240, mb: 2 }}>
          {t('点击顶部"浏览图像"按钮或拖拽图片到上传区域开始分享吧！')}
        </Typography>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<CloudUploadOutlinedIcon />}
          sx={{ mt: 1, borderRadius: 2 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          {t('立即上传')}
        </Button>
      </Box>
    ) : (
      <Box sx={{ width: '100%' }}>
        {latestImages.map((img, idx) => (
          <Paper key={img.shortCode || idx} sx={{ mb: 2, p: 1.5, display: 'flex', alignItems: 'center', boxShadow: 1 }}>
            <Box sx={{ width: 56, height: 56, mr: 2, flexShrink: 0, borderRadius: 1, overflow: 'hidden', bgcolor: '#fafafa', border: '1px solid #eee', cursor: 'pointer' }} onClick={() => setPreviewImg(img)}>
              <img src={img.imageUrl} alt={img.fileName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>{img.fileName}</Typography>
              <Typography variant="caption" color="textSecondary" noWrap>
                <a href={window.location.origin + '/i/' + img.shortCode} target="_blank" rel="noopener noreferrer">
                  {window.location.host + '/i/' + img.shortCode}
                </a>
              </Typography>
            </Box>
            <Button size="small" variant="outlined" sx={{ ml: 1, minWidth: 36 }} onClick={() => navigator.clipboard.writeText(window.location.origin + '/i/' + img.shortCode)}>
              {t('一键分享')}
            </Button>
          </Paper>
        ))}
      </Box>
    )
  );

  // 背景主题样式映射
  const bgThemes = {
    clean: {
      bgcolor: '#f8f8f8',
      backgroundImage: 'none',
    },
    pattern: {
      bgcolor: '#f5f5f5',
      backgroundImage: 'repeating-linear-gradient(135deg, #ececec 0 2px, transparent 2px 40px)',
      backgroundSize: '40px 40px',
    },
    gradient: {
      bgcolor: '#f5f8fa',
      backgroundImage: 'linear-gradient(135deg, #f8f9fa 0%, #e9f2f9 100%)',
    }
  };

  // 主题选择组件
  const renderThemePicker = () => (
    <Slide in={themePickerOpen} direction="up">
      <Paper sx={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1400, borderRadius: 3, boxShadow: 4, p: 2, width: { xs: '90%', sm: '400px' } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
            <PaletteIcon sx={{ mr: 1 }} /> 背景主题
          </Typography>
          <IconButton size="small" onClick={() => setThemePickerOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <Paper 
              elevation={themeMode === 'clean' ? 4 : 1} 
              sx={{ 
                p: 1, 
                height: 80, 
                cursor: 'pointer', 
                bgcolor: '#f8f8f8',
                border: themeMode === 'clean' ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
                transition: 'all 0.2s'
              }}
              onClick={() => setThemeMode('clean')}
            >
              <Typography variant="body2" textAlign="center" sx={{ mt: 3 }}>纯色</Typography>
            </Paper>
          </Grid>
          <Grid item xs={4}>
            <Paper 
              elevation={themeMode === 'pattern' ? 4 : 1} 
              sx={{ 
                p: 1, 
                height: 80, 
                cursor: 'pointer',
                bgcolor: '#f5f5f5',
                backgroundImage: 'repeating-linear-gradient(135deg, #ececec 0 2px, transparent 2px 40px)',
                backgroundSize: '40px 40px',
                border: themeMode === 'pattern' ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
                transition: 'all 0.2s'
              }}
              onClick={() => setThemeMode('pattern')}
            >
              <Typography variant="body2" textAlign="center" sx={{ mt: 3 }}>点纹</Typography>
            </Paper>
          </Grid>
          <Grid item xs={4}>
            <Paper 
              elevation={themeMode === 'gradient' ? 4 : 1} 
              sx={{ 
                p: 1, 
                height: 80, 
                cursor: 'pointer',
                bgcolor: '#f5f8fa',
                backgroundImage: 'linear-gradient(135deg, #f8f9fa 0%, #e9f2f9 100%)',
                border: themeMode === 'gradient' ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
                transition: 'all 0.2s'
              }}
              onClick={() => setThemeMode('gradient')}
            >
              <Typography variant="body2" textAlign="center" sx={{ mt: 3 }}>渐变</Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Slide>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* 应用选中的背景主题 */}
      <Box sx={{
        minHeight: '100vh',
        ...bgThemes[themeMode],
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* 顶部黑色导航栏 */}
        <AppBar position="static" color="primary" elevation={0} sx={{ minHeight: 60 }}>
          <Toolbar sx={{ minHeight: 60, px: 2 }}>
            {/* LOGO区强化 */}
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, bgcolor: 'white', borderRadius: 1.5, mr: 1 }}>
                <ImageIcon sx={{ fontSize: 24, color: 'primary.main', transform: 'scale(1.2)' }} />
              </Box>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, letterSpacing: 0.6, fontSize: { xs: 18, md: 22 }, textTransform: 'none' }}>
                PicShare
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1 }} />
            {/* 历史上传按钮 */}
            <Button sx={{ fontWeight: 700, mr: 2, px: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.16)', color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.24)', transform: 'scale(1.06)' },
              transition: 'all 0.18s',
            }} onClick={() => setPage('history')} disabled={!user} startIcon={<HistoryIcon />}>
              {t('历史上传')}
            </Button>
            {/* 语言切换器 */}
            <LanguageSwitcher />
            {/* 社交图标 */}
            <IconButton sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' } }} href="https://twitter.com" target="_blank">
              <TwitterIcon />
            </IconButton>
            <IconButton sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' } }} href="https://github.com" target="_blank">
              <GitHubIcon />
            </IconButton>
            {/* 用户/登录按钮 */}
            {user ? (
              <>
                <Button color="inherit" onClick={e => setAnchorEl(e.currentTarget)} startIcon={<Avatar sx={{ width: 24, height: 24, bgcolor: 'secondary.main' }}>{user.email[0].toUpperCase()}</Avatar>}>
                  {user.email}
                </Button>
                <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                  <MenuItem onClick={handleLogout}>{t('退出登录')}</MenuItem>
                </Menu>
              </>
            ) : (
              <Button color="inherit" onClick={() => setAuthOpen(true)} sx={{ ml: 2, fontWeight: 600, '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' } }}>{t('登录 / 注册')}</Button>
            )}
          </Toolbar>
        </AppBar>
        <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} onLoginSuccess={handleLoginSuccess} />
        
        <Container maxWidth="lg" sx={{ mt: { xs: 4, md: 10 }, mb: 4, flexGrow: 1 }}>
          {page === 'home' && (
            <>
              {/* 上传区顶部横向居中 */}
              <Fade in={true} timeout={800}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', mb: { xs: 4, md: 7 } }}>
                  <UploadArea onUploadSuccess={handleUploadSuccess} user={user} />
                </Box>
              </Fade>
              {/* 下方两栏布局，响应式优化 */}
              <Fade in={true} timeout={1000} style={{ transitionDelay: '200ms' }}>
                <Grid container spacing={{ xs: 2, md: 5 }} justifyContent="center" alignItems="flex-start">
                  {/* 左侧统计区 */}
                  <Grid item xs={12} md={5} lg={4}>
                    <Grow in={true} timeout={800} style={{ transformOrigin: '0 0 0' }}>
                      <Paper sx={{ p: { xs: 2, md: 4 }, textAlign: 'center', bgcolor: '#f9f9f9', borderRadius: 4, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', mb: { xs: 3, md: 0 } }}>
                        <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: 'primary.main', fontSize: { xs: 22, md: 32 } }}>
                          {platformStats.totalUploads.toLocaleString()}
                        </Typography>
                        <Typography variant="body1" color="textSecondary" sx={{ fontSize: { xs: 14, md: 18 }, mt: 1 }}>
                          {t('上传的图片')}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 2, fontSize: { xs: 12, md: 15 } }}>
                          {t('从{{date}}开始', { date: platformStats.startDate })}
                        </Typography>
                        {/* 社交按钮区 */}
                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
                          <Button variant="outlined" color="primary" startIcon={<XIcon />} size="small" sx={{ borderRadius: 2, fontWeight: 600 }} href={`https://x.com/intent/tweet?text=${encodeURIComponent('我正在使用PicShare分享图片，快来试试吧！'+ window.location.origin)}`} target="_blank">
                            分享到X
                          </Button>
                          <Button variant="outlined" color="primary" startIcon={<ChatIcon />} size="small" sx={{ borderRadius: 2, fontWeight: 600 }} href={`https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(window.location.origin)}&title=${encodeURIComponent('PicShare图片分享平台')}&desc=${encodeURIComponent('一个简单、快速的图片分享平台')}`} target="_blank">
                            分享到QQ
                          </Button>
                        </Box>
                      </Paper>
                    </Grow>
                  </Grid>
                  {/* 右侧最近上传区 */}
                  <Grid item xs={12} md={7} lg={6}>
                    <Grow in={true} timeout={800} style={{ transformOrigin: '0 0 0', transitionDelay: '150ms' }}>
                      <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 4, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
                        <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: 15, md: 20 } }}>
                          {t('最近上传')}
                        </Typography>
                        <Box sx={{ mt: 1, maxHeight: { xs: 220, md: 340 }, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          {renderLatestImages()}
                        </Box>
                      </Paper>
                    </Grow>
                  </Grid>
                </Grid>
              </Fade>
            </>
          )}
          {page === 'history' && (
            <Fade in={true} timeout={600}>
              <Box>
                <History user={user} />
              </Box>
            </Fade>
          )}
        </Container>
        
        <Box component="footer" sx={{ py: 3, px: 2, mt: 'auto', backgroundColor: (theme) => theme.palette.grey[100] }}>
          <Container maxWidth="lg">
            <Typography variant="body2" color="textSecondary" align="center">
              {'© '}
              {new Date().getFullYear()}
              {' PicShare - 简单、快速的图片分享平台'}
            </Typography>
          </Container>
        </Box>
        
        {/* 悬浮主题切换按钮 */}
        <Zoom in={true}>
          <Fab 
            color="primary" 
            size="medium" 
            aria-label="背景主题" 
            sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1300 }}
            onClick={() => setThemePickerOpen(!themePickerOpen)}
          >
            <PaletteIcon />
          </Fab>
        </Zoom>
        
        {/* 主题选择器 */}
        {renderThemePicker()}
      </Box>
      {/* 图片放大预览弹窗 */}
      <Dialog open={!!previewImg} onClose={() => setPreviewImg(null)} maxWidth="md">
        <DialogContent sx={{ p: 0, bgcolor: '#222' }}>
          {previewImg && (
            <img src={previewImg.imageUrl} alt={previewImg.fileName} style={{ maxWidth: '90vw', maxHeight: '80vh', display: 'block', margin: '0 auto' }} />
          )}
        </DialogContent>
      </Dialog>
    </ThemeProvider>
  );
}

export default App;