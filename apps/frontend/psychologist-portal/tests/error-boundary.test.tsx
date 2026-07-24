import React from 'react';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../src/app/error-boundary';

describe('ErrorBoundary', () => {
  it('renders fallback UI on error', () => {
    const Thrower = () => {
      throw new Error('test error');
      return null;
    };

    render(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong.')).toBeDefined();
  });
});
