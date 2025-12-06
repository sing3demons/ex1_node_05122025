import express, { type Request, type Response } from 'express';
import { MongoClient } from 'mongodb'
import { z } from 'zod';
import http, { Server } from 'http';
import bcrypt from 'bcrypt';
import UserMongoRepository from './repository/user.repository.js';
import UserService from './service/user.service.js';
import { RegisterSchema } from './schema/schema.js';
import UserController from './controller/user.controller.js';

type UserModel = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phoneNumber?: string;
    avatarUrl?: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
}


async function connectToDatabase(): Promise<MongoClient> {
    // Placeholder for future database connection logic
    const url = process.env.MONGODB_URL || 'mongodb://localhost:27017';
    console.log(`Connecting to MongoDB at ${url}...`);
    const client = new MongoClient(url);

    await client.connect();
    console.log('Connected successfully to server');
    console.log(`Connected to MongoDB at ${url}`);
    return client;
}

const createMongoConnection = async () => {
    const maxReconnectAttempts = 5;
    const reconnectInterval = 5000; // 5 seconds
    let currentReconnectAttempts = 0;

    const connectWithRetry = async (): Promise<MongoClient> => {
        try {
            const url = process.env.MONGODB_URL || 'mongodb://localhost:27017';
            console.log(`Connecting to MongoDB at ${url}...`);
            const client = new MongoClient(url);

            await client.connect();
            console.log('Connected successfully to server');
            console.log(`Connected to MongoDB at ${url}`);
            return client;
        } catch (error) {
            if (currentReconnectAttempts < maxReconnectAttempts) {
                currentReconnectAttempts++;
                console.error(`MongoDB connection failed. Retrying in ${reconnectInterval / 1000} seconds... (${currentReconnectAttempts}/${maxReconnectAttempts})`);
                await new Promise(res => setTimeout(res, reconnectInterval));
                return connectWithRetry();
            } else {
                throw new Error('Max reconnect attempts reached. Could not connect to MongoDB.');
            }
        }
    };

    return connectWithRetry();
}


async function main() {
    const client = await createMongoConnection();

    // di user
    const userRepository = new UserMongoRepository(client);
    const userService = new UserService(userRepository);
    const userController = new UserController(userService);

    // Placeholder for future asynchronous operations
    const app = express();
    const port = process.env.PORT || 3000;
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.get('/health', async (_req: Request, res: Response) => {
        res.json({
            status: 'OK',
        });
    });

    // app.post("/register", (req: Request, res: Response) => userController.register(req, res));
    app.post("/register", userController.register);

    const server = http.createServer(app);
    server.listen(port);

    const shutdown = createShutdown(server, [
        { name: 'MongoDB', close: () => client.close() },
    ]);
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    console.log(`Server started on port ${port}`);
}


(async () => {
    await main();
    console.log('Hello, World!');
})();



interface CleanupResource {
    name: string;
    close: () => Promise<void> | void;
}

export function createShutdown(
    server: Server,
    resources: CleanupResource[] = [],
    delay: number = 10000
) {
    return async function shutdown(signal: string) {
        console.log(`\n[SHUTDOWN] Received ${signal}. Shutting down gracefully...`);

        // 1. Stop accepting new connections
        const closeServer = new Promise<void>((resolve, reject) => {
            server.close((err) => {
                if (err) {
                    console.error('[SHUTDOWN] Server close error:', err);
                    return reject(err);
                }
                console.log('[SHUTDOWN] HTTP server closed.');
                resolve();
            });
        });

        // 2. Close external resources (DB / Redis / etc.)
        const closeResources = Promise.all(
            resources.map(async (r) => {
                try {
                    console.log(`[SHUTDOWN] Closing ${r.name}...`);
                    await r.close();
                    console.log(`[SHUTDOWN] ${r.name} closed.`);
                } catch (err) {
                    console.error(`[SHUTDOWN] Failed to close ${r.name}:`, err);
                }
            })
        );

        // 3. Timeout fallback (force exit)
        const forceExit = new Promise((_res, reject) => {
            setTimeout(() => {
                reject(new Error('Shutdown timeout, forcing exit.'));
            }, delay).unref();
        });

        try {
            await Promise.race([Promise.all([closeServer, closeResources]), forceExit]);
            console.log('[SHUTDOWN] Graceful shutdown complete.');
            process.exit(0);
        } catch (err) {
            console.error('[SHUTDOWN] Forced shutdown:', err);
            process.exit(1);
        }
    };
}