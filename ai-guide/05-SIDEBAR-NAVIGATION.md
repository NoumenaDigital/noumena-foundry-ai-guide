# 05 - Sidebar Navigation Generation

## ⚠️ PREREQUISITE: API Client Must Exist

**This guide is for PHASE 3 of the development workflow.**

Before starting this guide, verify the API client has been generated:

```bash
# Verify generated files exist
ls frontend/src/generated/
# ✅ Should see: api.ts, models/

# If missing, go back to 04-FRONTEND-SETUP.md and generate the API client first!
```

**❌ DO NOT proceed if `src/generated/api.ts` does not exist.**

---

## Overview

The sidebar navigation should be **protocol-centric** and organized by **packages**. Each package becomes a menu section, and each protocol within a package becomes a sub-menu item.

## Structure

```
Sidebar
├── Dashboard (role-based)
├── Package 1
│   ├── Protocol A Overview
│   ├── Protocol B Overview
│   └── Protocol C Overview
├── Package 2
│   ├── Protocol D Overview
│   └── Protocol E Overview
└── ...
```

## Generation Steps

### Step 1: Analyze NPL Packages

Scan the NPL codebase and identify:
1. All packages containing `@api` protocols
2. All `@api` protocols within each package
3. Protocol names (for menu labels)

**Example:**
```
npl/src/main/npl-1.0/
├── dogtraining/
│   ├── DogTraining.npl      # @api protocol
│   └── Trainer.npl          # @api protocol
└── scheduling/
    └── TrainingSession.npl  # @api protocol
```

### Step 2: Create Navigation Structure

Generate navigation items based on packages:

```typescript
interface NavigationItem {
  path: string;
  label: string;
  icon: React.ReactElement;
  children?: NavigationItem[];
}

// Example structure
const navigationItems: NavigationItem[] = [
  {
    path: '/dogtraining',
    label: 'Dog Training',
    icon: <Pets />,
    children: [
      {
        path: '/dogtraining/dogs',
        label: 'Dogs',
        icon: <Pets />
      },
      {
        path: '/dogtraining/trainers',
        label: 'Trainers',
        icon: <People />
      }
    ]
  },
  {
    path: '/scheduling',
    label: 'Scheduling',
    icon: <CalendarToday />,
    children: [
      {
        path: '/scheduling/sessions',
        label: 'Training Sessions',
        icon: <Event />
      }
    ]
  }
];
```

### Step 3: Generate Sidebar Component

Create `src/components/shared/SidebarNavigation.tsx`:

**Key Features:**
- **Collapsible sidebar** - Can be collapsed to show only icons (64px width)
- **Collapsible sections** for packages with sub-menu items
- **Sub-menu items** for protocols
- **Role-based visibility** (optional)
- **Active route highlighting**
- **Responsive design** - Mobile drawer for small screens
- **User menu** with logout functionality
- **Theme toggle** and **language switcher** in footer

**Template Structure:**

