import React, { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useAuth } from '../../AuthProvider';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { authenticated, hasRole } = useAuth();

  if (!authenticated) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography color="text.secondary">Please sign in to access this page.</Typography>
      </Box>
    );
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" sx={{ color: '#ef4444', mb: 1 }}>Access Denied</Typography>
        <Typography color="text.secondary">
          You need the <strong>{requiredRole}</strong> role to access this page.
        </Typography>
      </Box>
    );
  }

  return <>{children}</>;
}
