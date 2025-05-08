import React from 'react';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { RoundWithFixturesAndPick } from '../../lib/hooks/data/useRoundPicks';
import { adaptFixtures } from '../../lib/utils/fixturesAdapter';
import FixturesList from './FixturesList';
import RoundHeader from './RoundHeader';
import CurrentSelection from './CurrentSelection';
import ActionButtons from './ActionButtons';

interface RoundFixturesSectionProps {
  currentRound: RoundWithFixturesAndPick;
  selection: string | null;
  selections: Record<string, string | null>;
  isSelectable: boolean;
  deadlinePassed: boolean;
  isSaving: boolean;
  getTeamName: (round: RoundWithFixturesAndPick, teamId: string | null) => string;
  handleSelectionChange: (roundId: string, teamId: string) => void;
  saveCurrentPick: () => void;
  saveAllPicks: () => void;
}

const RoundFixturesSection: React.FC<RoundFixturesSectionProps> = ({
  currentRound,
  selection,
  selections,
  isSelectable,
  deadlinePassed,
  isSaving,
  getTeamName,
  handleSelectionChange,
  saveCurrentPick,
  saveAllPicks
}) => {
  const hasAnySelections = Object.values(selections).some(val => val !== null);
  
  return (
    <Paper elevation={1} className="p-4 md:p-6 mb-6 rounded-lg">
      <RoundHeader round={currentRound} />
      
      {currentRound?.fixtures ? (
        <FixturesList
          fixtures={adaptFixtures(currentRound.fixtures)}
          selectedTeamId={selection}
          onSelectionChange={(teamId) => handleSelectionChange(currentRound.id, teamId)}
          isDisabled={!isSelectable || deadlinePassed}
          roundLabel={`Select Your Team for Round ${currentRound.round_number}`}
        />
      ) : (
        <Box className="flex justify-center py-8">
          <CircularProgress size={40} />
        </Box>
      )}

      <CurrentSelection
        currentRound={currentRound}
        selection={selection}
        getTeamName={getTeamName}
      />

      <ActionButtons
        isSaving={isSaving}
        currentRoundNumber={currentRound?.round_number}
        hasSelection={!!selection}
        isSelectable={isSelectable}
        deadlinePassed={deadlinePassed}
        onSaveCurrentPick={saveCurrentPick}
        onSaveAllPicks={saveAllPicks}
        hasAnySelections={hasAnySelections}
      />
    </Paper>
  );
};

export default RoundFixturesSection; 