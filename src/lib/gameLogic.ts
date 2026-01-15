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
  Step,
  Attempt,
  PathSignature,
  PathPattern
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

// ============= نظام تحليل المسارات الذكي =============

// تحليل بصمة المسار
export function analyzePathSignature(attempt: Attempt, session: GameSession): PathSignature {
  const steps = attempt.steps;
  const discoveredEvidence = attempt.discoveredEvidence;
  
  // تحليل الأدلة المكتشفة
  const hasE1 = discoveredEvidence.includes('E1');
  const hasE2 = discoveredEvidence.includes('E2');
  const hasE3 = discoveredEvidence.includes('E3');
  const hasE4 = discoveredEvidence.includes('E4');
  const hasE5 = discoveredEvidence.includes('E5');
  const hasE6 = discoveredEvidence.includes('E6');
  
  // تحليل خطوات الرفض
  const rejectionSteps = steps.filter(s => s.action === 'reject_hypothesis');
  const validRejections = rejectionSteps.filter(s => s.valid);
  const rejectedH1 = validRejections.some(s => s.hypothesis === 'H1');
  const rejectedH2 = validRejections.some(s => s.hypothesis === 'H2');
  
  // التحقق من الفخاخ في الرفض
  const failedRejection = rejectionSteps.find(s => !s.valid);
  const fellIntoTrap = failedRejection !== undefined;
  let trapType: 'E2' | 'E5' | null = null;
  if (failedRejection && failedRejection.evidence) {
    if (failedRejection.evidence.includes('E2')) trapType = 'E2';
    else if (failedRejection.evidence.includes('E5')) trapType = 'E5';
  }
  
  // تحليل خطوة الحل
  const solutionStep = steps.find(s => s.action === 'declare_solution');
  const declaredSolution = solutionStep !== undefined;
  const declaredH1 = solutionStep?.hypothesis === 'H1';
  const declaredH2 = solutionStep?.hypothesis === 'H2';
  const declaredH3 = solutionStep?.hypothesis === 'H3';
  const declaredCorrectHypothesis = declaredH3 && solutionStep?.valid === true;
  
  // تحليل الأدلة المستخدمة في الحل
  const solutionEvidence = solutionStep?.evidence || [];
  const usedE3InSolution = solutionEvidence.includes('E3');
  const usedE4InSolution = solutionEvidence.includes('E4');
  const usedE6InSolution = solutionEvidence.includes('E6');
  
  // ترتيب الخطوات
  const solutionStepIndex = steps.findIndex(s => s.action === 'declare_solution');
  const h1RejectionIndex = steps.findIndex(s => s.action === 'reject_hypothesis' && s.hypothesis === 'H1' && s.valid);
  const h2RejectionIndex = steps.findIndex(s => s.action === 'reject_hypothesis' && s.hypothesis === 'H2' && s.valid);
  const rejectedBeforeSolution = solutionStepIndex === -1 || 
    (h1RejectionIndex !== -1 && h1RejectionIndex < solutionStepIndex) ||
    (h2RejectionIndex !== -1 && h2RejectionIndex < solutionStepIndex);
  
  // عدد الخطوات الفعلية (غير الرفض)
  const actionSteps = steps.filter(s => s.action !== 'reject_hypothesis').length;
  
  return {
    // الأدلة
    totalEvidenceDiscovered: discoveredEvidence.length,
    hasDecisiveEvidence: hasE3,
    hasSupportingEvidence: hasE4 || hasE6,
    hasFactualEvidence: hasE1,
    hasMisleadingEvidence: hasE2,
    hasTrapEvidence: hasE5,
    discoveredEvidenceIds: discoveredEvidence,
    
    // الرفض
    totalRejections: validRejections.length,
    rejectedH1,
    rejectedH2,
    rejectedH1WithCorrectEvidence: rejectedH1,
    rejectedH2WithCorrectEvidence: rejectedH2,
    rejectedBeforeSolution,
    
    // الفخاخ
    fellIntoTrap,
    trapType,
    failedRejectionAttempt: failedRejection !== undefined,
    
    // الحل
    declaredSolution,
    declaredCorrectHypothesis,
    declaredH1,
    declaredH2,
    declaredH3,
    usedDecisiveEvidence: usedE3InSolution,
    usedOptimalEvidence: usedE3InSolution && usedE4InSolution,
    usedWeakEvidence: usedE4InSolution && !usedE3InSolution,
    usedE6: usedE6InSolution,
    solutionEvidenceIds: solutionEvidence,
    
    // السرعة
    totalSteps: steps.length,
    wasRushed: actionSteps <= 2,
    wasVeryRushed: actionSteps <= 1,
    wasSlow: actionSteps > 5,
    
    // المحاولات
    attemptNumber: attempt.attemptNumber,
    isFirstAttempt: attempt.attemptNumber === 1,
    previousAttemptsFailed: attempt.attemptNumber - 1,
    
    // الحالة
    wasSuccessful: attempt.status === 'success',
    wasFailure: attempt.status === 'failed',
    wasGameOver: session.currentAttempt >= session.maxAttempts && attempt.status === 'failed',
  };
}

