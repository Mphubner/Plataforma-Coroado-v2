import { z } from 'zod';
import { cleanText, DEFAULT_PLATFORM_TENANT_ID } from './payloads';

export { cleanText, DEFAULT_PLATFORM_TENANT_ID } from './payloads';

const optionalText = (max: number) => z.unknown().optional().transform(value => cleanText(value, max));

const requiredText = (max: number, message: string) =>
  z.unknown()
    .transform(value => cleanText(value, max))
    .refine(value => value.length > 0, { message });

const boundedNumber = (min: number, max: number, message: string) =>
  z.coerce.number()
    .min(min, { message })
    .max(max, { message });

const idText = (message = 'Identificador obrigatorio') => requiredText(128, message);

export const visitorLeadRequestSchema = z.object({
  name: requiredText(200, 'Nome e obrigatorio'),
  phone: requiredText(50, 'WhatsApp e obrigatorio'),
  neighborhood: optionalText(200),
  source: optionalText(120),
  tenantId: optionalText(128),
}).transform(lead => ({
  ...lead,
  source: lead.source || 'site_publico',
  tenantId: lead.tenantId || DEFAULT_PLATFORM_TENANT_ID,
}));

export const checkoutCartItemSchema = z.object({
  productId: optionalText(128),
  product: z.object({
    id: z.union([z.string(), z.number()]).transform(value => cleanText(value, 128)).optional(),
  }).passthrough().optional(),
  quantity: z.coerce.number().int().min(1).max(20),
  size: optionalText(50),
  color: optionalText(50),
}).passthrough().transform(item => ({
  productId: item.productId || item.product?.id || '',
  quantity: item.quantity,
  size: item.size,
  color: item.color,
})).refine(item => item.productId.length > 0, {
  message: 'Produto invalido',
  path: ['productId'],
});

export const checkoutRequestSchema = z.object({
  items: z.array(checkoutCartItemSchema).min(1).max(50),
});

export const tenantScopedSchema = z.object({
  tenantId: idText('Tenant obrigatorio'),
});

export const paymentStatusSchema = z.enum(['created', 'pending', 'approved', 'paid', 'completed', 'rejected', 'failed', 'cancelled', 'refunded']);

export const cellReportInputSchema = tenantScopedSchema.extend({
  cellId: idText('Celula obrigatoria'),
  date: requiredText(50, 'Data obrigatoria'),
  type: optionalText(50),
  meetingType: optionalText(100),
  present: boundedNumber(0, 1000, 'Presencas invalidas').int(),
  visitors: boundedNumber(0, 1000, 'Visitantes invalidos').int(),
  summary: requiredText(2000, 'Resumo obrigatorio'),
  presentMembersIds: z.array(idText()).max(1000).optional(),
  visitorData: z.union([
    z.object({ name: optionalText(200) }).passthrough(),
    z.null(),
  ]).optional(),
  createdBy: optionalText(128),
}).passthrough();

export const transactionStatusSchema = z.enum(['created', 'pending', 'completed', 'failed', 'cancelled', 'refunded']);
export const transactionMethodSchema = z.enum(['pix', 'pix_manual', 'card', 'cash', 'transfer', 'mercado_pago']);

export const transactionInputSchema = tenantScopedSchema.extend({
  userId: idText('Membro obrigatorio'),
  amount: boundedNumber(0.01, 1_000_000, 'Valor invalido'),
  type: requiredText(120, 'Tipo obrigatorio'),
  itemId: idText('Item obrigatorio'),
  status: transactionStatusSchema,
  date: requiredText(50, 'Data obrigatoria'),
  method: transactionMethodSchema,
}).passthrough();

export const contributionRequestSchema = z.object({
  amount: boundedNumber(0.01, 1_000_000, 'Valor invalido'),
  contributionType: requiredText(120, 'Tipo de contribuicao obrigatorio'),
  itemId: optionalText(128),
  method: transactionMethodSchema.optional(),
}).transform(input => ({
  amount: Math.round(input.amount * 100) / 100,
  contributionType: input.contributionType,
  itemId: input.itemId || input.contributionType,
  method: input.method || 'pix_manual',
}));

export const transactionReconciliationRequestSchema = z.object({
  status: z.enum(['completed', 'failed', 'cancelled', 'refunded']),
  note: optionalText(500),
});

export const planRequestSchema = z.object({
  name: requiredText(200, 'Nome do plano obrigatorio'),
  price: boundedNumber(0, 1_000_000, 'Preco invalido'),
  interval: z.enum(['monthly', 'yearly']),
  type: z.enum(['individual', 'family']),
  features: z.array(z.string().max(300)).max(50).optional(),
  featuresRaw: optionalText(2000),
}).transform(input => ({
  name: input.name,
  price: Math.round(input.price * 100) / 100,
  interval: input.interval,
  type: input.type,
  features: (input.features?.length ? input.features : input.featuresRaw.split(','))
    .map(feature => cleanText(feature, 300))
    .filter(Boolean),
}));

