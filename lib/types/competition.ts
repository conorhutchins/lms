
export type Round = {
  id: number;
  competitionId: number;
  roundNumber: number;
  deadlineDate: Date;
};

export type Competition = {
  id: number;
  title: string;
  entry_fee: number;
  start_date: Date;
  status: string;
  prize_pot: number;
  created_at: Date;
  updated_at: Date;
  rolled_over: boolean;
  rounds?: Round[];
}; 