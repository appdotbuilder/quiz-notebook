
import { db } from '../db';
import { quizAttemptsTable, answersTable } from '../db/schema';
import { type QuizAttempt, type Answer } from '../schema';
import { eq } from 'drizzle-orm';

export async function getQuizAttemptWithAnswers(attemptId: number): Promise<{ attempt: QuizAttempt; answers: Answer[] } | null> {
  try {
    // First, get the quiz attempt
    const attemptResults = await db.select()
      .from(quizAttemptsTable)
      .where(eq(quizAttemptsTable.id, attemptId))
      .execute();

    if (attemptResults.length === 0) {
      return null;
    }

    const attemptData = attemptResults[0];

    // Get all answers for this attempt
    const answerResults = await db.select()
      .from(answersTable)
      .where(eq(answersTable.attempt_id, attemptId))
      .execute();

    // Convert numeric fields back to numbers
    const attempt: QuizAttempt = {
      ...attemptData,
      total_score: attemptData.total_score ? parseFloat(attemptData.total_score) : null,
      max_score: parseFloat(attemptData.max_score)
    };

    const answers: Answer[] = answerResults.map(answer => ({
      ...answer,
      points_earned: answer.points_earned ? parseFloat(answer.points_earned) : null
    }));

    return { attempt, answers };
  } catch (error) {
    console.error('Failed to get quiz attempt with answers:', error);
    throw error;
  }
}
