import {
  Attempt,
  CaseOutcome,
  DECLARATION_RULES,
  EvidenceId,
  EvidenceStrength,
  EliminationQuality,
  GameResult,
  GameSession,
  HypothesisId,
  NoiseQuality,
  REJECTION_RULES,
  Step,
  TimelineItem,
  TRAP_MESSAGES,
  ThinkingLevel,
} from '@/types/game';
import { mainScenario } from '@/data/scenario';

// =====================
// 1) التحقق من الرفض
// =====================
export function canRejectHypothesisWithEvidence(
  hypothesisId: Exclude<HypothesisId, 'H3'>,
  evidenceIds: EvidenceId[]
): { valid: boolean; isTrap: boolean; message?: string } {
  const evidenceId = evidenceIds[0];
  const rule = REJECTION_RULES[hypothesisId];

  if (!evidenceId) {
    return { valid: false, isTrap: false, message: 'لازم تختار دليل واحد على الأقل.' };
  }

  if (rule.trap.includes(evidenceId)) {
    return { valid: false, isTrap: true, message: TRAP_MESSAGES[evidenceId] };
  }

  if (rule.valid.includes(evidenceId)) {
    return { valid: true, isTrap: false };
  }

  return { valid: false, isTrap: false, message: 'الدليل ده ما ينفعش يرفض الفرضية دي بشكل منطقي.' };
}

// =====================
// 2) تقييم إعلان القرار
// =====================
export function evaluateDeclaration(
  hypothesisId: HypothesisId,
  evidenceIds: EvidenceId[]
): {
  outcome: CaseOutcome;
  justification: EvidenceStrength;
} {
  if (!evidenceIds || evidenceIds.length === 0) {
    return { outcome: 'incorrect', justification: 'none' };
  }

  // لو اللاعب استخدم ضجيج ضمن التبرير
  if (evidenceIds.some((e) => DECLARATION_RULES[hypothesisId].noise.includes(e))) {
    // حتى لو الفرضية الصحيحة… تبرير ضجيج = غير مقبول
    return { outcome: 'incorrect', justification: 'noise' };
  }

  // لو استخدم دليل غير صالح ضمن التبرير
  if (evidenceIds.some((e) => DECLARATION_RULES[hypothesisId].invalid.includes(e))) {
    return { outcome: 'incorrect', justification: 'invalid' };
  }

  const hasStrong = evidenceIds.some((e) => DECLARATION_RULES[hypothesisId].strong.includes(e));
  const hasWeak = evidenceIds.some((e) => DECLARATION_RULES[hypothesisId].weak.includes(e));

  // H3 هي الفرضية الصحيحة
  if (hypothesisId === mainScenario.correctHypothesis) {
    if (hasStrong) return { outcome: 'correct', justification: 'strong' };
    if (hasWeak) return { outcome: 'correct', justification: 'weak' };
    // أي شيء غير كده = لا تبرير
    return { outcome: 'incorrect', justification: 'none' };
  }

  // H1/H2 خاطئين في هذا الكيس
  // حتى لو عنده مؤشر يوحي… النتيجة خاطئة.
  if (hasStrong || hasWeak) {
    return { outcome: 'incorrect', justification: hasStrong ? 'strong' : 'weak' };
  }

  return { outcome: 'incorrect', justification: 'none' };
}

// =====================
// 3) بناء بطاقات التقييم
// =====================
function getEliminationInfo(attempt: Attempt): { level: EliminationQuality; wrongCount: number } {
  const rejected = attempt.steps.filter((s) => s.action === 'reject_hypothesis');
  const validRejections = rejected.filter((s) => s.valid);
  const wrongRejections = rejected.filter((s) => s.valid === false);

  const wrongCount = wrongRejections.length;

  if (wrongCount > 0) return { level: 'has_wrong', wrongCount };

  const rejectedH1Correct = validRejections.some((s) => s.hypothesis === 'H1');
  const rejectedH2Correct = validRejections.some((s) => s.hypothesis === 'H2');

  if (rejectedH1Correct && rejectedH2Correct) return { level: 'both_correct', wrongCount: 0 };
  if (rejectedH1Correct || rejectedH2Correct) return { level: 'one_correct', wrongCount: 0 };
  return { level: 'none', wrongCount: 0 };
}

function getNoiseQuality(attempt: Attempt): NoiseQuality {
  const decision = attempt.finalDecision;
  const usedE5InDecision = decision?.evidence?.includes('E5');
  if (usedE5InDecision) return 'used_noise_e5';

  // وزن زائد لـ E2: لو اعتمد على E2 وحده في القرار
  const usedOnlyE2 = decision?.evidence?.length === 1 && decision.evidence[0] === 'E2';
  if (usedOnlyE2) return 'overweighted_e2';

  return 'clean';
}

