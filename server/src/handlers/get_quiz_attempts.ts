
import { db } from '../db';
import { quizAttemptsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type QuizAttempt } from '../schema';

export async function getQuizAttempts(studentId: number): Promise<QuizAttempt[]> {
  try {
    const results = await db.select()
      .from(quizAttemptsTable)
      .where(eq(quizAttemptsTable.student_id, studentId))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(attempt => ({
      ...attempt,
      total_score: attempt.total_score ? parseFloat(attempt.total_score) : null,
      max_score: parseFloat(attempt.max_score)
    }));
  } catch (error) {
    console.error('Failed to fetch quiz attempts:', error);
    throw error;
  }
}