// تحديد نمط المسار
export function detectPathPattern(signature: PathSignature): PathPattern {
  // === حالات النجاح ===
  if (signature.wasSuccessful) {
    // المسار المثالي
    if (signature.rejectedH1 && signature.rejectedH2 && signature.usedOptimalEvidence) {
      return 'IDEAL_PATH';
    }
    // رفض كامل بدليل واحد
    if (signature.rejectedH1 && signature.rejectedH2) {
      return 'GOOD_PATH_FULL_REJECT';
    }
    // رفض جزئي H1
    if (signature.rejectedH1 && !signature.rejectedH2) {
      return 'PARTIAL_REJECT_H1';
    }
    // رفض جزئي H2
    if (signature.rejectedH2 && !signature.rejectedH1) {
      return 'PARTIAL_REJECT_H2';
    }
    // بدون رفض
    if (signature.totalRejections === 0) {
      if (signature.wasVeryRushed) {
        return 'VERY_RUSHED_CORRECT';
      }
      if (signature.wasRushed) {
        return 'RUSHED_CORRECT';
      }
      if (signature.usedOptimalEvidence) {
        return 'NO_REJECT_OPTIMAL';
      }
      if (signature.usedDecisiveEvidence) {
        return 'NO_REJECT_DECISIVE';
      }
      if (signature.usedE6) {
        return 'NO_REJECT_E6';
      }
      if (signature.usedWeakEvidence) {
        return 'NO_REJECT_WEAK';
      }
    }
    // تسرّع لكن صحيح
    if (signature.wasRushed) {
      return 'RUSHED_CORRECT';
    }
  }
  
  // === حالات الفشل ===
  
  // فخ في الرفض
  if (signature.fellIntoTrap) {
    if (signature.trapType === 'E2') {
      return 'TRAP_E2_REJECTION';
    }
    if (signature.trapType === 'E5') {
      return 'TRAP_E5_REJECTION';
    }
  }
  
  // نفي خاطئ (بدون فخ)
  if (signature.failedRejectionAttempt && !signature.fellIntoTrap) {
    return 'WRONG_REJECTION';
  }
  
  // اختار فرضية خاطئة
  if (signature.declaredH1) {
    return 'WRONG_H1';
  }
  if (signature.declaredH2) {
    return 'WRONG_H2';
  }
  
  // H3 بدليل خاطئ
  if (signature.declaredH3 && !signature.declaredCorrectHypothesis) {
    // استخدم E2 للحل
    if (signature.solutionEvidenceIds.includes('E2')) {
      return 'TRAP_E2_SOLUTION';
    }
    return 'WRONG_H3_BAD_EVIDENCE';
  }
  
  // === Game Over ===
  if (signature.wasGameOver) {
    if (signature.totalEvidenceDiscovered < 2) {
      return 'GAME_OVER_NO_EVIDENCE';
    }
    if (signature.fellIntoTrap) {
      return 'GAME_OVER_FELL_TRAPS';
    }
    if (signature.hasDecisiveEvidence) {
      return 'GAME_OVER_HAD_E3';
    }
    return 'GAME_OVER_GENERAL';
  }
  
  // حالة افتراضية
  return 'GAME_OVER_GENERAL';
}

