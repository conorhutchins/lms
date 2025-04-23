import React from 'react';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { CompetitionList } from '../../../components/competitions/CompetitionList';
import { createServerClient } from '@supabase/ssr';
import { Database } from '../../../lib/types/supabase';
import { createApiRouteCookieMethods } from '../../../lib/utils/supabaseServerHelpers/supabaseServerHelpers';
import { NextApiRequest, NextApiResponse } from 'next';

type SportCompetitionsPageProps = {
  sport: string;
};

export const getServerSideProps: GetServerSideProps<SportCompetitionsPageProps> = async (context) => {
  const { sport } = context.params || {};
  
  if (typeof sport !== 'string') {
    return { notFound: true };
  }
  
  // Optional - can add validation here if needed
  const validSports = ['football', 'basketball', 'tennis', 'golf', 'hockey']; // Add all your supported sports
  if (!validSports.includes(sport.toLowerCase())) {
    return { notFound: true };
  }
  
  return {
    props: {
      sport: sport.toLowerCase()
    }
  };
};

export default function SportCompetitionsPage({ sport }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <div className="container mx-auto px-4 py-8">
      <CompetitionList sport={sport} />
    </div>
  );
} 