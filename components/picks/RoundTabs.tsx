// navigation tab between rounds
import React from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Chip,
  Button,
  Paper
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import HistoryIcon from '@mui/icons-material/History';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// Define interfaces for component props
interface Round {
  id: string;
  round_number: number;
  status?: 'PAST' | 'CURRENT' | 'UPCOMING' | 'FUTURE';
}

interface RoundTabsProps {
  rounds: Round[];
  activeTabIndex: number;
  onTabChange: (index: number) => void;
  selections: Record<string, string | null>;
}

const RoundTabs: React.FC<RoundTabsProps> = ({
  rounds,
  activeTabIndex,
  onTabChange,
  selections
}) => {
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    onTabChange(newValue);
  };

  const handlePrevious = () => {
    if (activeTabIndex > 0) {
      onTabChange(activeTabIndex - 1);
    }
  };

  const handleNext = () => {
    if (activeTabIndex < rounds.length - 1) {
      onTabChange(activeTabIndex + 1);
    }
  };

  return (
    <Paper elevation={0} className="mb-6 rounded-lg overflow-hidden border border-gray-200">
      <Box className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <Typography variant="body2" color="text.secondary" className="mb-2">
          Navigate between rounds using the tabs below. You can view fixtures for all rounds but 
          can only make selections for the current round and upcoming rounds.
        </Typography>
        
        {/* Navigation controls */}
        <Box className="flex items-center justify-between">
          <Button 
            onClick={handlePrevious}
            disabled={activeTabIndex === 0}
            startIcon={<span>←</span>}
            variant="outlined"
            size="small"
            className="min-w-[120px]"
          >
            Previous
          </Button>
          
          <Chip 
            label={`Round ${activeTabIndex + 1} of ${rounds.length}`}
            variant="outlined"
            className="hidden sm:flex"
          />
          
          <Button 
            onClick={handleNext}
            disabled={activeTabIndex === rounds.length - 1}
            endIcon={<span>→</span>}
            variant="outlined"
            size="small"
            className="min-w-[120px]"
          >
            Next
          </Button>
        </Box>
      </Box>
      
      <Tabs 
        value={activeTabIndex} 
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="round tabs"
        className="bg-white"
        sx={{
          '& .MuiTabs-indicator': {
            height: 3,
          },
          '& .MuiTab-root': {
            minHeight: 64,
            padding: 2
          }
        }}
      >
        {rounds.map((round, index) => {
          // Determine tab styling/labeling based on status
          let icon = <InfoIcon fontSize="small" />;
          let statusColor = 'text.secondary';
          
          // Determine status icon and color
          switch(round.status) {
            case 'PAST':
              icon = <HistoryIcon fontSize="small" />;
              statusColor = 'text.secondary';
              break;
            case 'CURRENT':
              icon = <AccessTimeIcon fontSize="small" />;
              statusColor = 'success.main';
              break;
            case 'UPCOMING':
              icon = <HourglassEmptyIcon fontSize="small" />;
              statusColor = 'primary.main';
              break;
            case 'FUTURE':
              icon = <InfoIcon fontSize="small" />;
              statusColor = 'text.disabled';
              break;
            default:
              break;
          }
          
          // Add a green check if there's a selection for this round
          const hasSelection = !!selections[round.id];
          
          return (
            <Tab 
              key={round.id}
              label={
                <Box className="flex flex-col items-center pt-1">
                  <Typography variant="body2" className={round.status === 'CURRENT' ? 'font-bold' : ''}>
                    Round {round.round_number}
                  </Typography>
                  <Box className="flex items-center mt-1">
                    {icon}
                    <Typography 
                      variant="caption" 
                      color={statusColor}
                      className="ml-1"
                    >
                      {round.status}
                    </Typography>
                    {hasSelection && <CheckCircleIcon color="success" fontSize="small" className="ml-1" />}
                  </Box>
                </Box>
              }
              id={`round-tab-${index}`}
              aria-controls={`round-tabpanel-${index}`}
              className={round.status === 'FUTURE' ? 'opacity-70' : 'opacity-100'}
            />
          );
        })}
      </Tabs>
    </Paper>
  );
};

export default RoundTabs; 