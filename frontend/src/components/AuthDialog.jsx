import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Box, Snackbar, Alert } from '@mui/material';
import axios from 'axios';

const AuthDialog = ({ open, onClose, onLoginSuccess }) => {
  const [step, setStep] = useState(1); // 1: 输入邮箱 2: 输入验证码
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSendCode = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await axios.post('/api/auth/send-code', { email });
      setStep(2);
      setSuccess('验证码已发送，请查收邮箱');
    } catch (err) {
      setError(err.response?.data?.error || '验证码发送失败');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await axios.post('/api/auth/verify-code', { email, code });
      setSuccess('登录成功');
      setTimeout(() => {
        onLoginSuccess(res.data.user);
        onClose();
      }, 800);
    } catch (err) {
      setError(err.response?.data?.error || '验证码校验失败');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setEmail('');
    setCode('');
    setError('');
    setSuccess('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>登录 / 注册</DialogTitle>
      <DialogContent>
        {step === 1 && (
          <Box>
            <TextField
              label="邮箱地址"
              type="email"
              fullWidth
              margin="normal"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
            />
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              支持QQ邮箱、Gmail等主流邮箱
            </Typography>
          </Box>
        )}
        {step === 2 && (
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>验证码已发送至：{email}</Typography>
            <TextField
              label="验证码"
              fullWidth
              margin="normal"
              value={code}
              onChange={e => setCode(e.target.value)}
              disabled={loading}
            />
          </Box>
        )}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>取消</Button>
        {step === 1 && (
          <Button onClick={handleSendCode} variant="contained" disabled={loading || !email}>
            获取验证码
          </Button>
        )}
        {step === 2 && (
          <Button onClick={handleVerifyCode} variant="contained" disabled={loading || !code}>
            登录 / 注册
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AuthDialog; 