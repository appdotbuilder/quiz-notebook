
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, quizzesTable, quizAttemptsTable } from '../db/schema';
import { getQuizAttempts } from '../handlers/get_quiz_attempts';

describe('getQuizAttempts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when student has no attempts', async () => {
    // Create a student
    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();

    const studentId = studentResult[0].id;

    const attempts = await getQuizAttempts(studentId);

    expect(attempts).toEqual([]);
  });

  it('should return quiz attempts for a specific student', async () => {
    // Create a teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create a student
    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();

    const studentId = studentResult[0].id;

    // Create a quiz
    const quizResult = await db.insert(quizzesTable)
      .values({
        title: 'Test Quiz',
        description: 'A test quiz',
        teacher_id: teacherId
      })
      .returning()
      .execute();

    const quizId = quizResult[0].id;

    // Create quiz attempts
    const attemptResult = await db.insert(quizAttemptsTable)
      .values([
        {
          quiz_id: quizId,
          student_id: studentId,
          total_score: '85.50',
          max_score: '100.00'
        },
        {
          quiz_id: quizId,
          student_id: studentId,
          total_score: null,
          max_score: '100.00'
        }
      ])
      .returning()
      .execute();

    const attempts = await getQuizAttempts(studentId);

    expect(attempts).toHaveLength(2);
    
    // Check first attempt (completed)
    const completedAttempt = attempts.find(a => a.total_score !== null);
    expect(completedAttempt).toBeDefined();
    expect(completedAttempt!.quiz_id).toEqual(quizId);
    expect(completedAttempt!.student_id).toEqual(studentId);
    expect(completedAttempt!.total_score).toEqual(85.50);
    expect(typeof completedAttempt!.total_score).toBe('number');
    expect(completedAttempt!.max_score).toEqual(100.00);
    expect(typeof completedAttempt!.max_score).toBe('number');
    expect(completedAttempt!.started_at).toBeInstanceOf(Date);
    expect(completedAttempt!.completed_at).toBeNull();

    // Check second attempt (in progress)
    const inProgressAttempt = attempts.find(a => a.total_score === null);
    expect(inProgressAttempt).toBeDefined();
    expect(inProgressAttempt!.quiz_id).toEqual(quizId);
    expect(inProgressAttempt!.student_id).toEqual(studentId);
    expect(inProgressAttempt!.total_score).toBeNull();
    expect(inProgressAttempt!.max_score).toEqual(100.00);
    expect(typeof inProgressAttempt!.max_score).toBe('number');
  });

  it('should only return attempts for the specified student', async () => {
    // Create a teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create two students
    const studentsResult = await db.insert(usersTable)
      .values([
        {
          email: 'student1@test.com',
          name: 'Student One',
          role: 'student'
        },
        {
          email: 'student2@test.com',
          name: 'Student Two',
          role: 'student'
        }
      ])
      .returning()
      .execute();

    const student1Id = studentsResult[0].id;
    const student2Id = studentsResult[1].id;

    // Create a quiz
    const quizResult = await db.insert(quizzesTable)
      .values({
        title: 'Test Quiz',
        description: 'A test quiz',
        teacher_id: teacherId
      })
      .returning()
      .execute();

    const quizId = quizResult[0].id;

    // Create attempts for both students
    await db.insert(quizAttemptsTable)
      .values([
        {
          quiz_id: quizId,
          student_id: student1Id,
          total_score: '85.50',
          max_score: '100.00'
        },
        {
          quiz_id: quizId,
          student_id: student2Id,
          total_score: '90.00',
          max_score: '100.00'
        }
      ])
      .execute();

    // Get attempts for student 1 only
    const student1Attempts = await getQuizAttempts(student1Id);

    expect(student1Attempts).toHaveLength(1);
    expect(student1Attempts[0].student_id).toEqual(student1Id);
    expect(student1Attempts[0].total_score).toEqual(85.50);
  });
});