function evidenceCardText(level: EvidenceStrength): string {
  switch (level) {
    case 'strong':
      return 'تبرير قوي: استخدمت دليل يفرّق بوضوح بين الفرضيات.';
    case 'weak':
      return 'تبرير ضعيف: استخدمت مؤشر عام لا يكفي وحده للحسم.';
    case 'invalid':
      return 'تبرير غير صالح: الدليل لا يدعم الحل منطقيًا.';
    case 'noise':
      return 'تبرير ضجيج: اعتمدت على رأي/انطباع بدل مؤشر.';
    case 'none':
      return 'بدون تبرير: ما استخدمتش دليل فعلي للقرار.';
  }
}

function eliminationCardText(level: EliminationQuality, wrongCount: number): string {
  switch (level) {
    case 'both_correct':
      return 'استبعاد ممتاز: رفضت الفرضيتين المنافسين بأدلة مناسبة.';
    case 'one_correct':
      return 'استبعاد جيد: رفضت فرضية منافسة واحدة بدليل مناسب.';
    case 'none':
      return 'بدون استبعاد: حسمت بدون ما تُسقط البدائل.';
    case 'has_wrong': {
      if (wrongCount === 1) return 'استبعاد غير دقيق: حاولت رفض فرضية بدليل غير مناسب مرة واحدة.';
      if (wrongCount === 2) return 'استبعاد غير دقيق: حاولت رفض فرضية بدليل غير مناسب مرتين.';
      return `استبعاد غير دقيق: حاولت رفض فرضية بدليل غير مناسب ${wrongCount} مرات.`;
    }
  }
}

function noiseCardText(level: NoiseQuality): string {
  switch (level) {
    case 'clean':
      return 'نضيف: التزمت بمؤشرات قابلة للقياس.';
    case 'overweighted_e2':
      return 'في وزن زائد: اعتمدت على مؤشر (الفواتير/المتوسط) كأنه حاسم.';
    case 'used_noise_e5':
      return 'في ضجيج: دخلت رأي عام في قرارك.';
  }
}

function deriveThinkingLevel(outcome: CaseOutcome, evidence: EvidenceStrength): ThinkingLevel {
  if (outcome !== 'correct') return 'unacceptable';
  if (evidence === 'strong') return 'sound';
  // correct + weak
  return 'weak';
}

export function buildEvaluation(attempt: Attempt) {
  const outcome = attempt.finalDecision?.outcome || (attempt.status === 'no_decision' ? 'no_decision' : 'incorrect');
  const evidenceLevel = attempt.finalDecision?.justification || 'none';
  const elimination = getEliminationQuality(attempt);
  const noise = getNoiseQuality(attempt);

  const cards = {
    evidence: { level: evidenceLevel, text: evidenceCardText(evidenceLevel) },
    elimination: { level: elimination, text: eliminationCardText(elimination) },
    noise: { level: noise, text: noiseCardText(noise) },
  };

  const thinking = deriveThinkingLevel(outcome, evidenceLevel);

  return { outcome, evidenceLevel, elimination, noise, cards, thinking };
}

