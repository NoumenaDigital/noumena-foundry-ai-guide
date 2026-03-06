import React, { ReactNode, useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../AuthProvider';
import { useAppTheme } from '../../ThemeContext';

export function Layout({ children }: { children: ReactNode }) {
  const { keycloak, authenticated } = useAuth();
  const { mode, toggleTheme } = useAppTheme();
  const dark = mode === 'dark';

  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  const handleLogout = () => {
    keycloak?.logout({ redirectUri: window.location.origin });
    setUserMenuAnchor(null);
  };

  const userEmail = keycloak?.tokenParsed?.email as string | undefined;

  const iconBtnSx = {
    color: dark ? '#94a3b8' : '#6b7280',
    borderRadius: 1,
    '&:hover': {
      color: dark ? '#0bd2a2' : '#120a4d',
      backgroundColor: dark ? 'rgba(11,210,162,0.08)' : '#f9fafb',
    },
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky">
        <Toolbar disableGutters sx={{ minHeight: '56px !important' }}>
          <Box
            sx={{
              maxWidth: '80rem',
              mx: 'auto',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: { xs: 2, sm: 3, lg: 4 },
              gap: 1,
            }}
          >
            <Box
              component={RouterLink}
              to="/"
              sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}
            >
              <Box
                component="img"
                src="/noumenadigitallogo.png"
                alt="Noumena Digital"
                sx={{ height: 14, width: 'auto', filter: dark ? 'brightness(0) invert(1)' : 'none' }}
              />
            </Box>

            <Box sx={{ flex: 1 }} />

            <Tooltip title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
              <IconButton onClick={toggleTheme} size="small" sx={iconBtnSx}>
                {dark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
              </IconButton>
            </Tooltip>

            {authenticated ? (
              <Tooltip title={userEmail ?? 'Account'}>
                <IconButton onClick={(e) => setUserMenuAnchor(e.currentTarget)} size="small" sx={iconBtnSx}>
                  <AccountCircleIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : (
              <Button variant="contained" size="small" onClick={() => keycloak?.login()} sx={{ ml: 0.5 }}>
                Sign In
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ maxWidth: '80rem', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        {children}
      </Box>

      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={() => setUserMenuAnchor(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{ sx: { mt: 0.5, minWidth: 200, borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' } }}
      >
        {userEmail && (
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="caption" color="text.secondary" display="block">Signed in as</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>{userEmail}</Typography>
          </Box>
        )}
        {userEmail && <Divider />}
        <MenuItem onClick={handleLogout} sx={{ gap: 1.5, color: 'error.main', fontSize: '0.875rem' }}>
          <LogoutIcon fontSize="small" />
          Sign out
        </MenuItem>
      </Menu>
    </Box>
  );
}
