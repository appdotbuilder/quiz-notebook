
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, quizzesTable } from '../db/schema';
import { type UpdateQuizInput } from '../schema';
import { updateQuiz } from '../handlers/update_quiz';
import { eq } from 'drizzle-orm';

describe('updateQuiz', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let teacherId: number;
  let quizId: number;

  beforeEach(async () => {
    // Create teacher user
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();
    teacherId = teacherResult[0].id;

    // Create quiz to update
    const quizResult = await db.insert(quizzesTable)
      .values({
        title: 'Original Quiz Title',
        description: 'Original description',
        teacher_id: teacherId,
        is_published: false
      })
      .returning()
      .execute();
    quizId = quizResult[0].id;
  });

  it('should update quiz title', async () => {
    const input: UpdateQuizInput = {
      id: quizId,
      title: 'Updated Quiz Title'
    };

    const result = await updateQuiz(input);

    expect(result.id).toEqual(quizId);
    expect(result.title).toEqual('Updated Quiz Title');
    expect(result.description).toEqual('Original description');
    expect(result.is_published).toEqual(false);
    expect(result.teacher_id).toEqual(teacherId);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update quiz description', async () => {
    const input: UpdateQuizInput = {
      id: quizId,
      description: 'Updated description'
    };

    const result = await updateQuiz(input);

    expect(result.title).toEqual('Original Quiz Title');
    expect(result.description).toEqual('Updated description');
    expect(result.is_published).toEqual(false);
  });

  it('should update publication status', async () => {
    const input: UpdateQuizInput = {
      id: quizId,
      is_published: true
    };

    const result = await updateQuiz(input);

    expect(result.title).toEqual('Original Quiz Title');
    expect(result.description).toEqual('Original description');
    expect(result.is_published).toEqual(true);
  });

  it('should update multiple fields simultaneously', async () => {
    const input: UpdateQuizInput = {
      id: quizId,
      title: 'New Title',
      description: 'New description',
      is_published: true
    };

    const result = await updateQuiz(input);

    expect(result.title).toEqual('New Title');
    expect(result.description).toEqual('New description');
    expect(result.is_published).toEqual(true);
    expect(result.teacher_id).toEqual(teacherId);
  });

  it('should set description to null when explicitly provided', async () => {
    const input: UpdateQuizInput = {
      id: quizId,
      description: null
    };

    const result = await updateQuiz(input);

    expect(result.description).toBeNull();
    expect(result.title).toEqual('Original Quiz Title');
  });

  it('should update the quiz in database', async () => {
    const input: UpdateQuizInput = {
      id: quizId,
      title: 'Database Updated Title',
      is_published: true
    };

    await updateQuiz(input);

    // Verify database was updated
    const quizzes = await db.select()
      .from(quizzesTable)
      .where(eq(quizzesTable.id, quizId))
      .execute();

    expect(quizzes).toHaveLength(1);
    expect(quizzes[0].title).toEqual('Database Updated Title');
    expect(quizzes[0].is_published).toEqual(true);
    expect(quizzes[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update the updated_at timestamp', async () => {
    const originalQuiz = await db.select()
      .from(quizzesTable)
      .where(eq(quizzesTable.id, quizId))
      .execute();

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateQuizInput = {
      id: quizId,
      title: 'Time Updated Title'
    };

    const result = await updateQuiz(input);

    expect(result.updated_at > originalQuiz[0].updated_at).toBe(true);
  });

  it('should throw error when quiz does not exist', async () => {
    const input: UpdateQuizInput = {
      id: 99999,
      title: 'Nonexistent Quiz'
    };

    expect(updateQuiz(input)).rejects.toThrow(/Quiz with id 99999 not found/i);
  });
});
