import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SingleBirthForm } from '../SingleBirthForm';

describe('SingleBirthForm', () => {
  it('renders month/day/year dropdowns', () => {
    render(<SingleBirthForm />);
    expect(screen.getByLabelText('Month')).toBeInTheDocument();
    expect(screen.getByLabelText('Day')).toBeInTheDocument();
    expect(screen.getByLabelText('Year')).toBeInTheDocument();
  });

  it('hides the hour/minute fields when "I don\'t know my birth time" is checked', () => {
    render(<SingleBirthForm />);
    expect(screen.getByLabelText('Hour')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/know my birth time/));
    expect(screen.queryByLabelText('Hour')).not.toBeInTheDocument();
  });

  it('offers a "Can\'t find your city?" fallback to a country/timezone picker', () => {
    render(<SingleBirthForm />);
    expect(screen.getByLabelText('Birthplace')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Can't find your city/ }));
    expect(screen.getByLabelText('Country')).toBeInTheDocument();
  });
});
