// action buttons for the saving picks on the make picks page
import React from 'react';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface ActionButtonsProps {
  isSaving: boolean;
  currentRoundNumber: number;
  hasSelection: boolean;
  isSelectable: boolean;
  deadlinePassed: boolean;
  onSaveCurrentPick: () => void;
  onSaveAllPicks: () => void;
  hasAnySelections: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  isSaving,
  currentRoundNumber,
  hasSelection,
  isSelectable,
  deadlinePassed,
  onSaveCurrentPick,
  onSaveAllPicks,
  hasAnySelections
}) => {
  return (
    <Grid container spacing={2} className="mt-6">
      <Grid item xs={12} md={6}>
        <Button 
          variant="contained" 
          color="primary" 
          fullWidth 
          className="py-3 text-base"
          onClick={onSaveCurrentPick}
          disabled={isSaving || !hasSelection || !isSelectable || deadlinePassed}
          startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
        >
          {isSaving ? 'Saving...' : `Save Pick for Round ${currentRoundNumber}`}
        </Button>
      </Grid>
      <Grid item xs={12} md={6}>
        <Button 
          variant="contained" 
          color="secondary" 
          fullWidth 
          className="py-3 text-base"
          onClick={onSaveAllPicks}
          disabled={isSaving || !hasAnySelections || (!isSelectable && deadlinePassed)}
          startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
        >
          {isSaving ? 'Saving All Picks...' : 'Save All Selections'}
        </Button>
      </Grid>
    </Grid>
  );
};

export default ActionButtons; 