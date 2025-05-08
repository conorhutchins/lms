'use client'; 

// This is a client side page that allows a user to make picks for a round

import { InferGetServerSidePropsType } from 'next';
import React from 'react';

// MUI Imports
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

// Import the hook for managing round picks
import { useRoundPicks } from '../../../../../lib/hooks/data/useRoundPicks';
import { useKeyboardNavigation } from '../../../../../lib/hooks/useKeyboard/index';

// Custom components
import RoundTabs from '../../../../../components/picks/RoundTabs';
import SelectionSummary from '../../../../../components/picks/SelectionSummary';
import StatusAlerts from '../../../../../components/picks/StatusAlerts';
import RoundFixturesSection from '../../../../../components/picks/RoundFixturesSection';
import NotificationSnackbar from '../../../../../components/picks/NotificationSnackbar';

// Server-side props
import { getPicksPageServerSideProps } from '../../../../../lib/server/picksPageServerProps';

// Export the getServerSideProps function
export const getServerSideProps = getPicksPageServerSideProps;

export default function MakePicksPage({ 
  initialRoundData, 
  existingPick, 
  upcomingRounds = [],
  error 
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  // Use the hook to handle the data and logic
  const {
    roundsData,
    activeTabIndex,
    selections,
    isSaving,
    saveError,
    savedSuccess,
    savedMessage,
    handleTabChange: onTabChange,
    handleSelectionChange,
    saveCurrentPick,
    saveAllPicks,
    getTeamName,
    handleCloseSnackbar,
    currentRound,
    isCurrentRoundSelectable,
    hasCurrentRoundDeadlinePassed,
    loadRoundFixtures
  } = useRoundPicks(initialRoundData, existingPick, upcomingRounds);

  // Use the keyboard navigation hook
  useKeyboardNavigation({
    activeIndex: activeTabIndex,
    itemsCount: roundsData.length,
    onNavigate: onTabChange
  });

  // Preload fixtures for rounds with selections to ensure team names display properly
  React.useEffect(() => {
    // Ensure this only runs when roundsData and selections are initialised
    if (roundsData.length > 0 && Object.keys(selections).length > 0) {
      // For each selection, ensure fixtures are loaded
      Object.entries(selections).forEach(([roundId, teamId]) => {
        if (teamId) {
          const round = roundsData.find(r => r.id === roundId);
          if (round && (!round.fixtures || round.fixtures.length === 0)) {
            console.log(`Preloading fixtures for round ${roundId} to display team name for selection`);
            loadRoundFixtures(roundId);
          }
        }
      });
    }
  }, [roundsData, selections, loadRoundFixtures]);

  // Force immediate loading of fixtures for rounds with selections
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (roundsData.length > 0 && Object.keys(selections).length > 0) {
        console.log('Forcing immediate fixture load for rounds with selections');
        Object.keys(selections).forEach(roundId => {
          if (selections[roundId]) {
            console.log(`Force loading fixtures for round ${roundId} with selection ${selections[roundId]}`);
            loadRoundFixtures(roundId);
          }
        });
      }
    }, 100); // Quick delay to make sure roundsData is populated
    
    return () => clearTimeout(timer);
  }, [roundsData, selections, loadRoundFixtures]);

  // Track viewed round in localStorage
  React.useEffect(() => {
    // When component mounts, check if there's a saved round
    const competitionKey = `lastViewedRound_${initialRoundData?.competition_id}`;
    const savedRoundId = localStorage.getItem(competitionKey);
    
    // If we have a saved round and it's not the current one, find its index
    if (savedRoundId && savedRoundId !== initialRoundData?.id) {
      const savedIndex = roundsData.findIndex(round => round.id === savedRoundId);
      if (savedIndex !== -1) {
        onTabChange(savedIndex);
      }
    }
  }, [roundsData, initialRoundData?.competition_id, initialRoundData?.id, onTabChange]);
  
  // Save viewed round when tab changes
  React.useEffect(() => {
    if (activeTabIndex >= 0 && activeTabIndex < roundsData.length) {
      const competitionKey = `lastViewedRound_${initialRoundData?.competition_id}`;
      localStorage.setItem(competitionKey, roundsData[activeTabIndex].id);
    }
  }, [activeTabIndex, roundsData, initialRoundData?.competition_id]);

  // Render error state
  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">Error loading page: {error}</Alert>
      </Container>
    );
  }

  // Render loading state
  if (roundsData.length === 0) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  // Use values from the hook
  const currentRoundData = currentRound;
  const isSelectable = isCurrentRoundSelectable;
  const deadlinePassed = hasCurrentRoundDeadlinePassed;
  const isFutureRound = currentRoundData?.status === 'FUTURE';

  return (
    <Container maxWidth="lg" className="py-4 md:py-8">
      <Typography variant="h4" component="h1" gutterBottom className="text-2xl md:text-3xl font-semibold">
        {currentRoundData?.competitions?.title || 'Competition'} - Make your Picks for Rounds
      </Typography>
      
      <StatusAlerts 
        deadlinePassed={deadlinePassed}
        isFutureRound={isFutureRound}
        saveError={saveError}
      />
      
      <RoundTabs
        rounds={roundsData}
        activeTabIndex={activeTabIndex}
        selections={selections}
        onTabChange={onTabChange}
      />
      
      {/* Current Round Content */}
      <RoundFixturesSection 
        currentRound={currentRoundData}
        selection={selections[currentRoundData?.id]}
        selections={selections}
        isSelectable={isSelectable}
        deadlinePassed={deadlinePassed}
        isSaving={isSaving}
        getTeamName={getTeamName}
        handleSelectionChange={handleSelectionChange}
        saveCurrentPick={saveCurrentPick}
        saveAllPicks={saveAllPicks}
      />
      
      {/* Summary of all selections */}
      <SelectionSummary
        roundsData={roundsData}
        selections={selections}
        getTeamName={getTeamName}
        loadRoundFixtures={loadRoundFixtures}
      />
      
      {/* Toast notification for successful saves */}
      <NotificationSnackbar
        open={savedSuccess}
        message={savedMessage}
        onClose={handleCloseSnackbar}
      />
    </Container>
  );
} 