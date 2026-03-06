import { createTheme, Theme } from '@mui/material/styles';

export function createAppTheme(mode: 'light' | 'dark'): Theme {
  const dark = mode === 'dark';
  return createTheme({
    palette: {
      mode,
      primary: {
        main: dark ? '#0bd2a2' : '#120a4d',
        dark: dark ? '#09b88d' : '#20127c',
        contrastText: dark ? '#0f172a' : '#ffffff',
      },
      secondary: { main: '#0bd2a2', contrastText: '#120a4d' },
      error:   { main: '#ef4444' },
      success: { main: '#22c55e' },
      warning: { main: '#fa8b45' },
      background: {
        default: dark ? '#0f172a' : '#ffffff',
        paper:   dark ? '#1e293b' : '#ffffff',
      },
      text: {
        primary:   dark ? '#f1f5f9' : '#111827',
        secondary: dark ? '#94a3b8' : '#6b7280',
      },
      divider: dark ? '#334155' : '#e5e7eb',
    },
    typography: {
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: { borderRadius: 8 },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 8, fontWeight: 600 },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: dark ? '#1e293b' : '#ffffff',
            color:           dark ? '#f1f5f9' : '#111827',
            boxShadow:       dark ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
            borderBottom: `1px solid ${dark ? '#334155' : '#e5e7eb'}`,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            border: `1px solid ${dark ? '#334155' : '#e5e7eb'}`,
            backgroundColor: dark ? '#1e293b' : '#ffffff',
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              backgroundColor:  dark ? '#0f172a' : '#f9fafb',
              fontWeight: 600,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: dark ? '#94a3b8' : '#6b7280',
              borderBottomColor: dark ? '#334155' : '#e5e7eb',
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderBottomColor: dark ? '#334155' : '#e5e7eb' },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, fontSize: '0.75rem' },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { backgroundColor: dark ? '#1e293b' : '#ffffff' },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: dark ? '#0f172a' : 'transparent',
            '& fieldset': { borderColor: dark ? '#475569' : '#e5e7eb' },
            '&:hover fieldset': { borderColor: dark ? '#64748b' : '#120a4d' },
            '&.Mui-focused fieldset': { borderColor: dark ? '#0bd2a2' : '#120a4d' },
          },
          input: { color: dark ? '#f1f5f9' : '#111827' },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: { color: dark ? '#94a3b8' : '#6b7280' },
        },
      },
    },
  });
}
