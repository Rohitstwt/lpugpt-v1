import { z } from "zod";

/** Citation from RAG retrieval */
export const CitationSchema = z.object({
  id: z.string(),
  title: z.string(),
  source: z.string(),
  snippet: z.string().optional(),
});

/** Base block — every UI block has a type and optional text fallback */
export const TextBlockSchema = z.object({
  type: z.literal("text"),
  content: z.string(),
  citations: z.array(CitationSchema).optional(),
});

export const RouteCardDataSchema = z.object({
  from: z.string(),
  to: z.string(),
  distance: z.string(),
  duration: z.string(),
  steps: z.array(z.string()).optional(),
  fromLat: z.number().optional(),
  fromLng: z.number().optional(),
  toLat: z.number().optional(),
  toLng: z.number().optional(),
  landmarks: z.array(z.string()).optional(),
  mapsUrl: z.string().optional(),
});

export const RouteCardBlockSchema = z.object({
  type: z.literal("route_card"),
  data: RouteCardDataSchema,
  text: z.string().optional(),
});

export const BuildingCardDataSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  block: z.string().optional(),
  description: z.string().optional(),
  facilities: z.array(z.string()).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  imageUrl: z.string().optional(),
});

export const BuildingCardBlockSchema = z.object({
  type: z.literal("building_card"),
  data: BuildingCardDataSchema,
});

export const FacultyCardDataSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  department: z.string().optional(),
  designation: z.string().optional(),
  email: z.string().optional(),
  specialization: z.string().optional(),
  imageUrl: z.string().optional(),
});

export const FacultyCardBlockSchema = z.object({
  type: z.literal("faculty_card"),
  data: FacultyCardDataSchema,
});

export const EventCardDataSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  date: z.string(),
  time: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
});

export const EventCardBlockSchema = z.object({
  type: z.literal("event_card"),
  data: EventCardDataSchema,
});

export const NoticeCardDataSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  body: z.string(),
  date: z.string().optional(),
  category: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
});

export const NoticeCardBlockSchema = z.object({
  type: z.literal("notice_card"),
  data: NoticeCardDataSchema,
});

export const HostelCardDataSchema = z.object({
  name: z.string(),
  block: z.string().optional(),
  type: z.string().optional(),
  facilities: z.array(z.string()).optional(),
  warden: z.string().optional(),
  description: z.string().optional(),
});

export const HostelCardBlockSchema = z.object({
  type: z.literal("hostel_card"),
  data: HostelCardDataSchema,
});

export const LibraryCardDataSchema = z.object({
  name: z.string(),
  hours: z.string().optional(),
  location: z.string().optional(),
  services: z.array(z.string()).optional(),
  description: z.string().optional(),
});

export const LibraryCardBlockSchema = z.object({
  type: z.literal("library_card"),
  data: LibraryCardDataSchema,
});

export const RestaurantCardDataSchema = z.object({
  name: z.string(),
  cuisine: z.string().optional(),
  distance: z.string().optional(),
  rating: z.number().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  mapsUrl: z.string().optional(),
});

export const RestaurantCardBlockSchema = z.object({
  type: z.literal("restaurant_card"),
  data: RestaurantCardDataSchema,
});

export const FAQCardDataSchema = z.object({
  question: z.string(),
  answer: z.string(),
  category: z.string().optional(),
});

export const FAQCardBlockSchema = z.object({
  type: z.literal("faq_card"),
  data: FAQCardDataSchema,
});

export const SourcesCardDataSchema = z.object({
  sources: z.array(CitationSchema),
});

export const SourcesCardBlockSchema = z.object({
  type: z.literal("sources_card"),
  data: SourcesCardDataSchema,
});

export const CampusMapDataSchema = z.object({
  centerLat: z.number(),
  centerLng: z.number(),
  zoom: z.number().optional(),
  markers: z
    .array(
      z.object({
        lat: z.number(),
        lng: z.number(),
        label: z.string(),
        type: z.string().optional(),
      })
    )
    .optional(),
  routePolyline: z.array(z.object({ lat: z.number(), lng: z.number() })).optional(),
});

export const CampusMapBlockSchema = z.object({
  type: z.literal("campus_map"),
  data: CampusMapDataSchema,
});

export const NearbyPlacesDataSchema = z.object({
  query: z.string(),
  places: z.array(
    z.object({
      name: z.string(),
      type: z.string().optional(),
      distance: z.string().optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
    })
  ),
});

