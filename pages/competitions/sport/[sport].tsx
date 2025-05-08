/**
 * Dynamic sport specific competition listing page
 * Displays competitions filtered by sport type (e.g., /competitions/sport/football)
 * It has some server side processing and client side rendering
 */

import React from 'react';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { CompetitionList } from '../../../components/competitions/CompetitionList';
import { isValidActiveSport, isKnownSport, getSportName } from '../../../lib/config/supportedSports';

// Props to be passed to the page component
type SportCompetitionsPageProps = {
  sport: string;
  displayName: string;
  showComingSoon: boolean;
};
// Return the props for the page component server side before rendering
export const getServerSideProps: GetServerSideProps<SportCompetitionsPageProps> = async (context) => {
  const { sport } = context.params || {};
  
  // Make sure it's a string
  if (typeof sport !== 'string') {
    return { notFound: true };
  }
  // Make sure it's lowercase
  const lowerCasedSport = sport.toLowerCase();
  
  // Check if it's a known sport in our system
  if (!isKnownSport(lowerCasedSport)) {
    return { notFound: true };
  }
  
  // Get the display name for the sport
  const displayName = getSportName(lowerCasedSport);
  
  // Check if it's an active sport
  const isActive = isValidActiveSport(lowerCasedSport);
  // return the props for the page component
  return {
    props: {
      sport: lowerCasedSport,
      displayName,
      showComingSoon: !isActive
    }
  };
};

export default function SportCompetitionsPage({ 
  sport, 
  displayName,
  showComingSoon 
}: InferGetServerSidePropsType<typeof getServerSideProps>) { // this type is inferred from the props above
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{displayName} Competitions</h1>
      
      {showComingSoon ? (
        <div className="bg-blue-50 text-blue-700 p-4 rounded-md border border-blue-200">
          <h2 className="text-xl font-semibold mb-2">Too keen challenger, this is coming soon!</h2>
          <p>We&apos;re not quite ready for {displayName} competitions yet, but they will be here soon!</p>
        </div>
      ) : (
        <CompetitionList sport={sport} />
      )}
    </div>
  );
} 