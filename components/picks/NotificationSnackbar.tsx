import React from 'react';
import Snackbar from '@mui/material/Snackbar';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface NotificationSnackbarProps {
  open: boolean;
  message: string;
  onClose: () => void;
  autoHideDuration?: number;
  icon?: React.ReactNode;
}

const NotificationSnackbar: React.FC<NotificationSnackbarProps> = ({
  open,
  message,
  onClose,
  autoHideDuration = 6000,
  icon = <CheckCircleIcon />
}) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      message={
        <div className="flex items-center">
          {icon}
          <span className="ml-2">{message}</span>
        </div>
      }
      action={
        <IconButton
          size="small"
          aria-label="close"
          color="inherit"
          onClick={onClose}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      }
      className="bg-green-600"
    />
  );
};

export default NotificationSnackbar; 