// =====================
// 4) Feedback نهائي
// =====================
export function generateFeedback(attempt: Attempt): string {
  const { outcome, evidenceLevel, elimination, noise } = buildEvaluation(attempt);

  if (outcome === 'no_decision') {
    return 'جمعت معلومات… لكن ما حسمتش قرار. التحليل لازم ينتهي بقرار حتى لو في عدم يقين.';
  }

  if (outcome === 'incorrect') {
    // رسائل فشل مركّزة على الخطأ المنهجي
    if (evidenceLevel === 'noise') {
      return 'قرارك مبني على رأي عام، مش على مؤشر من المتجر نفسه. ارجع للمقاييس: حركة دخول / فواتير / مخزون / توقيت.';
    }
    if (evidenceLevel === 'invalid') {
      return 'اخترت تبرير لا يدعم قرارك منطقيًا. حاول تربط الدليل بالفرضية اللي “يفرّق” بينها وبين غيرها.';
    }
    if (evidenceLevel === 'none') {
      return 'حسمت بدون أي دليل. اجمع مؤشر واحد على الأقل قبل إعلان القرار.';
    }
    // فشل طبيعي (اختيار فرضية خاطئة بناءً على مؤشر ضعيف)
    return 'قفلت على تفسير قبل ما تقارن مؤشرات كفاية. حاول تدور على تناقض مباشر بين “المسجل” و“اللي حصل فعلاً”.';
  }

  // outcome correct
  if (evidenceLevel === 'strong') {
    if (elimination === 'both_correct' && noise === 'clean') {
      return 'شغل ممتاز: استخدمت دليل يفرّق بين الفرضيات، واستبعدت البدائل قبل ما تحسم.';
    }
    if (elimination === 'none') {
      return 'النتيجة صحيحة بدليل قوي، لكن المرة الجاية استبعد البدائل قبل ما تقفل.';
    }
    if (elimination === 'has_wrong') {
      return 'وصلت للنتيجة، لكن عملت محاولة استبعاد غير دقيقة. راجع: كل رفض لازم يكون مربوط بدليل مناسب.';
    }
    return 'حل صحيح بدليل قوي. ممتاز، ومع شوية استبعاد أكتر هتكون أقوى.';
  }

  // correct but weak
  if (noise === 'overweighted_e2') {
    return 'وصلت لتفسير صحيح، لكن اعتمدت على مؤشر عام كأنه حاسم. ركّز على الدليل اللي يفرّق بين الفرضيات.';
  }

  return 'النتيجة صحيحة، لكن تبريرك ضعيف. حاول تجمع مؤشر يثبت التناقض بشكل مباشر.';
}

// =====================
// 5) Timeline
// =====================
export function buildTimeline(steps: Step[]): TimelineItem[] {
  return steps.map((step, index) => {
    let description = '';
    let outcome = '';
    let isPositive = true;

    if (step.action === 'reject_hypothesis') {
      const hypothesis = mainScenario.hypotheses.find((h) => h.id === step.hypothesis);
      description = `رفض فرضية: ${hypothesis?.text}`;
      if (step.valid) {
        outcome = 'رفض صحيح ✓';
      } else {
        outcome = 'رفض غير صحيح ✗';
        isPositive = false;
      }
    } else if (step.action === 'declare_solution') {
      description = 'أعلنت القرار';
      outcome = step.result === 'correct' ? 'القرار صحيح ✓' : 'القرار غير صحيح ✗';
      isPositive = step.result === 'correct';
    } else if (step.action === 'end_investigation') {
      description = 'أنهيت التحقيق';
      outcome = 'بدون قرار';
      isPositive = false;
    } else {
      const action = mainScenario.actions.find((a) => a.id === step.action);
      description = action?.label || String(step.action);

      if (step.result?.startsWith('discovered_')) {
        const evidenceId = step.result.replace('discovered_', '') as EvidenceId;
        const evidence = mainScenario.evidence.find((e) => e.id === evidenceId);
        outcome = `اكتشفت مؤشر: ${evidence?.id}`;
      } else {
        outcome = '—';
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

// =====================
// 6) Game Result
// =====================
function outcomeTitle(outcome: CaseOutcome): string {
  switch (outcome) {
    case 'correct':
      return 'قرار صحيح';
    case 'incorrect':
      return 'قرار غير صحيح';
    case 'no_decision':
      return 'بدون قرار';
  }
}

function thinkingTitle(level: ThinkingLevel): string {
  switch (level) {
    case 'sound':
      return 'تفكير سليم';
    case 'weak':
      return 'تفكير يحتاج تحسين';
    case 'unacceptable':
      return 'منهج غير مقبول';
  }
}

export function calculateGameResult(session: GameSession): GameResult {
  const currentAttempt = session.attempts[session.currentAttempt - 1];

  // احتياط: لو مفيش محاولة (نادر)
  const attempt = currentAttempt || {
    attemptNumber: session.currentAttempt,
    steps: [],
    discoveredEvidence: [],
    rejectedHypotheses: [],
    status: 'failed' as const,
  };

  const evaluation = buildEvaluation(attempt);

  return {
    outcome: evaluation.outcome,
    outcomeTitle: outcomeTitle(evaluation.outcome),
    thinking: evaluation.thinking,
    thinkingTitle: thinkingTitle(evaluation.thinking),
    cards: evaluation.cards,
    feedbackText: generateFeedback(attempt),
    timeline: buildTimeline(attempt.steps || []),
    attemptUsed: session.currentAttempt,
  };
}

export function generateGameOverFeedback(session: GameSession): string {
  const lastAttempt = session.attempts[session.currentAttempt - 1];
  if (!lastAttempt) {
    return 'انتهت المحاولات. حاول مرة ثانية مع التركيز على المؤشرات القابلة للقياس.';
  }
  return generateFeedback(lastAttempt);
}
