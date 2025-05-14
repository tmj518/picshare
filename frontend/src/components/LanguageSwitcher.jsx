import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, 
  Button, 
  Menu, 
  MenuItem, 
  Typography, 
  Divider, 
  TextField, 
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Tabs,
  Tab,
  Paper,
  Badge
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import LanguageIcon from '@mui/icons-material/Language';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import { supportedLanguages } from '../i18n';

// 语言分组
const languageGroups = {
  asia: ['zh', 'zh-TW', 'ja', 'ko', 'vi', 'th', 'ms', 'bn', 'ur', 'hi'],
  europe: ['en', 'es', 'fr', 'de', 'ru', 'pl', 'nl', 'tr'],
  middleEast: ['ar', 'fa', 'he'],
  africa: ['sw', 'ha'],
};

const LanguageSwitcher = () => {
  const { t, i18n } = useTranslation();
  const [anchorEl, setAnchorEl] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  
  // 获取当前语言信息
  const currentLanguage = supportedLanguages.find(lang => lang.code === i18n.language) || supportedLanguages[0];
  
  // 切换语言
  const handleChangeLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('picshare_language', langCode);
    setAnchorEl(null);
    setDialogOpen(false);
    
    // 对于RTL语言（如阿拉伯语）设置文档方向
    const selectedLang = supportedLanguages.find(lang => lang.code === langCode);
    if (selectedLang && selectedLang.dir === 'rtl') {
      document.documentElement.dir = 'rtl';
      document.body.style.textAlign = 'right';
    } else {
      document.documentElement.dir = 'ltr';
      document.body.style.textAlign = 'left';
    }
  };
  
  // 根据搜索和标签过滤语言
  const filteredLanguages = useMemo(() => {
    let filtered = supportedLanguages;
    
    // 根据搜索过滤
    if (searchQuery) {
      filtered = filtered.filter(lang => 
        lang.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lang.code.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // 根据标签过滤
    if (activeTab !== 'all') {
      const groupCodes = languageGroups[activeTab] || [];
      filtered = filtered.filter(lang => groupCodes.includes(lang.code));
    }
    
    return filtered;
  }, [searchQuery, activeTab]);
  
  // 常用语言（前6个）
  const commonLanguages = supportedLanguages.slice(0, 6);

  // 计算每个地区的语言数量
  const langCountByRegion = {
    all: supportedLanguages.length,
    asia: languageGroups.asia.length,
    europe: languageGroups.europe.length,
    middleEast: languageGroups.middleEast.length,
    africa: languageGroups.africa.length,
  };
  
  return (
    <>
      {/* 显示当前语言和下拉触发器 */}
      <Button
        onClick={(e) => setAnchorEl(e.currentTarget)}
        color="inherit"
        startIcon={<LanguageIcon />}
        endIcon={<KeyboardArrowDownIcon />}
        sx={{ 
          bgcolor: 'rgba(255,255,255,0.16)', 
          borderRadius: 2,
          px: 1.5, py: 0.5, 
          '&:hover': { bgcolor: 'rgba(255,255,255,0.24)', transform: 'scale(1.03)' }, 
          transition: 'all 0.18s'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 500, mr: 0.5 }}>
            {currentLanguage.flag}
          </Typography>
          <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
            {currentLanguage.nativeName}
          </Typography>
        </Box>
      </Button>
      
      {/* 简洁下拉菜单（常用语言） */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        PaperProps={{ sx: { mt: 1, width: 220, maxHeight: 350 } }}
      >
        {commonLanguages.map((lang) => (
          <MenuItem 
            key={lang.code} 
            onClick={() => handleChangeLanguage(lang.code)}
            selected={i18n.language === lang.code}
            sx={{ py: 1 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <Typography sx={{ fontSize: 16, mr: 1.5 }}>{lang.flag}</Typography>
              <Typography sx={{ flex: 1 }}>{lang.nativeName}</Typography>
              {i18n.language === lang.code && <CheckIcon fontSize="small" color="primary" sx={{ ml: 1 }} />}
            </Box>
          </MenuItem>
        ))}
        <Divider sx={{ my: 1 }} />
        <MenuItem onClick={() => { setDialogOpen(true); setAnchorEl(null); }}>
          <Typography color="primary" sx={{ width: '100%', textAlign: 'center' }}>
            {t('更多')} ({supportedLanguages.length - 6})
          </Typography>
        </MenuItem>
      </Menu>
      
      {/* 完整语言选择对话框 */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ pb: 1 }}>
          {t('语言设置')}
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            {t('选择您的首选语言')}
          </Typography>
          
          <TextField
            placeholder={t('搜索语言')}
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            variant="outlined"
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <CloseIcon 
                    fontSize="small" 
                    sx={{ cursor: 'pointer' }} 
                    onClick={() => setSearchQuery('')}
                  />
                </InputAdornment>
              ) : null
            }}
          />
          
          {/* 语言分类标签页 */}
          <Paper sx={{ mb: 2, borderRadius: 1 }}>
            <Tabs 
              value={activeTab} 
              onChange={(_, newValue) => setActiveTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{ 
                minHeight: 42,
                '& .MuiTab-root': { minHeight: 42, py: 0.5 },
              }}
            >
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography component="span">全部</Typography>
                    <Badge badgeContent={langCountByRegion.all} color="primary" sx={{ ml: 1 }} />
                  </Box>
                } 
                value="all" 
              />
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography component="span">亚洲</Typography>
                    <Badge badgeContent={langCountByRegion.asia} color="primary" sx={{ ml: 1 }} />
                  </Box>
                } 
                value="asia" 
              />
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography component="span">欧洲</Typography>
                    <Badge badgeContent={langCountByRegion.europe} color="primary" sx={{ ml: 1 }} />
                  </Box>
                } 
                value="europe" 
              />
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography component="span">中东</Typography>
                    <Badge badgeContent={langCountByRegion.middleEast} color="primary" sx={{ ml: 1 }} />
                  </Box>
                } 
                value="middleEast" 
              />
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography component="span">非洲</Typography>
                    <Badge badgeContent={langCountByRegion.africa} color="primary" sx={{ ml: 1 }} />
                  </Box>
                } 
                value="africa" 
              />
            </Tabs>
          </Paper>
          
          {filteredLanguages.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="textSecondary">
                没有找到匹配的语言
              </Typography>
            </Box>
          ) : (
            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
              {filteredLanguages.map((lang) => (
                <ListItem 
                  button 
                  key={lang.code}
                  onClick={() => handleChangeLanguage(lang.code)}
                  selected={i18n.language === lang.code}
                  sx={{ 
                    borderRadius: 1,
                    mb: 0.5,
                    '&.Mui-selected': { bgcolor: 'rgba(25, 118, 210, 0.08)' } 
                  }}
                >
                  <ListItemAvatar sx={{ minWidth: 40 }}>
                    <Typography sx={{ fontSize: 20 }}>{lang.flag}</Typography>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={lang.nativeName} 
                    secondary={lang.nativeName !== lang.name ? lang.name : null}
                    primaryTypographyProps={{ fontWeight: i18n.language === lang.code ? 600 : 400 }}
                  />
                  {i18n.language === lang.code && <CheckIcon color="primary" />}
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} color="inherit">
            {t('关闭')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default LanguageSwitcher; 