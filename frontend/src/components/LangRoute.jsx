import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { supportedLanguages } from '../i18n';

// 语言路由处理组件
const LangRoute = ({ children }) => {
  const { i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  
  // 从URL路径中提取语言代码
  useEffect(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const langParam = pathSegments[0];
    
    // 检查URL中的第一个片段是否为有效的语言代码
    const isValidLang = supportedLanguages.some(lang => lang.code === langParam);
    
    if (isValidLang) {
      // 如果URL中有语言代码且与当前不同，则更新语言
      if (i18n.language !== langParam) {
        i18n.changeLanguage(langParam);
        localStorage.setItem('picshare_language', langParam);
      }
    } else {
      // 如果URL中没有语言代码，则将当前语言添加到URL中
      const newPath = `/${i18n.language}${location.pathname}`;
      navigate(newPath, { replace: true });
    }
  }, [location.pathname, i18n, navigate]);
  
  // 语言改变时更新URL
  useEffect(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const langParam = pathSegments[0];
    const isValidLang = supportedLanguages.some(lang => lang.code === langParam);
    
    if (isValidLang && langParam !== i18n.language) {
      // 替换URL中的语言代码
      const newPath = `/${i18n.language}${location.pathname.substring(langParam.length + 1)}`;
      navigate(newPath, { replace: true });
    }
  }, [i18n.language, location.pathname, navigate]);
  
  // 语言标记为HTML文档
  useEffect(() => {
    // 设置HTML的lang属性
    document.documentElement.lang = i18n.language;
    
    // 为阿拉伯语等RTL语言设置方向
    const currentLang = supportedLanguages.find(lang => lang.code === i18n.language);
    if (currentLang && currentLang.dir === 'rtl') {
      document.documentElement.dir = 'rtl';
      document.body.style.textAlign = 'right';
    } else {
      document.documentElement.dir = 'ltr';
      document.body.style.textAlign = 'left';
    }
    
    // 添加备用语言链接用于SEO
    const existingAlternateLinks = document.querySelectorAll('link[rel="alternate"]');
    existingAlternateLinks.forEach(link => link.remove());
    
    supportedLanguages.forEach(lang => {
      if (lang.code !== i18n.language) {
        const link = document.createElement('link');
        link.rel = 'alternate';
        link.hreflang = lang.code;
        
        // 构建备用URL
        const pathSegments = location.pathname.split('/').filter(Boolean);
        const langInUrl = supportedLanguages.some(l => l.code === pathSegments[0]);
        const path = langInUrl 
          ? location.pathname.substring(pathSegments[0].length + 1) || '/'
          : location.pathname;
          
        link.href = `${window.location.origin}/${lang.code}${path}`;
        document.head.appendChild(link);
      }
    });
    
    // 添加规范链接
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const langInUrl = supportedLanguages.some(l => l.code === pathSegments[0]);
    const path = langInUrl 
      ? location.pathname
      : `/${i18n.language}${location.pathname}`;
      
    canonicalLink.href = `${window.location.origin}${path}`;
    
  }, [i18n.language, location.pathname]);
  
  return <>{children}</>;
};

export default LangRoute; 