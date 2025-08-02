
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { quizzesTable, usersTable } from '../db/schema';
import { type CreateQuizInput } from '../schema';
import { createQuiz } from '../handlers/create_quiz';
import { eq } from 'drizzle-orm';

describe('createQuiz', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let teacherId: number;

  beforeEach(async () => {
    // Create a teacher user for testing
    const teacher = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();
    
    teacherId = teacher[0].id;
  });

  it('should create a quiz with required fields', async () => {
    const testInput: CreateQuizInput = {
      title: 'Test Quiz',
      teacher_id: teacherId
    };

    const result = await createQuiz(testInput);

    // Basic field validation
    expect(result.title).toEqual('Test Quiz');
    expect(result.description).toBeNull();
    expect(result.teacher_id).toEqual(teacherId);
    expect(result.is_published).toBe(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a quiz with optional description', async () => {
    const testInput: CreateQuizInput = {
      title: 'Quiz with Description',
      description: 'This is a test quiz with description',
      teacher_id: teacherId
    };

    const result = await createQuiz(testInput);

    expect(result.title).toEqual('Quiz with Description');
    expect(result.description).toEqual('This is a test quiz with description');
    expect(result.teacher_id).toEqual(teacherId);
    expect(result.is_published).toBe(false);
  });

  it('should save quiz to database', async () => {
    const testInput: CreateQuizInput = {
      title: 'Database Test Quiz',
      description: 'Testing database persistence',
      teacher_id: teacherId
    };

    const result = await createQuiz(testInput);

    // Query using proper drizzle syntax
    const quizzes = await db.select()
      .from(quizzesTable)
      .where(eq(quizzesTable.id, result.id))
      .execute();

    expect(quizzes).toHaveLength(1);
    expect(quizzes[0].title).toEqual('Database Test Quiz');
    expect(quizzes[0].description).toEqual('Testing database persistence');
    expect(quizzes[0].teacher_id).toEqual(teacherId);
    expect(quizzes[0].is_published).toBe(false);
    expect(quizzes[0].created_at).toBeInstanceOf(Date);
    expect(quizzes[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle null description correctly', async () => {
    const testInput: CreateQuizInput = {
      title: 'Quiz No Description',
      description: null,
      teacher_id: teacherId
    };

    const result = await createQuiz(testInput);

    expect(result.description).toBeNull();

    // Verify in database
    const quizzes = await db.select()
      .from(quizzesTable)
      .where(eq(quizzesTable.id, result.id))
      .execute();

    expect(quizzes[0].description).toBeNull();
  });

  it('should fail with invalid teacher_id', async () => {
    const testInput: CreateQuizInput = {
      title: 'Invalid Teacher Quiz',
      teacher_id: 99999 // Non-existent teacher ID
    };

    await expect(createQuiz(testInput)).rejects.toThrow(/violates foreign key constraint/i);
  });
});
