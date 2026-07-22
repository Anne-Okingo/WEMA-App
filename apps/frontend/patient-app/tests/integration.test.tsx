import React from 'react';
import { render, screen } from '@testing-library/react';
import { App } from '../src/app/App';

describe('Patient App integration', () => {
  it('renders placeholder content', () => {
    render(<App />);
    expect(screen.getByText('WEMA Patient App')).toBeDefined();
    expect(screen.getByText('Phase 1 — application foundation in progress.')).toBeDefined();
  });
});
