
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, quizzesTable } from '../db/schema';
import { getQuizById } from '../handlers/get_quiz_by_id';

describe('getQuizById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return quiz when it exists', async () => {
    // Create a teacher user first
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacher = teacherResult[0];

    // Create a quiz
    const quizResult = await db.insert(quizzesTable)
      .values({
        title: 'Test Quiz',
        description: 'A quiz for testing',
        teacher_id: teacher.id,
        is_published: true
      })
      .returning()
      .execute();

    const quiz = quizResult[0];

    // Test the handler
    const result = await getQuizById(quiz.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(quiz.id);
    expect(result!.title).toEqual('Test Quiz');
    expect(result!.description).toEqual('A quiz for testing');
    expect(result!.teacher_id).toEqual(teacher.id);
    expect(result!.is_published).toEqual(true);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when quiz does not exist', async () => {
    const result = await getQuizById(999);

    expect(result).toBeNull();
  });

  it('should return quiz with null description', async () => {
    // Create a teacher user first
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacher = teacherResult[0];

    // Create a quiz with null description
    const quizResult = await db.insert(quizzesTable)
      .values({
        title: 'Quiz Without Description',
        description: null,
        teacher_id: teacher.id,
        is_published: false
      })
      .returning()
      .execute();

    const quiz = quizResult[0];

    // Test the handler
    const result = await getQuizById(quiz.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(quiz.id);
    expect(result!.title).toEqual('Quiz Without Description');
    expect(result!.description).toBeNull();
    expect(result!.teacher_id).toEqual(teacher.id);
    expect(result!.is_published).toEqual(false);
  });
});
