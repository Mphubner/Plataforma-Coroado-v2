export const DEFAULT_PLATFORM_TENANT_ID = 'tenant-1';

export function cleanText(value: unknown, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

export type StoreCartLikeItem = {
  product: { id: string | number };
  quantity: number;
  size?: string;
  color?: string;
};

export type CheckoutPayload = {
  items: Array<{
    productId: string;
    quantity: number;
    size: string;
    color: string;
  }>;
};

export function toCheckoutPayload(cart: StoreCartLikeItem[]): CheckoutPayload {
  return {
    items: cart.map(item => ({
      productId: cleanText(item.product.id, 128),
      quantity: item.quantity,
      size: cleanText(item.size, 50),
      color: cleanText(item.color, 50),
    })),
  };
}

export type CellReportPayloadInput = {
  cellId: string | number;
  tenantId?: string;
  date: string;
  meetingType?: string;
  presentMembersIds?: Array<string | number>;
  visitorName?: string;
  createdBy?: string;
};

export function toCellReportPayload(input: CellReportPayloadInput) {
  const presentMembersIds = Array.from(new Set(
    (input.presentMembersIds || [])
      .map(id => cleanText(id, 128))
      .filter(Boolean)
  ));
  const meetingType = cleanText(input.meetingType, 100) || 'Celula';
  const visitorName = cleanText(input.visitorName, 200);
  const visitors = visitorName ? 1 : 0;

  return {
    cellId: cleanText(input.cellId, 128),
    tenantId: cleanText(input.tenantId, 128) || DEFAULT_PLATFORM_TENANT_ID,
    date: cleanText(input.date, 50),
    type: 'presence',
    meetingType,
    present: presentMembersIds.length,
    visitors,
    summary: `${meetingType}: ${presentMembersIds.length} presentes${visitorName ? `; visitante ${visitorName}` : ''}.`,
    presentMembersIds,
    visitorData: visitorName ? { name: visitorName } : null,
    createdBy: cleanText(input.createdBy, 128),
  };
}

export type PendingContributionPayloadInput = {
  userId: string;
  amount: number | string;
  contributionType: string;
  itemId?: string | null;
  tenantId?: string;
  method?: string;
};

export function toPendingContributionPayload(input: PendingContributionPayloadInput) {
  const amount = Number(input.amount);
  const contributionType = cleanText(input.contributionType, 120) || 'contribution';

  return {
    userId: cleanText(input.userId, 128),
    amount: Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0,
    type: contributionType,
    itemId: cleanText(input.itemId, 128) || contributionType,
    status: 'pending',
    date: new Date().toISOString().split('T')[0],
    method: cleanText(input.method, 50) || 'pix_manual',
    tenantId: cleanText(input.tenantId, 128) || DEFAULT_PLATFORM_TENANT_ID,
  };
}

export type EventEnrollmentKidInput = {
  id?: string;
  name?: string;
  age?: string | number;
  obs?: string;
};

export type EventEnrollmentPayloadInput = {
  eventId: string | number;
  userId: string;
  tenantId?: string;
  kids?: EventEnrollmentKidInput[];
  paymentStatus?: 'pending' | 'approved' | 'rejected';
};

function createLocalId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function toEventEnrollmentPayload(input: EventEnrollmentPayloadInput) {
  return {
    eventId: cleanText(input.eventId, 128),
    userId: cleanText(input.userId, 128),
    tenantId: cleanText(input.tenantId, 128) || DEFAULT_PLATFORM_TENANT_ID,
    checkedIn: false,
    paymentStatus: input.paymentStatus || 'approved',
    kids: (input.kids || [])
      .map(kid => ({
        id: cleanText(kid.id, 128) || createLocalId(),
        name: cleanText(kid.name, 200),
        age: cleanText(kid.age, 30),
        obs: cleanText(kid.obs, 500),
        checkedIn: false,
      }))
      .filter(kid => kid.name.length > 0),
  };
}

export type MemberProfileUpdatePayloadInput = {
  cellId?: string;
  ministryIds?: string[];
  supervisorId?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  address?: string;
  lat?: number | string;
  lng?: number | string;
  phone?: string;
  birthdate?: string;
  maritalStatus?: string;
  profession?: string;
  socialMedia?: string;
  avatarUrl?: string;
};

export function toMemberProfileUpdatePayload(input: MemberProfileUpdatePayloadInput) {
  const cep = cleanText(input.cep, 10);
  const street = cleanText(input.street, 300);
  const number = cleanText(input.number, 20);
  const complement = cleanText(input.complement, 200);
  const neighborhood = cleanText(input.neighborhood, 200);
  const city = cleanText(input.city, 200);
  // Build flat address string for backwards compatibility and map display
  const addressParts = [street, number, complement, neighborhood, city].filter(Boolean);
  const address = cleanText(input.address, 500) || addressParts.join(', ');

  return {
    cellId: cleanText(input.cellId, 128),
    ministryIds: (input.ministryIds || []).map(id => cleanText(id, 128)).filter(Boolean),
    supervisorId: cleanText(input.supervisorId, 128),
    cep,
    street,
    number,
    complement,
    neighborhood,
    city,
    address,
    lat: Number(input.lat) || 0,
    lng: Number(input.lng) || 0,
    phone: cleanText(input.phone, 50),
    birthdate: cleanText(input.birthdate, 50),
    maritalStatus: cleanText(input.maritalStatus, 100),
    profession: cleanText(input.profession, 150),
    socialMedia: cleanText(input.socialMedia, 300),
    avatarUrl: cleanText(input.avatarUrl, 1000),
  };
}

export type PastoralAppointmentPayloadInput = {
  pastorId?: string;
  pastorName?: string;
  userId?: string;
  userName?: string;
  tenantId?: string;
  date: string;
  time: string;
};

export function toPastoralAppointmentPayload(input: PastoralAppointmentPayloadInput) {
  return {
    pastorId: cleanText(input.pastorId, 128) || 'plantonista',
    pastorName: cleanText(input.pastorName, 200) || 'Pastor Plantonista',
    userId: cleanText(input.userId, 128),
    userName: cleanText(input.userName, 200) || 'Membro',
    tenantId: cleanText(input.tenantId, 128) || DEFAULT_PLATFORM_TENANT_ID,
    date: cleanText(input.date, 50),
    time: cleanText(input.time, 50),
    status: 'scheduled',
  };
}

export type PastoralTaskPayloadInput = {
  title: string;
  tenantId?: string;
  createdBy: string;
  assigneeId?: string;
  description?: string;
  startDate?: string;
};

export function toPastoralTaskPayload(input: PastoralTaskPayloadInput) {
  return {
    title: cleanText(input.title, 200),
    description: cleanText(input.description, 1000) || 'Tarefa criada pelo painel pastoral.',
    tag: 'Pastoral',
    assigneeId: cleanText(input.assigneeId, 128) || cleanText(input.createdBy, 128),
    status: 'todo',
    tenantId: cleanText(input.tenantId, 128) || DEFAULT_PLATFORM_TENANT_ID,
    createdBy: cleanText(input.createdBy, 128),
    dueDate: '',
    startDate: cleanText(input.startDate, 50) || new Date().toISOString().split('T')[0],
    completedAt: '',
  };
}

export type SocialAppointmentPayloadInput = {
  userName?: string;
  userId?: string;
  professionalId?: string;
  professionalName?: string;
  specialty?: string;
  date: string;
  time: string;
  price?: number | null;
  tenantId?: string;
};

export function toSocialAppointmentPayload(input: SocialAppointmentPayloadInput) {
  const price = Number(input.price);
  const hasPrice = Number.isFinite(price) && price > 0;

  return {
    userName: cleanText(input.userName, 200) || 'Usuario',
    userId: cleanText(input.userId, 128),
    professionalId: cleanText(input.professionalId, 128),
    professionalName: cleanText(input.professionalName, 200),
    specialty: cleanText(input.specialty, 200),
    date: cleanText(input.date, 50),
    time: cleanText(input.time, 50),
    status: 'pending',
    price: hasPrice ? Math.round(price * 100) / 100 : null,
    paymentStatus: hasPrice ? 'pending' : 'paid',
    tenantId: cleanText(input.tenantId, 128) || DEFAULT_PLATFORM_TENANT_ID,
  };
}

export type SocialProfessionalPayloadInput = {
  name?: string;
  specialty?: string;
  email?: string;
  photoUrl?: string;
  isPublic?: boolean;
  price?: number | string | null;
  availableTimes?: string[] | string;
  tenantId?: string;
};

export function toSocialProfessionalPayload(input: SocialProfessionalPayloadInput) {
  const price = Number(input.price);
  const availableTimes = Array.isArray(input.availableTimes)
    ? input.availableTimes
    : String(input.availableTimes || '').split(',');

  return {
    name: cleanText(input.name, 200),
    specialty: cleanText(input.specialty, 200),
    email: cleanText(input.email, 200),
    photoUrl: cleanText(input.photoUrl, 1000),
    isPublic: Boolean(input.isPublic),
    price: Number.isFinite(price) && price > 0 ? Math.round(price * 100) / 100 : null,
    availableTimes: availableTimes.map(time => cleanText(time, 50)).filter(Boolean),
    tenantId: cleanText(input.tenantId, 128) || DEFAULT_PLATFORM_TENANT_ID,
  };
}

export type CoursePayloadInput = {
  title: string;
  status?: string;
  category?: string;
  description?: string;
  level?: string;
  duration?: string;
  img?: string;
  students?: number | string;
  isSubscriptionOnly?: boolean;
  monthlyPrice?: number | string;
  tenantId?: string;
  createdBy: string;
};

export function toCoursePayload(input: CoursePayloadInput) {
  const students = Number(input.students);
  const monthlyPrice = Number(input.monthlyPrice);

  return {
    title: cleanText(input.title, 200),
    status: cleanText(input.status, 50) || 'Rascunho',
    category: cleanText(input.category, 100) || 'Geral',
    description: cleanText(input.description, 2000),
    level: cleanText(input.level, 100) || 'Basico',
    duration: cleanText(input.duration, 50) || '0h',
    img: cleanText(input.img, 1000),
    students: Number.isFinite(students) ? students : 0,
    isSubscriptionOnly: input.isSubscriptionOnly !== false,
    monthlyPrice: Number.isFinite(monthlyPrice) ? Math.max(0, monthlyPrice) : 0,
    tenantId: cleanText(input.tenantId, 128) || DEFAULT_PLATFORM_TENANT_ID,
    createdBy: cleanText(input.createdBy, 128),
  };
}

export type LearningPathPayloadInput = {
  title: string;
  description?: string;
  stage?: string;
  courses?: Array<string | number>;
  tenantId?: string;
};

export function toLearningPathPayload(input: LearningPathPayloadInput) {
  return {
    title: cleanText(input.title, 200),
    description: cleanText(input.description, 2000),
    stage: cleanText(input.stage, 128) || 'Geral',
    courses: (input.courses || []).map(courseId => cleanText(courseId, 128)).filter(Boolean),
    tenantId: cleanText(input.tenantId, 128) || DEFAULT_PLATFORM_TENANT_ID,
  };
}

export type ModulePayloadInput = {
  title: string;
  courseId: string | number;
  tenantId?: string;
  order?: number | string;
};

export function toModulePayload(input: ModulePayloadInput) {
  const order = Number(input.order);

  return {
    title: cleanText(input.title, 200),
    courseId: cleanText(input.courseId, 128),
    tenantId: cleanText(input.tenantId, 128) || DEFAULT_PLATFORM_TENANT_ID,
    order: Number.isFinite(order) ? order : 0,
  };
}

export type LessonPayloadInput = {
  title: string;
  description?: string;
  videoUrl?: string;
  moduleId: string | number;
  courseId: string | number;
  tenantId?: string;
  order?: number | string;
  isFree?: boolean;
  standalonePrice?: number | string;
};

export function toLessonPayload(input: LessonPayloadInput) {
  const order = Number(input.order);
  const standalonePrice = Number(input.standalonePrice);

  return {
    title: cleanText(input.title, 200),
    description: cleanText(input.description, 2000),
    videoUrl: cleanText(input.videoUrl, 500),
    moduleId: cleanText(input.moduleId, 128),
    courseId: cleanText(input.courseId, 128),
    tenantId: cleanText(input.tenantId, 128) || DEFAULT_PLATFORM_TENANT_ID,
    order: Number.isFinite(order) ? order : 0,
    isFree: Boolean(input.isFree),
    standalonePrice: Number.isFinite(standalonePrice) ? Math.max(0, standalonePrice) : 0,
  };
}

export type EnrollmentPayloadInput = {
  userId: string;
  courseId: string | number;
  tenantId?: string;
};

export function toEnrollmentPayload(input: EnrollmentPayloadInput) {
  return {
    userId: cleanText(input.userId, 128),
    courseId: cleanText(input.courseId, 128),
    tenantId: cleanText(input.tenantId, 128) || DEFAULT_PLATFORM_TENANT_ID,
    progress: 0,
    status: 'in-progress',
    completedLessons: [] as string[],
  };
}

export function toEnrollmentProgressPayload(completedLessons: Array<string | number>, totalLessons: number) {
  const completed = Array.from(new Set(completedLessons.map(id => cleanText(id, 128)).filter(Boolean)));
  const total = Math.max(Number(totalLessons) || 1, 1);
  const progress = Math.min(100, Math.round((completed.length / total) * 100));

  return {
    completedLessons: completed,
    progress,
    status: progress >= 100 ? 'completed' : 'in-progress',
  };
}

export type TaskPayloadInput = {
  title: string;
  description?: string;
  tag?: string;
  rootCause?: string;
  assigneeId?: string;
  status?: string;
  tenantId?: string;
  createdBy: string;
  dueDate?: string;
  startDate?: string;
  completedAt?: string;
};

export function toTaskPayload(input: TaskPayloadInput) {
  return {
    title: cleanText(input.title, 200),
    description: cleanText(input.description, 1000),
    tag: cleanText(input.tag, 100) || 'Geral',
    rootCause: cleanText(input.rootCause, 200),
    assigneeId: cleanText(input.assigneeId, 128) || 'Nao atribuido',
    status: cleanText(input.status, 50) || 'todo',
    tenantId: cleanText(input.tenantId, 128) || DEFAULT_PLATFORM_TENANT_ID,
    createdBy: cleanText(input.createdBy, 128),
    dueDate: cleanText(input.dueDate, 50),
    startDate: cleanText(input.startDate, 50) || new Date().toISOString().split('T')[0],
    completedAt: cleanText(input.completedAt, 50),
  };
}

export type TaskUpdatePayloadInput = {
  taskId: string;
  content: string;
  authorName?: string;
  tenantId?: string;
  date?: string;
};

export function toTaskUpdatePayload(input: TaskUpdatePayloadInput) {
  return {
    taskId: cleanText(input.taskId, 128),
    content: cleanText(input.content, 2000),
    authorName: cleanText(input.authorName, 200) || 'Usuario',
    date: cleanText(input.date, 50) || new Date().toISOString(),
    tenantId: cleanText(input.tenantId, 128) || DEFAULT_PLATFORM_TENANT_ID,
  };
}

export type MinistryPayloadInput = {
  name?: string;
  description?: string;
  leaderId?: string;
  leaderName?: string;
  icon?: string;
  members?: unknown[];
  requiredTracks?: unknown[];
  tenantId?: string;
};

export function toMinistryPayload(input: MinistryPayloadInput) {
  return {
    name: cleanText(input.name, 200),
    description: cleanText(input.description, 2000),
    leaderId: cleanText(input.leaderId, 128),
    leaderName: cleanText(input.leaderName, 200),
    icon: cleanText(input.icon, 50) || 'users',
    members: Array.isArray(input.members) ? input.members : [],
    requiredTracks: Array.isArray(input.requiredTracks) ? input.requiredTracks : [],
    tenantId: cleanText(input.tenantId, 128) || DEFAULT_PLATFORM_TENANT_ID,
  };
}

export type ScaleAssignmentPayloadInput = {
  memberId?: string;
  role?: string;
  status?: string;
};

export type ScalePayloadInput = {
  ministryId: string;
  eventId?: string;
  eventName?: string;
  date?: string;
  time?: string;
  assignments?: ScaleAssignmentPayloadInput[];
  setlist?: string[];
  notes?: string;
  tenantId?: string;
};

export function toScalePayload(input: ScalePayloadInput) {
  return {
    ministryId: cleanText(input.ministryId, 128),
    eventId: cleanText(input.eventId, 128),
    eventName: cleanText(input.eventName, 200),
    date: cleanText(input.date, 50),
    time: cleanText(input.time, 50),
    assignments: (input.assignments || []).map(assignment => ({
      memberId: cleanText(assignment.memberId, 128),
      role: cleanText(assignment.role, 200),
      status: cleanText(assignment.status, 50) || 'pending',
    })),
    setlist: (input.setlist || []).map(item => cleanText(item, 200)).filter(Boolean),
    notes: cleanText(input.notes, 2000),
    tenantId: cleanText(input.tenantId, 128) || DEFAULT_PLATFORM_TENANT_ID,
  };
}

export type BriefingPayloadInput = {
  ministryId: string;
  requesterMinistry?: string;
  title?: string;
  description?: string;
  deadline?: string;
  status?: string;
  assigneeId?: string;
  tenantId?: string;
};

export function toBriefingPayload(input: BriefingPayloadInput) {
  return {
    ministryId: cleanText(input.ministryId, 128),
    requesterMinistry: cleanText(input.requesterMinistry, 200) || 'Coroado',
    title: cleanText(input.title, 200),
    description: cleanText(input.description, 2000),
    deadline: cleanText(input.deadline, 50),
    status: cleanText(input.status, 50) || 'pending',
    assigneeId: cleanText(input.assigneeId, 128),
    tenantId: cleanText(input.tenantId, 128) || DEFAULT_PLATFORM_TENANT_ID,
  };
}
