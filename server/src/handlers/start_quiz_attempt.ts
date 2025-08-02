
import { db } from '../db';
import { quizAttemptsTable, questionsTable, quizzesTable, usersTable } from '../db/schema';
import { type StartQuizAttemptInput, type QuizAttempt } from '../schema';
import { eq, sum } from 'drizzle-orm';

export const startQuizAttempt = async (input: StartQuizAttemptInput): Promise<QuizAttempt> => {
  try {
    // Verify quiz exists and is published
    const quiz = await db.select()
      .from(quizzesTable)
      .where(eq(quizzesTable.id, input.quiz_id))
      .execute();

    if (quiz.length === 0) {
      throw new Error('Quiz not found');
    }

    if (!quiz[0].is_published) {
      throw new Error('Quiz is not published');
    }

    // Verify student exists and has student role
    const student = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.student_id))
      .execute();

    if (student.length === 0) {
      throw new Error('Student not found');
    }

    if (student[0].role !== 'student') {
      throw new Error('User is not a student');
    }

    // Calculate max score from quiz questions
    const maxScoreResult = await db.select({
      max_score: sum(questionsTable.points)
    })
    .from(questionsTable)
    .where(eq(questionsTable.quiz_id, input.quiz_id))
    .execute();

    const maxScore = maxScoreResult[0]?.max_score ? parseFloat(maxScoreResult[0].max_score) : 0;

    // Create quiz attempt
    const result = await db.insert(quizAttemptsTable)
      .values({
        quiz_id: input.quiz_id,
        student_id: input.student_id,
        max_score: maxScore.toString()
      })
      .returning()
      .execute();

    const attempt = result[0];
    return {
      ...attempt,
      total_score: attempt.total_score ? parseFloat(attempt.total_score) : null,
      max_score: parseFloat(attempt.max_score)
    };
  } catch (error) {
    console.error('Quiz attempt creation failed:', error);
    throw error;
  }
};