// قاموس رسائل الـ Feedback المخصصة لكل نمط
const FEEDBACK_TEMPLATES: Record<PathPattern, string> = {
  // === نجاح ===
  'IDEAL_PATH': 
    'ممتاز! 🏆 فكّرت كما يفكّر المحقق المحترف: جمعت الأدلة، رفضت الفرضيات الخاطئة واحدة تلو الأخرى بالأدلة القاطعة، ثم أثبتّ الحل بأقوى الأدلة. مسار مثالي!',
  
  'GOOD_PATH_FULL_REJECT': 
    'أحسنت! 🎯 رفضت كلتا الفرضيتين الخاطئتين قبل إعلان الحل. لو جمعت بين الدليل الحاسم (E3) والداعم (E4) معاً، كانت النتيجة أفضل.',
  
  'PARTIAL_REJECT_H1': 
    'جيد! ✓ رفضت فرضية "قلة الزبائن" بشكل صحيح ووصلت للحل. لكن كان يمكنك أيضاً رفض فرضية "يصرفون أقل" لتكون أكثر دقة وتحصل على نقاط أعلى.',
  
  'PARTIAL_REJECT_H2': 
    'وصلت للحل الصحيح! ✓ لكن نسيت استبعاد فرضية "قلة عدد الزبائن". المحلّل الجيد يُغلق كل الأبواب الخاطئة قبل فتح الباب الصحيح.',
  
  'NO_REJECT_OPTIMAL': 
    'وصلت للحل الصحيح بأقوى الأدلة! لكنك قفزت مباشرة دون استبعاد الفرضيات الأخرى. ماذا لو كانت المشكلة فعلاً في عدد الزبائن أو مستوى إنفاقهم؟ التحليل المنهجي يبدأ برفض الخطأ.',
  
  'NO_REJECT_DECISIVE': 
    'وصلت للحل الصحيح بالدليل الحاسم. 👍 لكن تسرّعت قليلاً - كان يجب أن ترفض الفرضيات الخاطئة أولاً لتتأكد من استبعاد كل الاحتمالات.',
  
  'NO_REJECT_WEAK': 
    'وصلت للحل الصحيح، لكن استخدمت دليلاً داعماً وليس حاسماً. ⚠️ كلام الكاشير عن التسجيل الورقي يدعم الفرضية، لكن الدليل الأقوى هو الفرق الفعلي بين المخزون والفواتير (E3)!',
  
  'NO_REJECT_E6': 
    'استخدمت التحليل المحاسبي للوصول للحل. ✓ جيد، لكن كان الأفضل أن ترفض الفرضيات الخاطئة أولاً وتستخدم الدليل الأكثر مباشرة (فرق المخزون).',
  
  'RUSHED_CORRECT': 
    'تسرّعت في الحكم! ⚡ صحيح أن الإجابة صحيحة، لكن المحلل الحقيقي لا يكتفي بدليل أو اثنين. كان يجب أن تتأكد من استبعاد الفرضيات الأخرى بالأدلة.',
  
  'VERY_RUSHED_CORRECT': 
    'قفزت مباشرة للنتيجة من أول خطوة! 🚀 صحيح أن الإجابة صحيحة، لكن هذا حظ وليس تحليل. المحلل الحقيقي يجمع الأدلة، يستبعد الخطأ، ثم يثبت الصحيح.',
  
  // === فشل - فرضية خاطئة ===
  'WRONG_H1': 
    'اخترت فرضية "قلة الزبائن"، لكن هل تأكدت من ذلك؟ ❌ كان هناك دليل يثبت أن حركة الزبائن طبيعية. عُد وتفحّص ما قاله موظف الصالة!',
  
  'WRONG_H2': 
    'اخترت فرضية "يصرفون أقل"، لكن الأدلة لا تدعم ذلك بشكل قاطع. ❌ هل فحصت المخزون مقارنة بالفواتير؟ التناقض الحقيقي يكمن هناك!',
  
  'WRONG_H3_BAD_EVIDENCE': 
    'اخترت الفرضية الصحيحة، لكن بدليل لا يثبتها! ❌ ابحث عن الدليل الذي يُظهر التناقض بين المبيعات المسجّلة والمخزون الفعلي.',
  
  // === فشل - فخاخ ===
  'TRAP_E2_REJECTION': 
    'وقعت في فخ "متوسط الفاتورة"! 🪤 هذا الرقم يبدو مهماً لكنه مجرد نتيجة وليس سبباً. الانخفاض البسيط في المتوسط قد يكون عادياً تماماً. ابحث عن الدليل الذي يكشف تناقضاً حقيقياً!',
  
  'TRAP_E5_REJECTION': 
    'وقعت في فخ الرأي الشخصي! 🪤 اعتمدت على ما قاله الزبون عن "الوضع الاقتصادي"، لكن هذا انطباع عام وليس دليلاً على ما يحدث في هذا المتجر تحديداً. ابحث عن الأرقام والحقائق الموثقة!',
  
  'TRAP_E2_SOLUTION': 
    'حاولت إثبات الحل بدليل مضلل! 🪤 متوسط الفاتورة لا علاقة له بمشكلة التسجيل. ابحث عن الدليل الذي يُظهر الفرق بين ما بِيع فعلاً وما سُجّل.',
  
  // === فشل - نفي خاطئ ===
  'WRONG_REJECTION': 
    'حاولت نفي الفرضية بدليل لا علاقة له بها! ⚠️ فكّر في العلاقة المنطقية: ما الذي يجب أن يكون صحيحاً لكي تكون هذه الفرضية خاطئة؟',
  
  // === Game Over ===
  'GAME_OVER_NO_EVIDENCE': 
    'استنفدت محاولاتك! 💔 لم تجمع معلومات كافية. المحلّل الجيد يبحث ويسأل قبل أن يحكم. تذكّر: التحدث مع الموظفين وفحص السجلات يكشف الحقائق.',
  
  'GAME_OVER_HAD_E3': 
    'استنفدت محاولاتك! 💔 الغريب أنك اكتشفت الدليل الحاسم (فرق المخزون والفواتير) لكنك لم تستخدمه بالشكل الصحيح. هذا الدليل يثبت أن المبيعات تحدث لكن لا تُسجّل!',
  
  'GAME_OVER_FELL_TRAPS': 
    'استنفدت محاولاتك بسبب الفخاخ! 🪤 وقعت في فخ الأدلة المضللة. تذكّر: الآراء الشخصية والأرقام السطحية ليست أدلة قاطعة. ابحث عن التناقضات في البيانات الفعلية.',
  
  'GAME_OVER_GENERAL': 
    'استنفدت محاولاتك! 💔 السر في هذا اللغز: ابحث عن التناقض بين ما هو مُسجّل (الفواتير) وما هو موجود فعلاً (المخزون). الأرقام لا تكذب!',
};

