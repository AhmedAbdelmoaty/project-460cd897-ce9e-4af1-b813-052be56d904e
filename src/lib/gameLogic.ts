import { 
  HypothesisId, 
  EvidenceId, 
  GameSession, 
  GameResult, 
  TimelineItem,
  Rank,
  VALIDITY_MAP, 
  SCORING_RULES,
  Step
} from '@/types/game';
import { mainScenario } from '@/data/scenario';

// التحقق من صلاحية ربط دليل بفرضية للرفض
export function canRejectHypothesisWithEvidence(
  hypothesisId: HypothesisId,
  evidenceId: EvidenceId
): boolean {
  const validityRule = VALIDITY_MAP[hypothesisId];
  // H3 لا يمكن رفضها - هي الحل الصحيح
  if (hypothesisId === 'H3') return false;
  return validityRule.validEvidence.includes(evidenceId);
}

// التحقق من صلاحية الحل النهائي
export function canDeclareWithEvidence(
  hypothesisId: HypothesisId,
  evidenceId: EvidenceId
): { valid: boolean; isOptimal: boolean } {
  if (hypothesisId !== mainScenario.correctHypothesis) {
    return { valid: false, isOptimal: false };
  }
  const validityRule = VALIDITY_MAP[hypothesisId];
  const isValid = validityRule.validEvidence.includes(evidenceId);
  const isOptimal = evidenceId === 'E3'; // الدليل الحاسم
  return { valid: isValid, isOptimal };
}

// حساب النقاط النهائية
export function calculateScore(session: GameSession): number {
  const currentAttempt = session.attempts[session.currentAttempt - 1];
  if (!currentAttempt || currentAttempt.status !== 'success') {
    return 0;
  }

  let score = SCORING_RULES.BASE_SCORE;

  // مكافآت الرفض الصحيح
  const rejectedH1 = currentAttempt.steps.find(
    s => s.action === 'reject_hypothesis' && s.hypothesis === 'H1' && s.valid
  );
  const rejectedH2 = currentAttempt.steps.find(
    s => s.action === 'reject_hypothesis' && s.hypothesis === 'H2' && s.valid
  );

  if (rejectedH1 && rejectedH1.evidence === 'E1') {
    score += SCORING_RULES.REJECT_H1_WITH_E1;
  }
  if (rejectedH2 && rejectedH2.evidence === 'E3') {
    score += SCORING_RULES.REJECT_H2_WITH_E3;
  }

  // مكافأة إعلان الحل
  if (currentAttempt.finalDecision) {
    if (currentAttempt.finalDecision.evidence === 'E3') {
      score += SCORING_RULES.DECLARE_H3_WITH_E3;
    } else if (currentAttempt.finalDecision.evidence === 'E4') {
      score += SCORING_RULES.DECLARE_H3_WITH_E4;
    }
  }

  // مكافأة رفض H1 قبل الحل
  const solutionStepIndex = currentAttempt.steps.findIndex(
    s => s.action === 'declare_solution'
  );
  const h1RejectionIndex = currentAttempt.steps.findIndex(
    s => s.action === 'reject_hypothesis' && s.hypothesis === 'H1' && s.valid
  );
  if (h1RejectionIndex !== -1 && h1RejectionIndex < solutionStepIndex) {
    score += SCORING_RULES.BONUS_REJECT_H1_BEFORE_SOLUTION;
  }

  // خصم الخطوات الزائدة
  const stepsCount = currentAttempt.steps.length;
  if (stepsCount > SCORING_RULES.MIN_STEPS_BEFORE_PENALTY) {
    const extraSteps = stepsCount - SCORING_RULES.MIN_STEPS_BEFORE_PENALTY;
    score -= extraSteps * SCORING_RULES.PENALTY_PER_EXTRA_STEP;
  }

  // خصم عدم رفض أي فرضية
  if (currentAttempt.rejectedHypotheses.length === 0) {
    score -= SCORING_RULES.PENALTY_NO_REJECTIONS;
  }

  // تطبيق معامل المحاولات
  if (session.currentAttempt === 2) {
    score = Math.floor(score * SCORING_RULES.ATTEMPT_2_MULTIPLIER);
  } else if (session.currentAttempt === 3) {
    score = Math.floor(score * SCORING_RULES.ATTEMPT_3_MULTIPLIER);
  }

  return Math.max(0, Math.min(1000, score));
}

// تحديد الرتبة
export function calculateRank(score: number): Rank {
  if (score >= 900) return 'S';
  if (score >= 700) return 'A';
  if (score >= 500) return 'B';
  return 'C';
}

// الحصول على أيقونة الرتبة
export function getRankIcon(rank: Rank): string {
  switch (rank) {
    case 'S': return '🏆';
    case 'A': return '🥈';
    case 'B': return '🥉';
    case 'C': return '📋';
  }
}

