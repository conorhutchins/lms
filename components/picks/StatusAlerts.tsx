// displays alerts for the status of the round
import React from 'react';
import Alert from '@mui/material/Alert';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import InfoIcon from '@mui/icons-material/Info';

interface StatusAlertsProps {
  deadlinePassed: boolean;
  isFutureRound: boolean;
  saveError: string | null;
}

const StatusAlerts: React.FC<StatusAlertsProps> = ({
  deadlinePassed,
  isFutureRound,
  saveError
}) => {
  return (
    <>
      {deadlinePassed && (
        <Alert severity="warning" sx={{ mb: 3 }} icon={<AccessTimeIcon />} className="rounded-md">
          The deadline for this round has passed. You can view but not change your pick.
        </Alert>
      )}
      
      {isFutureRound && (
        <Alert severity="info" sx={{ mb: 3 }} icon={<InfoIcon />} className="rounded-md">
          This round is not yet available for selection. You can view the fixtures but can&apos;t make selections until it enters the upcoming window.
        </Alert>
      )}
      
      {saveError && (
        <Alert severity="error" sx={{ mt: 2 }} className="rounded-md">{saveError}</Alert>
      )}
      
      {isFutureRound && (
        <Alert severity="info" sx={{ mt: 3 }} icon={<InfoIcon />} className="rounded-md">
          This round is beyond the current selection window. You can view the fixtures now, but you can only select a team 
          when the round enters the upcoming window (approximately 4 weeks before the deadline).
        </Alert>
      )}
    </>
  );
};

export default StatusAlerts; 