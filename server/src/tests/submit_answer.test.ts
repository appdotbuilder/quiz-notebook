
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, quizzesTable, questionsTable, quizAttemptsTable, answersTable } from '../db/schema';
import { type SubmitAnswerInput } from '../schema';
import { submitAnswer } from '../handlers/submit_answer';
import { eq } from 'drizzle-orm';

describe('submitAnswer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should submit answer for multiple choice question and evaluate correctly', async () => {
    // Create prerequisite data
    const teacherResult = await db.insert(usersTable)
      .values({ email: 'teacher@test.com', name: 'Teacher', role: 'teacher' })
      .returning()
      .execute();
    const teacher = teacherResult[0];

    const studentResult = await db.insert(usersTable)
      .values({ email: 'student@test.com', name: 'Student', role: 'student' })
      .returning()
      .execute();
    const student = studentResult[0];

    const quizResult = await db.insert(quizzesTable)
      .values({ title: 'Test Quiz', teacher_id: teacher.id, is_published: true })
      .returning()
      .execute();
    const quiz = quizResult[0];

    const questionResult = await db.insert(questionsTable)
      .values({
        quiz_id: quiz.id,
        type: 'multiple_choice',
        question_text: 'What is 2+2?',
        options: ['3', '4', '5', '6'],
        correct_answer: '4',
        points: '10.00',
        order_index: 1
      })
      .returning()
      .execute();
    const question = questionResult[0];

    const attemptResult = await db.insert(quizAttemptsTable)
      .values({
        quiz_id: quiz.id,
        student_id: student.id,
        max_score: '10.00'
      })
      .returning()
      .execute();
    const attempt = attemptResult[0];

    const input: SubmitAnswerInput = {
      attempt_id: attempt.id,
      question_id: question.id,
      answer_text: '4'
    };

    const result = await submitAnswer(input);

    expect(result.attempt_id).toEqual(attempt.id);
    expect(result.question_id).toEqual(question.id);
    expect(result.answer_text).toEqual('4');
    expect(result.is_correct).toBe(true);
    expect(result.points_earned).toEqual(10);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should submit incorrect answer for multiple choice question', async () => {
    // Create prerequisite data
    const teacherResult = await db.insert(usersTable)
      .values({ email: 'teacher@test.com', name: 'Teacher', role: 'teacher' })
      .returning()
      .execute();
    const teacher = teacherResult[0];

    const studentResult = await db.insert(usersTable)
      .values({ email: 'student@test.com', name: 'Student', role: 'student' })
      .returning()
      .execute();
    const student = studentResult[0];

    const quizResult = await db.insert(quizzesTable)
      .values({ title: 'Test Quiz', teacher_id: teacher.id, is_published: true })
      .returning()
      .execute();
    const quiz = quizResult[0];

    const questionResult = await db.insert(questionsTable)
      .values({
        quiz_id: quiz.id,
        type: 'multiple_choice',
        question_text: 'What is 2+2?',
        options: ['3', '4', '5', '6'],
        correct_answer: '4',
        points: '5.50',
        order_index: 1
      })
      .returning()
      .execute();
    const question = questionResult[0];

    const attemptResult = await db.insert(quizAttemptsTable)
      .values({
        quiz_id: quiz.id,
        student_id: student.id,
        max_score: '5.50'
      })
      .returning()
      .execute();
    const attempt = attemptResult[0];

    const input: SubmitAnswerInput = {
      attempt_id: attempt.id,
      question_id: question.id,
      answer_text: '3'
    };

    const result = await submitAnswer(input);

    expect(result.is_correct).toBe(false);
    expect(result.points_earned).toEqual(0);
  });

  it('should submit answer for essay question without evaluation', async () => {
    // Create prerequisite data
    const teacherResult = await db.insert(usersTable)
      .values({ email: 'teacher@test.com', name: 'Teacher', role: 'teacher' })
      .returning()
      .execute();
    const teacher = teacherResult[0];

    const studentResult = await db.insert(usersTable)
      .values({ email: 'student@test.com', name: 'Student', role: 'student' })
      .returning()
      .execute();
    const student = studentResult[0];

    const quizResult = await db.insert(quizzesTable)
      .values({ title: 'Test Quiz', teacher_id: teacher.id, is_published: true })
      .returning()
      .execute();
    const quiz = quizResult[0];

    const questionResult = await db.insert(questionsTable)
      .values({
        quiz_id: quiz.id,
        type: 'essay',
        question_text: 'Explain the concept of democracy.',
        options: null,
        correct_answer: null,
        points: '20.00',
        order_index: 1
      })
      .returning()
      .execute();
    const question = questionResult[0];

    const attemptResult = await db.insert(quizAttemptsTable)
      .values({
        quiz_id: quiz.id,
        student_id: student.id,
        max_score: '20.00'
      })
      .returning()
      .execute();
    const attempt = attemptResult[0];

    const input: SubmitAnswerInput = {
      attempt_id: attempt.id,
      question_id: question.id,
      answer_text: 'Democracy is a system of government where power is held by the people.'
    };

    const result = await submitAnswer(input);

    expect(result.answer_text).toEqual('Democracy is a system of government where power is held by the people.');
    expect(result.is_correct).toBeNull();
    expect(result.points_earned).toBeNull();
  });

  it('should save answer to database', async () => {
    // Create prerequisite data
    const teacherResult = await db.insert(usersTable)
      .values({ email: 'teacher@test.com', name: 'Teacher', role: 'teacher' })
      .returning()
      .execute();
    const teacher = teacherResult[0];

    const studentResult = await db.insert(usersTable)
      .values({ email: 'student@test.com', name: 'Student', role: 'student' })
      .returning()
      .execute();
    const student = studentResult[0];

    const quizResult = await db.insert(quizzesTable)
      .values({ title: 'Test Quiz', teacher_id: teacher.id, is_published: true })
      .returning()
      .execute();
    const quiz = quizResult[0];

    const questionResult = await db.insert(questionsTable)
      .values({
        quiz_id: quiz.id,
        type: 'true_false',
        question_text: 'The sky is blue.',
        options: null,
        correct_answer: 'true',
        points: '2.00',
        order_index: 1
      })
      .returning()
      .execute();
    const question = questionResult[0];

    const attemptResult = await db.insert(quizAttemptsTable)
      .values({
        quiz_id: quiz.id,
        student_id: student.id,
        max_score: '2.00'
      })
      .returning()
      .execute();
    const attempt = attemptResult[0];

    const input: SubmitAnswerInput = {
      attempt_id: attempt.id,
      question_id: question.id,
      answer_text: 'true'
    };

    const result = await submitAnswer(input);

    // Query database to verify answer was saved
    const answers = await db.select()
      .from(answersTable)
      .where(eq(answersTable.id, result.id))
      .execute();

    expect(answers).toHaveLength(1);
    expect(answers[0].answer_text).toEqual('true');
    expect(answers[0].is_correct).toBe(true);
    expect(parseFloat(answers[0].points_earned!)).toEqual(2);
  });

  it('should handle case insensitive matching for objective questions', async () => {
    // Create prerequisite data
    const teacherResult = await db.insert(usersTable)
      .values({ email: 'teacher@test.com', name: 'Teacher', role: 'teacher' })
      .returning()
      .execute();
    const teacher = teacherResult[0];

    const studentResult = await db.insert(usersTable)
      .values({ email: 'student@test.com', name: 'Student', role: 'student' })
      .returning()
      .execute();
    const student = studentResult[0];

    const quizResult = await db.insert(quizzesTable)
      .values({ title: 'Test Quiz', teacher_id: teacher.id, is_published: true })
      .returning()
      .execute();
    const quiz = quizResult[0];

    const questionResult = await db.insert(questionsTable)
      .values({
        quiz_id: quiz.id,
        type: 'short_answer',
        question_text: 'What is the capital of France?',
        options: null,
        correct_answer: 'Paris',
        points: '5.00',
        order_index: 1
      })
      .returning()
      .execute();
    const question = questionResult[0];

    const attemptResult = await db.insert(quizAttemptsTable)
      .values({
        quiz_id: quiz.id,
        student_id: student.id,
        max_score: '5.00'
      })
      .returning()
      .execute();
    const attempt = attemptResult[0];

    const input: SubmitAnswerInput = {
      attempt_id: attempt.id,
      question_id: question.id,
      answer_text: '  PARIS  ' // Different case with spaces
    };

    const result = await submitAnswer(input);

    expect(result.is_correct).toBe(true);
    expect(result.points_earned).toEqual(5);
  });

  it('should throw error for non-existent question', async () => {
    const input: SubmitAnswerInput = {
      attempt_id: 1,
      question_id: 999,
      answer_text: 'test answer'
    };

    expect(submitAnswer(input)).rejects.toThrow(/Question with id 999 not found/i);
  });
});