export const eventCheckInRequestSchema = z.object({
  enrollmentId: idText('Inscricao obrigatoria'),
  source: optionalText(100),
});

export const eventEnrollmentKidSchema = z.object({
  id: optionalText(128),
  name: requiredText(200, 'Nome da crianca obrigatorio'),
  age: optionalText(30),
  obs: optionalText(500),
  checkedIn: z.boolean().default(false),
}).passthrough();

export const eventEnrollmentInputSchema = tenantScopedSchema.extend({
  eventId: idText('Evento obrigatorio'),
  userId: idText('Membro obrigatorio'),
  checkedIn: z.boolean(),
  kids: z.array(eventEnrollmentKidSchema).max(30).optional(),
  paymentStatus: paymentStatusSchema.optional(),
  preferenceId: optionalText(128),
}).passthrough();

export const eventEnrollmentRequestKidSchema = z.object({
  name: optionalText(200),
  age: optionalText(30),
  obs: optionalText(500),
}).passthrough();

export const eventEnrollmentRequestSchema = z.object({
  eventId: idText('Evento obrigatorio'),
  ticketTypeId: z.string().optional(),
  isServant: z.boolean().optional(),
  kids: z.array(eventEnrollmentRequestKidSchema).max(30).optional(),
}).transform(input => ({
  eventId: input.eventId,
  ticketTypeId: input.ticketTypeId,
  isServant: input.isServant,
  kids: (input.kids || []).filter(kid => kid.name.length > 0),
}));

export const orderStatusSchema = z.enum(['created', 'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']);

export const orderItemSnapshotSchema = z.object({
  productId: idText('Produto obrigatorio'),
  name: requiredText(200, 'Nome do produto obrigatorio'),
  quantity: boundedNumber(1, 100, 'Quantidade invalida').int(),
  unitPrice: boundedNumber(0, 1_000_000, 'Preco invalido'),
  size: optionalText(50),
  color: optionalText(50),
}).passthrough();

export const orderInputSchema = tenantScopedSchema.extend({
  userId: idText('Comprador obrigatorio'),
  userName: requiredText(200, 'Nome do comprador obrigatorio'),
  items: z.array(orderItemSnapshotSchema).min(1).max(100),
  total: boundedNumber(0.01, 1_000_000, 'Total invalido'),
  status: orderStatusSchema,
  paymentMethod: requiredText(50, 'Metodo de pagamento obrigatorio'),
  paymentStatus: paymentStatusSchema.optional(),
}).passthrough();

export const memberProfileSchema = tenantScopedSchema.extend({
  id: optionalText(128),
  name: requiredText(200, 'Nome obrigatorio'),
  email: optionalText(200),
  phone: optionalText(50),
  roles: z.array(z.string().max(64)).max(20).optional(),
  cellId: optionalText(128),
  ministryId: optionalText(128),
  isApproved: z.boolean().optional(),
}).passthrough();

export const memberProfileUpdateSchema = z.object({
  cellId: optionalText(128),
  ministryIds: z.array(z.string().max(128)).optional(),
  supervisorId: optionalText(128),
  cep: optionalText(10),
  street: optionalText(300),
  number: optionalText(20),
  complement: optionalText(200),
  neighborhood: optionalText(200),
  city: optionalText(200),
  address: optionalText(500),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  phone: optionalText(50),
  birthdate: optionalText(50),
  maritalStatus: optionalText(100),
  profession: optionalText(150),
  socialMedia: optionalText(300),
  avatarUrl: optionalText(1000),
}).passthrough();

export const taskInputSchema = tenantScopedSchema.extend({
  title: requiredText(200, 'Titulo obrigatorio'),
  description: optionalText(1000),
  tag: requiredText(100, 'Categoria obrigatoria'),
  assigneeId: optionalText(128),
  status: z.enum(['todo', 'in-progress', 'done', 'pending', 'completed']),
  createdBy: idText('Criador obrigatorio'),
  dueDate: optionalText(50),
  startDate: optionalText(50),
  completedAt: optionalText(50),
}).passthrough();

export const pastoralAppointmentStatusSchema = z.enum(['scheduled', 'approved', 'declined', 'completed', 'cancelled']);

