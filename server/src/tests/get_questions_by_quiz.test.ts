
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, quizzesTable, questionsTable } from '../db/schema';
import { type CreateUserInput, type CreateQuizInput, type CreateQuestionInput } from '../schema';
import { getQuestionsByQuiz } from '../handlers/get_questions_by_quiz';

describe('getQuestionsByQuiz', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return questions ordered by order_index', async () => {
    // Create prerequisite data - teacher
    const teacherData: CreateUserInput = {
      email: 'teacher@example.com',
      name: 'Test Teacher',
      role: 'teacher'
    };

    const [teacher] = await db.insert(usersTable)
      .values(teacherData)
      .returning()
      .execute();

    // Create quiz
    const quizData: CreateQuizInput = {
      title: 'Test Quiz',
      description: 'A quiz for testing',
      teacher_id: teacher.id
    };

    const [quiz] = await db.insert(quizzesTable)
      .values(quizData)
      .returning()
      .execute();

    // Create questions with different order_index values
    const question1: CreateQuestionInput = {
      quiz_id: quiz.id,
      type: 'multiple_choice',
      question_text: 'Question 1',
      options: ['A', 'B', 'C', 'D'],
      correct_answer: 'A',
      points: 10,
      order_index: 2
    };

    const question2: CreateQuestionInput = {
      quiz_id: quiz.id,
      type: 'true_false',
      question_text: 'Question 2',
      options: null,
      correct_answer: 'true',
      points: 5,
      order_index: 1
    };

    const question3: CreateQuestionInput = {
      quiz_id: quiz.id,
      type: 'short_answer',
      question_text: 'Question 3',
      options: null,
      correct_answer: null,
      points: 15,
      order_index: 3
    };

    // Insert questions in random order
    await db.insert(questionsTable)
      .values([
        {
          ...question1,
          points: question1.points.toString()
        },
        {
          ...question2,
          points: question2.points.toString()
        },
        {
          ...question3,
          points: question3.points.toString()
        }
      ])
      .execute();

    // Get questions by quiz
    const result = await getQuestionsByQuiz(quiz.id);

    // Should return 3 questions
    expect(result).toHaveLength(3);

    // Should be ordered by order_index (1, 2, 3)
    expect(result[0].order_index).toBe(1);
    expect(result[0].question_text).toBe('Question 2');
    expect(result[0].type).toBe('true_false');
    expect(result[0].points).toBe(5);
    expect(typeof result[0].points).toBe('number');
    expect(result[0].options).toBe(null);

    expect(result[1].order_index).toBe(2);
    expect(result[1].question_text).toBe('Question 1');
    expect(result[1].type).toBe('multiple_choice');
    expect(result[1].points).toBe(10);
    expect(typeof result[1].points).toBe('number');
    expect(result[1].options).toEqual(['A', 'B', 'C', 'D']);

    expect(result[2].order_index).toBe(3);
    expect(result[2].question_text).toBe('Question 3');
    expect(result[2].type).toBe('short_answer');
    expect(result[2].points).toBe(15);
    expect(typeof result[2].points).toBe('number');
    expect(result[2].options).toBe(null);

    // Verify all questions have correct quiz_id
    result.forEach(question => {
      expect(question.quiz_id).toBe(quiz.id);
      expect(question.id).toBeDefined();
      expect(question.created_at).toBeInstanceOf(Date);
    });
  });

  it('should return empty array for quiz with no questions', async () => {
    // Create prerequisite data - teacher
    const teacherData: CreateUserInput = {
      email: 'teacher@example.com',
      name: 'Test Teacher',
      role: 'teacher'
    };

    const [teacher] = await db.insert(usersTable)
      .values(teacherData)
      .returning()
      .execute();

    // Create quiz without questions
    const quizData: CreateQuizInput = {
      title: 'Empty Quiz',
      description: 'A quiz with no questions',
      teacher_id: teacher.id
    };

    const [quiz] = await db.insert(quizzesTable)
      .values(quizData)
      .returning()
      .execute();

    // Get questions by quiz
    const result = await getQuestionsByQuiz(quiz.id);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should only return questions for the specified quiz', async () => {
    // Create prerequisite data - teacher
    const teacherData: CreateUserInput = {
      email: 'teacher@example.com',
      name: 'Test Teacher',
      role: 'teacher'
    };

    const [teacher] = await db.insert(usersTable)
      .values(teacherData)
      .returning()
      .execute();

    // Create two quizzes
    const [quiz1, quiz2] = await db.insert(quizzesTable)
      .values([
        {
          title: 'Quiz 1',
          description: 'First quiz',
          teacher_id: teacher.id
        },
        {
          title: 'Quiz 2', 
          description: 'Second quiz',
          teacher_id: teacher.id
        }
      ])
      .returning()
      .execute();

    // Create questions for both quizzes
    await db.insert(questionsTable)
      .values([
        {
          quiz_id: quiz1.id,
          type: 'multiple_choice',
          question_text: 'Quiz 1 Question 1',
          options: ['A', 'B'],
          correct_answer: 'A',
          points: '10',
          order_index: 1
        },
        {
          quiz_id: quiz1.id,
          type: 'true_false',
          question_text: 'Quiz 1 Question 2',
          options: null,
          correct_answer: 'true',
          points: '5',
          order_index: 2
        },
        {
          quiz_id: quiz2.id,
          type: 'short_answer',
          question_text: 'Quiz 2 Question 1',
          options: null,
          correct_answer: null,
          points: '15',
          order_index: 1
        }
      ])
      .execute();

    // Get questions for quiz1 only
    const result = await getQuestionsByQuiz(quiz1.id);

    expect(result).toHaveLength(2);
    result.forEach(question => {
      expect(question.quiz_id).toBe(quiz1.id);
      expect(question.question_text).toContain('Quiz 1');
    });

    // Verify ordering
    expect(result[0].order_index).toBe(1);
    expect(result[1].order_index).toBe(2);

    // Verify options handling for different question types
    expect(result[0].options).toEqual(['A', 'B']); // multiple choice
    expect(result[1].options).toBe(null); // true/false
  });
});
