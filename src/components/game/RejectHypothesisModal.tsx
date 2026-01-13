import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HypothesisId, EvidenceId, Hypothesis } from '@/types/game';
import { mainScenario } from '@/data/scenario';

interface RejectHypothesisModalProps {
  isOpen: boolean;
  onClose: () => void;
  hypotheses: Hypothesis[];
  discoveredEvidence: EvidenceId[];
  onReject: (hypothesisId: HypothesisId, evidenceId: EvidenceId) => { success: boolean; message: string };
}

export function RejectHypothesisModal({ 
  isOpen, 
  onClose, 
  hypotheses,
  discoveredEvidence,
  onReject 
}: RejectHypothesisModalProps) {
  const [selectedHypothesis, setSelectedHypothesis] = useState<HypothesisId | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceId | null>(null);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const activeHypotheses = hypotheses.filter(h => h.status === 'active');
  const evidenceList = mainScenario.evidence.filter(e => discoveredEvidence.includes(e.id));

  const handleReject = () => {
    if (!selectedHypothesis || !selectedEvidence) return;

    const result = onReject(selectedHypothesis, selectedEvidence);
    
    if (result.success) {
      setMessage({ text: result.message, isError: false });
      setTimeout(() => {
        handleClose();
      }, 1500);
    } else {
      setMessage({ text: result.message, isError: true });
    }
  };

  const handleClose = () => {
    setSelectedHypothesis(null);
    setSelectedEvidence(null);
    setMessage(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">❌</span>
            رفض فرضية
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {discoveredEvidence.length === 0 ? (
            <div className="text-center py-6 space-y-3">
              <div className="text-4xl">🔍</div>
              <p className="text-muted-foreground">
                لا يمكنك رفض فرضية بدون أدلة!
              </p>
              <p className="text-sm text-muted-foreground">
                اجمع بعض الأدلة أولاً من الشخصيات والمستندات.
              </p>
              <Button onClick={handleClose} variant="outline" className="mt-4">
                حسناً
              </Button>
            </div>
          ) : (
            <>
              {/* Step 1: Select Hypothesis */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  1. اختر الفرضية التي تريد رفضها:
                </label>
                <div className="space-y-2">
                  {activeHypotheses.map(hypothesis => (
                    <button
                      key={hypothesis.id}
                      onClick={() => {
                        setSelectedHypothesis(hypothesis.id);
                        setMessage(null);
                      }}
                      className={`w-full p-3 rounded-lg border-2 text-right transition-colors ${
                        selectedHypothesis === hypothesis.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
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
                    2. اختر الدليل الذي ينفي هذه الفرضية:
                  </label>
                  <div className="space-y-2">
                    {evidenceList.map(evidence => (
                      <button
                        key={evidence.id}
                        onClick={() => {
                          setSelectedEvidence(evidence.id);
                          setMessage(null);
                        }}
                        className={`w-full p-3 rounded-lg border-2 text-right transition-colors ${
                          selectedEvidence === evidence.id
                            ? 'border-info bg-info/10'
                            : 'border-border hover:border-info/50'
                        }`}
                      >
                        <p className="text-foreground text-sm">{evidence.text}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message */}
              {message && (
                <div className={`p-3 rounded-lg text-center ${
                  message.isError ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'
                }`}>
                  <p className="font-medium">{message.text}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={handleReject} 
                  disabled={!selectedHypothesis || !selectedEvidence}
                  className="flex-1"
                >
                  رفض الفرضية
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
