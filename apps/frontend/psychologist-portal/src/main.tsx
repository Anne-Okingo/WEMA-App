import React from 'react';
import ReactDOM from 'react-dom/client';
import { startup } from './app/startup';
import { Providers } from './app/providers';
import { App } from './app/App';

async function main() {
  await startup();
  const root = document.getElementById('root');
  if (!root) throw new Error('Root element not found');
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <Providers>
        <App />
      </Providers>
    </React.StrictMode>
  );
}

main();
