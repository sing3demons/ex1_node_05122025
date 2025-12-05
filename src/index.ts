import express, { type Request, type Response } from 'express';
import { MongoClient } from 'mongodb'
import { z } from 'zod';
import http from 'http';
import bcrypt from 'bcrypt';

type UserModel = {
    id: number;
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


async function main() {
    const client = await connectToDatabase();
    // Database Name
    const dbName = 'myProject';
    const db = client.db(dbName);
    // const collection = db.collection('users');

    // Placeholder for future asynchronous operations
    const app = express();
    const port = process.env.PORT || 3000;
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.get('/health', (_req: Request, res: Response) => {
        res.json({ status: 'OK' });
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
    server.listen(port, () => {
        console.log(`Server is running at http://localhost:${port}`);
    });
}


(async () => {
    await main();
    console.log('Hello, World!');
})();