import React from 'react';
import { render, screen } from '@testing-library/react';
import { App } from '../src/app/App';

describe('Psychologist Portal integration', () => {
  it('renders placeholder content', () => {
    render(<App />);
    expect(screen.getByText('WEMA Psychologist Portal')).toBeDefined();
    expect(screen.getByText('Phase 1 — application foundation in progress.')).toBeDefined();
  });
});
