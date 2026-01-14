import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ActionId, EvidenceId, HypothesisId, Hypothesis } from '@/types/game';
import { mainScenario } from '@/data/scenario';
import { DialogueModal } from './DialogueModal';
import { RejectHypothesisModal } from './RejectHypothesisModal';
import { DeclareSolutionModal } from './DeclareSolutionModal';

interface GamePlayScreenProps {
  hypotheses: Hypothesis[];
  discoveredEvidence: EvidenceId[];
  stepsUsed: number;
  remainingSteps: number;
  remainingAttempts: number;
  onPerformAction: (actionId: ActionId) => { evidenceId: EvidenceId | null };
  onRejectHypothesis: (hypothesisId: HypothesisId, evidenceIds: EvidenceId[]) => { success: boolean; message: string; lostAttempt?: boolean };
  onDeclareSolution: (hypothesisId: HypothesisId, evidenceIds: EvidenceId[]) => { success: boolean };
}

export function GamePlayScreen({
  hypotheses,
  discoveredEvidence,
  stepsUsed,
  remainingSteps,
  remainingAttempts,
  onPerformAction,
  onRejectHypothesis,
  onDeclareSolution,
}: GamePlayScreenProps) {
  const [dialogueAction, setDialogueAction] = useState<ActionId | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeclareModal, setShowDeclareModal] = useState(false);

  const handleActionClick = (actionId: ActionId) => {
    if (actionId === 'declare_solution') {
      setShowDeclareModal(true);
    } else {
      onPerformAction(actionId);
      setDialogueAction(actionId);
    }
  };

  const handleEvidenceDiscovered = (evidenceId: EvidenceId) => {
    // Evidence is already added in onPerformAction
  };

  const evidenceList = mainScenario.evidence.filter(e => discoveredEvidence.includes(e.id));
  const progressPercent = (stepsUsed / 6) * 100;
  
  // Filter actions for main grid (exclude declare_solution and check_stock as it duplicates talk_stockkeeper)
  const mainActions = mainScenario.actions.filter(a => 
    a.id !== 'declare_solution' && a.id !== 'check_stock'
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-4" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header Stats */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-sm px-3 py-1">
              🎯 المحاولة {4 - remainingAttempts}/{3}
            </Badge>
            <Badge variant={remainingSteps <= 2 ? "destructive" : "secondary"} className="text-sm px-3 py-1">
              👣 الخطوات: {remainingSteps}/6
            </Badge>
          </div>
          <Progress value={progressPercent} className="w-32 h-2" />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {/* Main Action Area */}
          <div className="md:col-span-2 space-y-4">
            {/* Problem Statement */}
            <Card className="border-2 border-warning/30 bg-warning/5">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">المشكلة:</p>
                <p className="font-bold text-foreground">{mainScenario.problem}</p>
              </CardContent>
            </Card>

            {/* Actions Grid */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">ماذا تريد أن تفعل؟</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {mainActions.map(action => (
                  <Button
                    key={action.id}
                    variant="outline"
                    className="h-auto py-4 flex flex-col gap-2 hover:bg-primary/5 hover:border-primary"
                    onClick={() => handleActionClick(action.id)}
                    disabled={remainingSteps <= 0}
                  >
                    <span className="text-2xl">{action.icon}</span>
                    <span className="text-sm text-center">{action.label}</span>
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Decision Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-auto py-4 border-destructive/50 hover:bg-destructive/10 hover:border-destructive"
                onClick={() => setShowRejectModal(true)}
              >
                <span className="text-xl ml-2">❌</span>
                ارفض فرضية
              </Button>
              <Button
                className="h-auto py-4 bg-accent hover:bg-accent/90"
                onClick={() => setShowDeclareModal(true)}
                disabled={remainingSteps <= 0}
              >
                <span className="text-xl ml-2">✅</span>
                أعلن الحل
              </Button>
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            {/* Hypotheses */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span>💭</span> الفرضيات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {hypotheses.map(hypothesis => (
                  <div 
                    key={hypothesis.id}
                    className={`p-2 rounded-lg text-sm ${
                      hypothesis.status === 'rejected' 
                        ? 'bg-destructive/10 line-through text-muted-foreground' 
                        : 'bg-primary/5 border border-primary/20'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span>{hypothesis.status === 'rejected' ? '❌' : '❓'}</span>
                      <span>{hypothesis.text}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Evidence */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span>📋</span> الأدلة المكتشفة
                  <Badge variant="secondary" className="mr-auto">{evidenceList.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {evidenceList.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    لم تكتشف أي أدلة بعد
                  </p>
                ) : (
                  evidenceList.map(evidence => (
                    <div 
                      key={evidence.id}
                      className="card-evidence p-2 rounded-lg text-sm"
                    >
                      <p className="text-foreground">{evidence.text}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modals */}
      <DialogueModal
        isOpen={dialogueAction !== null}
        onClose={() => setDialogueAction(null)}
        actionId={dialogueAction}
        onEvidenceDiscovered={handleEvidenceDiscovered}
        discoveredEvidence={discoveredEvidence}
      />

      <RejectHypothesisModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        hypotheses={hypotheses}
        discoveredEvidence={discoveredEvidence}
        onReject={onRejectHypothesis}
      />

      <DeclareSolutionModal
        isOpen={showDeclareModal}
        onClose={() => setShowDeclareModal(false)}
        hypotheses={hypotheses}
        discoveredEvidence={discoveredEvidence}
        onDeclare={onDeclareSolution}
      />
    </div>
  );
}
