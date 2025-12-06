import { MongoClient, MongoError, type Document, type InsertOneResult } from 'mongodb'

interface IUserRepository {
    checkUserExists(email: string): Promise<ResponseData<boolean>>;
    saveUser(user: any): Promise<ResponseData<InsertOneResult<Document>>>
    findUserByEmail(email: string): Promise<ResponseData<Document | null>>;
    findUserByPhoneNumber(phoneNumber: string): Promise<ResponseData<Document | null>>;
}

type ResponseData<T = any> = {
    err: false,
    desc: string,
    data: T
} | {
    err: true,
    desc: string,
    data: unknown | null
}

type UserModel = {
    // id: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phoneNumber?: string | undefined;
    avatarUrl?: string | undefined;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date | null
}
class UserMongoRepository implements IUserRepository {
    private readonly dbName = "myProject"
    private readonly collectionName = "users"
    constructor(private readonly client: MongoClient) { }

    private getCollection() {
        const db = this.client.db(this.dbName);
        return db.collection(this.collectionName);
    }

    public async checkUserExists(email: string): Promise<ResponseData<boolean>> {
        try {
            const existingUser = await this.getCollection().countDocuments({
                email,
                deletedAt: null
            });

            return {
                err: false,
                desc: "Check user existence successful",
                data: existingUser > 0
            }
        } catch (error) {
            console.error('Error checking user existence:', error);
            if (error instanceof MongoError) {
                return {
                    err: true,
                    desc: `MongoDB error: ${error.message}`,
                    data: null
                }
            }

            return {
                err: true,
                desc: "error",
                data: error
            }
        }
    }

    public async saveUser(user: UserModel): Promise<ResponseData<InsertOneResult<Document>>> {
        try {
            const result = await this.getCollection().insertOne(user);
            return {
                err: false,
                desc: "User saved successfully",
                data: result
            };
        } catch (error) {
            console.error('Error checking user existence:', error);
            if (error instanceof MongoError) {
                return {
                    err: true,
                    desc: `MongoDB error: ${error.message}`,
                    data: null
                }
            }
            return {
                err: true,
                desc: "error",
                data: error
            }
        }
    }

    public async findUserByEmail(email: string): Promise<ResponseData<Document | null>> {
        try {
            const user = await this.getCollection().findOne({ email, deletedAt: null });
            return {
                err: false,
                desc: "User found successfully",
                data: user
            };
        } catch (error) {
            console.error('Error finding user by email:', error);
            if (error instanceof MongoError) {
                return {
                    err: true,
                    desc: `MongoDB error: ${error.message}`,
                    data: null
                }
            }
            return {
                err: true,
                desc: "error",
                data: error
            }
        }
    }

    public async findUserByPhoneNumber(phoneNumber: string): Promise<ResponseData<Document | null>> {
        try {
            const user = await this.getCollection().findOne({ phoneNumber, deletedAt: null });
            return {
                err: false,
                desc: "User found successfully",
                data: user
            };
        } catch (error) {
            console.error('Error finding user by phone number:', error);
            if (error instanceof MongoError) {
                return {
                    err: true,
                    desc: `MongoDB error: ${error.message}`,
                    data: null
                }
            }
            return {
                err: true,
                desc: "error",
                data: error
            }
        }
    }
}

export type { IUserRepository, UserModel };
export default UserMongoRepository;