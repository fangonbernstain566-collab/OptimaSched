// src/components/Toast.jsx
import { Snackbar, Alert } from '@mui/material';

const Toast = ({ toast, onClose }) => {
  return (
    <Snackbar
      open={toast.open}
      autoHideDuration={4000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert
        onClose={onClose}
        severity={toast.severity}
        variant="filled"
        sx={{ width: '100%', borderRadius: '12px', boxShadow: 3 }}
      >
        {toast.message}
      </Alert>
    </Snackbar>
  );
};

export default Toast;