// توليد feedback ذكي بناءً على تحليل المسار
export function generateSmartFeedback(attempt: Attempt, session: GameSession): string {
  const signature = analyzePathSignature(attempt, session);
  const pattern = detectPathPattern(signature);
  
  let feedback = FEEDBACK_TEMPLATES[pattern];
  
  // إضافة تفاصيل إضافية حسب المحاولة
  if (!signature.isFirstAttempt && signature.wasSuccessful) {
    const attemptNote = signature.attemptNumber === 2 
      ? ' (المحاولة الثانية - النقاط مخفضة بنسبة 30%)'
      : ' (المحاولة الثالثة - النقاط مخفضة بنسبة 50%)';
    feedback += attemptNote;
  }
  
  return feedback;
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

// توليد الـFeedback النهائي - الآن يستخدم النظام الذكي
export function generateFeedback(session: GameSession, rank: Rank): string {
  const currentAttempt = session.attempts[session.currentAttempt - 1];
  
  if (!currentAttempt) {
    return 'لم تبدأ المحاولة بعد.';
  }

  // استخدام نظام الـ Feedback الذكي
  return generateSmartFeedback(currentAttempt, session);
}

// توليد Feedback الفشل - محدث لاستخدام النظام الذكي
export function generateFailureFeedback(attempt: Attempt, session: GameSession): string {
  if (!attempt) {
    return 'لم تبدأ المحاولة بعد.';
  }
  
  return generateSmartFeedback(attempt, session);
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
