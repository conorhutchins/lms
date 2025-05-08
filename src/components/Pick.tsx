import { Box, Typography, useTheme } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import LockIcon from '@mui/icons-material/Lock';
import { PickStatus } from '../lib/types/pick';

interface PickProps {
  pick: {
    team_name: string;
    status: PickStatus;
  };
  round: {
    deadline: string;
  };
  isCurrent: boolean;
  isPassed: boolean;
}

const Pick = ({ pick, round, isCurrent, isPassed }: PickProps) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const getStatusIcon = () => {
    switch (pick.status) {
      case PickStatus.WIN:
        return <CheckCircleIcon sx={{ color: theme.palette.success.main }} />;
      case PickStatus.LOSS:
        return <CancelIcon sx={{ color: theme.palette.error.main }} />;
      case PickStatus.DRAW:
        return <RemoveCircleIcon sx={{ color: theme.palette.warning.main }} />;
      case PickStatus.VOID:
        return <RemoveCircleIcon sx={{ color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)' }} />;
      case PickStatus.LOCKED:
        return <LockIcon sx={{ color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)' }} />;
      case PickStatus.PENDING:
      default:
        return <CheckCircleIcon sx={{ color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)' }} />;
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        padding: 1,
        borderRadius: 1,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
      }}
    >
      {getStatusIcon()}
      <Typography 
        variant="body2" 
        sx={{ 
          color: isPassed || pick.status === PickStatus.LOCKED
            ? (isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)')
            : (isDark ? 'rgba(255, 255, 255, 0.87)' : 'rgba(0, 0, 0, 0.87)')
        }}
      >
        {pick.team_name}
      </Typography>
    </Box>
  );
};

export default Pick; 