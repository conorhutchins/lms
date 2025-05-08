// Very simple config file to define the supported sports in the app

export interface SportConfig {
  id: string;        // URL slug
  name: string;      // Display name
  active: boolean;   // Whether this sport is currently active in the app
  icon?: string;     // Optional icon name (for future use)
}

/**
 * Array of all supported sports in the application
 * - Set active to true for sports that are ready to be displayed
 * - Set active to false for sports in development/coming soon
 */
export const SUPPORTED_SPORTS: SportConfig[] = [
  {
    id: 'football',
    name: 'Football',
    active: true
  },
  {
    id: 'f1',
    name: 'Formula 1',
    active: false, // Coming soon
  },
  {
    id: 'ufc',
    name: 'UFC',
    active: false, // Coming soon
  },

];

// function to get all active sports
export function getActiveSports(): SportConfig[] {
  return SUPPORTED_SPORTS.filter(sport => sport.active);
}

// function to get all active sport ids
export function getActiveSportIds(): string[] {
  return getActiveSports().map(sport => sport.id);
}

// function to check if a sport is valid and active
export function isValidActiveSport(sportId: string): boolean {
  return getActiveSportIds().includes(sportId.toLowerCase());
}

// function to check if a sport is in our system (active or inactive)
export function isKnownSport(sportId: string): boolean {
  return SUPPORTED_SPORTS.some(sport => sport.id === sportId.toLowerCase());
}

// function to get the display name for a sport by id
export function getSportName(sportId: string): string {
  const sport = SUPPORTED_SPORTS.find(s => s.id === sportId.toLowerCase());
  return sport?.name || sportId.charAt(0).toUpperCase() + sportId.slice(1);
} 