export const NearbyPlacesBlockSchema = z.object({
  type: z.literal("nearby_places"),
  data: NearbyPlacesDataSchema,
});

export const QuickActionsDataSchema = z.object({
  actions: z.array(
    z.object({
      label: z.string(),
      query: z.string(),
      icon: z.string().optional(),
    })
  ),
});

export const QuickActionsBlockSchema = z.object({
  type: z.literal("quick_actions"),
  data: QuickActionsDataSchema,
});

export const SearchResultDataSchema = z.object({
  title: z.string(),
  snippet: z.string(),
  source: z.string().optional(),
  url: z.string().optional(),
});

export const SearchResultBlockSchema = z.object({
  type: z.literal("search_result"),
  data: SearchResultDataSchema,
});

export const AttendanceCardDataSchema = z.object({
  courseCode: z.string().optional(),
  courseName: z.string().optional(),
  present: z.number(),
  total: z.number(),
  percentage: z.number(),
  status: z.enum(["good", "warning", "critical"]).optional(),
});

export const AttendanceCardBlockSchema = z.object({
  type: z.literal("attendance_card"),
  data: AttendanceCardDataSchema,
});

export const FeeCardDataSchema = z.object({
  invoices: z.array(
    z.object({
      id: z.string().optional(),
      term: z.string(),
      category: z.string(),
      amountInr: z.number(),
      paidInr: z.number(),
      status: z.string(),
      dueDate: z.string().optional(),
    })
  ),
  totalDue: z.number().optional(),
});

export const FeeCardBlockSchema = z.object({
  type: z.literal("fee_card"),
  data: FeeCardDataSchema,
});

export const AgentRunDataSchema = z.object({
  workflow: z.string(),
  portalUrl: z.string().optional(),
  steps: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      status: z.enum(["pending", "running", "ok", "fail"]),
      detail: z.string(),
    })
  ),
});

export const AgentRunBlockSchema = z.object({
  type: z.literal("agent_run"),
  data: AgentRunDataSchema,
});

export const AgentImageDataSchema = z.object({
  imageUrl: z.string(),
  caption: z.string().optional(),
  title: z.string().optional(),
});

export const AgentImageBlockSchema = z.object({
  type: z.literal("agent_image"),
  data: AgentImageDataSchema,
});

export const PaymentResultDataSchema = z.object({
  status: z.enum(["success", "partial", "failed"]),
  title: z.string(),
  paidLabel: z.string(),
  amountPaid: z.number(),
  totalDue: z.number(),
  txnId: z.string().optional(),
  imageUrl: z.string().optional(),
  portalUrl: z.string().optional(),
  invoices: z.array(
    z.object({
      id: z.string().optional(),
      term: z.string(),
      category: z.string(),
      amountInr: z.number(),
      paidInr: z.number(),
      status: z.string(),
    })
  ),
});

export const PaymentResultBlockSchema = z.object({
  type: z.literal("payment_result"),
  data: PaymentResultDataSchema,
});

export const LiveBrowserDataSchema = z.object({
  url: z.string(),
  title: z.string().optional(),
  studentName: z.string(),
  studentEmail: z.string().optional(),
  feeCategory: z.enum(["hostel", "exam", "tuition"]),
  /** Total outstanding before automation (for result card) */
  amountDue: z.number().optional(),
  /** Human-readable due lines for the approval sheet */
  dueLines: z.array(z.string()).optional(),
  /** Pay all remaining dues after the visible portal payment */
  payAllRemaining: z.boolean().optional().default(true),
  /** Show Allow/Skip overlay before any form filling */
  requireApproval: z.boolean().optional().default(true),
});

export const LiveBrowserBlockSchema = z.object({
  type: z.literal("live_browser"),
  data: LiveBrowserDataSchema,
});

export const AssignmentSessionDataSchema = z.object({
  url: z.string(),
  title: z.string().optional(),
  studentName: z.string(),
  studentEmail: z.string().optional(),
  courseCode: z.string(),
  assignmentTitle: z.string(),
  dueLabel: z.string(),
  fileName: z.string().optional().default("assignment-demo.pdf"),
  requireApproval: z.boolean().optional().default(true),
});

export const AssignmentSessionBlockSchema = z.object({
  type: z.literal("assignment_session"),
  data: AssignmentSessionDataSchema,
});

