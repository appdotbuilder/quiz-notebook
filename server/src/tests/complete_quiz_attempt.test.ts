
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, quizzesTable, questionsTable, quizAttemptsTable, answersTable } from '../db/schema';
import { type CompleteQuizAttemptInput } from '../schema';
import { completeQuizAttempt } from '../handlers/complete_quiz_attempt';
import { eq } from 'drizzle-orm';

describe('completeQuizAttempt', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should complete a quiz attempt and calculate total score', async () => {
    // Create test teacher
    const teacher = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    // Create test student  
    const student = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();

    // Create test quiz
    const quiz = await db.insert(quizzesTable)
      .values({
        title: 'Test Quiz',
        description: 'A quiz for testing',
        teacher_id: teacher[0].id,
        is_published: true
      })
      .returning()
      .execute();

    // Create test questions
    const question1 = await db.insert(questionsTable)
      .values({
        quiz_id: quiz[0].id,
        type: 'multiple_choice',
        question_text: 'What is 2+2?',
        options: ['3', '4', '5'],
        correct_answer: '4',
        points: '10',
        order_index: 1
      })
      .returning()
      .execute();

    const question2 = await db.insert(questionsTable)
      .values({
        quiz_id: quiz[0].id,
        type: 'true_false',
        question_text: 'The sky is blue',
        correct_answer: 'true',
        points: '5',
        order_index: 2
      })
      .returning()
      .execute();

    // Create quiz attempt
    const attempt = await db.insert(quizAttemptsTable)
      .values({
        quiz_id: quiz[0].id,
        student_id: student[0].id,
        max_score: '15'
      })
      .returning()
      .execute();

    // Create answers with points earned
    await db.insert(answersTable)
      .values([
        {
          attempt_id: attempt[0].id,
          question_id: question1[0].id,
          answer_text: '4',
          is_correct: true,
          points_earned: '10'
        },
        {
          attempt_id: attempt[0].id,
          question_id: question2[0].id,
          answer_text: 'true',
          is_correct: true,
          points_earned: '5'
        }
      ])
      .execute();

    const input: CompleteQuizAttemptInput = {
      attempt_id: attempt[0].id
    };

    const result = await completeQuizAttempt(input);

    // Verify completion
    expect(result.id).toEqual(attempt[0].id);
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(result.total_score).toEqual(15);
    expect(result.max_score).toEqual(15);
    expect(typeof result.total_score).toBe('number');
    expect(typeof result.max_score).toBe('number');
  });

  it('should save completion to database', async () => {
    // Create prerequisite data
    const teacher = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const student = await db.insert(usersTable)
      .values({
        email: 'student@test.com', 
        name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();

    const quiz = await db.insert(quizzesTable)
      .values({
        title: 'Test Quiz',
        teacher_id: teacher[0].id,
        is_published: true
      })
      .returning()
      .execute();

    const attempt = await db.insert(quizAttemptsTable)
      .values({
        quiz_id: quiz[0].id,
        student_id: student[0].id,
        max_score: '10'
      })
      .returning()
      .execute();

    const input: CompleteQuizAttemptInput = {
      attempt_id: attempt[0].id
    };

    await completeQuizAttempt(input);

    // Verify database state
    const attempts = await db.select()
      .from(quizAttemptsTable)
      .where(eq(quizAttemptsTable.id, attempt[0].id))
      .execute();

    expect(attempts).toHaveLength(1);
    expect(attempts[0].completed_at).toBeInstanceOf(Date);
    expect(attempts[0].total_score).toBeDefined();
  });

  it('should handle zero score correctly', async () => {
    // Create prerequisite data
    const teacher = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher', 
        role: 'teacher'
      })
      .returning()
      .execute();

    const student = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();

    const quiz = await db.insert(quizzesTable)
      .values({
        title: 'Test Quiz',
        teacher_id: teacher[0].id,
        is_published: true
      })
      .returning()
      .execute();

    const attempt = await db.insert(quizAttemptsTable)
      .values({
        quiz_id: quiz[0].id,
        student_id: student[0].id,
        max_score: '10'
      })
      .returning()
      .execute();

    // No answers created - should result in 0 score

    const input: CompleteQuizAttemptInput = {
      attempt_id: attempt[0].id
    };

    const result = await completeQuizAttempt(input);

    expect(result.total_score).toEqual(0);
    expect(typeof result.total_score).toBe('number');
  });

  it('should throw error for non-existent attempt', async () => {
    const input: CompleteQuizAttemptInput = {
      attempt_id: 99999
    };

    expect(completeQuizAttempt(input)).rejects.toThrow(/not found/i);
  });

  it('should throw error for already completed attempt', async () => {
    // Create prerequisite data
    const teacher = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const student = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();

    const quiz = await db.insert(quizzesTable)
      .values({
        title: 'Test Quiz',
        teacher_id: teacher[0].id,
        is_published: true
      })
      .returning()
      .execute();

    // Create already completed attempt
    const attempt = await db.insert(quizAttemptsTable)
      .values({
        quiz_id: quiz[0].id,
        student_id: student[0].id,
        completed_at: new Date(),
        total_score: '10',
        max_score: '10'
      })
      .returning()
      .execute();

    const input: CompleteQuizAttemptInput = {
      attempt_id: attempt[0].id
    };

    expect(completeQuizAttempt(input)).rejects.toThrow(/already completed/i);
  });
});
