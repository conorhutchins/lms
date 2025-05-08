// /competitions a simple page to display all active sports

import React from 'react';
import Link from 'next/link';
import { GetStaticProps, InferGetStaticPropsType } from 'next';
import { getActiveSports, SUPPORTED_SPORTS, SportConfig } from '../../lib/config/supportedSports';

interface CompetitionsHomeProps {
  activeSports: SportConfig[];
  comingSoonSports: SportConfig[];
}

export const getStaticProps: GetStaticProps<CompetitionsHomeProps> = async () => {
  const activeSports = getActiveSports();
  const comingSoonSports = SUPPORTED_SPORTS.filter(sport => !sport.active);
  
  return {
    props: {
      activeSports,
      comingSoonSports
    },
    // Revalidate every hour to pick up config changes
    revalidate: 3600
  };
};

export default function CompetitionsHome({ 
  activeSports,
  comingSoonSports
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Competitions by Sport</h1>
      
      {/* Active Sports Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Available Sports</h2>
        
        {activeSports.length === 0 ? (
          <p className="text-gray-600">No active sports at the moment.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {activeSports.map(sport => (
              <Link 
                href={`/competitions/sport/${sport.id}`} 
                key={sport.id}
                className="bg-white hover:bg-gray-50 transition p-6 rounded-lg shadow-md border border-gray-200 flex flex-col items-center"
              >
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                  {/* Future sport icons can go here */}
                  <span className="text-lg font-bold">{sport.name.charAt(0)}</span>
                </div>
                <h3 className="text-xl font-medium text-blue-700">{sport.name}</h3>
                <span className="mt-2 text-sm text-gray-500">View competitions</span>
              </Link>
            ))}
          </div>
        )}
      </section>
      
      {/* Coming Soon Section */}
      {comingSoonSports.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">Coming Soon</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {comingSoonSports.map(sport => (
              <div 
                key={sport.id}
                className="bg-gray-100 p-6 rounded-lg border border-gray-200 flex flex-col items-center opacity-70"
              >
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-3">
                  <span className="text-lg font-bold text-gray-500">{sport.name.charAt(0)}</span>
                </div>
                <h3 className="text-xl font-medium text-gray-600">{sport.name}</h3>
                <span className="mt-2 text-sm text-gray-500">Coming soon</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
} 