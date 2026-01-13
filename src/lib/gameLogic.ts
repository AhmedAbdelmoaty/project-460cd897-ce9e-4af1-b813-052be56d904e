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
  // التحقق من أن الدليل ينفي هذه الفرضية
  return validityRule.rejectEvidence.includes(evidenceId);
}

// التحقق من صلاحية الحل النهائي
export function canDeclareWithEvidence(
  hypothesisId: HypothesisId,
  evidenceId: EvidenceId
): { valid: boolean; isOptimal: boolean } {
  // يجب أن تكون الفرضية هي H3 (الحل الصحيح)
  if (hypothesisId !== mainScenario.correctHypothesis) {
    return { valid: false, isOptimal: false };
  }
  
  const validityRule = VALIDITY_MAP[hypothesisId];
  // يجب أن يكون الدليل من الأدلة الداعمة (E3 أو E4)
  const isValid = validityRule.supportEvidence.includes(evidenceId);
  // E3 هو الدليل الحاسم
  const isOptimal = evidenceId === 'E3';
  
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
  if (rejectedH2 && rejectedH2.evidence === 'E5') {
    score += SCORING_RULES.REJECT_H2_WITH_E5;
  }

  // مكافأة إعلان الحل
  if (currentAttempt.finalDecision) {
    if (currentAttempt.finalDecision.evidence === 'E3') {
      score += SCORING_RULES.DECLARE_H3_WITH_E3;
    } else if (currentAttempt.finalDecision.evidence === 'E4') {
      score += SCORING_RULES.DECLARE_H3_WITH_E4;
    }
  }

  // مكافأة رفض الفرضيتين قبل الحل
  const solutionStepIndex = currentAttempt.steps.findIndex(
    s => s.action === 'declare_solution'
  );
  const h1RejectionIndex = currentAttempt.steps.findIndex(
    s => s.action === 'reject_hypothesis' && s.hypothesis === 'H1' && s.valid
  );
  const h2RejectionIndex = currentAttempt.steps.findIndex(
    s => s.action === 'reject_hypothesis' && s.hypothesis === 'H2' && s.valid
  );
  
  if (h1RejectionIndex !== -1 && h2RejectionIndex !== -1 && 
      h1RejectionIndex < solutionStepIndex && h2RejectionIndex < solutionStepIndex) {
    score += SCORING_RULES.BONUS_REJECT_BOTH_BEFORE_SOLUTION;
  }

  // خصم الخطوات الزائدة (نحسب فقط الخطوات التي تستهلك - جمع الأدلة وإعلان الحل)
  const consumingSteps = currentAttempt.steps.filter(
    s => s.action !== 'reject_hypothesis'
  ).length;
  
  if (consumingSteps > SCORING_RULES.MIN_STEPS_BEFORE_PENALTY) {
    const extraSteps = consumingSteps - SCORING_RULES.MIN_STEPS_BEFORE_PENALTY;
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
  let displayStep = 0;
  
  return steps.map((step) => {
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
      // رفض الفرضية لا يزيد رقم الخطوة
    } else if (step.action === 'declare_solution') {
      displayStep++;
      description = 'أعلنت الحل النهائي';
      outcome = step.result === 'correct' ? 'الحل صحيح! ✓' : 'الحل خاطئ ✗';
      isPositive = step.result === 'correct';
    } else {
      displayStep++;
      const action = mainScenario.actions.find(a => a.id === step.action);
      description = action?.label || step.action;
      if (step.result?.startsWith('discovered_')) {
        const evidenceIdsStr = step.result.replace('discovered_', '');
        const evidenceIds = evidenceIdsStr.split('_') as EvidenceId[];
        const evidenceTexts = evidenceIds.map(id => {
          const evidence = mainScenario.evidence.find(e => e.id === id);
          return evidence?.text.substring(0, 25) + '...';
        });
        outcome = `اكتشفت: ${evidenceTexts.join(' | ')}`;
      } else {
        outcome = 'لا جديد';
      }
    }

    return {
      step: displayStep,
      description,
      outcome,
      isPositive,
    };
  });
}

