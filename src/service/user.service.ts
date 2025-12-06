import { MongoError } from "mongodb";
import type { IUserRepository } from "../repository/user.repository.js";
import bcrypt from 'bcrypt';
import type { RegisterInput } from "../schema/schema.js";

class UserService {
    constructor(private readonly userRepository: IUserRepository) { }
    public async register(body: RegisterInput) {
        try {
            const existingUser = await this.userRepository.checkUserExists(body.email);
            if (existingUser.err) {
                throw new Error(existingUser.desc);
            }

            if (existingUser.data) {
                // return { error: "User already exists" };
                throw new Error("User already exists");
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

            const result = await this.userRepository.saveUser(doc);
            if (result.err) {
                throw new Error(result.desc);
            }
            return result.data
        } catch (error) {
            throw error;
        }
    }

}
export default UserService;