import React from 'react';
import { 
  Paper,
  Grid,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Typography,
  Box
} from '@mui/material';

type Fixture = {
  id: string;
  external_id?: string;
  home_team_id: number | string;
  away_team_id: number | string;
  home_team: string;
  away_team: string;
  kickoff_time?: string;
};

interface FixturesListProps {
  fixtures: Fixture[];
  selectedTeamId: string | null;
  onSelectionChange: (teamId: string) => void;
  isDisabled: boolean;
  roundLabel?: string;
}

const FixturesList: React.FC<FixturesListProps> = ({
  fixtures,
  selectedTeamId,
  onSelectionChange,
  isDisabled,
  roundLabel = 'Select Your Team'
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSelectionChange((event.target as HTMLInputElement).value);
  };

  return (
    <FormControl component="fieldset" fullWidth>
      <FormLabel component="legend" className="text-xl mb-4 font-medium">
        {roundLabel}
      </FormLabel>
      
      <RadioGroup
        aria-label="team-pick"
        name="team-pick"
        value={selectedTeamId || ''}
        onChange={handleChange}
      >
        {fixtures.length > 0 ? (
          <Grid container spacing={2}>
            {fixtures.map((fixture) => (
              <Grid item xs={12} key={fixture.id || fixture.external_id}>
                <Paper 
                  elevation={0} 
                  className="p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200"
                >
                  <Grid container spacing={1} alignItems="center">
                    {/* Home Team Radio */}
                    <Grid item xs={5} className="text-right">
                      {fixture.home_team_id !== null && fixture.home_team_id !== undefined ? (
                        <FormControlLabel 
                          value={fixture.home_team_id.toString()}
                          control={
                            <Radio 
                              disabled={isDisabled}
                              color="primary"
                            />
                          } 
                          label={
                            <Typography 
                              variant="body1" 
                              className={selectedTeamId === fixture.home_team_id.toString() ? 
                                'font-bold text-blue-600' : ''}
                            >
                              {fixture.home_team || `Team ${fixture.home_team_id}`}
                            </Typography>
                          }
                          labelPlacement="start"
                        />
                      ) : (
                        <Typography variant="body2" color="text.disabled">Unknown Home Team</Typography>
                      )}
                    </Grid>
                    
                    {/* VS Text */}
                    <Grid item xs={2} className="text-center">
                      <div className="flex flex-col items-center">
                        <Typography variant="body1" fontWeight="bold" className="mb-1">vs</Typography>
                        <div className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {fixture.kickoff_time 
                            ? new Date(fixture.kickoff_time).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' }) 
                            : 'TBC'}
                        </div>
                      </div>
                    </Grid>
                    
                    {/* Away Team Radio */}
                    <Grid item xs={5} className="text-left">
                      {fixture.away_team_id !== null && fixture.away_team_id !== undefined ? (
                        <FormControlLabel 
                          value={fixture.away_team_id.toString()} 
                          control={
                            <Radio 
                              disabled={isDisabled}
                              color="primary"
                            />
                          } 
                          label={
                            <Typography 
                              variant="body1" 
                              className={selectedTeamId === fixture.away_team_id.toString() ? 
                                'font-bold text-blue-600' : ''}
                            >
                              {fixture.away_team || `Team ${fixture.away_team_id}`}
                            </Typography>
                          }
                          labelPlacement="end"
                        />
                      ) : (
                        <Typography variant="body2" color="text.disabled">Unknown Away Team</Typography>
                      )}
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box className="flex justify-center py-8">
            <Typography variant="body1" color="text.secondary">
              No fixtures found for this round.
            </Typography>
          </Box>
        )}
      </RadioGroup>
    </FormControl>
  );
};

export default FixturesList; 