// توليد Feedback مفصّل للفشل بناءً على المسار الفعلي
export function generateDetailedFailureFeedback(
  chosenHypothesis: HypothesisId,
  chosenEvidence: EvidenceId,
  discoveredEvidence: EvidenceId[],
  rejectedHypotheses: HypothesisId[]
): string {
  // الحالة 1: اختار H2 مع E2 (الفخ!)
  if (chosenHypothesis === 'H2' && chosenEvidence === 'E2') {
    return 'وقعت في فخ الدليل المُغري! "متوسط الفاتورة أقل" معلومة صحيحة، لكنها لا تفسّر لماذا. ابحث عن التناقض الحقيقي بين ما هو مُسجّل وما هو موجود فعلاً.';
  }

  // الحالة 2: اختار H2 مع أي دليل آخر
  if (chosenHypothesis === 'H2') {
    if (discoveredEvidence.includes('E5')) {
      return 'أحد الأدلة التي اكتشفتها يقول بوضوح أن الزبائن يشترون نفس الأصناف والكميات. هذا ينفي فرضية أنهم يصرفون أقل!';
    }
    return 'هل تأكدت من أن الزبائن فعلاً يصرفون أقل؟ ابحث عن دليل يثبت أو ينفي هذا.';
  }

  // الحالة 3: اختار H1
  if (chosenHypothesis === 'H1') {
    if (discoveredEvidence.includes('E1')) {
      return 'أحد الأدلة التي اكتشفتها يقول بوضوح أن حركة الزبائن طبيعية. هذا ينفي فرضية أن عددهم قلّ!';
    }
    return 'هل تأكدت من أن عدد الزبائن فعلاً قلّ؟ تحدث مع موظفي الصالة لتتأكد.';
  }

  // الحالة 4: اختار H3 لكن بدليل خاطئ
  if (chosenHypothesis === 'H3') {
    if (chosenEvidence === 'E1' || chosenEvidence === 'E5') {
      return 'الفرضية صحيحة! لكن الدليل الذي اخترته لا يدعمها. ابحث عن دليل يُظهر مشكلة في التسجيل.';
    }
    if (chosenEvidence === 'E2') {
      return 'الفرضية صحيحة! لكن "متوسط الفاتورة أقل" لا يثبت مشكلة في التسجيل. ابحث عن تناقض بين المخزون والفواتير.';
    }
  }

  // الحالة 5: لم يجمع أدلة كافية
  if (discoveredEvidence.length < 2) {
    return 'لم تجمع معلومات كافية قبل إعلان النتيجة. المحلّل الجيد يبحث ويسأل قبل أن يحكم.';
  }

  // الحالة 6: لم يرفض أي فرضية
  if (rejectedHypotheses.length === 0) {
    return 'أعلنت النتيجة قبل أن تستبعد الاحتمالات الأخرى. حاول رفض الفرضيات الخاطئة بالأدلة أولاً.';
  }

  // الحالة الافتراضية
  return 'توقفت عند احتمال لم تتأكد منه بالأدلة. أحيانًا الدليل الذي يبدو مقنعًا لا يحكي القصة كاملة. أعد التفكير!';
}

// توليد الـFeedback النهائي للنجاح
export function generateFeedback(session: GameSession, rank: Rank): string {
  const currentAttempt = session.attempts[session.currentAttempt - 1];
  
  if (!currentAttempt || currentAttempt.status !== 'success') {
    return generateFailureFeedback(currentAttempt);
  }

  const rejectedBoth = currentAttempt.rejectedHypotheses.includes('H1') && 
                       currentAttempt.rejectedHypotheses.includes('H2');
  const usedE3 = currentAttempt.finalDecision?.evidence === 'E3';

  switch (rank) {
    case 'S':
      return 'ممتاز! فكّرت بطريقة منهجية: جمعت الأدلة، استبعدت الاحتمالات الخاطئة واحدة تلو الأخرى، ثم وصلت للنتيجة بالدليل الحاسم. هكذا يفكّر المحلّلون المحترفون!';
    case 'A':
      if (!rejectedBoth) {
        return 'أحسنت! وصلت للحل الصحيح وربطته بدليل قوي. لو استبعدت كل الفرضيات الخاطئة بالأدلة قبل إعلان النتيجة، كانت النتيجة أفضل.';
      }
      return 'أحسنت! مسار تفكيرك كان جيدًا. استبعدت الخطأ وربطت الحل بدليل صحيح.';
    case 'B':
      if (!usedE3) {
        return 'وصلت للحل الصحيح، لكن استخدمت دليلًا داعمًا بدلاً من الدليل الحاسم. الدليل الأقوى هو الذي يُظهر التناقض مباشرة.';
      }
      return 'وصلت للحل الصحيح، لكن مسارك كان يمكن أن يكون أقصر وأدق. حاول ترفض الاحتمالات الخاطئة أولًا.';
    case 'C':
      return 'وصلت للحل، لكن بجهد كبير ومحاولات كثيرة. التفكير التحليلي يعني استبعاد الخطأ بالدليل، وليس التجريب العشوائي.';
  }
}

// توليد Feedback الفشل (قديم - للتوافق)
export function generateFailureFeedback(attempt: any): string {
  if (!attempt) {
    return 'لم تبدأ المحاولة بعد.';
  }
  return 'توقفت عند احتمال لم تتأكد منه بالأدلة.';
}

// توليد Feedback انتهاء المحاولات
export function generateGameOverFeedback(): string {
  return 'استنفدت محاولاتك! اللغز كان في التناقض: بضائع تخرج من الرفوف لكن لا تظهر في السجلات. الموظفة الجديدة لا تُسجّل كل المبيعات وقت الزحمة. أعد التفكير: من يُسجّل؟ ومتى لا يُسجّل؟';
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
