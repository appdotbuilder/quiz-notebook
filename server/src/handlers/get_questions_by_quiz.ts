
import { db } from '../db';
import { questionsTable } from '../db/schema';
import { type Question } from '../schema';
import { eq, asc } from 'drizzle-orm';

export async function getQuestionsByQuiz(quizId: number): Promise<Question[]> {
  try {
    // Fetch questions for the quiz, ordered by order_index
    const results = await db.select()
      .from(questionsTable)
      .where(eq(questionsTable.quiz_id, quizId))
      .orderBy(asc(questionsTable.order_index))
      .execute();

    // Convert numeric fields and handle JSON options field
    return results.map(question => ({
      ...question,
      points: parseFloat(question.points), // Convert string back to number
      options: question.options as string[] | null // Cast JSON field to proper type
    }));
  } catch (error) {
    console.error('Failed to fetch questions by quiz:', error);
    throw error;
  }
}
