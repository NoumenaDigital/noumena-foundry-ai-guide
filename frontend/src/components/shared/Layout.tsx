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
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import DiamondIcon from '@mui/icons-material/Diamond';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../AuthProvider';
import { useAppTheme } from '../../ThemeContext';

interface NavItem {
  label: string;
  path: string;
  icon?: React.ReactElement;
  opsOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Gold Bars', path: '/gold-bars', icon: <DiamondIcon sx={{ fontSize: 16 }} /> },
  { label: 'Register Bar', path: '/gold-bars/register', icon: <AddCircleOutlineIcon sx={{ fontSize: 16 }} />, opsOnly: true },
];

export function Layout({ children }: { children: ReactNode }) {
  const muiTheme = useTheme();
  const location = useLocation();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const { keycloak, authenticated, hasRole } = useAuth();
  const { mode, toggleTheme } = useAppTheme();
  const dark = mode === 'dark';

  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  const handleLogout = () => {
    keycloak?.logout({ redirectUri: window.location.origin });
    setUserMenuAnchor(null);
  };

  const isActive = (path: string) =>
    path === '/gold-bars'
      ? location.pathname === '/gold-bars' ||
        (location.pathname.startsWith('/gold-bars/') && location.pathname !== '/gold-bars/register')
      : location.pathname.startsWith(path);

  const visibleNavItems = navItems.filter((item) => !(item.opsOnly && !hasRole('ops')));

  const userEmail = keycloak?.tokenParsed?.email as string | undefined;

  // Nav link sx — matches nm-nav__link / nm-nav__link--active exactly
  const navLinkSx = (active: boolean) => ({
    fontSize: '0.875rem',
    fontWeight: active ? 600 : 500,
    color: active
      ? (dark ? '#0bd2a2' : '#120a4d')
      : (dark ? '#cbd5e1' : '#6b7280'),
    backgroundColor: active
      ? (dark ? 'rgba(11,210,162,0.12)' : 'rgba(18,10,77,0.05)')
      : 'transparent',
    borderRadius: 1,
    px: 1.5,
    py: 0.75,
    minWidth: 0,
    '&:hover': {
      color: dark ? '#0bd2a2' : '#120a4d',
      backgroundColor: dark ? 'rgba(11,210,162,0.08)' : '#f9fafb',
    },
  });

  // Icon button sx — matches nm-theme-toggle / nm-header__burger
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
      {/* Fixed top navigation — nm-header */}
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
          {/* Logo — nm-header__logo (color logo, invert only in dark) */}
          <Box
            component={RouterLink}
            to="/gold-bars"
            sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}
          >
            <Box
              component="img"
              src="/noumenadigitallogo.png"
              alt="Noumena Digital"
              sx={{
                height: 14,
                width: 'auto',
                filter: dark ? 'brightness(0) invert(1)' : 'none',
              }}
            />
          </Box>

          {/* Desktop nav links — nm-header__nav */}
          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, ml: 3 }}>
              {visibleNavItems.map((item) => (
                <Button
                  key={item.path}
                  component={RouterLink}
                  to={item.path}
                  startIcon={item.icon}
                  disableRipple={false}
                  sx={navLinkSx(isActive(item.path))}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          )}

          <Box sx={{ flex: 1 }} />

          {/* Theme toggle — nm-theme-toggle */}
          <Tooltip title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
            <IconButton onClick={toggleTheme} size="small" sx={iconBtnSx}>
              {dark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          {/* User menu or Sign In */}
          {authenticated ? (
            <Tooltip title={userEmail ?? 'Account'}>
              <IconButton
                onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                size="small"
                sx={iconBtnSx}
              >
                <AccountCircleIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : (
            <Button variant="contained" size="small" onClick={() => keycloak?.login()} sx={{ ml: 0.5 }}>
              Sign In
            </Button>
          )}

          {/* Mobile burger — nm-header__burger */}
          {isMobile && (
            <IconButton
              onClick={(e) => setMobileMenuAnchor(e.currentTarget)}
              size="small"
              sx={iconBtnSx}
            >
              <MenuIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
        </Toolbar>
      </AppBar>

      {/* Page content — nm-container equivalent */}
      <Box sx={{ maxWidth: '80rem', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        {children}
      </Box>

      {/* User dropdown */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={() => setUserMenuAnchor(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: { mt: 0.5, minWidth: 200, borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' },
        }}
      >
        {userEmail && (
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Signed in as
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>
              {userEmail}
            </Typography>
          </Box>
        )}
        {userEmail && <Divider />}
        <MenuItem onClick={handleLogout} sx={{ gap: 1.5, color: 'error.main', fontSize: '0.875rem' }}>
          <LogoutIcon fontSize="small" />
          Sign out
        </MenuItem>
      </Menu>

      {/* Mobile nav dropdown */}
      <Menu
        anchorEl={mobileMenuAnchor}
        open={Boolean(mobileMenuAnchor)}
        onClose={() => setMobileMenuAnchor(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: { mt: 0.5, minWidth: 200, borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
        }}
      >
        {visibleNavItems.map((item) => (
          <MenuItem
            key={item.path}
            component={RouterLink}
            to={item.path}
            onClick={() => setMobileMenuAnchor(null)}
            selected={isActive(item.path)}
            sx={{ gap: 1.5, fontSize: '0.875rem' }}
          >
            {item.icon}
            {item.label}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
