
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { questionsTable, quizzesTable, usersTable } from '../db/schema';
import { type CreateQuestionInput } from '../schema';
import { createQuestion } from '../handlers/create_question';
import { eq } from 'drizzle-orm';

// Test input for multiple choice question
const testInput: CreateQuestionInput = {
  quiz_id: 1,
  type: 'multiple_choice',
  question_text: 'What is the capital of France?',
  options: ['Paris', 'London', 'Berlin', 'Madrid'],
  correct_answer: 'Paris',
  points: 10,
  order_index: 1
};

// Test input for essay question
const essayInput: CreateQuestionInput = {
  quiz_id: 1,
  type: 'essay',
  question_text: 'Explain the concept of photosynthesis.',
  options: null,
  correct_answer: null,
  points: 25.5,
  order_index: 2
};

describe('createQuestion', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a multiple choice question', async () => {
    // Create prerequisite teacher and quiz
    const teacher = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    await db.insert(quizzesTable)
      .values({
        id: 1,
        title: 'Test Quiz',
        description: 'A quiz for testing',
        teacher_id: teacher[0].id,
        is_published: false
      })
      .execute();

    const result = await createQuestion(testInput);

    // Basic field validation
    expect(result.quiz_id).toEqual(1);
    expect(result.type).toEqual('multiple_choice');
    expect(result.question_text).toEqual('What is the capital of France?');
    expect(result.options).toEqual(['Paris', 'London', 'Berlin', 'Madrid']);
    expect(result.correct_answer).toEqual('Paris');
    expect(result.points).toEqual(10);
    expect(typeof result.points).toEqual('number');
    expect(result.order_index).toEqual(1);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create an essay question with null options and correct_answer', async () => {
    // Create prerequisite teacher and quiz
    const teacher = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    await db.insert(quizzesTable)
      .values({
        id: 1,
        title: 'Test Quiz',
        description: 'A quiz for testing',
        teacher_id: teacher[0].id,
        is_published: false
      })
      .execute();

    const result = await createQuestion(essayInput);

    // Validate essay question fields
    expect(result.type).toEqual('essay');
    expect(result.question_text).toEqual('Explain the concept of photosynthesis.');
    expect(result.options).toBeNull();
    expect(result.correct_answer).toBeNull();
    expect(result.points).toEqual(25.5);
    expect(typeof result.points).toEqual('number');
    expect(result.order_index).toEqual(2);
  });

  it('should save question to database', async () => {
    // Create prerequisite teacher and quiz
    const teacher = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    await db.insert(quizzesTable)
      .values({
        id: 1,
        title: 'Test Quiz',
        description: 'A quiz for testing',
        teacher_id: teacher[0].id,
        is_published: false
      })
      .execute();

    const result = await createQuestion(testInput);

    // Query using proper drizzle syntax
    const questions = await db.select()
      .from(questionsTable)
      .where(eq(questionsTable.id, result.id))
      .execute();

    expect(questions).toHaveLength(1);
    expect(questions[0].question_text).toEqual('What is the capital of France?');
    expect(questions[0].type).toEqual('multiple_choice');
    expect(questions[0].options).toEqual(['Paris', 'London', 'Berlin', 'Madrid']);
    expect(questions[0].correct_answer).toEqual('Paris');
    expect(parseFloat(questions[0].points)).toEqual(10);
    expect(questions[0].order_index).toEqual(1);
    expect(questions[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when quiz does not exist', async () => {
    const invalidInput: CreateQuestionInput = {
      ...testInput,
      quiz_id: 999 // Non-existent quiz ID
    };

    await expect(createQuestion(invalidInput)).rejects.toThrow(/Quiz with id 999 not found/i);
  });
});
