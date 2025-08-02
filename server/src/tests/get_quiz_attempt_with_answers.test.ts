
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, quizzesTable, questionsTable, quizAttemptsTable, answersTable } from '../db/schema';
import { getQuizAttemptWithAnswers } from '../handlers/get_quiz_attempt_with_answers';

describe('getQuizAttemptWithAnswers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return quiz attempt with answers when attempt exists', async () => {
    // Create test data
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();

    const quizResult = await db.insert(quizzesTable)
      .values({
        title: 'Test Quiz',
        description: 'A test quiz',
        teacher_id: teacherResult[0].id,
        is_published: true
      })
      .returning()
      .execute();

    const questionResult = await db.insert(questionsTable)
      .values({
        quiz_id: quizResult[0].id,
        type: 'multiple_choice',
        question_text: 'What is 2+2?',
        options: ['3', '4', '5'],
        correct_answer: '4',
        points: '10.00',
        order_index: 1
      })
      .returning()
      .execute();

    const attemptResult = await db.insert(quizAttemptsTable)
      .values({
        quiz_id: quizResult[0].id,
        student_id: studentResult[0].id,
        total_score: '8.50',
        max_score: '10.00'
      })
      .returning()
      .execute();

    const answerResult = await db.insert(answersTable)
      .values({
        attempt_id: attemptResult[0].id,
        question_id: questionResult[0].id,
        answer_text: '4',
        is_correct: true,
        points_earned: '8.50'
      })
      .returning()
      .execute();

    // Execute handler
    const result = await getQuizAttemptWithAnswers(attemptResult[0].id);

    // Verify result
    expect(result).not.toBeNull();
    expect(result!.attempt.id).toEqual(attemptResult[0].id);
    expect(result!.attempt.quiz_id).toEqual(quizResult[0].id);
    expect(result!.attempt.student_id).toEqual(studentResult[0].id);
    expect(result!.attempt.total_score).toEqual(8.5);
    expect(result!.attempt.max_score).toEqual(10.0);
    expect(result!.attempt.started_at).toBeInstanceOf(Date);
    expect(result!.attempt.completed_at).toBeNull();

    expect(result!.answers).toHaveLength(1);
    expect(result!.answers[0].id).toEqual(answerResult[0].id);
    expect(result!.answers[0].attempt_id).toEqual(attemptResult[0].id);
    expect(result!.answers[0].question_id).toEqual(questionResult[0].id);
    expect(result!.answers[0].answer_text).toEqual('4');
    expect(result!.answers[0].is_correct).toBe(true);
    expect(result!.answers[0].points_earned).toEqual(8.5);
    expect(result!.answers[0].created_at).toBeInstanceOf(Date);
  });

  it('should return null when attempt does not exist', async () => {
    const result = await getQuizAttemptWithAnswers(999);
    expect(result).toBeNull();
  });

  it('should handle attempt with no answers', async () => {
    // Create test data without answers
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();

    const quizResult = await db.insert(quizzesTable)
      .values({
        title: 'Test Quiz',
        description: 'A test quiz',
        teacher_id: teacherResult[0].id,
        is_published: true
      })
      .returning()
      .execute();

    const attemptResult = await db.insert(quizAttemptsTable)
      .values({
        quiz_id: quizResult[0].id,
        student_id: studentResult[0].id,
        max_score: '10.00'
      })
      .returning()
      .execute();

    // Execute handler
    const result = await getQuizAttemptWithAnswers(attemptResult[0].id);

    // Verify result
    expect(result).not.toBeNull();
    expect(result!.attempt.id).toEqual(attemptResult[0].id);
    expect(result!.attempt.total_score).toBeNull();
    expect(result!.attempt.max_score).toEqual(10.0);
    expect(result!.answers).toHaveLength(0);
  });

  it('should handle multiple answers for one attempt', async () => {
    // Create test data
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();

    const quizResult = await db.insert(quizzesTable)
      .values({
        title: 'Test Quiz',
        description: 'A test quiz',
        teacher_id: teacherResult[0].id,
        is_published: true
      })
      .returning()
      .execute();

    const question1Result = await db.insert(questionsTable)
      .values({
        quiz_id: quizResult[0].id,
        type: 'multiple_choice',
        question_text: 'What is 2+2?',
        options: ['3', '4', '5'],
        correct_answer: '4',
        points: '5.00',
        order_index: 1
      })
      .returning()
      .execute();

    const question2Result = await db.insert(questionsTable)
      .values({
        quiz_id: quizResult[0].id,
        type: 'true_false',
        question_text: 'The sky is blue',
        correct_answer: 'true',
        points: '3.00',
        order_index: 2
      })
      .returning()
      .execute();

    const attemptResult = await db.insert(quizAttemptsTable)
      .values({
        quiz_id: quizResult[0].id,
        student_id: studentResult[0].id,
        total_score: '5.00',
        max_score: '8.00'
      })
      .returning()
      .execute();

    await db.insert(answersTable)
      .values([
        {
          attempt_id: attemptResult[0].id,
          question_id: question1Result[0].id,
          answer_text: '4',
          is_correct: true,
          points_earned: '5.00'
        },
        {
          attempt_id: attemptResult[0].id,
          question_id: question2Result[0].id,
          answer_text: 'false',
          is_correct: false,
          points_earned: '0.00'
        }
      ])
      .execute();

    // Execute handler
    const result = await getQuizAttemptWithAnswers(attemptResult[0].id);

    // Verify result
    expect(result).not.toBeNull();
    expect(result!.attempt.total_score).toEqual(5.0);
    expect(result!.attempt.max_score).toEqual(8.0);
    expect(result!.answers).toHaveLength(2);

    // Verify answers are properly converted
    const correctAnswer = result!.answers.find(a => a.is_correct === true);
    const incorrectAnswer = result!.answers.find(a => a.is_correct === false);

    expect(correctAnswer).toBeDefined();
    expect(correctAnswer!.points_earned).toEqual(5.0);
    expect(incorrectAnswer).toBeDefined();
    expect(incorrectAnswer!.points_earned).toEqual(0.0);
  });
});
