import { useState, useCallback } from 'react';
import { 
  GameSession, 
  Attempt, 
  Step, 
  HypothesisId, 
  EvidenceId, 
  ActionId,
  Hypothesis,
  GAME_LIMITS 
} from '@/types/game';
import { mainScenario } from '@/data/scenario';
import { canRejectHypothesisWithEvidence, canDeclareWithEvidence } from '@/lib/gameLogic';

export type GameScreen = 'welcome' | 'intro' | 'gameplay' | 'failure' | 'gameover' | 'success';

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

    setSession(prev => ({
      ...prev!,
      attempts: [...prev!.attempts, newAttempt],
    }));

    // إعادة تعيين حالة اللعب
    setHypotheses([...mainScenario.hypotheses]);
    setDiscoveredEvidence([]);
    setStepsUsed(0);
    setScreen('gameplay');
  }, [session]);

  // تنفيذ فعل
  const performAction = useCallback((actionId: ActionId): { evidenceId: EvidenceId | null } => {
    if (!session || stepsUsed >= GAME_LIMITS.MAX_STEPS) {
      return { evidenceId: null };
    }

    const action = mainScenario.actions.find(a => a.id === actionId);
    if (!action || actionId === 'declare_solution') {
      return { evidenceId: null };
    }

    const newStep: Step = {
      stepNumber: stepsUsed + 1,
      action: actionId,
      timestamp: Date.now(),
    };

    let evidenceId: EvidenceId | null = null;

    if (action.yieldsEvidence && !discoveredEvidence.includes(action.yieldsEvidence)) {
      evidenceId = action.yieldsEvidence;
      newStep.result = `discovered_${evidenceId}`;
      setDiscoveredEvidence(prev => [...prev, evidenceId!]);
    }

    setSession(prev => {
      const attempts = [...prev!.attempts];
      const currentAttemptIndex = prev!.currentAttempt - 1;
      attempts[currentAttemptIndex] = {
        ...attempts[currentAttemptIndex],
        steps: [...attempts[currentAttemptIndex].steps, newStep],
        discoveredEvidence: evidenceId 
          ? [...attempts[currentAttemptIndex].discoveredEvidence, evidenceId]
          : attempts[currentAttemptIndex].discoveredEvidence,
      };
      return { ...prev!, attempts };
    });

    setStepsUsed(prev => prev + 1);

    return { evidenceId };
  }, [session, stepsUsed, discoveredEvidence]);

  // رفض فرضية
  const rejectHypothesis = useCallback((hypothesisId: HypothesisId, evidenceId: EvidenceId): { success: boolean; message: string } => {
    if (!session) {
      return { success: false, message: 'لا توجد جلسة نشطة' };
    }

    if (hypothesisId === 'H3') {
      return { success: false, message: 'لا يمكن رفض هذه الفرضية بهذا الدليل' };
    }

    const isValid = canRejectHypothesisWithEvidence(hypothesisId, evidenceId);

    if (!isValid) {
      return { success: false, message: 'هذا الدليل لا ينفي هذه الفرضية. حاول ربطها بدليل آخر.' };
    }

    // تحديث الفرضيات
    setHypotheses(prev => 
      prev.map(h => h.id === hypothesisId ? { ...h, status: 'rejected' as const } : h)
    );

    // إضافة الخطوة
    const newStep: Step = {
      stepNumber: stepsUsed + 1,
      action: 'reject_hypothesis',
      hypothesis: hypothesisId,
      evidence: evidenceId,
      valid: true,
      timestamp: Date.now(),
    };

    setSession(prev => {
      const attempts = [...prev!.attempts];
      const currentAttemptIndex = prev!.currentAttempt - 1;
      attempts[currentAttemptIndex] = {
        ...attempts[currentAttemptIndex],
        steps: [...attempts[currentAttemptIndex].steps, newStep],
        rejectedHypotheses: [...attempts[currentAttemptIndex].rejectedHypotheses, hypothesisId],
      };
      return { ...prev!, attempts };
    });

    setStepsUsed(prev => prev + 1);

    return { success: true, message: 'تم رفض الفرضية بنجاح!' };
  }, [session, stepsUsed]);

  // إعلان الحل
  const declareSolution = useCallback((hypothesisId: HypothesisId, evidenceId: EvidenceId): { success: boolean } => {
    if (!session) {
      return { success: false };
    }

    const { valid, isOptimal } = canDeclareWithEvidence(hypothesisId, evidenceId);

    const newStep: Step = {
      stepNumber: stepsUsed + 1,
      action: 'declare_solution',
      hypothesis: hypothesisId,
      evidence: evidenceId,
      result: valid ? 'correct' : 'incorrect',
      valid,
      timestamp: Date.now(),
    };

    const finalDecision = {
      hypothesis: hypothesisId,
      evidence: evidenceId,
      correct: valid,
    };

    setSession(prev => {
      const attempts = [...prev!.attempts];
      const currentAttemptIndex = prev!.currentAttempt - 1;
      attempts[currentAttemptIndex] = {
        ...attempts[currentAttemptIndex],
        steps: [...attempts[currentAttemptIndex].steps, newStep],
        finalDecision,
        status: valid ? 'success' : 'failed',
      };
      return { ...prev!, attempts };
    });

    if (valid) {
      setScreen('success');
    } else {
      // التحقق من عدد المحاولات المتبقية
      if (session.currentAttempt >= GAME_LIMITS.MAX_ATTEMPTS) {
        setScreen('gameover');
      } else {
        // توليد feedback للفشل
        const hasE2 = discoveredEvidence.includes('E2');
        const hasE3 = discoveredEvidence.includes('E3');
        const rejectedAny = hypotheses.some(h => h.status === 'rejected');

        if (discoveredEvidence.length < 2) {
          setFailureFeedback('لم تجمع معلومات كافية قبل إعلان النتيجة. المحلّل الجيد يبحث ويسأل قبل أن يحكم.');
        } else if (hasE2 && !hasE3) {
          setFailureFeedback('وقعت في فخ الدليل المُغري! بعض المعلومات تبدو مهمة لكنها لا تحسم شيء. ابحث عن الدليل الذي يكشف التناقض الحقيقي.');
        } else if (!rejectedAny) {
          setFailureFeedback('أعلنت النتيجة قبل ما تستبعد كل الاحتمالات الخاطئة. الحل الصحيح يظهر فقط عندما ترفض الخطأ بالدليل.');
        } else {
          setFailureFeedback('توقفت عند احتمال لم تتأكد منه بالأدلة. أحيانًا الدليل الذي يبدو مقنعًا لا يحكي القصة كاملة. أعد التفكير!');
        }

        setScreen('failure');
      }
    }

    return { success: valid };
  }, [session, stepsUsed, discoveredEvidence, hypotheses]);

  // بدء محاولة جديدة بعد الفشل
  const retryAttempt = useCallback(() => {
    if (!session) return;

    setSession(prev => ({
      ...prev!,
      currentAttempt: prev!.currentAttempt + 1,
    }));

    // إعادة تعيين الحالة
    setHypotheses([...mainScenario.hypotheses]);
    setDiscoveredEvidence([]);
    setStepsUsed(0);
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
    remainingAttempts: session ? GAME_LIMITS.MAX_ATTEMPTS - session.currentAttempt + 1 : GAME_LIMITS.MAX_ATTEMPTS,
    failureFeedback,
    startNewSession,
    startAttempt,
    performAction,
    rejectHypothesis,
    declareSolution,
    retryAttempt,
    restartGame,
    setScreen,
  };
}
