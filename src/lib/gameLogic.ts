import { 
  HypothesisId, 
  EvidenceId, 
  GameSession, 
  GameResult, 
  TimelineItem,
  Rank,
  VALIDITY_MAP, 
  SCORING_RULES,
  TRAP_MESSAGES,
  Step
} from '@/types/game';
import { mainScenario } from '@/data/scenario';

// التحقق من صلاحية ربط دليل بفرضية للرفض
export function canRejectHypothesisWithEvidence(
  hypothesisId: HypothesisId,
  evidenceIds: EvidenceId[]
): { valid: boolean; isTrap: boolean; trapMessage?: string } {
  const validityRule = VALIDITY_MAP[hypothesisId];
  
  // H3 لا يمكن رفضها - هي الحل الصحيح
  if (hypothesisId === 'H3') {
    return { valid: false, isTrap: false };
  }
  
  // التحقق من الفخاخ أولاً
  for (const evidenceId of evidenceIds) {
    if (validityRule.trapEvidence.includes(evidenceId)) {
      const trapKey = `${hypothesisId}_${evidenceId}`;
      return { 
        valid: false, 
        isTrap: true, 
        trapMessage: TRAP_MESSAGES[trapKey] || 'هذا الدليل لا يصلح لنفي هذه الفرضية!'
      };
    }
  }
  
  // التحقق من صحة الأدلة
  const hasValidEvidence = evidenceIds.some(id => validityRule.validEvidence.includes(id));
  
  return { valid: hasValidEvidence, isTrap: false };
}

