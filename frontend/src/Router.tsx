import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/shared/Layout';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import { GoldBarOverview } from './components/overview-pages/GoldBarOverview';
import { GoldBarDetail } from './components/detail-pages/GoldBarDetail';
import { RegisterGoldBar } from './components/creation-forms/RegisterGoldBar';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/gold-bars" replace />} />
          <Route path="/gold-bars" element={<GoldBarOverview />} />
          <Route path="/gold-bars/:id" element={<GoldBarDetail />} />
          <Route
            path="/gold-bars/register"
            element={
              <ProtectedRoute requiredRole="ops">
                <RegisterGoldBar />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/gold-bars" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
