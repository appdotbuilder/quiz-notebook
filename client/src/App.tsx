
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { 
  User, 
  Quiz, 
  Question, 
  CreateUserInput, 
  CreateQuizInput, 
  CreateQuestionInput,
  QuizAttempt 
} from '../../server/src/schema';

function App() {
  // Current user state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  
  // Quiz management
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  
  // Quiz taking
  const [currentAttempt, setCurrentAttempt] = useState<QuizAttempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');

  // Load initial data
  const loadUsers = useCallback(async () => {
    try {
      const result = await trpc.getUsers.query();
      setUsers(result);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, []);

  const loadQuizzes = useCallback(async () => {
    try {
      const result = await trpc.getQuizzes.query();
      setQuizzes(result);
    } catch (error) {
      console.error('Failed to load quizzes:', error);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadQuizzes();
  }, [loadUsers, loadQuizzes]);

  // User creation form
  const [userForm, setUserForm] = useState<CreateUserInput>({
    email: '',
    name: '',
    role: 'student'
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newUser = await trpc.createUser.mutate(userForm);
      setUsers((prev: User[]) => [...prev, newUser]);
      setUserForm({ email: '', name: '', role: 'student' });
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Quiz creation form
  const [quizForm, setQuizForm] = useState<CreateQuizInput>({
    title: '',
    description: null,
    teacher_id: 0
  });

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || currentUser.role !== 'teacher') return;
    setIsLoading(true);
    try {
      const newQuiz = await trpc.createQuiz.mutate({
        ...quizForm,
        teacher_id: currentUser.id
      });
      setQuizzes((prev: Quiz[]) => [...prev, newQuiz]);
      setQuizForm({ title: '', description: null, teacher_id: currentUser.id });
    } catch (error) {
      console.error('Failed to create quiz:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Question creation
  const [questionForm, setQuestionForm] = useState<CreateQuestionInput>({
    quiz_id: 0,
    type: 'multiple_choice',
    question_text: '',
    options: null,
    correct_answer: null,
    points: 1,
    order_index: 0
  });

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuiz) return;
    setIsLoading(true);
    try {
      const newQuestion = await trpc.createQuestion.mutate({
        ...questionForm,
        quiz_id: selectedQuiz.id,
        order_index: questions.length
      });
      setQuestions((prev: Question[]) => [...prev, newQuestion]);
      setQuestionForm({
        quiz_id: selectedQuiz.id,
        type: 'multiple_choice',
        question_text: '',
        options: null,
        correct_answer: null,
        points: 1,
        order_index: questions.length + 1
      });
    } catch (error) {
      console.error('Failed to create question:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load questions for selected quiz
  const loadQuestions = useCallback(async (quizId: number) => {
    try {
      const result = await trpc.getQuestionsByQuiz.query({ quizId });
      setQuestions(result);
    } catch (error) {
      console.error('Failed to load questions:', error);
    }
  }, []);

  // Start quiz attempt
  const handleStartQuiz = async (quiz: Quiz) => {
    if (!currentUser || currentUser.role !== 'student') return;
    setIsLoading(true);
    try {
      const attempt = await trpc.startQuizAttempt.mutate({
        quiz_id: quiz.id,
        student_id: currentUser.id
      });
      setCurrentAttempt(attempt);
      setSelectedQuiz(quiz);
      await loadQuestions(quiz.id);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setActiveTab('quiz-taking');
    } catch (error) {
      console.error('Failed to start quiz:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Submit answer
  const handleSubmitAnswer = async (questionId: number, answerText: string) => {
    if (!currentAttempt) return;
    try {
      await trpc.submitAnswer.mutate({
        attempt_id: currentAttempt.id,
        question_id: questionId,
        answer_text: answerText
      });
      setAnswers((prev: Record<number, string>) => ({ ...prev, [questionId]: answerText }));
    } catch (error) {
      console.error('Failed to submit answer:', error);
    }
  };

  // Complete quiz
  const handleCompleteQuiz = async () => {
    if (!currentAttempt) return;
    setIsLoading(true);
    try {
      await trpc.completeQuizAttempt.mutate({ attempt_id: currentAttempt.id });
      setCurrentAttempt(null);
      setSelectedQuiz(null);
      setQuestions([]);
      setAnswers({});
      setActiveTab('dashboard');
    } catch (error) {
      console.error('Failed to complete quiz:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Render question based on type
  const renderQuestion = (question: Question) => {
    const currentAnswer = answers[question.id] || '';

    switch (question.type) {
      case 'multiple_choice':
        return (
          <div className="space-y-3">
            <RadioGroup 
              value={currentAnswer} 
              onValueChange={(value: string) => handleSubmitAnswer(question.id, value)}
            >
              {question.options?.map((option: string, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );
      
      case 'true_false':
        return (
          <RadioGroup 
            value={currentAnswer} 
            onValueChange={(value: string) => handleSubmitAnswer(question.id, value)}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="true" id="true" />
              <Label htmlFor="true" className="cursor-pointer">True</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="false" id="false" />
              <Label htmlFor="false" className="cursor-pointer">False</Label>
            </div>
          </RadioGroup>
        );
      
      case 'short_answer':
        return (
          <Input
            value={currentAnswer}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              handleSubmitAnswer(question.id, e.target.value)
            }
            placeholder="Enter your answer..."
            className="mt-2"
          />
        );
      
      case 'essay':
        return (
          <Textarea
            value={currentAnswer}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
              handleSubmitAnswer(question.id, e.target.value)
            }
            placeholder="Write your essay here..."
            className="mt-2 min-h-32"
          />
        );
      
      default:
        return null;
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-md mx-auto mt-20">
          <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-light text-slate-800">
                📚 QuizMaster
              </CardTitle>
              <CardDescription>
                Welcome to your digital learning companion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select User</Label>
                    <Select onValueChange={(value: string) => {
                      const user = users.find((u: User) => u.id === parseInt(value));
                      if (user) setCurrentUser(user);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose your account" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user: User) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.name} ({user.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {users.length === 0 && (
                    <p className="text-sm text-slate-500 text-center">
                      No users yet. Create one in the Register tab.
                    </p>
                  )}
                </TabsContent>
                
                <TabsContent value="register" className="space-y-4">
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={userForm.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setUserForm((prev: CreateUserInput) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="Enter your name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={userForm.email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setUserForm((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
                        }
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select 
                        value={userForm.role} 
                        onValueChange={(value: 'teacher' | 'student') =>
                          setUserForm((prev: CreateUserInput) => ({ ...prev, role: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="teacher">Teacher</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Creating...' : 'Create Account'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="border-b bg-white/70 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-light text-slate-800">📚 QuizMaster</h1>
            <Badge variant="outline" className="text-xs">
              {currentUser.role === 'teacher' ? '👨‍🏫' : '👨‍🎓'} {currentUser.name}
            </Badge>
          </div>
          <Button variant="ghost" onClick={() => setCurrentUser(null)}>
            Sign Out
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            {currentUser.role === 'teacher' && (
              <>
                <TabsTrigger value="create-quiz">Create Quiz</TabsTrigger>
                <TabsTrigger value="manage-questions">Manage Questions</TabsTrigger>
              </>
            )}
            {currentUser.role === 'student' && (
              <TabsTrigger value="take-quiz">Take Quiz</TabsTrigger>
            )}
            {activeTab === 'quiz-taking' && (
              <TabsTrigger value="quiz-taking">Quiz in Progress</TabsTrigger>
            )}
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="text-center py-8">
              <h2 className="text-3xl font-light text-slate-700 mb-2">
                Welcome back, {currentUser.name}! 👋
              </h2>
              <p className="text-slate-500">
                {currentUser.role === 'teacher' 
                  ? "Ready to create amazing quizzes?" 
                  : "Ready to test your knowledge?"
                }
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-slate-700">
                    📊 Available Quizzes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {quizzes.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">
                      No quizzes available yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {quizzes.slice(0, 3).map((quiz: Quiz) => (
                        <div key={quiz.id} className="p-3 border rounded-lg bg-slate-50/50">
                          <h4 className="font-medium text-slate-800">{quiz.title}</h4>
                          <p className="text-sm text-slate-500 mt-1">
                            {quiz.description || 'No description'}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <Badge variant={quiz.is_published ? 'default' : 'secondary'}>
                              {quiz.is_published ? 'Published' : 'Draft'}
                            </Badge>
                            {currentUser.role === 'student' && quiz.is_published && (
                              <Button 
                                size="sm" 
                                onClick={() => handleStartQuiz(quiz)}
                                disabled={isLoading}
                              >
                                Start Quiz
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-slate-700">
                    {currentUser.role === 'teacher' ? '🎯 Quick Actions' : '📈 Your Progress'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentUser.role === 'teacher' ? (
                    <div className="space-y-3">
                      <Button 
                        className="w-full justify-start" 
                        variant="ghost"
                        onClick={() => setActiveTab('create-quiz')}
                      >
                        ➕ Create New Quiz
                      </Button>
                      <Button 
                        className="w-full justify-start" 
                        variant="ghost"
                        onClick={() => setActiveTab('manage-questions')}
                      >
                        ❓ Manage Questions
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-center py-4">
                        <p className="text-2xl font-light text-slate-600">0</p>
                        <p className="text-sm text-slate-500">Quizzes Completed</p>
                      </div>
                      <Button 
                        className="w-full" 
                        onClick={() => setActiveTab('take-quiz')}
                      >
                        Browse Quizzes
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Create Quiz (Teachers only) */}
          {currentUser.role === 'teacher' && (
            <TabsContent value="create-quiz" className="space-y-6">
              <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-xl font-light text-slate-700">
                    ✨ Create New Quiz
                  </CardTitle>
                  <CardDescription>
                    Design a quiz that will challenge and engage your students
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateQuiz} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="quiz-title">Quiz Title</Label>
                      <Input
                        id="quiz-title"
                        value={quizForm.title}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setQuizForm((prev: CreateQuizInput) => ({ ...prev, title: e.target.value }))
                        }
                        placeholder="Enter a compelling quiz title..."
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quiz-description">Description (Optional)</Label>
                      <Textarea
                        id="quiz-description"
                        value={quizForm.description || ''}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setQuizForm((prev: CreateQuizInput) => ({ 
                            ...prev, 
                            description: e.target.value || null 
                          }))
                        }
                        placeholder="Describe what this quiz covers..."
                        rows={3}
                      />
                    </div>
                    <Button type="submit" disabled={isLoading} className="w-full">
                      {isLoading ? 'Creating...' : '🎯 Create Quiz'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Recent Quizzes */}
              {quizzes.length > 0 && (
                <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-slate-700">
                      📚 Your Recent Quizzes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {quizzes.map((quiz: Quiz) => (
                        <div key={quiz.id} className="p-4 border rounded-lg bg-slate-50/50">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-slate-800">{quiz.title}</h4>
                              <p className="text-sm text-slate-500 mt-1">
                                {quiz.description || 'No description'}
                              </p>
                              <p className="text-xs text-slate-400 mt-2">
                                Created: {quiz.created_at.toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant={quiz.is_published ? 'default' : 'secondary'}>
                                {quiz.is_published ? 'Published' : 'Draft'}
                              </Badge>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => {
                                  setSelectedQuiz(quiz);
                                  loadQuestions(quiz.id);
                                  setActiveTab('manage-questions');
                                }}
                              >
                                Edit
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          {/* Manage Questions (Teachers only) */}
          {currentUser.role === 'teacher' && (
            <TabsContent value="manage-questions" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-light text-slate-700">
                    ❓ Question Management
                  </h2>
                  {selectedQuiz && (
                    <p className="text-slate-500 mt-1">
                      Adding questions to: <strong>{selectedQuiz.title}</strong>
                    </p>
                  )}
                </div>
                <Select 
                  value={selectedQuiz?.id.toString() || ''} 
                  onValueChange={(value: string) => {
                    const quiz = quizzes.find((q: Quiz) => q.id === parseInt(value));
                    if (quiz) {
                      setSelectedQuiz(quiz);
                      loadQuestions(quiz.id);
                    }
                  }}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select a quiz" />
                  </SelectTrigger>
                  <SelectContent>
                    {quizzes.map((quiz: Quiz) => (
                      <SelectItem key={quiz.id} value={quiz.id.toString()}>
                        {quiz.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedQuiz ? (
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Add Question Form */}
                  <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-lg font-medium text-slate-700">
                        ➕ Add New Question
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleCreateQuestion} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="question-type">Question Type</Label>
                          <Select 
                            value={questionForm.type} 
                            onValueChange={(value: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay') =>
                              setQuestionForm((prev: CreateQuestionInput) => ({ ...prev, type: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                              <SelectItem value="true_false">True/False</SelectItem>
                              <SelectItem value="short_answer">Short Answer</SelectItem>
                              <SelectItem value="essay">Essay</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="question-text">Question Text</Label>
                          <Textarea
                            id="question-text"
                            value={questionForm.question_text}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                              setQuestionForm((prev: CreateQuestionInput) => ({ 
                                ...prev, 
                                question_text: e.target.value 
                              }))
                            }
                            placeholder="Enter your question..."
                            required
                          />
                        </div>

                        {questionForm.type === 'multiple_choice' && (
                          <div className="space-y-2">
                            <Label>Answer Options (one per line)</Label>
                            <Textarea
                              value={questionForm.options?.join('\n') || ''}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                setQuestionForm((prev: CreateQuestionInput) => ({
                                  ...prev,
                                  options: e.target.value.split('\n').filter((opt: string) => opt.trim())
                                }))
                              }
                              placeholder="Option A&#10;Option B&#10;Option C&#10;Option D"
                              rows={4}
                            />
                          </div>
                        )}

                        {(questionForm.type === 'multiple_choice' || 
                          questionForm.type === 'true_false' || 
                          questionForm.type === 'short_answer') && (
                          <div className="space-y-2">
                            <Label htmlFor="correct-answer">Correct Answer</Label>
                            <Input
                              id="correct-answer"
                              value={questionForm.correct_answer || ''}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setQuestionForm((prev: CreateQuestionInput) => ({ 
                                  ...prev, 
                                  correct_answer: e.target.value || null 
                                }))
                              }
                              placeholder={
                                questionForm.type === 'true_false' 
                                  ? 'true or false' 
                                  : 'Enter the correct answer...'
                              }
                            />
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="points">Points</Label>
                          <Input
                            id="points"
                            type="number"
                            value={questionForm.points}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setQuestionForm((prev: CreateQuestionInput) => ({ 
                                ...prev, 
                                points: parseInt(e.target.value) || 1 
                              }))
                            }
                            min="1"
                            required
                          />
                        </div>

                        <Button type="submit" disabled={isLoading} className="w-full">
                          {isLoading ? 'Adding...' : '✅ Add Question'}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  {/* Questions List */}
                  <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-lg font-medium text-slate-700">
                        📝 Questions ({questions.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {questions.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">
                          No questions yet. Add some questions to get started!
                        </p>
                      ) : (
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          {questions.map((question: Question, index: number) => (
                            <div key={question.id} className="p-3 border rounded-lg bg-slate-50/50">
                              <div className="flex items-start justify-between mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {question.type.replace('_', ' ')}
                                </Badge>
                                <span className="text-xs text-slate-500">
                                  {question.points} pts
                                </span>
                              </div>
                              <p className="text-sm font-medium text-slate-800 mb-2">
                                {index + 1}. {question.question_text}
                              </p>
                              {question.options && (
                                <div className="text-xs text-slate-600 space-y-1">
                                  {question.options.map((option: string, optIndex: number) => (
                                    
                                    <div key={optIndex} className="ml-4">
                                      • {option}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {question.correct_answer && (
                                <p className="text-xs text-green-600 mt-2">
                                  ✓ Answer: {question.correct_answer}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Alert>
                  <AlertDescription>
                    Please select a quiz to manage its questions.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          )}

          {/* Take Quiz (Students only) */}
          {currentUser.role === 'student' && (
            <TabsContent value="take-quiz" className="space-y-6">
              <h2 className="text-xl font-light text-slate-700 text-center">
                🎯 Available Quizzes
              </h2>
              
              {quizzes.filter((quiz: Quiz) => quiz.is_published).length === 0 ? (
                <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
                  <CardContent className="text-center py-12">
                    <p className="text-slate-500 text-lg">📚</p>
                    <p className="text-slate-500 mt-2">No published quizzes available yet.</p>
                    <p className="text-slate-400 text-sm mt-1">Check back later!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {quizzes
                    .filter((quiz: Quiz) => quiz.is_published)
                    .map((quiz: Quiz) => (
                      <Card key={quiz.id} className="border-0 shadow-sm bg-white/70 backdrop-blur-sm hover:shadow-md transition-shadow">
                        <CardHeader>
                          <CardTitle className="text-lg font-medium text-slate-800">
                            {quiz.title}
                          </CardTitle>
                          <CardDescription>
                            {quiz.description || 'Test your knowledge!'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-slate-400 mb-4">
                            Created: {quiz.created_at.toLocaleDateString()}
                          </p>
                        </CardContent>
                        <CardFooter>
                          <Button 
                            className="w-full" 
                            onClick={() => handleStartQuiz(quiz)}
                            disabled={isLoading}
                          >
                            {isLoading ? 'Starting...' : '🚀 Start Quiz'}
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                </div>
              )}
            </TabsContent>
          )}

          {/* Quiz Taking Interface */}
          <TabsContent value="quiz-taking" className="space-y-6">
            {currentAttempt && selectedQuiz && questions.length > 0 && (
              <div className="max-w-3xl mx-auto">
                <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-light text-slate-800">
                      {selectedQuiz.title}
                    </CardTitle>
                    <CardDescription>
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </CardDescription>
                    <div className="w-full bg-slate-200 rounded-full h-2 mt-4">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` 
                        }}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {questions[currentQuestionIndex] && (
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <h3 className="text-lg font-medium text-slate-800 leading-relaxed">
                            {questions[currentQuestionIndex].question_text}
                          </h3>
                          <Badge variant="outline" className="ml-4 shrink-0">
                            {questions[currentQuestionIndex].points} pts
                          </Badge>
                        </div>
                        
                        <Separator />
                        
                        {renderQuestion(questions[currentQuestionIndex])}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex items-center justify-between">
                    <Button 
                      variant="ghost" 
                      onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                      disabled={currentQuestionIndex === 0}
                    >
                      ← Previous
                    </Button>
                    
                    <div className="flex items-center space-x-2">
                      {currentQuestionIndex < questions.length - 1 ? (
                        <Button 
                          onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                        >
                          Next →
                        </Button>
                      ) : (
                        <Button 
                          onClick={handleCompleteQuiz}
                          disabled={isLoading}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {isLoading ? 'Submitting...' : '✅ Submit Quiz'}
                        </Button>
                      )}
                    </div>
                  </CardFooter>
                </Card>
                
                {/* Question Navigation */}
                <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm mt-4">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-center space-x-2 flex-wrap">
                      {questions.map((question: Question, index: number) => (
                        <Button
                          key={question.id}
                          variant={index === currentQuestionIndex ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentQuestionIndex(index)}
                          className={`w-10 h-10 p-0 ${
                            answers[question.id] 
                              ? 'ring-2 ring-green-500 ring-offset-1' 
                              : ''
                          }`}
                        >
                          {index + 1}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 text-center mt-3">
                      Questions with green rings have been answered
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
