import { useMemo, useState } from 'react';
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
  onReject: (hypothesisId: HypothesisId, evidenceIds: EvidenceId[]) => { success: boolean; message: string };
}

export function RejectHypothesisModal({
  isOpen,
  onClose,
  hypotheses,
  discoveredEvidence,
  onReject,
}: RejectHypothesisModalProps) {
  const [selectedHypothesis, setSelectedHypothesis] = useState<HypothesisId | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceId | null>(null);
  const [feedback, setFeedback] = useState<string>('');

  const activeHypotheses = useMemo(
    () => hypotheses.filter((h) => h.status === 'active'),
    [hypotheses]
  );

  const evidenceList = useMemo(
    () => mainScenario.evidence.filter((e) => discoveredEvidence.includes(e.id)),
    [discoveredEvidence]
  );

  const handleReject = () => {
    if (!selectedHypothesis || !selectedEvidence) return;
    const result = onReject(selectedHypothesis, [selectedEvidence]);
    setFeedback(result.message);
    if (result.success) {
      // قفل بعد نجاح الرفض
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedHypothesis(null);
    setSelectedEvidence(null);
    setFeedback('');
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
              <p className="text-muted-foreground">لا يمكنك رفض فرضية بدون أدلة.</p>
              <Button onClick={handleClose} variant="outline" className="mt-4">
                حسناً
              </Button>
            </div>
          ) : (
            <>
              {/* اختر الفرضية */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  1) اختر فرضية تريد استبعادها:
                </label>
                <div className="space-y-2">
                  {activeHypotheses.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => {
                        setSelectedHypothesis(h.id);
                        setSelectedEvidence(null);
                        setFeedback('');
                      }}
                      className={`w-full p-3 rounded-lg border-2 text-right transition-colors ${
                        selectedHypothesis === h.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <p className="text-foreground">{h.text}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* اختر دليل واحد */}
              {selectedHypothesis && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    2) اختر دليل واحد يرفضها:
                  </label>
                  <div className="space-y-2">
                    {evidenceList.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => {
                          setSelectedEvidence(e.id);
                          setFeedback('');
                        }}
                        className={`w-full p-3 rounded-lg border-2 text-right transition-colors ${
                          selectedEvidence === e.id
                            ? 'border-info bg-info/10'
                            : 'border-border hover:border-info/50'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              selectedEvidence === e.id ? 'bg-info border-info' : 'border-muted-foreground'
                            }`}
                          >
                            {selectedEvidence === e.id && (
                              <span className="text-info-foreground text-xs">✓</span>
                            )}
                          </div>
                          <p className="text-foreground text-sm">{e.text}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {selectedEvidence && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">تم اختيار دليل</Badge>
                    </div>
                  )}
                </div>
              )}

              {/* Feedback داخل المودال */}
              {feedback && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm text-foreground leading-relaxed">{feedback}</p>
                </div>
              )}

              {/* أزرار */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleReject}
                  disabled={!selectedHypothesis || !selectedEvidence}
                  className="flex-1"
                >
                  رفض
                </Button>
                <Button onClick={handleClose} variant="outline">
                  إغلاق
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                ملاحظة: الرفض الخاطئ لا ينهي المحاولة، لكنه يقلل جودة تقييمك.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