export const LeaveSessionDataSchema = z.object({
  url: z.string(),
  title: z.string().optional(),
  studentName: z.string(),
  studentEmail: z.string().optional(),
  leaveType: z.enum(["sick", "casual", "emergency", "home"]),
  leaveTypeLabel: z.string(),
  fromDate: z.string(),
  toDate: z.string(),
  dateLabel: z.string(),
  reason: z.string(),
  requireApproval: z.boolean().optional().default(true),
});

export const LeaveSessionBlockSchema = z.object({
  type: z.literal("leave_session"),
  data: LeaveSessionDataSchema,
});

export const AgentConfirmDataSchema = z.object({
  title: z.string(),
  description: z.string(),
  bullets: z.array(z.string()).optional(),
  /** What the agent will do if approved */
  allowLabel: z.string().optional().default("Allow"),
  denyLabel: z.string().optional().default("Skip"),
  /** Nested action to run after approval */
  action: z.object({
    type: z.literal("live_browser"),
    data: LiveBrowserDataSchema,
  }),
});

export const AgentConfirmBlockSchema = z.object({
  type: z.literal("agent_confirm"),
  data: AgentConfirmDataSchema,
});

export const TimetableCardDataSchema = z.object({
  entries: z.array(
    z.object({
      courseCode: z.string(),
      courseName: z.string().optional(),
      schedule: z.string(),
      location: z.string(),
      faculty: z.string().optional(),
    })
  ),
});

export const TimetableCardBlockSchema = z.object({
  type: z.literal("timetable_card"),
  data: TimetableCardDataSchema,
});

export const GradesCardDataSchema = z.object({
  term: z.string().optional(),
  gpaHint: z.string().optional(),
  rows: z.array(
    z.object({
      courseCode: z.string(),
      courseName: z.string().optional(),
      grade: z.string(),
      marks: z.number().nullable().optional(),
      credits: z.number().optional(),
      term: z.string().optional(),
    })
  ),
});

export const GradesCardBlockSchema = z.object({
  type: z.literal("grades_card"),
  data: GradesCardDataSchema,
});

export const AssignmentsCardDataSchema = z.object({
  title: z.string().optional(),
  filter: z.enum(["all", "pending", "projects", "reports"]).optional(),
  tasks: z.array(
    z.object({
      id: z.string().optional(),
      courseCode: z.string(),
      title: z.string(),
      dueLabel: z.string(),
      status: z.string(),
      kind: z.enum(["assignment", "project", "report", "lab"]).optional(),
      fileName: z.string().nullable().optional(),
    })
  ),
});

export const AssignmentsCardBlockSchema = z.object({
  type: z.literal("assignments_card"),
  data: AssignmentsCardDataSchema,
});

export const AttendanceCalcCardDataSchema = z.object({
  ruleLabel: z.string().optional(),
  minPercent: z.number().default(75),
  rows: z.array(
    z.object({
      courseCode: z.string(),
      courseName: z.string().optional(),
      present: z.number(),
      total: z.number(),
      percentage: z.number(),
      status: z.enum(["eligible", "warning", "ineligible"]),
      canMiss: z.number(),
      needAttend: z.number(),
      note: z.string(),
    })
  ),
});

export const AttendanceCalcCardBlockSchema = z.object({
  type: z.literal("attendance_calc_card"),
  data: AttendanceCalcCardDataSchema,
});

export const CgpaCardDataSchema = z.object({
  scale: z.string().optional(),
  sgpa: z.number(),
  totalCredits: z.number(),
  band: z.string().optional(),
  bandHint: z.string().optional(),
  term: z.string().optional(),
  rows: z.array(
    z.object({
      courseCode: z.string(),
      courseName: z.string().optional(),
      grade: z.string(),
      marks: z.number().nullable().optional(),
      credits: z.number(),
      gradePoint: z.number(),
      term: z.string().optional(),
    })
  ),
});

export const CgpaCardBlockSchema = z.object({
  type: z.literal("cgpa_card"),
  data: CgpaCardDataSchema,
});

export const ResultsChartsCardDataSchema = z.object({
  title: z.string().optional(),
  marks: z.array(
    z.object({
      courseCode: z.string(),
      courseName: z.string().optional(),
      marks: z.number(),
      grade: z.string().optional(),
    })
  ),
  gradeDist: z.array(
    z.object({
      grade: z.string(),
      count: z.number(),
    })
  ),
  attendance: z
    .array(
      z.object({
        courseCode: z.string(),
        percentage: z.number(),
      })
    )
    .optional(),
  gradePoints: z
    .array(
      z.object({
        courseCode: z.string(),
        gradePoint: z.number(),
      })
    )
    .optional(),
});

