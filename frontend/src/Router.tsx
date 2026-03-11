import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Layout } from './components/shared/Layout';

function WelcomePage() {
  return (
    <Box sx={{ py: 6, textAlign: 'center' }}>
      <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
        Welcome
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Sample App
      </Typography>
    </Box>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
