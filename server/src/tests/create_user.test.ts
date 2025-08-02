
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test inputs for different user types
const teacherInput: CreateUserInput = {
  email: 'teacher@example.com',
  name: 'John Teacher',
  role: 'teacher'
};

const studentInput: CreateUserInput = {
  email: 'student@example.com',
  name: 'Jane Student',
  role: 'student'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a teacher user', async () => {
    const result = await createUser(teacherInput);

    // Basic field validation
    expect(result.email).toEqual('teacher@example.com');
    expect(result.name).toEqual('John Teacher');
    expect(result.role).toEqual('teacher');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a student user', async () => {
    const result = await createUser(studentInput);

    // Basic field validation
    expect(result.email).toEqual('student@example.com');
    expect(result.name).toEqual('Jane Student');
    expect(result.role).toEqual('student');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(teacherInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('teacher@example.com');
    expect(users[0].name).toEqual('John Teacher');
    expect(users[0].role).toEqual('teacher');
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should enforce unique email constraint', async () => {
    // Create first user
    await createUser(teacherInput);

    // Try to create another user with same email
    await expect(createUser(teacherInput)).rejects.toThrow(/unique/i);
  });

  it('should create multiple users with different emails', async () => {
    const teacher = await createUser(teacherInput);
    const student = await createUser(studentInput);

    // Verify both users exist
    const allUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(allUsers).toHaveLength(2);
    expect(allUsers.map(u => u.email)).toContain('teacher@example.com');
    expect(allUsers.map(u => u.email)).toContain('student@example.com');
    expect(teacher.id).not.toEqual(student.id);
  });
});
