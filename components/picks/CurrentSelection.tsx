import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import { RoundWithFixturesAndPick } from '../../lib/hooks/data/useRoundPicks';
import { Pick } from '../../lib/types/pick';

interface CurrentSelectionProps {
  currentRound: RoundWithFixturesAndPick;
  selection: string | null;
  getTeamName: (round: RoundWithFixturesAndPick, teamId: string | null) => string;
}

const CurrentSelection: React.FC<CurrentSelectionProps> = ({
  currentRound,
  selection,
  getTeamName
}) => {
  return (
    <Box className="mt-6 mb-4 min-h-[40px] py-3 px-4 rounded-md bg-blue-50 border border-blue-100">
      {selection ? (
        <Typography variant="h6" color="primary" className="flex items-center">
          <CheckCircleIcon className="mr-2" />
          Your selection for Round {currentRound?.round_number}: <span className="font-bold ml-2">Team Chosen: {getTeamName(currentRound, selection)}</span>
          {currentRound?.existingPick && currentRound.existingPick.team_id === selection && 
            <Chip size="small" label={`Status: ${currentRound.existingPick.status}`} className="ml-2" />
          }
        </Typography>
      ) : (
        <Typography variant="body1" color="text.secondary" className="flex items-center">
          <InfoIcon className="mr-2" />
          No team selected for this round yet
        </Typography>
      )}
    </Box>
  );
};

export default CurrentSelection; 