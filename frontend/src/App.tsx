import React from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
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
          Loading Sample App...
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
          background: 'radial-gradient(circle at 20% 20%, #2b1f8b 0%, #120a4d 35%, #0d073a 100%)',
          p: { xs: 2, md: 4 },
        }}
      >
        <Card
          sx={{
            width: '100%',
            maxWidth: 1024,
            borderRadius: 3,
            border: '1px solid rgba(255,255,255,0.12)',
            bgcolor: 'rgba(9, 6, 39, 0.78)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 5 } }}>
            <Stack spacing={2} sx={{ mb: 3 }}>
              <Chip
                label="Sample Platform"
                sx={{
                  alignSelf: 'flex-start',
                  color: '#0bd2a2',
                  border: '1px solid rgba(11,210,162,0.45)',
                  bgcolor: 'rgba(11,210,162,0.08)',
                  fontWeight: 600,
                }}
              />
              <Typography variant="h3" sx={{ color: '#fff', fontWeight: 800, lineHeight: 1.1 }}>
                Sample App
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.74)', maxWidth: 760 }}>
                Track the full lifecycle of every product from registration to review, approval,
                audit, client acknowledgement, and retirement in one auditable workflow.
              </Typography>
            </Stack>

            <Grid container spacing={2.5} sx={{ mb: 4 }}>
              {[
                {
                  title: 'Role-based governance',
                  description: 'Manager, compliance officer, custodian, auditor, and client role separation.',
                },
                {
                  title: 'Immutable audit trail',
                  description: 'Each state transition and governance action is recorded on the product timeline.',
                },
                {
                  title: 'Allocation readiness',
                  description: 'Clear progression from draft to reviewed, approved, and lifecycle retirement.',
                },
              ].map((item) => (
                <Grid item xs={12} md={4} key={item.title}>
                  <Box
                    sx={{
                      height: '100%',
                      p: 2,
                      borderRadius: 2,
                      border: '1px solid rgba(255,255,255,0.1)',
                      bgcolor: 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <Typography sx={{ color: '#fff', fontWeight: 700, mb: 0.75 }}>
                      {item.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.68)' }}>
                      {item.description}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => keycloak?.login()}
                sx={{
                  backgroundColor: '#0bd2a2',
                  color: '#120a4d',
                  fontWeight: 700,
                  px: 4,
                  py: 1.25,
                  fontSize: '1rem',
                  '&:hover': { backgroundColor: '#09b88d' },
                }}
              >
                Sign In
              </Button>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)' }}>
                Use your provisioned role account to access the workflow dashboard.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return <AppRouter />;
}
