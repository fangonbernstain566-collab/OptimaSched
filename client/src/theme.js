import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    background: { default: '#f8fafc', paper: '#ffffff' },
    primary: { main: '#2563eb' },
    text: { primary: '#1e293b', secondary: '#64748b' }
  },
  components: {
    MuiCard: { styleOverrides: { root: { borderRadius: '16px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' } } },
    MuiButton: { styleOverrides: { root: { borderRadius: '8px', textTransform: 'none', fontWeight: 600 } } }
  }
});