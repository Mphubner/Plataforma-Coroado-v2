// =====================================================
// Shared Types — Plataforma Ecossistema Coroado
// =====================================================

// Re-export permission-related types from the permissions module
export type {
  ChurchRole,
  Capability,
  LeadershipAssignment,
  UserProfile,
  RouteId,
  RouteConfig,
} from '@/src/lib/permissions';

// =====================================================
// School / Courses
// =====================================================

export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
};

export type OpenQuestion = {
  id: string;
  question: string;
  rubric: string;
};

export type Quiz = {
  id: string;
  questions: QuizQuestion[];
  passingScore: number;
  openQuestions?: OpenQuestion[];
};

export type Lesson = {
  id: string;
  title: string;
  videoId: string;
  duration: string;
  quiz?: Quiz;
  summary?: string;
  transcript?: string;
  subtitles?: { time: string; text: string }[];
};

export type Module = {
  id: string;
  title: string;
  lessons: Lesson[];
};

export type Course = {
  id: string;
  title: string;
  description: string;
  level: string;
  duration: string;
  students: number;
  img: string;
  modules: Module[];
  professor: string;
  status: 'published' | 'draft';
  category: string;
  learningOutcomes: string[];
  rating: number;
  price?: number;
};

export type Note = {
  id: string;
  courseId: string;
  lessonId: string;
  timestamp: number;
  text: string;
};

export type ForumQuestion = {
  id: string;
  courseId: string;
  lessonId: string;
  user: string;
  text: string;
  answer?: string;
  isOfficial?: boolean;
  createdAt: string;
};

export type Enrollment = {
  courseId: string;
  progress: number;
  completedLessons: string[];
  lastLessonId?: string;
  enrolledAt: string;
  finalGrade?: number;
  completedAt?: string;
  mistakes?: { lessonId: string; questionId: string; questionText: string }[];
};

// Badge type (renamed to avoid collision with shadcn Badge component)
export type AchievementBadge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
};

export type CourseRecommendation = {
  id: string;
  courseId: string;
  memberId: string;
  recommendedBy: string;
  date: string;
};

export type LearningTrack = {
  id: string;
  title: string;
  description: string;
  courseIds: string[];
};

// =====================================================
// Finance / Subscriptions
// =====================================================

export type Plan = {
  id: string;
  name: string;
  price: number;
  interval: 'monthly' | 'yearly';
  features: string[];
  type: 'individual' | 'family';
};

export type Transaction = {
  id: string;
  userId: string;
  amount: number;
  type: 'course' | 'subscription';
  itemId: string;
  status: 'completed' | 'pending' | 'failed' | 'cancelled' | 'refunded';
  date: string;
  method: 'pix' | 'card';
};

export type Coupon = {
  id: string;
  code: string;
  discountPercent: number;
  active: boolean;
};

// =====================================================
// Automations / Workflows
// =====================================================

export type AutomationRule = {
  id: string;
  name: string;
  trigger: string;
  action: string;
  active: boolean;
};
