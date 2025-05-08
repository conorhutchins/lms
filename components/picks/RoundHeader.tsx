// displays a header with the round info and deadline
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import { RoundWithFixturesAndPick } from '../../lib/hooks/data/useRoundPicks';

interface RoundHeaderProps {
  round: RoundWithFixturesAndPick;
}

const RoundHeader: React.FC<RoundHeaderProps> = ({ round }) => {
  return (
    <Box className="mb-4 pb-3 border-b border-gray-200">
      <Box className="flex items-center">
        <SportsSoccerIcon className="mr-2 text-gray-600" />
        <Typography variant="h6" className="font-semibold">
          Round {round?.round_number}
        </Typography>
      </Box>
      <Typography variant="subtitle1" color="text.secondary" className="mt-1 flex items-center">
        <AccessTimeIcon fontSize="small" className="mr-1" />
        Deadline: {new Date(round?.deadline_date).toLocaleString()}
      </Typography>
    </Box>
  );
};

export default RoundHeader; 