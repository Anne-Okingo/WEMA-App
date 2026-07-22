import React from 'react';
import { render, screen } from '@testing-library/react';
import { App } from '../src/app/App';

describe('App', () => {
  it('renders the placeholder screen', () => {
    render(<App />);
    expect(screen.getByText('WEMA Patient App')).toBeDefined();
  });
});
