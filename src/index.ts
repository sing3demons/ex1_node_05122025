import express, { type Request, type Response } from 'express';
import { MongoClient } from 'mongodb'
import { z } from 'zod';
import http, { Server } from 'http';
import bcrypt from 'bcrypt';

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
const RegisterSchema = z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string(),
    password: z.string().min(6),
    phoneNumber: z.string().optional(),
    avatarUrl: z.string().optional(),
})

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
            const client = await connectToDatabase();
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
    // Database Name
    const dbName = 'myProject';
    const db = client.db(dbName);
    // const collection = db.collection('users');

    // Placeholder for future asynchronous operations
    const app = express();
    const port = process.env.PORT || 3000;
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.get('/wait', async (_req: Request, res: Response) => {
        const endpoint = 'GET /wait';
        const startTime = new Date();
        const totalSeconds = 9; // ลดเหลือ 10 วินาทีเพื่อทดสอบ
        console.log(`[${startTime.toISOString()}] [${endpoint}] Request received`);

        for (let remaining = totalSeconds; remaining > 0; remaining--) {
            console.log(`[${new Date().toISOString()}] [${endpoint}] Countdown: ${remaining}s remaining...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const endTime = new Date();
        const duration = (endTime.getTime() - startTime.getTime()) / 1000;
        console.log(`[${endTime.toISOString()}] [${endpoint}] Completed (took ${duration}s)`);
        res.json({ status: 'OK' });
    });

    app.get('/health', async (_req: Request, res: Response) => {
        const endpoint = 'GET /health';
        const startTime = new Date();


        const endTime = new Date();
        const duration = (endTime.getTime() - startTime.getTime()) / 1000;
        console.log(`[${endTime.toISOString()}] [${endpoint}] Completed (took ${duration}s)`);
        res.json({
            status: 'OK',
            durationInSeconds: duration,
            timestamp: endTime.toISOString(),
        });
    });

    app.post("/register", async (req: Request, res: Response) => {
        try {
            console.log("Register endpoint hit");
            // validation 
            const body = RegisterSchema.parse(req.body);

            // business logic
            // - check if user already exists
            const collection = db.collection('users');
            const existingUser = await collection.countDocuments({ email: body.email, deletedAt: null });
            if (existingUser > 0) {
                return res.status(400).json({ error: "User already exists" });
            }
            // - hash password
            const saltRounds = await bcrypt.genSalt(10); // ค่ามาตรฐาน (ยิ่งสูงยิ่งช้าแต่ปลอดภัย)
            const hashedPassword = await bcrypt.hash(body.password, saltRounds);

            const doc = {
                ...body,
                password: hashedPassword,
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
            }
            // - store user in database
            const result = await collection.insertOne(doc);

            res.json({ message: "User registered successfully", data: result });
        } catch (error) {
            if (error instanceof z.ZodError) {
                console.error("Validation error:", error.issues);
                return res.status(400).json({ errors: error.issues });
            }
            res.status(500).json({ error: "Internal Server Error" });

        }

    });

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