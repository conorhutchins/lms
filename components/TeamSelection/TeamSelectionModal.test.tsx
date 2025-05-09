// TeamSelectionModal.test.tsx - Tests for the team selection modal component
import { render, screen, fireEvent } from '@testing-library/react';
import TeamSelectionModal from './TeamSelectionModal';

// Sample test data
const mockTeams = [
  { id: '1', name: 'Arsenal', logo: '/logos/arsenal.png' },
  { id: '2', name: 'Chelsea', logo: '/logos/chelsea.png' },
  { id: '3', name: 'Liverpool', logo: '/logos/liverpool.png' },
];

describe('TeamSelectionModal', () => {
  const mockClose = jest.fn();
  const mockSelectTeam = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when open', () => {
    render(
      <TeamSelectionModal
        isOpen={true}
        onClose={mockClose}
        onSelectTeam={mockSelectTeam}
        teams={mockTeams}
      />
    );

    // Check for modal title
    expect(screen.getByText('Select Your Team')).toBeInTheDocument();
    
    // Check if all teams are displayed
    expect(screen.getByText('Arsenal')).toBeInTheDocument();
    expect(screen.getByText('Chelsea')).toBeInTheDocument();
    expect(screen.getByText('Liverpool')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <TeamSelectionModal
        isOpen={false}
        onClose={mockClose}
        onSelectTeam={mockSelectTeam}
        teams={mockTeams}
      />
    );
    
    // Modal should not be visible
    expect(screen.queryByText('Select Your Team')).not.toBeInTheDocument();
  });

  it('calls onSelectTeam and onClose when a team is selected', () => {
    render(
      <TeamSelectionModal
        isOpen={true}
        onClose={mockClose}
        onSelectTeam={mockSelectTeam}
        teams={mockTeams}
      />
    );
    
    // Click on a team
    fireEvent.click(screen.getByText('Arsenal'));
    
    // Check if callbacks were called with correct args
    expect(mockSelectTeam).toHaveBeenCalledWith(mockTeams[0]);
    expect(mockClose).toHaveBeenCalled();
  });

  it('calls onClose when the close button is clicked', () => {
    render(
      <TeamSelectionModal
        isOpen={true}
        onClose={mockClose}
        onSelectTeam={mockSelectTeam}
        teams={mockTeams}
      />
    );
    
    // Find and click the close button (using the accessible name)
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    
    // Verify onClose was called
    expect(mockClose).toHaveBeenCalled();
    expect(mockSelectTeam).not.toHaveBeenCalled();
  });
}); 