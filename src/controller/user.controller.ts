import type { Request, Response } from "express";
import type UserService from "../service/user.service.js";
import { RegisterSchema } from "../schema/schema.js";
import { z } from "zod";

class UserController {
    constructor(private readonly userService: UserService) { }

    // async register(req: Request, res: Response) {
    public register = async (req: Request, res: Response) => {
        try {
            console.log("Register endpoint hit");
            // validation 
            const body = RegisterSchema.parse(req.body);
            const result = await this.userService.register(body);

            res.json({
                message: "User registered successfully",
                data: result
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                console.error("Validation error:", error.issues);
                return res.status(400).json({ errors: error.issues });
            } else if (error instanceof Error) {
                console.error("Error during registration:", error.message);
                if (error.message === "User already exists") {
                    return res.status(400).json({ error: error.message });
                }
            }
            res.status(500).json({ error: "Internal Server Error" });

        }
    }
}
export default UserController;