// hook to handle keyboard navigation for tabs on the make picks page
import { useCallback, useEffect } from 'react';

interface KeyboardNavigationOptions {
  activeIndex: number;
  itemsCount: number;
  onNavigate: (newIndex: number) => void;
  disableInInputs?: boolean;
  leftKey?: string;
  rightKey?: string;
}

export function useKeyboardNavigation({
  activeIndex,
  itemsCount,
  onNavigate,
  disableInInputs = true,
  leftKey = 'ArrowLeft',
  rightKey = 'ArrowRight'
}: KeyboardNavigationOptions) {
  
  const handleKeyboardNavigation = useCallback((event: KeyboardEvent) => {
    // Dont do it if the user is typing in an input field and disableInInputs is true
    if (disableInInputs && (
        event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement)
    ) {
      return;
    }
    
    // Left arrow key (previous item)
    if (event.key === leftKey && activeIndex > 0) {
      onNavigate(activeIndex - 1);
    }
    
    // Right arrow key (next item)
    if (event.key === rightKey && activeIndex < itemsCount - 1) {
      onNavigate(activeIndex + 1);
    }
  }, [activeIndex, itemsCount, onNavigate, disableInInputs, leftKey, rightKey]);

  // Set up event listener for keyboard navigation
  useEffect(() => {
    window.addEventListener('keydown', handleKeyboardNavigation);
    
    // Clean up event listener
    return () => {
      window.removeEventListener('keydown', handleKeyboardNavigation);
    };
  }, [handleKeyboardNavigation]);

  return {
    handleKeyboardNavigation
  };
} 