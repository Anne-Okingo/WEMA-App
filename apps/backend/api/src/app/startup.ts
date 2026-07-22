import { connectDatabase } from '@wema/database';
import { type Express } from 'express';
import { type Server } from 'node:http';

export async function startServer(app: Express, port: number): Promise<Server> {
  await connectDatabase();

  return new Promise((resolve, reject) => {
    const server = app
      .listen(port, () => {
        console.log(`API listening on port ${port.toString()}`);
        resolve(server);
      })
      .on('error', reject);
  });
}