export const pastoralAppointmentInputSchema = tenantScopedSchema.extend({
  pastorId: idText('Pastor obrigatorio'),
  pastorName: requiredText(200, 'Nome do pastor obrigatorio'),
  userId: idText('Membro obrigatorio'),
  userName: requiredText(200, 'Nome do membro obrigatorio'),
  date: requiredText(50, 'Data obrigatoria'),
  time: requiredText(50, 'Horario obrigatorio'),
  status: pastoralAppointmentStatusSchema,
}).passthrough();

export const socialAppointmentStatusSchema = z.enum(['pending', 'approved', 'declined', 'completed', 'cancelled']);

export const socialAppointmentInputSchema = tenantScopedSchema.extend({
  userName: requiredText(200, 'Nome do beneficiario obrigatorio'),
  userId: idText('Beneficiario obrigatorio'),
  professionalId: idText('Profissional obrigatorio'),
  professionalName: requiredText(200, 'Nome do profissional obrigatorio'),
  specialty: requiredText(200, 'Especialidade obrigatoria'),
  date: requiredText(50, 'Data obrigatoria'),
  time: requiredText(50, 'Horario obrigatorio'),
  status: socialAppointmentStatusSchema,
  paymentStatus: paymentStatusSchema,
  price: z.union([boundedNumber(0, 1_000_000, 'Preco invalido'), z.null()]).optional(),
}).passthrough();

export const socialProfessionalInputSchema = tenantScopedSchema.extend({
  name: requiredText(200, 'Nome obrigatorio'),
  specialty: requiredText(200, 'Especialidade obrigatoria'),
  email: requiredText(200, 'Email obrigatorio'),
  photoUrl: optionalText(1000),
  isPublic: z.boolean(),
  price: z.union([boundedNumber(0, 1_000_000, 'Preco invalido'), z.null()]).optional(),
  availableTimes: z.array(z.string().max(50)).max(100).optional(),
}).passthrough();

export const visitorLeadStatusSchema = z.enum(['new', 'contacted', 'assigned', 'converted']);
export const prayerRequestStatusSchema = z.enum(['open', 'praying', 'answered']);

export const courseInputSchema = tenantScopedSchema.extend({
  title: requiredText(200, 'Titulo obrigatorio'),
  status: requiredText(50, 'Status obrigatorio'),
  category: optionalText(100),
  description: optionalText(2000),
  level: optionalText(100),
  duration: optionalText(50),
  img: optionalText(1000),
  students: boundedNumber(0, 1_000_000, 'Alunos invalidos').optional(),
  isSubscriptionOnly: z.boolean().optional(),
  monthlyPrice: boundedNumber(0, 1_000_000, 'Preco invalido').optional(),
  createdBy: idText('Criador obrigatorio'),
}).passthrough();

export const learningPathInputSchema = tenantScopedSchema.extend({
  title: requiredText(200, 'Titulo obrigatorio'),
  description: optionalText(2000),
  stage: requiredText(128, 'Etapa obrigatoria'),
  courses: z.array(idText()).max(100),
}).passthrough();

export const moduleInputSchema = tenantScopedSchema.extend({
  title: requiredText(200, 'Titulo obrigatorio'),
  courseId: idText('Curso obrigatorio'),
  order: boundedNumber(0, 1000, 'Ordem invalida').int(),
}).passthrough();

export const lessonInputSchema = tenantScopedSchema.extend({
  title: requiredText(200, 'Titulo obrigatorio'),
  description: optionalText(2000),
  videoUrl: optionalText(500),
  moduleId: idText('Modulo obrigatorio'),
  courseId: idText('Curso obrigatorio'),
  order: boundedNumber(0, 1000, 'Ordem invalida').int(),
  isFree: z.boolean(),
  standalonePrice: boundedNumber(0, 1_000_000, 'Preco invalido').optional(),
}).passthrough();

export const enrollmentInputSchema = tenantScopedSchema.extend({
  userId: idText('Membro obrigatorio'),
  courseId: idText('Curso obrigatorio'),
  progress: boundedNumber(0, 100, 'Progresso invalido'),
  status: z.enum(['in-progress', 'completed', 'cancelled']),
  completedLessons: z.array(idText()).max(1000),
}).passthrough();

export const schoolEnrollmentRequestSchema = z.object({
  courseId: idText('Curso obrigatorio'),
});

export const schoolProgressRequestSchema = z.object({
  enrollmentId: idText('Matricula obrigatoria'),
  lessonId: idText('Aula obrigatoria'),
  completed: z.boolean().default(true),
});

export const schoolSubscriptionRequestSchema = z.object({
  planTitle: optionalText(200),
  amount: boundedNumber(1, 100_000, 'Valor invalido').optional(),
});

export const schoolPurchaseRequestSchema = z.object({
  targetType: z.enum(['course', 'lesson']),
  targetId: idText('Item obrigatorio'),
});

