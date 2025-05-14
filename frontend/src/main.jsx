import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LangRoute from './components/LangRoute';

// 添加Noto Sans系列字体支持多语言（可选，需要在index.html中添加相应的link标签）
// 也可以使用Google Fonts或其他CDN

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LangRoute>
        <Routes>
          <Route path="/*" element={<App />} />
          <Route path="/:lang/*" element={<App />} />
        </Routes>
      </LangRoute>
    </BrowserRouter>
  </React.StrictMode>,
);