```typescript
import React, { useState } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Box,
  Typography,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  Divider,
  Menu,
  MenuItem,
  Avatar,
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  Menu as MenuIcon,
  ChevronLeft,
  AccountCircle,
  ExitToApp,
  // Add icons for each package
} from '@mui/icons-material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useKeycloak } from '@react-keycloak/web';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';

interface NavigationItem {
  path: string;
  label: string;
  icon: React.ReactElement;
  children?: NavigationItem[];
}

const DRAWER_WIDTH = 280;
const DRAWER_WIDTH_COLLAPSED = 64;

export const SidebarNavigation: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useTheme();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { keycloak } = useKeycloak();
  const { t } = useTranslation();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  // Don't render sidebar if user is not authenticated
  if (!keycloak?.authenticated) {
    return <>{children}</>;
  }

  // Generate navigation items from packages
  const navigationItems: NavigationItem[] = [
    // Add your navigation items here
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleCollapseToggle = () => {
    setCollapsed(!collapsed);
  };

  const handleSectionToggle = (sectionKey: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const handleUserMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = () => {
    keycloak.logout({ redirectUri: window.location.origin });
    handleUserMenuClose();
  };

  const isActivePath = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const renderNavigationItem = (item: NavigationItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isActive = isActivePath(item.path);
    const sectionKey = item.path.replace('/', '').replace('-', '') || 'home';

    if (hasChildren) {
      const isOpen = openSections[sectionKey] || false;
      
      return (
        <React.Fragment key={item.path}>
          <ListItem disablePadding>
            <Box sx={{ display: 'flex', width: '100%' }}>
              {/* Main title - clickable to navigate */}
              <ListItemButton
                component={RouterLink}
                to={item.path}
                sx={{
                  pl: collapsed ? 1.5 : 2 + level * 2,
                  pr: 1,
                  minHeight: 48,
                  color: theme.palette.common.white,
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                  '&:hover': {
                    backgroundColor: isActive 
                      ? 'rgba(255, 255, 255, 0.25)' 
                      : 'rgba(255, 255, 255, 0.1)'
                  },
                  flex: 1,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                }}
              >
                <ListItemIcon 
                  sx={{ 
                    minWidth: collapsed ? 0 : 40, 
                    color: theme.palette.common.white,
                    justifyContent: 'center'
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {!collapsed && (
                  <>
                    <ListItemText 
                      primary={item.label}
                      sx={{
                        '& .MuiListItemText-primary': {
                          fontWeight: 600,
                          color: theme.palette.common.white
                        }
                      }}
                    />
                    <ListItemButton
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSectionToggle(sectionKey);
                      }}
                      sx={{
                        minWidth: 48,
                        maxWidth: 48,
                        minHeight: 48,
                        color: theme.palette.common.white,
                        p: 0,
                      }}
                    >
                      {isOpen ? <ExpandLess /> : <ExpandMore />}
                    </ListItemButton>
                  </>
                )}
              </ListItemButton>
            </Box>
          </ListItem>
          {!collapsed && (
            <Collapse in={isOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {item.children?.map((child) => renderNavigationItem(child, level + 1))}
              </List>
            </Collapse>
          )}
        </React.Fragment>
      );
    }

    return (
      <ListItem key={item.path} disablePadding>
        <Tooltip title={collapsed ? item.label : ''} placement="right">
          <ListItemButton
            component={RouterLink}
            to={item.path}
            sx={{
              pl: collapsed ? 1.5 : 2 + level * 2,
              minHeight: 48,
              color: theme.palette.common.white,
              backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
              '&:hover': {
                backgroundColor: isActive 
                  ? 'rgba(255, 255, 255, 0.25)' 
                  : 'rgba(255, 255, 255, 0.1)'
              },
              justifyContent: collapsed ? 'center' : 'flex-start',
            }}
          >
            <ListItemIcon 
              sx={{ 
                minWidth: collapsed ? 0 : 40, 
                color: theme.palette.common.white,
                justifyContent: 'center'
              }}
            >
              {item.icon}
            </ListItemIcon>
            {!collapsed && (
              <ListItemText 
                primary={item.label}
                sx={{
                  '& .MuiListItemText-primary': {
                    fontWeight: isActive ? 600 : 400,
                    color: theme.palette.common.white
                  }
                }}
              />
            )}
          </ListItemButton>
        </Tooltip>
      </ListItem>
    );
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          minHeight: 64,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        {!collapsed && (
          <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.common.white }}>
            {t('navigation.structuredProducts')}
          </Typography>
        )}
        {!isMobile && (
          <Tooltip title={collapsed ? t('tooltips.expandSidebar') : t('tooltips.collapseSidebar')}>
            <IconButton 
              onClick={handleCollapseToggle} 
              size="small"
              sx={{ color: theme.palette.common.white }}
            >
              {collapsed ? <MenuIcon /> : <ChevronLeft />}
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Navigation Items */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <List>
          {navigationItems.map((item) => renderNavigationItem(item))}
        </List>
      </Box>

      {/* Footer */}
      <Box sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        {!collapsed ? (
          <Box sx={{ p: 2 }}>
            {/* Theme Toggle and Language Switcher */}
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', gap: 1, alignItems: 'center' }}>
              <ThemeToggle />
              <LanguageSwitcher />
            </Box>
            
            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', mb: 2 }} />

            {/* User Information */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Avatar
                sx={{ 
                  width: 32, 
                  height: 32, 
                  mr: 1.5,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: theme.palette.common.white,
                  fontSize: '0.875rem',
                  fontWeight: 600
                }}
              >
                U
              </Avatar>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.95)',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  User Name
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '0.75rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  user@example.com
                </Typography>
              </Box>
              <IconButton
                onClick={handleUserMenuClick}
                size="small"
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&:hover': {
                    color: theme.palette.common.white,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                <AccountCircle fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        ) : (
          <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <ThemeToggle />
            <LanguageSwitcher />
            <Tooltip title="User Menu" placement="right">
              <IconButton
                onClick={handleUserMenuClick}
                size="small"
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&:hover': {
                    color: theme.palette.common.white,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                <Avatar
                  sx={{ 
                    width: 24, 
                    height: 24,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: theme.palette.common.white,
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}
                >
                  U
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.common.white,
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH,
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.common.white,
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Main Content */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 3,
          width: { md: `calc(100% - ${collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH}px)` },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        {children}
      </Box>

      {/* User Menu */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleUserMenuClose}
        PaperProps={{
          sx: {
            backgroundColor: theme.palette.common.white,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            borderRadius: '8px',
            mt: 1,
            minWidth: 200,
          }
        }}
      >
        <MenuItem
          onClick={handleLogout}
          sx={{
            color: '#1A1D23',
            '&:hover': {
              backgroundColor: '#F5F7FA'
            }
          }}
        >
          <ExitToApp sx={{ mr: 1, color: '#EF4444' }} />
          {t('common.logout')}
        </MenuItem>
      </Menu>
    </Box>
  );
};
```