export const taskUpdateInputSchema = tenantScopedSchema.extend({
  taskId: idText('Tarefa obrigatoria'),
  content: requiredText(2000, 'Comentario obrigatorio'),
  authorName: requiredText(200, 'Autor obrigatorio'),
  date: requiredText(50, 'Data obrigatoria'),
}).passthrough();

export const ministryInputSchema = tenantScopedSchema.extend({
  name: requiredText(200, 'Nome obrigatorio'),
  description: optionalText(2000),
  leaderId: optionalText(128),
  leaderName: optionalText(200),
  icon: requiredText(50, 'Icone obrigatorio'),
  members: z.array(z.unknown()).optional(),
  requiredTracks: z.array(z.unknown()).optional(),
}).passthrough();

export const scaleAssignmentSchema = z.object({
  memberId: optionalText(128),
  role: requiredText(200, 'Funcao obrigatoria'),
  status: z.enum(['pending', 'accepted', 'declined']),
}).passthrough();

export const scaleInputSchema = tenantScopedSchema.extend({
  ministryId: idText('Ministerio obrigatorio'),
  eventName: requiredText(200, 'Evento obrigatorio'),
  date: requiredText(50, 'Data obrigatoria'),
  time: requiredText(50, 'Horario obrigatorio'),
  assignments: z.array(scaleAssignmentSchema).max(200),
  setlist: z.array(z.string().max(200)).optional(),
  notes: optionalText(2000),
}).passthrough();

export const briefingStatusSchema = z.enum(['todo', 'in-progress', 'done', 'pending', 'accepted', 'declined', 'completed']);

export const briefingInputSchema = tenantScopedSchema.extend({
  ministryId: idText('Ministerio obrigatorio'),
  requesterMinistry: requiredText(200, 'Solicitante obrigatorio'),
  title: requiredText(200, 'Titulo obrigatorio'),
  description: optionalText(2000),
  deadline: requiredText(50, 'Prazo obrigatorio'),
  status: briefingStatusSchema,
  assigneeId: optionalText(128),
}).passthrough();

export type VisitorLeadRequest = z.infer<typeof visitorLeadRequestSchema>;
export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;
export type CheckoutCartItem = CheckoutRequest['items'][number];
export type CellReportInput = z.infer<typeof cellReportInputSchema>;
export type TransactionInput = z.infer<typeof transactionInputSchema>;
export type ContributionRequest = z.infer<typeof contributionRequestSchema>;
export type TransactionReconciliationRequest = z.infer<typeof transactionReconciliationRequestSchema>;
export type PlanRequest = z.infer<typeof planRequestSchema>;
export type EventEnrollmentInput = z.infer<typeof eventEnrollmentInputSchema>;
export type EventCheckInRequest = z.infer<typeof eventCheckInRequestSchema>;
export type EventEnrollmentRequest = z.infer<typeof eventEnrollmentRequestSchema>;
export type OrderInput = z.infer<typeof orderInputSchema>;
export type MemberProfile = z.infer<typeof memberProfileSchema>;
export type MemberProfileUpdate = z.infer<typeof memberProfileUpdateSchema>;
export type TaskInput = z.infer<typeof taskInputSchema>;
export type PastoralAppointmentInput = z.infer<typeof pastoralAppointmentInputSchema>;
export type SocialAppointmentInput = z.infer<typeof socialAppointmentInputSchema>;
export type SocialProfessionalInput = z.infer<typeof socialProfessionalInputSchema>;
export type VisitorLeadStatus = z.infer<typeof visitorLeadStatusSchema>;
export type PrayerRequestStatus = z.infer<typeof prayerRequestStatusSchema>;
export type CourseInput = z.infer<typeof courseInputSchema>;
export type LearningPathInput = z.infer<typeof learningPathInputSchema>;
export type ModuleInput = z.infer<typeof moduleInputSchema>;
export type LessonInput = z.infer<typeof lessonInputSchema>;
export type EnrollmentInput = z.infer<typeof enrollmentInputSchema>;
export type SchoolEnrollmentRequest = z.infer<typeof schoolEnrollmentRequestSchema>;
export type SchoolProgressRequest = z.infer<typeof schoolProgressRequestSchema>;
export type SchoolSubscriptionRequest = z.infer<typeof schoolSubscriptionRequestSchema>;
export type SchoolPurchaseRequest = z.infer<typeof schoolPurchaseRequestSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateInputSchema>;
export type MinistryInput = z.infer<typeof ministryInputSchema>;
export type ScaleInput = z.infer<typeof scaleInputSchema>;
export type BriefingInput = z.infer<typeof briefingInputSchema>;
