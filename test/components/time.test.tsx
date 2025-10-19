// test/components/time.test.tsx

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Time, TimeRange } from '@/components/time';

describe('Time Component', () => {
  const testDate = new Date('2023-05-15T12:00:00Z');

  it('renders with default options', () => {
    render(<Time date={testDate} />);

    // Get the time element
    const timeElement = screen.getByText(/15\. maj 2023/i);
    expect(timeElement).toBeInTheDocument();
    expect(timeElement.tagName).toBe('TIME');
    expect(timeElement).toHaveAttribute('datetime', testDate.toUTCString());
  });

  it('applies custom className', () => {
    render(<Time date={testDate} className="custom-class" />);

    const timeElement = screen.getByText(/15\. maj 2023/i);
    expect(timeElement).toHaveClass('custom-class');
  });

  it('formats date with custom options', () => {
    render(
      <Time
        date={testDate}
        options={{
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }}
      />
    );

    // Check for more verbose format (e.g., "15. maj 2023" vs "15. maj 2023")
    const timeElement = screen.getByText(/15\. maj 2023/i);
    expect(timeElement).toBeInTheDocument();
  });

  it('handles string date input', () => {
    render(<Time date="2023-05-15T12:00:00Z" />);

    const timeElement = screen.getByText(/15\. maj 2023/i);
    expect(timeElement).toBeInTheDocument();
  });
});

describe('TimeRange Component', () => {
  const startDate = new Date('2023-05-15T12:00:00Z');
  const endDate = new Date('2023-05-20T12:00:00Z');

  it('renders date range with default options', () => {
    render(<TimeRange startDate={startDate} endDate={endDate} />);

    // In Slovenian locale, this would look something like "15.–20. maj 2023"
    // Using a regex to be more flexible with the exact format
    const timeElement = screen.getByText(/15.*20.*maj.*2023/i);
    expect(timeElement).toBeInTheDocument();
    expect(timeElement.tagName).toBe('TIME');

    // Check that the datetime attribute contains both dates
    expect(timeElement).toHaveAttribute(
      'datetime',
      `${startDate.toISOString().split('T')[0]}/${endDate.toISOString().split('T')[0]}`
    );
  });

  it('applies custom className', () => {
    render(
      <TimeRange
        startDate={startDate}
        endDate={endDate}
        className="custom-class"
      />
    );

    const timeElement = screen.getByText(/15.*20.*maj.*2023/i);
    expect(timeElement).toHaveClass('custom-class');
  });

  it('formats date range with custom options', () => {
    render(
      <TimeRange
        startDate={startDate}
        endDate={endDate}
        options={{
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }}
      />
    );

    // Check for more verbose format
    const timeElement = screen.getByText(/15.*20.*maj.*2023/i);
    expect(timeElement).toBeInTheDocument();
  });

  it('handles string date inputs', () => {
    render(
      <TimeRange
        startDate="2023-05-15T12:00:00Z"
        endDate="2023-05-20T12:00:00Z"
      />
    );

    const timeElement = screen.getByText(/15.*20.*maj.*2023/i);
    expect(timeElement).toBeInTheDocument();
  });
});
