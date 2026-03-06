import React from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useAuth } from './AuthProvider';
import { AppRouter } from './Router';

export function App() {
  const { loading, error, authenticated, keycloak } = useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          gap: 2,
        }}
      >
        <CircularProgress color="primary" />
        <Typography variant="body2" color="text.secondary">
          Loading Gold Provenance...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          gap: 2,
          p: 3,
        }}
      >
        <Typography sx={{ color: 'error.main', fontWeight: 600 }}>
          Authentication Error
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {error}
        </Typography>
      </Box>
    );
  }

  if (!authenticated) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #120a4d 0%, #20127c 50%, #1a0f5a 100%)',
          gap: 3,
          p: 3,
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography variant="h4" sx={{ color: '#ffffff', fontWeight: 800, mb: 1 }}>
            Gold Provenance
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9375rem' }}>
            ESG Gold Fund Management
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          onClick={() => keycloak?.login()}
          sx={{
            backgroundColor: '#0bd2a2',
            color: '#120a4d',
            fontWeight: 700,
            px: 4,
            py: 1.5,
            fontSize: '1rem',
            '&:hover': { backgroundColor: '#09b88d' },
          }}
        >
          Sign In
        </Button>
      </Box>
    );
  }

  return <AppRouter />;
}
