// display a summary of the selections made by the user across rounds
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import HistoryIcon from '@mui/icons-material/History'; 
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import InfoIcon from '@mui/icons-material/Info';
import { RoundWithFixturesAndPick } from '../../lib/hooks/data/useRoundPicks';

interface SelectionSummaryProps {
  roundsData: RoundWithFixturesAndPick[];
  selections: Record<string, string | null>;
  getTeamName: (round: RoundWithFixturesAndPick, teamId: string | null | undefined) => string;
  loadRoundFixtures: (roundId: string) => Promise<void>;
}

const SelectionSummary: React.FC<SelectionSummaryProps> = ({
  roundsData,
  selections,
  getTeamName,
  loadRoundFixtures
}) => {
  return (
    <Paper elevation={1} className="p-4 rounded-lg mt-6 mb-4">
      <Typography variant="h6" gutterBottom className="flex items-center">
        <CheckCircleIcon className="mr-2" /> Your Selections Summary
      </Typography>
      
      <Box className="mb-4 p-3 bg-gray-50 rounded-md flex flex-wrap gap-3 justify-between border border-gray-200">
        <Box className="flex items-center">
          <HistoryIcon fontSize="small" className="mr-1 text-gray-500" />
          <Typography variant="body2" className="text-gray-500">PAST</Typography>
        </Box>
        <Box className="flex items-center">
          <AccessTimeIcon fontSize="small" className="mr-1 text-green-600" />
          <Typography variant="body2" className="text-green-600 font-bold">CURRENT</Typography>
        </Box>
        <Box className="flex items-center">
          <HourglassEmptyIcon fontSize="small" className="mr-1 text-blue-600" />
          <Typography variant="body2" className="text-blue-600">UPCOMING</Typography>
        </Box>
        <Box className="flex items-center">
          <InfoIcon fontSize="small" className="mr-1 text-gray-400" />
          <Typography variant="body2" className="text-gray-400">FUTURE</Typography>
        </Box>
      </Box>
      
      <Box className="max-h-[400px] overflow-y-auto pr-1">
        <List className="p-0 space-y-2">
          {roundsData.map((round) => {
            // Ensure fixtures are loaded for this round if it has a selection
            const hasSelection = selections[round.id] !== undefined && selections[round.id] !== null;
            const fixturesLoaded = round.fixtures && round.fixtures.length > 0;
            
            // If this round has a selection but no fixtures, trigger loading
            if (hasSelection && !fixturesLoaded) {
              loadRoundFixtures(round.id);
            }
            
            return (
              <Paper
                key={round.id}
                elevation={0}
                className={`p-3 rounded-md border ${
                  round.status === 'CURRENT' ? 'border-green-200 bg-green-50' : 'border-gray-200'
                }`}
              >
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={4}>
                    <Box className="flex flex-col">
                      <Box className="flex items-center">
                        {round.status === 'PAST' && <HistoryIcon fontSize="small" className="mr-1 text-gray-500" />}
                        {round.status === 'CURRENT' && <AccessTimeIcon fontSize="small" className="mr-1 text-green-600" />}
                        {round.status === 'UPCOMING' && <HourglassEmptyIcon fontSize="small" className="mr-1 text-blue-600" />}
                        {round.status === 'FUTURE' && <InfoIcon fontSize="small" className="mr-1 text-gray-400" />}
                        <Typography 
                          variant="body1" 
                          className={`${
                            round.status === 'CURRENT' ? 'font-bold text-green-700' : 
                            round.status === 'UPCOMING' ? 'font-medium text-blue-700' : 
                            'text-gray-700'
                          }`}
                        >
                          Round {round.round_number}
                        </Typography>
                      </Box>
                      <Typography variant="caption" className="text-gray-500 mt-1">
                        Deadline: {new Date(round.deadline_date).toLocaleDateString()} at {new Date(round.deadline_date).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={8}>
                    {selections[round.id] ? (
                      <Box className="flex items-center p-2 pl-3 rounded-md bg-blue-50 border border-blue-100">
                        <CheckCircleIcon className="text-green-600 mr-2" />
                        <Box>
                          <Typography className="text-blue-700 font-medium">
                            {(!round.fixtures || round.fixtures.length === 0) ? (
                              <>
                                <CircularProgress size={12} className="mr-1" />
                                Team Chosen: {getTeamName(round, selections[round.id])}
                              </>
                            ) : (
                              <>Team Chosen: {getTeamName(round, selections[round.id])}</>
                            )}
                          </Typography>
                          {round.existingPick && (
                            <Typography component="div" variant="caption" className="text-gray-500">
                              Status: <span className="font-semibold">{round.existingPick.status}</span>
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    ) : (
                      <Box className="flex items-center p-2 pl-3 rounded-md bg-gray-100 border border-dashed border-gray-300">
                        <InfoIcon className="text-gray-400 mr-2" />
                        <Typography variant="body2" className="text-gray-500">
                          {round.status === 'FUTURE' ? (
                            'Available for viewing only'
                          ) : round.status === 'PAST' ? (
                            'No selection was made'
                          ) : (
                            'No selection yet'
                          )}
                        </Typography>
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </Paper>
            );
          })}
        </List>
      </Box>
    </Paper>
  );
};

export default SelectionSummary; 