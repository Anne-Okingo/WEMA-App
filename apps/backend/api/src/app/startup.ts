import { type Express } from 'express';
import { type Server } from 'node:http';

export function startServer(app: Express, port: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = app
      .listen(port, () => {
        console.log(`API listening on port ${port.toString()}`);
        resolve(server);
      })
      .on('error', reject);
  });
}
