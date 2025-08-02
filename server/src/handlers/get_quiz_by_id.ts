
import { db } from '../db';
import { quizzesTable } from '../db/schema';
import { type Quiz } from '../schema';
import { eq } from 'drizzle-orm';

export const getQuizById = async (id: number): Promise<Quiz | null> => {
  try {
    const result = await db.select()
      .from(quizzesTable)
      .where(eq(quizzesTable.id, id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    const quiz = result[0];
    return {
      ...quiz,
      // Convert numeric fields back to numbers
      // (No numeric fields in quizzes table, so no conversion needed)
    };
  } catch (error) {
    console.error('Failed to get quiz by id:', error);
    throw error;
  }
};
