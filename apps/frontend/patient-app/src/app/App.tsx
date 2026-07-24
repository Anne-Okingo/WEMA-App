import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './error-boundary';
import { routes } from './routes';

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {routes.map((route, index) => (
            <Route key={index} path={route.path} element={route.element} />
          ))}
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
