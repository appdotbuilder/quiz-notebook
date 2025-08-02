
import { db } from '../db';
import { quizzesTable } from '../db/schema';
import { type Quiz } from '../schema';

export async function getQuizzes(): Promise<Quiz[]> {
  try {
    const results = await db.select()
      .from(quizzesTable)
      .execute();

    // No numeric conversions needed for quizzes table - all fields are appropriate types
    return results;
  } catch (error) {
    console.error('Failed to fetch quizzes:', error);
    throw error;
  }
}