## Collapsible Sidebar Features

### Collapse/Expand Functionality

The sidebar supports two collapse states:

1. **Full Width (280px)**: Shows full labels, icons, and user information
2. **Collapsed (64px)**: Shows only icons with tooltips on hover

**Key Implementation Details:**

- **State Management**: Use `useState` to track `collapsed` state
- **Toggle Button**: ChevronLeft icon when expanded, MenuIcon when collapsed
- **Width Transitions**: Smooth CSS transitions when collapsing/expanding
- **Conditional Rendering**: Hide text labels and adjust padding when collapsed
- **Tooltips**: Show tooltips on hover for collapsed menu items
- **Footer Adaptation**: Footer shows compact version when collapsed (icons only)

### Responsive Behavior

- **Desktop (md and up)**: Permanent drawer with collapse functionality
- **Mobile (below md)**: Temporary drawer that slides in from the left
- **Mobile Menu Button**: Add a menu button in your app bar for mobile users

## Route Mapping

Each protocol gets:
- **Overview route**: `/protocol-name-overview` or `/protocol-name` (plural)
- **Detail route**: `/protocol-name-detail/:id`
- **Creation route**: `/protocol-name-create`

**Example:**
- Protocol: `DogTraining`
- Overview: `/dogs` (from navigation)
- Detail: `/dog-detail/:id`
- Create: `/dog-create`

## Icon Selection

Use Material-UI icons based on protocol purpose:
- **Pets** - Animal-related protocols
- **People** - User/person protocols
- **Business** - Business/entity protocols
- **AccountBalance** - Financial protocols
- **ShowChart** - Analytics/reporting protocols
- **CalendarToday** - Scheduling/time-based protocols
- **Settings** - Configuration protocols

## Internationalization

Add translation keys for all navigation items:

```json
// src/i18n/locales/en.json
{
  "navigation": {
    "dogTraining": "Dog Training",
    "dogs": "Dogs",
    "trainers": "Trainers",
    "scheduling": "Scheduling",
    "sessions": "Training Sessions"
  }
}
```

## Generation Algorithm

1. **Scan NPL files** for `package` declarations
2. **For each package:**
   - Find all `@api protocol` declarations
   - Create package menu item
   - Create sub-menu items for each protocol
3. **Generate navigation structure** as TypeScript
4. **Generate routes** in Router.tsx
5. **Add translation keys** to i18n files

## Next Steps

Once sidebar is generated, proceed to:
- [06-OVERVIEW-PAGES.md](./06-OVERVIEW-PAGES.md) - Generate overview table pages

