// أنواع البيانات الأساسية للعبة

export type HypothesisId = 'H1' | 'H2' | 'H3';
export type EvidenceId = 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6';
export type CharacterId = 'owner' | 'salesperson' | 'cashier' | 'stockkeeper' | 'customer' | 'accountant';
export type ActionId = 'talk_owner' | 'talk_salesperson' | 'talk_cashier' | 'talk_stockkeeper' | 'talk_customer' | 'review_invoices' | 'check_stock' | 'review_reports' | 'declare_solution';
export type EvidenceType = 'factual' | 'misleading' | 'decisive' | 'supporting' | 'trap';
export type AttemptStatus = 'in_progress' | 'success' | 'failed';
export type Rank = 'S' | 'A' | 'B' | 'C';

export interface Hypothesis {
  id: HypothesisId;
  text: string;
  status: 'active' | 'rejected';
}

export interface Evidence {
  id: EvidenceId;
  text: string;
  type: EvidenceType;
  source: ActionId;
  trapMessage?: string; // رسالة خاصة عند استخدام الدليل كفخ
}

export interface Character {
  id: CharacterId;
  name: string;
  role: string;
  avatar: string;
}

export interface GameAction {
  id: ActionId;
  label: string;
  icon: string;
  yieldsEvidence: EvidenceId | null;
}

export interface Dialogue {
  character: CharacterId | null;
  lines: string[];
  hasEvidence: boolean;
  evidenceId?: EvidenceId;
}

export interface Scenario {
  id: string;
  title: string;
  domain: string;
  problem: string;
  correctHypothesis: HypothesisId;
  hypotheses: Hypothesis[];
  characters: Character[];
  actions: GameAction[];
  evidence: Evidence[];
  dialogues: Record<ActionId, Dialogue>;
}

export interface Step {
  stepNumber: number;
  action: ActionId | 'reject_hypothesis';
  hypothesis?: HypothesisId;
  evidence?: EvidenceId[];  // تغيير لدعم أدلة متعددة
  result?: string;
  valid?: boolean;
  timestamp: number;
}

export interface Attempt {
  attemptNumber: number;
  steps: Step[];
  discoveredEvidence: EvidenceId[];
  rejectedHypotheses: HypothesisId[];
  reasoningMistakes: number;
  finalDecision?: {
    hypothesis: HypothesisId;
    evidence: EvidenceId[];  // تغيير لدعم أدلة متعددة
    correct: boolean;
  };
  status: AttemptStatus;
}

export interface GameSession {
  sessionId: string;
  startTime: number;
  currentAttempt: number;
  maxAttempts: number;
  maxSteps: number;
  attempts: Attempt[];
}

export interface TimelineItem {
  step: number;
  description: string;
  outcome: string;
  isPositive: boolean;
}

export interface GameResult {
  score: number;
  maxScore: number;
  rank: Rank;
  rankIcon: string;
  feedbackText: string;
  timeline: TimelineItem[];
  attemptUsed: number;
}

// خريطة صلاحية الأدلة - محدثة مع الفخاخ
export interface ValidityRule {
  validEvidence: EvidenceId[];      // أدلة صحيحة للنفي/الإثبات
  trapEvidence: EvidenceId[];       // أدلة فخ (تبدو صحيحة لكنها خاطئة)
  optimalEvidence?: EvidenceId[];   // الأدلة المثلى (أعلى نقاط)
  action: 'reject' | 'support';
}

export const VALIDITY_MAP: Record<HypothesisId, ValidityRule> = {
  // H1: عدد الزبائن قلّ
  // ينفى بـ E1 (حركة الزبائن طبيعية)
  // E5 فخ (يبدو أنه يدعم H1 لكنه مضلل)
  H1: { 
    validEvidence: ['E1'], 
    trapEvidence: ['E5', 'E2'],
    action: 'reject' 
  },
  
  // H2: الزبائن يأتون لكن يصرفون أقل
  // ينفى بـ E3 (الفرق في المخزون يثبت البيع) أو E6 (تحليل مفصل)
  // E2 فخ (متوسط الفاتورة أقل - يبدو داعماً لكنه مضلل)
  H2: { 
    validEvidence: ['E3', 'E6'], 
    trapEvidence: ['E2'],
    action: 'reject' 
  },
  
  // H3: تحدث مبيعات لكن لا تُسجّل جيدًا (الحل الصحيح)
  // يثبت بـ E3 (حاسم) + E4 (داعم) أو E6
  H3: { 
    validEvidence: ['E3', 'E4', 'E6'], 
    trapEvidence: ['E2'],
    optimalEvidence: ['E3', 'E4'],  // الجمع بينهما يعطي أعلى نقاط
    action: 'support' 
  },
};

// قواعد النقاط المحدثة
export const SCORING_RULES = {
  BASE_SCORE: 400,
  
  // مكافآت النفي الصحيح
  REJECT_H1_WITH_E1: 100,
  REJECT_H2_WITH_E3: 100,
  REJECT_H2_WITH_E6: 80,
  
  // مكافآت إثبات H3
  DECLARE_H3_WITH_E3_AND_E4: 300,  // الأدلة المثلى معاً
  DECLARE_H3_WITH_E3: 200,          // الدليل الحاسم فقط
  DECLARE_H3_WITH_E4: 100,          // الدليل الداعم فقط
  DECLARE_H3_WITH_E6: 150,          // التحليل المفصل
  
  // مكافآت المسار المثالي
  BONUS_REJECT_BOTH_BEFORE_SOLUTION: 150,  // رفض H1 و H2 قبل الحل
  BONUS_REJECT_H1_BEFORE_SOLUTION: 75,
  BONUS_REJECT_H2_BEFORE_SOLUTION: 75,
  
  // خصومات
  PENALTY_PER_EXTRA_STEP: 40,
  PENALTY_NO_REJECTIONS: 150,
  PENALTY_WEAK_EVIDENCE: 50,  // استخدام دليل ضعيف في الإثبات
  PENALTY_REASONING_MISTAKE: 40,
  PENALTY_REASONING_MISTAKE_ESCALATION: 20,
  
  // معاملات المحاولات
  ATTEMPT_2_MULTIPLIER: 0.7,
  ATTEMPT_3_MULTIPLIER: 0.5,
  
  MIN_STEPS_BEFORE_PENALTY: 4,
};

// حدود اللعبة
export const GAME_LIMITS = {
  MAX_ATTEMPTS: 3,
  MAX_STEPS: 6,
};

// رسائل الفخاخ
export const TRAP_MESSAGES: Record<string, string> = {
  'H1_E2': 'متوسط الفاتورة الأقل لا ينفي أن عدد الزبائن قلّ! هذا ربط خاطئ.',
  'H1_E5': 'هذا الكلام مجرد رأي شخصي وليس دليلاً قاطعاً! انتبه للفرق بين الرأي والحقيقة.',
  'H2_E2': 'وقعت في الفخ! متوسط الفاتورة الأقل يبدو داعماً لـH2 وليس نافياً لها. أعد التفكير!',
  'H3_E2': 'متوسط الفاتورة لا علاقة له بمشكلة التسجيل!',
  'WRONG_DECLARE': 'اخترت الفرضية الخاطئة! عُد وتفحص الأدلة بعناية أكبر.',
};
