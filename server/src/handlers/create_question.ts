
import { db } from '../db';
import { questionsTable, quizzesTable } from '../db/schema';
import { type CreateQuestionInput, type Question } from '../schema';
import { eq } from 'drizzle-orm';

export async function createQuestion(input: CreateQuestionInput): Promise<Question> {
  try {
    // Verify that the quiz exists
    const quiz = await db.select()
      .from(quizzesTable)
      .where(eq(quizzesTable.id, input.quiz_id))
      .limit(1)
      .execute();

    if (quiz.length === 0) {
      throw new Error(`Quiz with id ${input.quiz_id} not found`);
    }

    // Insert question record
    const result = await db.insert(questionsTable)
      .values({
        quiz_id: input.quiz_id,
        type: input.type,
        question_text: input.question_text,
        options: input.options || null,
        correct_answer: input.correct_answer || null,
        points: input.points.toString(), // Convert number to string for numeric column
        order_index: input.order_index
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers and handle options type casting
    const question = result[0];
    return {
      ...question,
      points: parseFloat(question.points), // Convert string back to number
      options: question.options as string[] | null // Type cast JSON field to expected type
    };
  } catch (error) {
    console.error('Question creation failed:', error);
    throw error;
  }
}
