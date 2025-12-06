import { describe, it, expect, test, jest } from '@jest/globals';
import type { IUserRepository } from '../repository/user.repository.js';
import UserService from './user.service.js';
import type { InsertOneResult, Document } from 'mongodb';

describe('UserService', () => {
    const mockUserRepository: jest.Mocked<IUserRepository> = {
        checkUserExists: jest.fn(),
        saveUser: jest.fn(),
        findUserByEmail: jest.fn(),
        findUserByPhoneNumber: jest.fn(),
    }
    test('should register a new user successfully', async () => {
        // arrange
        mockUserRepository.checkUserExists.mockResolvedValueOnce({
            err: false,
            desc: "User not found",
            data: false
        })

        mockUserRepository.saveUser.mockResolvedValueOnce({
            err: false,
            desc: "User saved successfully",
            data: {
                "acknowledged": true,
                "insertedId": "6933edd5be12e43ce3f296cb"
            } as unknown as InsertOneResult<Document>
        });

        // act
        const userService = new UserService(mockUserRepository);
        const result = await userService.register({
            firstName: "John",
            lastName: "Doe",
            email: "john.doe@example.com",
            password: "password123"
        })
        // assert
        expect(result).toEqual({
            "acknowledged": true,
            "insertedId": "6933edd5be12e43ce3f296cb"
        });
    })
})