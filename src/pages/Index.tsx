import { useGameSession } from '@/hooks/useGameSession';
import { WelcomeScreen } from '@/components/game/WelcomeScreen';
import { IntroScreen } from '@/components/game/IntroScreen';
import { GamePlayScreen } from '@/components/game/GamePlayScreen';
import { FailureScreen } from '@/components/game/FailureScreen';
import { GameOverScreen } from '@/components/game/GameOverScreen';
import { SuccessScreen } from '@/components/game/SuccessScreen';

const Index = () => {
  const {
    screen,
    session,
    hypotheses,
    discoveredEvidence,
    stepsUsed,
    remainingSteps,
    remainingAttempts,
    failureFeedback,
    startNewSession,
    startAttempt,
    performAction,
    rejectHypothesis,
    declareSolution,
    retryAttempt,
    restartGame,
  } = useGameSession();

  switch (screen) {
    case 'welcome':
      return <WelcomeScreen onStart={startNewSession} />;
    
    case 'intro':
      return <IntroScreen onStartGame={startAttempt} />;
    
    case 'gameplay':
      return (
        <GamePlayScreen
          hypotheses={hypotheses}
          discoveredEvidence={discoveredEvidence}
          stepsUsed={stepsUsed}
          remainingSteps={remainingSteps}
          remainingAttempts={remainingAttempts}
          onPerformAction={performAction}
          onRejectHypothesis={rejectHypothesis}
          onDeclareSolution={declareSolution}
        />
      );
    
    case 'failure':
      return (
        <FailureScreen
          feedback={failureFeedback}
          remainingAttempts={remainingAttempts - 1}
          onRetry={retryAttempt}
        />
      );
    
    case 'gameover':
      return <GameOverScreen onRestart={restartGame} />;
    
    case 'success':
      return session ? (
        <SuccessScreen session={session} onRestart={restartGame} />
      ) : null;
    
    default:
      return <WelcomeScreen onStart={startNewSession} />;
  }
};

export default Index;
