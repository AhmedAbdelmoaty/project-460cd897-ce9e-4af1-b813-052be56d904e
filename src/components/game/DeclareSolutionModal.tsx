import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HypothesisId, EvidenceId, Hypothesis } from '@/types/game';
import { mainScenario } from '@/data/scenario';

interface DeclareSolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  hypotheses: Hypothesis[];
  discoveredEvidence: EvidenceId[];
  onDeclare: (hypothesisId: HypothesisId, evidenceId: EvidenceId) => { success: boolean };
}

export function DeclareSolutionModal({ 
  isOpen, 
  onClose, 
  hypotheses,
  discoveredEvidence,
  onDeclare 
}: DeclareSolutionModalProps) {
  const [selectedHypothesis, setSelectedHypothesis] = useState<HypothesisId | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceId | null>(null);

  const activeHypotheses = hypotheses.filter(h => h.status === 'active');
  const evidenceList = mainScenario.evidence.filter(e => discoveredEvidence.includes(e.id));

  const handleDeclare = () => {
    if (!selectedHypothesis || !selectedEvidence) return;
    onDeclare(selectedHypothesis, selectedEvidence);
    handleClose();
  };

  const handleClose = () => {
    setSelectedHypothesis(null);
    setSelectedEvidence(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">✅</span>
            إعلان الحل النهائي
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {discoveredEvidence.length === 0 ? (
            <div className="text-center py-6 space-y-3">
              <div className="text-4xl">⚠️</div>
              <p className="text-muted-foreground">
                لا يمكنك إعلان الحل بدون أدلة!
              </p>
              <p className="text-sm text-muted-foreground">
                اجمع بعض الأدلة أولاً لتدعم حلك.
              </p>
              <Button onClick={handleClose} variant="outline" className="mt-4">
                حسناً
              </Button>
            </div>
          ) : (
            <>
              {/* Warning */}
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
                <p className="text-sm text-warning-foreground">
                  ⚠️ تحذير: هذا القرار نهائي! تأكد من اختيارك قبل الإعلان.
                </p>
              </div>

              {/* Step 1: Select Hypothesis */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  1. اختر الفرضية الصحيحة (الحل):
                </label>
                <div className="space-y-2">
                  {activeHypotheses.map(hypothesis => (
                    <button
                      key={hypothesis.id}
                      onClick={() => setSelectedHypothesis(hypothesis.id)}
                      className={`w-full p-3 rounded-lg border-2 text-right transition-colors ${
                        selectedHypothesis === hypothesis.id
                          ? 'border-accent bg-accent/10'
                          : 'border-border hover:border-accent/50'
                      }`}
                    >
                      <p className="text-foreground">{hypothesis.text}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Select Evidence */}
              {selectedHypothesis && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    2. اختر الدليل الذي يدعم هذا الحل:
                  </label>
                  <div className="space-y-2">
                    {evidenceList.map(evidence => (
                      <button
                        key={evidence.id}
                        onClick={() => setSelectedEvidence(evidence.id)}
                        className={`w-full p-3 rounded-lg border-2 text-right transition-colors ${
                          selectedEvidence === evidence.id
                            ? 'border-accent bg-accent/10'
                            : 'border-border hover:border-accent/50'
                        }`}
                      >
                        <p className="text-foreground text-sm">{evidence.text}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={handleDeclare} 
                  disabled={!selectedHypothesis || !selectedEvidence}
                  className="flex-1 bg-accent hover:bg-accent/90"
                >
                  أعلن الحل ✅
                </Button>
                <Button onClick={handleClose} variant="outline">
                  إلغاء
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
