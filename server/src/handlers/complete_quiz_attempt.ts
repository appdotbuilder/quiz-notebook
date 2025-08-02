
import { db } from '../db';
import { quizAttemptsTable, answersTable, questionsTable } from '../db/schema';
import { type CompleteQuizAttemptInput, type QuizAttempt } from '../schema';
import { eq, sum } from 'drizzle-orm';

export const completeQuizAttempt = async (input: CompleteQuizAttemptInput): Promise<QuizAttempt> => {
  try {
    // First, verify the attempt exists and is not already completed
    const existingAttempt = await db.select()
      .from(quizAttemptsTable)
      .where(eq(quizAttemptsTable.id, input.attempt_id))
      .execute();

    if (existingAttempt.length === 0) {
      throw new Error('Quiz attempt not found');
    }

    if (existingAttempt[0].completed_at !== null) {
      throw new Error('Quiz attempt already completed');
    }

    // Calculate total score from answers
    const scoreResult = await db.select({
      total_score: sum(answersTable.points_earned)
    })
      .from(answersTable)
      .where(eq(answersTable.attempt_id, input.attempt_id))
      .execute();

    const totalScore = scoreResult[0]?.total_score ? parseFloat(scoreResult[0].total_score) : 0;

    // Update the attempt with completion time and total score
    const result = await db.update(quizAttemptsTable)
      .set({
        completed_at: new Date(),
        total_score: totalScore.toString()
      })
      .where(eq(quizAttemptsTable.id, input.attempt_id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const attempt = result[0];
    return {
      ...attempt,
      total_score: attempt.total_score ? parseFloat(attempt.total_score) : null,
      max_score: parseFloat(attempt.max_score)
    };
  } catch (error) {
    console.error('Quiz attempt completion failed:', error);
    throw error;
  }
};
