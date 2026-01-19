import { useState, useCallback } from 'react';
import {
  ActionId,
  Attempt,
  EvidenceId,
  GameSession,
  Hypothesis,
  HypothesisId,
  Step,
  GAME_LIMITS,
} from '@/types/game';
import { mainScenario } from '@/data/scenario';
import {
  canRejectHypothesisWithEvidence,
  evaluateDeclaration,
  generateFeedback,
} from '@/lib/gameLogic';

export type GameScreen = 'welcome' | 'intro' | 'gameplay' | 'failure' | 'gameover' | 'success';

const INVESTIGATION_ACTIONS: ActionId[] = [
  'talk_salesperson',
  'review_invoices',
  'check_stock',
  'talk_cashier',
  'talk_customer',
];

export function useGameSession() {
  const [screen, setScreen] = useState<GameScreen>('welcome');
  const [session, setSession] = useState<GameSession | null>(null);
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([...mainScenario.hypotheses]);
  const [discoveredEvidence, setDiscoveredEvidence] = useState<EvidenceId[]>([]);
  const [stepsUsed, setStepsUsed] = useState(0);
  const [failureFeedback, setFailureFeedback] = useState('');

  // بدء جلسة جديدة
  const startNewSession = useCallback(() => {
    const newSession: GameSession = {
      sessionId: crypto.randomUUID(),
      startTime: Date.now(),
      currentAttempt: 1,
      maxAttempts: GAME_LIMITS.MAX_ATTEMPTS,
      maxSteps: GAME_LIMITS.MAX_STEPS,
      attempts: [],
    };
    setSession(newSession);
    setScreen('intro');
  }, []);

  // بدء محاولة جديدة
  const startAttempt = useCallback(() => {
    if (!session) return;

    const newAttempt: Attempt = {
      attemptNumber: session.currentAttempt,
      steps: [],
      discoveredEvidence: [],
      rejectedHypotheses: [],
      status: 'in_progress',
    };

    setSession((prev) => ({
      ...prev!,
      attempts: [...prev!.attempts, newAttempt],
    }));

    // إعادة تعيين حالة اللعب
    setHypotheses([...mainScenario.hypotheses]);
    setDiscoveredEvidence([]);
    setStepsUsed(0);
    setFailureFeedback('');
    setScreen('gameplay');
  }, [session]);

  // تنفيذ فعل تحقيق (يستهلك خطوة)
  const performAction = useCallback(
    (actionId: ActionId): { evidenceId: EvidenceId | null } => {
      if (!session) return { evidenceId: null };
      if (!INVESTIGATION_ACTIONS.includes(actionId)) return { evidenceId: null };
      if (stepsUsed >= GAME_LIMITS.MAX_STEPS) return { evidenceId: null };

      const action = mainScenario.actions.find((a) => a.id === actionId);
      if (!action) return { evidenceId: null };

      let yieldedEvidence: EvidenceId | null = null;

      setSession((prev) => {
        const attempts = [...(prev?.attempts || [])];
        const idx = (prev?.currentAttempt || 1) - 1;
        const current = attempts[idx];
        if (!current) return prev!;

        const nextStepNumber = current.steps.length + 1;

        const newStep: Step = {
          stepNumber: nextStepNumber,
          action: actionId,
          timestamp: Date.now(),
        };

        if (action.yieldsEvidence && !discoveredEvidence.includes(action.yieldsEvidence)) {
          yieldedEvidence = action.yieldsEvidence;
          newStep.result = `discovered_${yieldedEvidence}`;

          // تحديث الأدلة المكتشفة محلياً
          setDiscoveredEvidence((e) => [...e, yieldedEvidence!]);
        }

        attempts[idx] = {
          ...current,
          steps: [...current.steps, newStep],
          discoveredEvidence: yieldedEvidence
            ? [...current.discoveredEvidence, yieldedEvidence]
            : current.discoveredEvidence,
        };

        return { ...prev!, attempts };
      });

      setStepsUsed((s) => s + 1);

      return { evidenceId: yieldedEvidence };
    },
    [session, stepsUsed, discoveredEvidence]
  );

  // رفض فرضية (لا يستهلك خطوة) — الخطأ لا يُنهي المحاولة، لكنه يؤثر على التقييم
const rejectHypothesis = useCallback(
  (hypothesisId: HypothesisId, evidenceIds: EvidenceId[]): { success: boolean; message: string } => {
    if (!session) {
      return { success: false, message: 'لا توجد جلسة نشطة' };
    }

    // السماح بدليل واحد فقط
    const picked = evidenceIds.slice(0, 1);

    let localMessage = '';
    let isValid = false;

    setSession((prev) => {
      const attempts = [...(prev?.attempts || [])];
      const idx = (prev?.currentAttempt || 1) - 1;
      const current = attempts[idx];
      if (!current) return prev!;

      // 1) حد أقصى 3 محاولات رفض لكل محاولة
      const rejectsCount = current.steps.filter((s) => s.action === 'reject_hypothesis').length;
      if (rejectsCount >= 4) {
        localMessage = 'استخدمت كل محاولات الرفض في هذه المحاولة.';
        return prev!;
      }
      const hypothesisRejectCount = current.steps.filter(
        (s) => s.action === 'reject_hypothesis' && s.hypothesis === hypothesisId
      ).length;
      
      if (hypothesisRejectCount >= 2) {
        localMessage = 'وصلت للحد الأقصى لمحاولات رفض هذه الفرضية في هذه المحاولة.';
        return prev!;
      }

      // 3) تحقق صلاحية الرفض
      if (hypothesisId === 'H3') {
        // لا يوجد دليل في هذا الكيس ينفي H3 (مسموح المحاولة لكن تعتبر غلط)
        isValid = false;
        localMessage = 'الدليل ده لا يكفي لرفض هذه الفرضية.';
      } else {
        const result = canRejectHypothesisWithEvidence(hypothesisId as Exclude<HypothesisId, 'H3'>, picked);
        isValid = result.valid;
        localMessage = result.message || (result.valid ? 'تم رفض الفرضية ✓' : 'الربط غير صحيح.');
      }

      // 4) سجل خطوة الرفض دائماً (صح أو غلط) للتتبع
      const nextStepNumber = current.steps.length + 1;

      const newStep: Step = {
        stepNumber: nextStepNumber,
        action: 'reject_hypothesis',
        hypothesis: hypothesisId,
        evidence: picked,
        valid: isValid,
        timestamp: Date.now(),
      };

      attempts[idx] = {
        ...current,
        steps: [...current.steps, newStep],
        rejectedHypotheses: isValid ? [...current.rejectedHypotheses, hypothesisId] : current.rejectedHypotheses,
      };

      return { ...prev!, attempts };
    });

    // لو اتمنع بسبب الحد/التكرار، هيرجع برسالة بدون تسجيل شيء جديد
    if (localMessage === 'استخدمت كل محاولات الرفض في هذه المحاولة.' ||
        localMessage === 'حاولت رفض هذه الفرضية بالفعل في هذه المحاولة.') {
      return { success: false, message: localMessage };
    }

    // لو الرفض صحيح، نغيّر حالة الفرضية
    if (isValid) {
      setHypotheses((prev) =>
        prev.map((h) => (h.id === hypothesisId ? { ...h, status: 'rejected' as const } : h))
      );
      return { success: true, message: 'تم رفض الفرضية بدليل مناسب ✓' };
    }

    return { success: false, message: localMessage || 'الربط غير صحيح.' };
  },
  [session]
);

  // إعلان القرار النهائي (لا يستهلك خطوات التحقيق)
  const declareSolution = useCallback(
    (hypothesisId: HypothesisId, evidenceIds: EvidenceId[]): { success: boolean } => {
      if (!session) return { success: false };

      // لا تسمح بأدلة غير مكتشفة
      const allowed = evidenceIds.filter((e) => discoveredEvidence.includes(e));

      const evaluation = evaluateDeclaration(hypothesisId, allowed);

      setSession((prev) => {
        const attempts = [...(prev?.attempts || [])];
        const idx = (prev?.currentAttempt || 1) - 1;
        const current = attempts[idx];
        if (!current) return prev!;

        const nextStepNumber = current.steps.length + 1;

        const newStep: Step = {
          stepNumber: nextStepNumber,
          action: 'declare_solution',
          hypothesis: hypothesisId,
          evidence: allowed,
          result: evaluation.outcome === 'correct' ? 'correct' : 'incorrect',
          valid: evaluation.outcome === 'correct',
          timestamp: Date.now(),
        };

        attempts[idx] = {
          ...current,
          steps: [...current.steps, newStep],
          finalDecision: {
            hypothesis: hypothesisId,
            evidence: allowed,
            outcome: evaluation.outcome,
            justification: evaluation.justification,
          },
          status: evaluation.outcome === 'correct' ? 'success' : 'failed',
        };

        return { ...prev!, attempts };
      });

      if (evaluation.outcome === 'correct') {
        setScreen('success');
        return { success: true };
      }

      // فشل = خسارة محاولة
      const attemptsLeftAfterThis = GAME_LIMITS.MAX_ATTEMPTS - session.currentAttempt;
      const current = session.attempts[session.currentAttempt - 1];
      const updatedAttempt: Attempt = {
        ...(current || {
          attemptNumber: session.currentAttempt,
          steps: [],
          discoveredEvidence: [],
          rejectedHypotheses: [],
          status: 'failed',
        }),
        status: 'failed',
        finalDecision: {
          hypothesis: hypothesisId,
          evidence: allowed,
          outcome: evaluation.outcome,
          justification: evaluation.justification,
        },
      };
      setFailureFeedback(generateFeedback(updatedAttempt));

      if (attemptsLeftAfterThis <= 0) {
        setScreen('gameover');
      } else {
        setScreen('failure');
      }

      return { success: false };
    },
    [session, discoveredEvidence]
  );

  // إنهاء التحقيق بدون قرار (خسارة محاولة)
  const endInvestigation = useCallback(() => {
    if (!session) return;

    const current = session.attempts[session.currentAttempt - 1];
    const updatedAttempt: Attempt = {
      ...(current || {
        attemptNumber: session.currentAttempt,
        steps: [],
        discoveredEvidence: [],
        rejectedHypotheses: [],
        status: 'no_decision',
      }),
      status: 'no_decision',
    };

    setSession((prev) => {
      const attempts = [...(prev?.attempts || [])];
      const idx = (prev?.currentAttempt || 1) - 1;
      const current = attempts[idx];
      if (!current) return prev!;

      const nextStepNumber = current.steps.length + 1;

      const newStep: Step = {
        stepNumber: nextStepNumber,
        action: 'end_investigation',
        timestamp: Date.now(),
      };

      attempts[idx] = {
        ...current,
        steps: [...current.steps, newStep],
        status: 'no_decision',
      };

      return { ...prev!, attempts };
    });

    setFailureFeedback(generateFeedback(updatedAttempt));

    const attemptsLeftAfterThis = GAME_LIMITS.MAX_ATTEMPTS - session.currentAttempt;
    if (attemptsLeftAfterThis <= 0) {
      setScreen('gameover');
    } else {
      setScreen('failure');
    }
  }, [session]);

  // بدء محاولة جديدة بعد الفشل
  const retryAttempt = useCallback(() => {
    if (!session) return;

    setSession((prev) => {
      if (!prev) return prev;

      const nextAttemptNumber = prev.currentAttempt + 1;
      const newAttempt: Attempt = {
        attemptNumber: nextAttemptNumber,
        steps: [],
        discoveredEvidence: [],
        rejectedHypotheses: [],
        status: 'in_progress',
      };

      return {
        ...prev,
        currentAttempt: nextAttemptNumber,
        attempts: [...prev.attempts, newAttempt],
      };
    });

    // إعادة تعيين الحالة
    setHypotheses([...mainScenario.hypotheses]);
    setDiscoveredEvidence([]);
    setStepsUsed(0);
    setFailureFeedback('');
    setScreen('gameplay');
  }, [session]);

  // إعادة بدء اللعبة من الصفر
  const restartGame = useCallback(() => {
    setSession(null);
    setHypotheses([...mainScenario.hypotheses]);
    setDiscoveredEvidence([]);
    setStepsUsed(0);
    setFailureFeedback('');
    setScreen('welcome');
  }, []);

  return {
    screen,
    session,
    hypotheses,
    discoveredEvidence,
    stepsUsed,
    remainingSteps: GAME_LIMITS.MAX_STEPS - stepsUsed,
    remainingAttempts: session
      ? GAME_LIMITS.MAX_ATTEMPTS - session.currentAttempt + 1
      : GAME_LIMITS.MAX_ATTEMPTS,
    failureFeedback,
    startNewSession,
    startAttempt,
    performAction,
    rejectHypothesis,
    declareSolution,
    endInvestigation,
    retryAttempt,
    restartGame,
    setScreen,
  };
}
