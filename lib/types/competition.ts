export type Round = {
  id: number;
  competitionId: number;
  roundNumber: number;
  deadlineDate: Date;
};

export type Competition = {
  id: string;
  title: string;
  entry_fee: number;
  start_date: string;
  status: string;
  prize_pot: number;
  created_at: string;
  rolled_over: boolean;
  rounds?: Round[];
}; 