export const ResultsChartsCardBlockSchema = z.object({
  type: z.literal("results_charts_card"),
  data: ResultsChartsCardDataSchema,
});

export const CampusNavCardDataSchema = z.object({
      places: z.array(
    z.object({
      id: z.string(),
      lat: z.number(),
      lng: z.number(),
      name: z.string(),
      description: z.string().optional(),
      category: z.string(),
      googleQuery: z.string().optional(),
      source: z.string().optional(),
      osmName: z.string().optional(),
    })
  ),
  fromId: z.string().optional(),
  toId: z.string().optional(),
  title: z.string().optional(),
});

export const CampusNavCardBlockSchema = z.object({
  type: z.literal("campus_nav"),
  data: CampusNavCardDataSchema,
});

export const UIBlockSchema = z.discriminatedUnion("type", [
  TextBlockSchema,
  RouteCardBlockSchema,
  BuildingCardBlockSchema,
  FacultyCardBlockSchema,
  EventCardBlockSchema,
  NoticeCardBlockSchema,
  HostelCardBlockSchema,
  LibraryCardBlockSchema,
  RestaurantCardBlockSchema,
  FAQCardBlockSchema,
  SourcesCardBlockSchema,
  CampusMapBlockSchema,
  NearbyPlacesBlockSchema,
  QuickActionsBlockSchema,
  SearchResultBlockSchema,
  AttendanceCardBlockSchema,
  FeeCardBlockSchema,
  AgentRunBlockSchema,
  AgentImageBlockSchema,
  PaymentResultBlockSchema,
  LiveBrowserBlockSchema,
  AssignmentSessionBlockSchema,
  LeaveSessionBlockSchema,
  AgentConfirmBlockSchema,
  TimetableCardBlockSchema,
  GradesCardBlockSchema,
  AssignmentsCardBlockSchema,
  AttendanceCalcCardBlockSchema,
  CgpaCardBlockSchema,
  ResultsChartsCardBlockSchema,
  CampusNavCardBlockSchema,
]);

export const ChatResponseSchema = z.object({
  intent: z.string(),
  blocks: z.array(UIBlockSchema),
  meshEvent: z
    .object({
      id: z.string(),
      type: z.string(),
      title: z.string(),
      body: z.string(),
      courseCode: z.string().nullable().optional(),
      location: z.string().nullable().optional(),
      authorName: z.string().nullable().optional(),
      createdAt: z.string().optional(),
    })
    .optional(),
});

export type Citation = z.infer<typeof CitationSchema>;
export type UIBlock = z.infer<typeof UIBlockSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
export type RouteCardData = z.infer<typeof RouteCardDataSchema>;
export type BuildingCardData = z.infer<typeof BuildingCardDataSchema>;
export type FacultyCardData = z.infer<typeof FacultyCardDataSchema>;
export type EventCardData = z.infer<typeof EventCardDataSchema>;
export type NoticeCardData = z.infer<typeof NoticeCardDataSchema>;
export type HostelCardData = z.infer<typeof HostelCardDataSchema>;
export type LibraryCardData = z.infer<typeof LibraryCardDataSchema>;
export type AttendanceCardData = z.infer<typeof AttendanceCardDataSchema>;
export type FeeCardData = z.infer<typeof FeeCardDataSchema>;
export type TimetableCardData = z.infer<typeof TimetableCardDataSchema>;
export type PaymentResultData = z.infer<typeof PaymentResultDataSchema>;
export type LiveBrowserData = z.infer<typeof LiveBrowserDataSchema>;
export type AssignmentSessionData = z.infer<typeof AssignmentSessionDataSchema>;
export type LeaveSessionData = z.infer<typeof LeaveSessionDataSchema>;
export type AgentConfirmData = z.infer<typeof AgentConfirmDataSchema>;
export type GradesCardData = z.infer<typeof GradesCardDataSchema>;
export type AssignmentsCardData = z.infer<typeof AssignmentsCardDataSchema>;
export type AttendanceCalcCardData = z.infer<typeof AttendanceCalcCardDataSchema>;
export type CgpaCardData = z.infer<typeof CgpaCardDataSchema>;
export type ResultsChartsCardData = z.infer<typeof ResultsChartsCardDataSchema>;
export type CampusNavCardData = z.infer<typeof CampusNavCardDataSchema>;
