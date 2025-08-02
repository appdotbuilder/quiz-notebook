
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, quizzesTable, questionsTable, quizAttemptsTable } from '../db/schema';
import { type StartQuizAttemptInput } from '../schema';
import { startQuizAttempt } from '../handlers/start_quiz_attempt';
import { eq } from 'drizzle-orm';

describe('startQuizAttempt', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a quiz attempt for a published quiz', async () => {
    // Create teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create student
    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();

    const studentId = studentResult[0].id;

    // Create published quiz
    const quizResult = await db.insert(quizzesTable)
      .values({
        title: 'Test Quiz',
        description: 'A test quiz',
        teacher_id: teacherId,
        is_published: true
      })
      .returning()
      .execute();

    const quizId = quizResult[0].id;

    // Create questions with different point values
    await db.insert(questionsTable)
      .values([
        {
          quiz_id: quizId,
          type: 'multiple_choice',
          question_text: 'Question 1',
          options: ['A', 'B', 'C', 'D'],
          correct_answer: 'A',
          points: '10.5',
          order_index: 1
        },
        {
          quiz_id: quizId,
          type: 'true_false',
          question_text: 'Question 2',
          correct_answer: 'true',
          points: '5.5',
          order_index: 2
        }
      ])
      .execute();

    const input: StartQuizAttemptInput = {
      quiz_id: quizId,
      student_id: studentId
    };

    const result = await startQuizAttempt(input);

    // Verify attempt creation
    expect(result.id).toBeDefined();
    expect(result.quiz_id).toEqual(quizId);
    expect(result.student_id).toEqual(studentId);
    expect(result.started_at).toBeInstanceOf(Date);
    expect(result.completed_at).toBeNull();
    expect(result.total_score).toBeNull();
    expect(result.max_score).toEqual(16); // 10.5 + 5.5
    expect(typeof result.max_score).toBe('number');
  });

  it('should save attempt to database with correct max score', async () => {
    // Create teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create student
    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();

    const studentId = studentResult[0].id;

    // Create published quiz
    const quizResult = await db.insert(quizzesTable)
      .values({
        title: 'Test Quiz',
        description: 'A test quiz',
        teacher_id: teacherId,
        is_published: true
      })
      .returning()
      .execute();

    const quizId = quizResult[0].id;

    // Create questions
    await db.insert(questionsTable)
      .values([
        {
          quiz_id: quizId,
          type: 'multiple_choice',
          question_text: 'Question 1',
          points: '25',
          order_index: 1
        },
        {
          quiz_id: quizId,
          type: 'short_answer',
          question_text: 'Question 2',
          points: '15',
          order_index: 2
        }
      ])
      .execute();

    const input: StartQuizAttemptInput = {
      quiz_id: quizId,
      student_id: studentId
    };

    const result = await startQuizAttempt(input);

    // Verify database record
    const attempts = await db.select()
      .from(quizAttemptsTable)
      .where(eq(quizAttemptsTable.id, result.id))
      .execute();

    expect(attempts).toHaveLength(1);
    expect(attempts[0].quiz_id).toEqual(quizId);
    expect(attempts[0].student_id).toEqual(studentId);
    expect(parseFloat(attempts[0].max_score)).toEqual(40); // 25 + 15
    expect(attempts[0].total_score).toBeNull();
    expect(attempts[0].completed_at).toBeNull();
    expect(attempts[0].started_at).toBeInstanceOf(Date);
  });

  it('should handle quiz with no questions (max score 0)', async () => {
    // Create teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create student
    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();

    const studentId = studentResult[0].id;

    // Create published quiz with no questions
    const quizResult = await db.insert(quizzesTable)
      .values({
        title: 'Empty Quiz',
        teacher_id: teacherId,
        is_published: true
      })
      .returning()
      .execute();

    const quizId = quizResult[0].id;

    const input: StartQuizAttemptInput = {
      quiz_id: quizId,
      student_id: studentId
    };

    const result = await startQuizAttempt(input);

    expect(result.max_score).toEqual(0);
    expect(typeof result.max_score).toBe('number');
  });

  it('should throw error for non-existent quiz', async () => {
    // Create student
    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();

    const input: StartQuizAttemptInput = {
      quiz_id: 999999, // Non-existent quiz
      student_id: studentResult[0].id
    };

    await expect(startQuizAttempt(input)).rejects.toThrow(/quiz not found/i);
  });

  it('should throw error for unpublished quiz', async () => {
    // Create teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create student
    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();

    const studentId = studentResult[0].id;

    // Create unpublished quiz
    const quizResult = await db.insert(quizzesTable)
      .values({
        title: 'Unpublished Quiz',
        teacher_id: teacherId,
        is_published: false
      })
      .returning()
      .execute();

    const input: StartQuizAttemptInput = {
      quiz_id: quizResult[0].id,
      student_id: studentId
    };

    await expect(startQuizAttempt(input)).rejects.toThrow(/quiz is not published/i);
  });

  it('should throw error for non-existent student', async () => {
    // Create teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create published quiz
    const quizResult = await db.insert(quizzesTable)
      .values({
        title: 'Test Quiz',
        teacher_id: teacherId,
        is_published: true
      })
      .returning()
      .execute();

    const input: StartQuizAttemptInput = {
      quiz_id: quizResult[0].id,
      student_id: 999999 // Non-existent student
    };

    await expect(startQuizAttempt(input)).rejects.toThrow(/student not found/i);
  });

  it('should throw error when user is not a student', async () => {
    // Create teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create published quiz
    const quizResult = await db.insert(quizzesTable)
      .values({
        title: 'Test Quiz',
        teacher_id: teacherId,
        is_published: true
      })
      .returning()
      .execute();

    const input: StartQuizAttemptInput = {
      quiz_id: quizResult[0].id,
      student_id: teacherId // Teacher trying to take quiz
    };

    await expect(startQuizAttempt(input)).rejects.toThrow(/user is not a student/i);
  });
});
