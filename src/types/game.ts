// أنواع البيانات الأساسية للعبة

export type HypothesisId = 'H1' | 'H2' | 'H3';
export type EvidenceId = 'E1' | 'E2' | 'E3' | 'E4';
export type CharacterId = 'owner' | 'salesperson' | 'cashier' | 'stockkeeper';
export type ActionId = 'talk_owner' | 'talk_salesperson' | 'talk_cashier' | 'review_invoices' | 'check_stock' | 'declare_solution';
export type EvidenceType = 'factual' | 'misleading' | 'decisive' | 'supporting';
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
  evidence?: EvidenceId;
  result?: string;
  valid?: boolean;
  timestamp: number;
}

export interface Attempt {
  attemptNumber: number;
  steps: Step[];
  discoveredEvidence: EvidenceId[];
  rejectedHypotheses: HypothesisId[];
  finalDecision?: {
    hypothesis: HypothesisId;
    evidence: EvidenceId;
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

// خريطة صلاحية الأدلة لنفي الفرضيات
export const VALIDITY_MAP: Record<HypothesisId, { validEvidence: EvidenceId[]; action: 'reject' | 'support' }> = {
  H1: { validEvidence: ['E1'], action: 'reject' },
  H2: { validEvidence: ['E3'], action: 'reject' },
  H3: { validEvidence: ['E3', 'E4'], action: 'support' },
};

// قواعد النقاط
export const SCORING_RULES = {
  BASE_SCORE: 500,
  REJECT_H1_WITH_E1: 150,
  REJECT_H2_WITH_E3: 150,
  DECLARE_H3_WITH_E3: 250,
  DECLARE_H3_WITH_E4: 150,
  BONUS_REJECT_H1_BEFORE_SOLUTION: 100,
  PENALTY_PER_EXTRA_STEP: 50,
  PENALTY_NO_REJECTIONS: 200,
  PENALTY_WRONG_EVIDENCE_LINK: 25,
  ATTEMPT_2_MULTIPLIER: 0.8,
  ATTEMPT_3_MULTIPLIER: 0.6,
  MIN_STEPS_BEFORE_PENALTY: 3,
};

// حدود اللعبة
export const GAME_LIMITS = {
  MAX_ATTEMPTS: 3,
  MAX_STEPS: 5,
};
