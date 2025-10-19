// test/components/theme-toggler-simple.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggler } from '@/components/theme-toggler';

// Create a mock for useTheme
const mockSetTheme = vi.fn();
vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: mockSetTheme,
  }),
}));

describe('ThemeToggler - Simple Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the toggle button', () => {
    render(<ThemeToggler />);

    const button = screen.getByRole('button', { name: /toggle theme/i });
    expect(button).toBeInTheDocument();
  });

  it('has sun and moon icons', () => {
    render(<ThemeToggler />);

    // Check for the icons by their classes
    const sunIcon = document.querySelector('.scale-100.rotate-0');
    const moonIcon = document.querySelector('.scale-0.rotate-90');

    expect(sunIcon).toBeInTheDocument();
    expect(moonIcon).toBeInTheDocument();
  });

  it('opens the dropdown menu when clicked', async () => {
    const user = userEvent.setup();
    render(<ThemeToggler />);

    const button = screen.getByRole('button', { name: /toggle theme/i });
    await user.click(button);

    // Verify dropdown menu appears with theme options
    expect(screen.getByText(/Light/i)).toBeInTheDocument();
    expect(screen.getByText(/Dark/i)).toBeInTheDocument();
    expect(screen.getByText(/System/i)).toBeInTheDocument();
  });

  it('sets the theme to dark when Dark option is clicked', async () => {
    const user = userEvent.setup();
    render(<ThemeToggler />);

    // Open dropdown
    const button = screen.getByRole('button', { name: /toggle theme/i });
    await user.click(button);

    // Click dark option
    const darkOption = screen.getByText(/Dark/i);
    await user.click(darkOption);

    // Verify setTheme was called with 'dark'
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('sets the theme to system when System option is clicked', async () => {
    const user = userEvent.setup();
    render(<ThemeToggler />);

    // Open dropdown
    const button = screen.getByRole('button', { name: /toggle theme/i });
    await user.click(button);

    // Click system option
    const systemOption = screen.getByText(/System/i);
    await user.click(systemOption);

    // Verify setTheme was called with 'system'
    expect(mockSetTheme).toHaveBeenCalledWith('system');
  });
});
