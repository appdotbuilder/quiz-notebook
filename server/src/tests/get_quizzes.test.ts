
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, quizzesTable } from '../db/schema';
import { getQuizzes } from '../handlers/get_quizzes';

describe('getQuizzes', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no quizzes exist', async () => {
    const result = await getQuizzes();
    expect(result).toEqual([]);
  });

  it('should return all quizzes', async () => {
    // Create a teacher user first
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create test quizzes
    await db.insert(quizzesTable)
      .values([
        {
          title: 'Math Quiz',
          description: 'Basic math questions',
          teacher_id: teacherId,
          is_published: true
        },
        {
          title: 'Science Quiz',
          description: 'Biology and chemistry',
          teacher_id: teacherId,
          is_published: false
        }
      ])
      .execute();

    const result = await getQuizzes();

    expect(result).toHaveLength(2);
    
    // Check first quiz
    const mathQuiz = result.find(q => q.title === 'Math Quiz');
    expect(mathQuiz).toBeDefined();
    expect(mathQuiz!.description).toEqual('Basic math questions');
    expect(mathQuiz!.teacher_id).toEqual(teacherId);
    expect(mathQuiz!.is_published).toBe(true);
    expect(mathQuiz!.id).toBeDefined();
    expect(mathQuiz!.created_at).toBeInstanceOf(Date);
    expect(mathQuiz!.updated_at).toBeInstanceOf(Date);

    // Check second quiz
    const scienceQuiz = result.find(q => q.title === 'Science Quiz');
    expect(scienceQuiz).toBeDefined();
    expect(scienceQuiz!.description).toEqual('Biology and chemistry');
    expect(scienceQuiz!.teacher_id).toEqual(teacherId);
    expect(scienceQuiz!.is_published).toBe(false);
    expect(scienceQuiz!.id).toBeDefined();
    expect(scienceQuiz!.created_at).toBeInstanceOf(Date);
    expect(scienceQuiz!.updated_at).toBeInstanceOf(Date);
  });

  it('should handle quiz with null description', async () => {
    // Create a teacher user first
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create quiz with null description
    await db.insert(quizzesTable)
      .values({
        title: 'No Description Quiz',
        description: null,
        teacher_id: teacherId,
        is_published: false
      })
      .execute();

    const result = await getQuizzes();

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('No Description Quiz');
    expect(result[0].description).toBeNull();
    expect(result[0].teacher_id).toEqual(teacherId);
    expect(result[0].is_published).toBe(false);
  });

  it('should return quizzes from multiple teachers', async () => {
    // Create two teacher users
    const teachersResult = await db.insert(usersTable)
      .values([
        {
          email: 'teacher1@test.com',
          name: 'Teacher One',
          role: 'teacher'
        },
        {
          email: 'teacher2@test.com',
          name: 'Teacher Two',
          role: 'teacher'
        }
      ])
      .returning()
      .execute();

    const teacher1Id = teachersResult[0].id;
    const teacher2Id = teachersResult[1].id;

    // Create quizzes for both teachers
    await db.insert(quizzesTable)
      .values([
        {
          title: 'Teacher 1 Quiz',
          description: 'First teacher quiz',
          teacher_id: teacher1Id,
          is_published: true
        },
        {
          title: 'Teacher 2 Quiz',
          description: 'Second teacher quiz',
          teacher_id: teacher2Id,
          is_published: true
        }
      ])
      .execute();

    const result = await getQuizzes();

    expect(result).toHaveLength(2);
    
    const teacher1Quiz = result.find(q => q.teacher_id === teacher1Id);
    const teacher2Quiz = result.find(q => q.teacher_id === teacher2Id);
    
    expect(teacher1Quiz).toBeDefined();
    expect(teacher1Quiz!.title).toEqual('Teacher 1 Quiz');
    
    expect(teacher2Quiz).toBeDefined();
    expect(teacher2Quiz!.title).toEqual('Teacher 2 Quiz');
  });
});
