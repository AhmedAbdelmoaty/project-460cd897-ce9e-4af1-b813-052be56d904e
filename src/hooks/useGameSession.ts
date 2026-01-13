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
import { canRejectHypothesisWithEvidence, canDeclareWithEvidence, generateDetailedFailureFeedback } from '@/lib/gameLogic';

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

  // تنفيذ فعل (جمع دليل)
  const performAction = useCallback((actionId: ActionId): { evidenceIds: EvidenceId[] } => {
    if (!session || stepsUsed >= GAME_LIMITS.MAX_STEPS) {
      return { evidenceIds: [] };
    }

    const action = mainScenario.actions.find(a => a.id === actionId);
    if (!action || actionId === 'declare_solution') {
      return { evidenceIds: [] };
    }

    // استهلاك خطوة لجمع الأدلة
    const newStep: Step = {
      stepNumber: stepsUsed + 1,
      action: actionId,
      timestamp: Date.now(),
    };

    const newEvidenceIds: EvidenceId[] = [];

    // جمع جميع الأدلة من هذا الفعل (قد يكون أكثر من دليل)
    if (action.yieldsEvidence) {
      for (const evidenceId of action.yieldsEvidence) {
        if (!discoveredEvidence.includes(evidenceId)) {
          newEvidenceIds.push(evidenceId);
        }
      }
    }

    if (newEvidenceIds.length > 0) {
      newStep.result = `discovered_${newEvidenceIds.join('_')}`;
      setDiscoveredEvidence(prev => [...prev, ...newEvidenceIds]);
    }

    setSession(prev => {
      const attempts = [...prev!.attempts];
      const currentAttemptIndex = prev!.currentAttempt - 1;
      attempts[currentAttemptIndex] = {
        ...attempts[currentAttemptIndex],
        steps: [...attempts[currentAttemptIndex].steps, newStep],
        discoveredEvidence: [...attempts[currentAttemptIndex].discoveredEvidence, ...newEvidenceIds],
      };
      return { ...prev!, attempts };
    });

    // جمع الأدلة يستهلك خطوة
    setStepsUsed(prev => prev + 1);

    return { evidenceIds: newEvidenceIds };
  }, [session, stepsUsed, discoveredEvidence]);

  // رفض فرضية - لا يستهلك خطوة!
  const rejectHypothesis = useCallback((hypothesisId: HypothesisId, evidenceId: EvidenceId): { success: boolean; message: string } => {
    if (!session) {
      return { success: false, message: 'لا توجد جلسة نشطة' };
    }

    // H3 هي الحل الصحيح - لا يمكن رفضها
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

    // إضافة الخطوة - رفض الفرضية لا يستهلك خطوة (لذلك نستخدم stepNumber = stepsUsed وليس +1)
    const newStep: Step = {
      stepNumber: stepsUsed, // لا نزيد لأنه لا يستهلك خطوة
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

    // ملاحظة: لا نزيد stepsUsed هنا - رفض الفرضية مجاني!

    return { success: true, message: 'تم رفض الفرضية بنجاح!' };
  }, [session, stepsUsed]);

  // إعلان الحل - يستهلك خطوة
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

    // الحصول على المحاولة الحالية قبل التحديث
    const currentAttemptData = session.attempts[session.currentAttempt - 1];

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
        // توليد feedback للفشل بناءً على المسار الفعلي
        const feedback = generateDetailedFailureFeedback(
          hypothesisId,
          evidenceId,
          discoveredEvidence,
          hypotheses.filter(h => h.status === 'rejected').map(h => h.id)
        );
        setFailureFeedback(feedback);
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