// بناء الـTimeline
export function buildTimeline(steps: Step[]): TimelineItem[] {
  return steps.map((step, index) => {
    let description = '';
    let outcome = '';
    let isPositive = true;

    if (step.action === 'reject_hypothesis') {
      const hypothesis = mainScenario.hypotheses.find(h => h.id === step.hypothesis);
      description = `رفضت: ${hypothesis?.text}`;
      if (step.valid) {
        outcome = 'ربطتها بدليل صحيح ✓';
      } else {
        outcome = 'الربط غير صحيح ✗';
        isPositive = false;
      }
    } else if (step.action === 'declare_solution') {
      description = 'أعلنت الحل النهائي';
      outcome = step.result === 'correct' ? 'الحل صحيح! ✓' : 'الحل خاطئ ✗';
      isPositive = step.result === 'correct';
    } else {
      const action = mainScenario.actions.find(a => a.id === step.action);
      description = action?.label || step.action;
      if (step.result?.startsWith('discovered_')) {
        const evidenceId = step.result.replace('discovered_', '') as EvidenceId;
        const evidence = mainScenario.evidence.find(e => e.id === evidenceId);
        outcome = `اكتشفت: ${evidence?.text.substring(0, 30)}...`;
      } else {
        outcome = 'لا جديد';
      }
    }

    return {
      step: index + 1,
      description,
      outcome,
      isPositive,
    };
  });
}

// توليد الـFeedback النهائي
export function generateFeedback(session: GameSession, rank: Rank): string {
  const currentAttempt = session.attempts[session.currentAttempt - 1];
  
  if (!currentAttempt || currentAttempt.status !== 'success') {
    return generateFailureFeedback(currentAttempt);
  }

  switch (rank) {
    case 'S':
      return 'ممتاز! فكّرت بطريقة منهجية: جمعت الأدلة، استبعدت الاحتمالات الخاطئة، ثم وصلت للنتيجة الصحيحة. هكذا يفكّر المحلّلون المحترفون!';
    case 'A':
      return 'أحسنت! وصلت للحل الصحيح وربطته بدليل قوي. لو استبعدت كل الفرضيات الخاطئة قبل إعلان النتيجة، كانت النتيجة أفضل.';
    case 'B':
      return 'وصلت للحل الصحيح، لكن مسارك كان يمكن أن يكون أقصر وأدق. حاول ترفض الاحتمالات الخاطئة أولًا قبل القفز للنتيجة.';
    case 'C':
      return 'وصلت للحل، لكن بجهد كبير ومحاولات كثيرة. التفكير التحليلي يعني استبعاد الخطأ بالدليل، وليس التجريب العشوائي.';
  }
}

// توليد Feedback الفشل
export function generateFailureFeedback(attempt: any): string {
  if (!attempt) {
    return 'لم تبدأ المحاولة بعد.';
  }

  // تحليل سبب الفشل
  const hasE2 = attempt.discoveredEvidence?.includes('E2');
  const hasE3 = attempt.discoveredEvidence?.includes('E3');
  const rejectedAny = attempt.rejectedHypotheses?.length > 0;
  const evidenceCount = attempt.discoveredEvidence?.length || 0;

  if (evidenceCount < 2) {
    return 'لم تجمع معلومات كافية قبل إعلان النتيجة. المحلّل الجيد يبحث ويسأل قبل أن يحكم.';
  }

  if (hasE2 && !hasE3) {
    return 'وقعت في فخ الدليل المُغري! بعض المعلومات تبدو مهمة لكنها لا تحسم شيء. ابحث عن الدليل الذي يكشف التناقض الحقيقي.';
  }

  if (!rejectedAny) {
    return 'أعلنت النتيجة قبل ما تستبعد كل الاحتمالات الخاطئة. الحل الصحيح يظهر فقط عندما ترفض الخطأ بالدليل.';
  }

  return 'توقفت عند احتمال لم تتأكد منه بالأدلة. أحيانًا الدليل الذي يبدو مقنعًا لا يحكي القصة كاملة. أعد التفكير!';
}

// توليد Feedback انتهاء المحاولات
export function generateGameOverFeedback(): string {
  return 'استنفدت محاولاتك! يبدو أن هناك جزء من اللغز لم تراه. الحل يكمن في البحث عن التناقض بين ما هو مُسجّل وما هو موجود فعلًا. حاول مجددًا بعقل منفتح!';
}

// حساب النتيجة الكاملة
export function calculateGameResult(session: GameSession): GameResult {
  const score = calculateScore(session);
  const rank = calculateRank(score);
  const currentAttempt = session.attempts[session.currentAttempt - 1];

  return {
    score,
    maxScore: 1000,
    rank,
    rankIcon: getRankIcon(rank),
    feedbackText: generateFeedback(session, rank),
    timeline: buildTimeline(currentAttempt?.steps || []),
    attemptUsed: session.currentAttempt,
  };
}
