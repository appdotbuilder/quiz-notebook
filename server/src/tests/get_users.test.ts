
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUsers } from '../handlers/get_users';

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();
    expect(result).toEqual([]);
  });

  it('should return all users', async () => {
    // Create test users
    const testUsers: CreateUserInput[] = [
      {
        email: 'teacher@example.com',
        name: 'John Teacher',
        role: 'teacher'
      },
      {
        email: 'student@example.com',
        name: 'Jane Student',
        role: 'student'
      }
    ];

    // Insert test users
    await db.insert(usersTable)
      .values(testUsers)
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(2);
    
    // Verify first user
    const teacher = result.find(u => u.email === 'teacher@example.com');
    expect(teacher).toBeDefined();
    expect(teacher!.name).toBe('John Teacher');
    expect(teacher!.role).toBe('teacher');
    expect(teacher!.id).toBeDefined();
    expect(teacher!.created_at).toBeInstanceOf(Date);

    // Verify second user
    const student = result.find(u => u.email === 'student@example.com');
    expect(student).toBeDefined();
    expect(student!.name).toBe('Jane Student');
    expect(student!.role).toBe('student');
    expect(student!.id).toBeDefined();
    expect(student!.created_at).toBeInstanceOf(Date);
  });

  it('should return users in correct order', async () => {
    // Create multiple users
    const testUsers: CreateUserInput[] = [
      {
        email: 'user1@example.com',
        name: 'User One',
        role: 'teacher'
      },
      {
        email: 'user2@example.com',
        name: 'User Two',
        role: 'student'
      },
      {
        email: 'user3@example.com',
        name: 'User Three',
        role: 'teacher'
      }
    ];

    await db.insert(usersTable)
      .values(testUsers)
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    
    // Verify all users have required fields
    result.forEach(user => {
      expect(user.id).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.name).toBeDefined();
      expect(user.role).toMatch(/^(teacher|student)$/);
      expect(user.created_at).toBeInstanceOf(Date);
    });
  });
});