// التحقق من صلاحية الحل النهائي
export function canDeclareWithEvidence(
  hypothesisId: HypothesisId,
  evidenceIds: EvidenceId[]
): { valid: boolean; isOptimal: boolean; score: number } {
  // التحقق من الفرضية الصحيحة
  if (hypothesisId !== mainScenario.correctHypothesis) {
    return { valid: false, isOptimal: false, score: 0 };
  }
  
  const validityRule = VALIDITY_MAP[hypothesisId];
  
  // التحقق من وجود دليل صحيح على الأقل
  const validEvidenceUsed = evidenceIds.filter(id => validityRule.validEvidence.includes(id));
  if (validEvidenceUsed.length === 0) {
    return { valid: false, isOptimal: false, score: 0 };
  }
  
  // حساب النقاط بناءً على الأدلة المستخدمة
  let score = 0;
  const hasE3 = evidenceIds.includes('E3');
  const hasE4 = evidenceIds.includes('E4');
  const hasE6 = evidenceIds.includes('E6');
  
  if (hasE3 && hasE4) {
    score = SCORING_RULES.DECLARE_H3_WITH_E3_AND_E4;
  } else if (hasE3) {
    score = SCORING_RULES.DECLARE_H3_WITH_E3;
  } else if (hasE6) {
    score = SCORING_RULES.DECLARE_H3_WITH_E6;
  } else if (hasE4) {
    score = SCORING_RULES.DECLARE_H3_WITH_E4;
  }
  
  // التحقق من المسار المثالي
  const isOptimal = hasE3 && hasE4;
  
  return { valid: true, isOptimal, score };
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

  if (rejectedH1) {
    score += SCORING_RULES.REJECT_H1_WITH_E1;
  }
  if (rejectedH2) {
    const evidence = rejectedH2.evidence || [];
    if (evidence.includes('E3')) {
      score += SCORING_RULES.REJECT_H2_WITH_E3;
    } else if (evidence.includes('E6')) {
      score += SCORING_RULES.REJECT_H2_WITH_E6;
    }
  }

  // مكافأة إعلان الحل
  if (currentAttempt.finalDecision) {
    const evidence = currentAttempt.finalDecision.evidence || [];
    const hasE3 = evidence.includes('E3');
    const hasE4 = evidence.includes('E4');
    const hasE6 = evidence.includes('E6');
    
    if (hasE3 && hasE4) {
      score += SCORING_RULES.DECLARE_H3_WITH_E3_AND_E4;
    } else if (hasE3) {
      score += SCORING_RULES.DECLARE_H3_WITH_E3;
    } else if (hasE6) {
      score += SCORING_RULES.DECLARE_H3_WITH_E6;
    } else if (hasE4) {
      score += SCORING_RULES.DECLARE_H3_WITH_E4;
    }
  }

  // مكافأة رفض الفرضيات قبل الحل
  const solutionStepIndex = currentAttempt.steps.findIndex(
    s => s.action === 'declare_solution'
  );
  const h1RejectionIndex = currentAttempt.steps.findIndex(
    s => s.action === 'reject_hypothesis' && s.hypothesis === 'H1' && s.valid
  );
  const h2RejectionIndex = currentAttempt.steps.findIndex(
    s => s.action === 'reject_hypothesis' && s.hypothesis === 'H2' && s.valid
  );
  
  const rejectedH1Before = h1RejectionIndex !== -1 && h1RejectionIndex < solutionStepIndex;
  const rejectedH2Before = h2RejectionIndex !== -1 && h2RejectionIndex < solutionStepIndex;
  
  if (rejectedH1Before && rejectedH2Before) {
    score += SCORING_RULES.BONUS_REJECT_BOTH_BEFORE_SOLUTION;
  } else if (rejectedH1Before) {
    score += SCORING_RULES.BONUS_REJECT_H1_BEFORE_SOLUTION;
  } else if (rejectedH2Before) {
    score += SCORING_RULES.BONUS_REJECT_H2_BEFORE_SOLUTION;
  }

  // خصم الخطوات الزائدة
  const stepsCount = currentAttempt.steps.filter(s => s.action !== 'reject_hypothesis').length;
  if (stepsCount > SCORING_RULES.MIN_STEPS_BEFORE_PENALTY) {
    const extraSteps = stepsCount - SCORING_RULES.MIN_STEPS_BEFORE_PENALTY;
    score -= extraSteps * SCORING_RULES.PENALTY_PER_EXTRA_STEP;
  }

  // خصم عدم رفض أي فرضية
  if (currentAttempt.rejectedHypotheses.length === 0) {
    score -= SCORING_RULES.PENALTY_NO_REJECTIONS;
  }

  const reasoningMistakes = currentAttempt.reasoningMistakes ?? 0;
  if (reasoningMistakes > 0) {
    const basePenalty = reasoningMistakes * SCORING_RULES.PENALTY_REASONING_MISTAKE;
    const extraPenalty = reasoningMistakes > 2
      ? (reasoningMistakes - 2) * SCORING_RULES.PENALTY_REASONING_MISTAKE_ESCALATION
      : 0;
    score -= basePenalty + extraPenalty;
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
  if (score >= 850) return 'S';
  if (score >= 650) return 'A';
  if (score >= 450) return 'B';
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
type MessageType =
  | 'SUCCESS_FULL'
  | 'SUCCESS_AFTER_CORRECTION'
  | 'SUCCESS_JUMPED_EARLY'
  | 'SUCCESS_PARTIAL_ELIMINATION'
  | 'SUCCESS_DEFAULT'
  | 'FAIL_RANDOM_REJECTION'
  | 'FAIL_THOUGHTFUL_TRICKED'
  | 'FAIL_GUESSING';

type AttemptIndicators = {
  isCorrectFinal: boolean;
  evidenceSeenCount: number;
  validRejectedCount: number;
  invalidRejectionCount: number;
  rejectedAllAlternatives: boolean;
  correctedAfterMistake: boolean;
  jumpedTooEarly: boolean;
};

function getAttemptIndicators(attempt: Attempt | undefined): AttemptIndicators {
  const evidenceSeenCount = attempt?.discoveredEvidence?.length ?? 0;
  const rejectionSteps = attempt?.steps.filter(
    step => step.action === 'reject_hypothesis'
  ) ?? [];
  const validRejectedCount = rejectionSteps.filter(step => step.valid).length;
  const invalidRejectionCount = rejectionSteps.filter(step => step.valid === false).length;
  const isCorrectFinal = attempt?.finalDecision?.correct === true;
  const alternativesCount = mainScenario.hypotheses.filter(
    hypothesis => hypothesis.id !== mainScenario.correctHypothesis
  ).length;
  const rejectedAllAlternatives = validRejectedCount >= alternativesCount;
  const correctedAfterMistake = invalidRejectionCount > 0 && validRejectedCount > 0;
  const jumpedTooEarly = validRejectedCount === 0 && evidenceSeenCount < 2;

  return {
    isCorrectFinal,
    evidenceSeenCount,
    validRejectedCount,
    invalidRejectionCount,
    rejectedAllAlternatives,
    correctedAfterMistake,
    jumpedTooEarly,
  };
}

function classifyMessageType(indicators: AttemptIndicators): MessageType {
  if (indicators.isCorrectFinal) {
    if (indicators.rejectedAllAlternatives && indicators.validRejectedCount >= 2) {
      return 'SUCCESS_FULL';
    }
    if (indicators.correctedAfterMistake) {
      return 'SUCCESS_AFTER_CORRECTION';
    }
    if (indicators.jumpedTooEarly) {
      return 'SUCCESS_JUMPED_EARLY';
    }
    if (
      indicators.validRejectedCount === 1 ||
      (indicators.validRejectedCount > 0 && !indicators.rejectedAllAlternatives)
    ) {
      return 'SUCCESS_PARTIAL_ELIMINATION';
    }
    return 'SUCCESS_DEFAULT';
  }

  if (indicators.invalidRejectionCount >= 2) {
    return 'FAIL_RANDOM_REJECTION';
  }
  if (indicators.evidenceSeenCount >= 3 || indicators.validRejectedCount >= 1) {
    return 'FAIL_THOUGHTFUL_TRICKED';
  }
  return 'FAIL_GUESSING';
}

function formatMessage(lines: [string, string, string]): string {
  return lines.join('\n');
}

function getMessageForType(type: MessageType, indicators: AttemptIndicators): string {
  const countHint = indicators.evidenceSeenCount > 0
    ? `جمعت ${indicators.evidenceSeenCount} دليل.`
    : '';

  switch (type) {
    case 'SUCCESS_FULL':
      return formatMessage([
        'أحسنت! الحل صح.',
        'استبعدت الفرضيات التانية بالدليل… ده تفكير مضبوط.',
        'كمّل كده: استبعاد واضح وبعدين تثبيت بأقوى دليل.',
      ]);
    case 'SUCCESS_AFTER_CORRECTION':
      return formatMessage([
        'وصلت للحل الصح.',
        'غلطت في الأول بس رجعت صححت… ده تعلم حقيقي.',
        'لما الدليل ما يكونش حاسم، دور على دليل أقوى قبل ما ترفض.',
      ]);
    case 'SUCCESS_JUMPED_EARLY':
      return formatMessage([
        'إجابتك طلعت صح.',
        'بس وصلت بسرعة قوي من غير ما تستبعد البدائل.',
        'قبل ما تحكم، اجمع أدلة أكتر وارفض الغلط بالدليل.',
      ]);
    case 'SUCCESS_PARTIAL_ELIMINATION':
      return formatMessage([
        'الحل صح.',
        'كويس… بس لسه فيه فرضيات ما اتشالتش بالدليل.',
        'كمّل الاستبعاد واحدة واحدة عشان يبقى قرارك قوي.',
      ]);
    case 'SUCCESS_DEFAULT':
      return formatMessage([
        'الحل صح.',
        countHint || 'وصلت للحل بطريقة كويسة.',
        'حافظ على جمع الأدلة وربطها بالفرضيات.',
      ]);
    case 'FAIL_RANDOM_REJECTION':
      return formatMessage([
        'الحل مش صح.',
        'فيه رفض كتير حصل من غير ربط قوي بالدليل.',
        'ارفض بس لما يكون معاك دليل واضح يناقض الفرضية.',
      ]);
    case 'FAIL_THOUGHTFUL_TRICKED':
      return formatMessage([
        'للأسف الحل طلع مش صح.',
        'بس واضح إنك اشتغلت: جمعت أدلة وبدأت تستبعد.',
        'اللي وقعك إن دليل شكله قوي خدعك… ركّز على دليل يحسم ويقصّي البدائل.',
      ]);
    case 'FAIL_GUESSING':
      return formatMessage([
        'الحل مش صح.',
        'القرار كان سريع قبل ما تجمع أدلة كفاية.',
        'خد وقتك: اجمع أدلة الأول، وبعدين اختار.',
      ]);
  }
}

export function generateFeedback(session: GameSession, _rank: Rank): string {
  const currentAttempt = session.attempts[session.currentAttempt - 1];
  if (!currentAttempt) {
    return 'لم تبدأ المحاولة بعد.';
  }

  const indicators = getAttemptIndicators(currentAttempt);
  const messageType = classifyMessageType(indicators);

  return getMessageForType(messageType, indicators);
}

// توليد رسالة فشل النفي
export function generateRejectionFailureFeedback(hypothesisId: HypothesisId, evidenceIds: EvidenceId[]): string {
  const trapKey = `${hypothesisId}_${evidenceIds[0]}`;
  
  if (TRAP_MESSAGES[trapKey]) {
    return TRAP_MESSAGES[trapKey];
  }
  
  // رسائل عامة للفشل
  const evidence = mainScenario.evidence.find(e => e.id === evidenceIds[0]);
  if (evidence?.type === 'misleading') {
    return 'هذا الدليل مضلل! يبدو مهماً لكنه لا يحسم شيء. ابحث عن دليل أقوى.';
  }
  if (evidence?.type === 'trap') {
    return 'هذا ليس دليلاً حقيقياً! إنه مجرد رأي أو انطباع شخصي.';
  }
  
  return 'هذا الدليل لا يصلح لنفي هذه الفرضية. فكّر في العلاقة المنطقية بينهما.';
}

// توليد Feedback انتهاء المحاولات
export function generateGameOverFeedback(): string {
  return 'استنفدت محاولاتك! السر في هذا اللغز: ابحث عن التناقض بين ما هو مُسجّل (الفواتير) وما هو موجود فعلاً (المخزون). الأرقام لا تكذب!';
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
