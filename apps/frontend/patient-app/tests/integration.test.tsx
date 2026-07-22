import React from 'react';
import { render, screen } from '@testing-library/react';
import { startup } from '../src/app/startup';
import { Providers } from '../src/app/providers';
import { App } from '../src/app/App';

describe('Patient App integration', () => {
  it('renders placeholder content', async () => {
    await startup();
    render(
      <Providers>
        <App />
      </Providers>
    );
    expect(screen.getByText('WEMA Patient App')).toBeDefined();
    expect(screen.getByText('Phase 1 — application foundation in progress.')).toBeDefined();
  });
});
