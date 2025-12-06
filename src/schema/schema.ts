import { z } from 'zod';

const RegisterSchema = z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string(),
    password: z.string().min(6),
    phoneNumber: z.string().optional(),
    avatarUrl: z.string().optional(),
})

type RegisterInput = z.infer<typeof RegisterSchema>;

export { RegisterSchema, type RegisterInput };