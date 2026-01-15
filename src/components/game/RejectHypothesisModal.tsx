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
  onReject: (hypothesisId: HypothesisId, evidenceIds: EvidenceId[]) => { success: boolean; message: string; lostAttempt?: boolean };
}

export function RejectHypothesisModal({ 
  isOpen, 
  onClose, 
  hypotheses,
  discoveredEvidence,
  onReject 
}: RejectHypothesisModalProps) {
  const [selectedHypothesis, setSelectedHypothesis] = useState<HypothesisId | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceId[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const activeHypotheses = hypotheses.filter(h => h.status === 'active');
  const evidenceList = mainScenario.evidence.filter(e => discoveredEvidence.includes(e.id));

  const toggleEvidence = (evidenceId: EvidenceId) => {
    setSelectedEvidence(prev => 
      prev.includes(evidenceId) 
        ? prev.filter(id => id !== evidenceId)
        : [...prev, evidenceId]
    );
  };

  const handleRejectClick = () => {
    if (!selectedHypothesis || selectedEvidence.length === 0) return;
    setShowConfirmation(true);
  };

  const handleConfirmReject = () => {
    if (!selectedHypothesis || selectedEvidence.length === 0) return;
    
    const result = onReject(selectedHypothesis, selectedEvidence);
    
    if (result.success) {
      handleClose();
    } else if (result.lostAttempt) {
      // Modal will close automatically as screen changes
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedHypothesis(null);
    setSelectedEvidence([]);
    setShowConfirmation(false);
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
          ) : showConfirmation ? (
            // شاشة التأكيد
            <div className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-center">
                <div className="text-3xl mb-3">⚠️</div>
                <p className="font-bold text-destructive mb-2">
                  هل أنت متأكد؟
                </p>
                <p className="text-sm text-muted-foreground">
                  النفي الخاطئ يكلفك محاولة كاملة!
                </p>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium">الفرضية المختارة:</p>
                <p className="text-foreground">
                  {hypotheses.find(h => h.id === selectedHypothesis)?.text}
                </p>
                <p className="text-sm font-medium mt-3">الأدلة المختارة:</p>
                {selectedEvidence.map(eId => {
                  const evidence = mainScenario.evidence.find(e => e.id === eId);
                  return (
                    <p key={eId} className="text-sm text-muted-foreground">
                      • {evidence?.text}
                    </p>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleConfirmReject}
                  variant="destructive"
                  className="flex-1"
                >
                  نعم، أنا متأكد
                </Button>
                <Button 
                  onClick={() => setShowConfirmation(false)} 
                  variant="outline"
                  className="flex-1"
                >
                  تراجع
                </Button>
              </div>
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
                        setSelectedEvidence([]);
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

              {/* Step 2: Select Evidence (Multiple) */}
              {selectedHypothesis && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    2. اختر الدليل/الأدلة التي تنفي هذه الفرضية:
                  </label>
                  <p className="text-xs text-muted-foreground">
                    يمكنك اختيار أكثر من دليل
                  </p>
                  <div className="space-y-2">
                    {evidenceList.map(evidence => (
                      <button
                        key={evidence.id}
                        onClick={() => toggleEvidence(evidence.id)}
                        className={`w-full p-3 rounded-lg border-2 text-right transition-colors ${
                          selectedEvidence.includes(evidence.id)
                            ? 'border-info bg-info/10'
                            : 'border-border hover:border-info/50'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            selectedEvidence.includes(evidence.id) 
                              ? 'bg-info border-info' 
                              : 'border-muted-foreground'
                          }`}>
                            {selectedEvidence.includes(evidence.id) && (
                              <span className="text-info-foreground text-xs">✓</span>
                            )}
                          </div>
                          <p className="text-foreground text-sm">{evidence.text}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected count */}
              {selectedEvidence.length > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {selectedEvidence.length} دليل مختار
                  </Badge>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={handleRejectClick} 
                  disabled={!selectedHypothesis || selectedEvidence.length === 0}
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
