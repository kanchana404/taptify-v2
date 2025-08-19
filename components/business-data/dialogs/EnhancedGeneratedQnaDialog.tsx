import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { HelpCircle, MessageSquare, Edit3, X, CalendarDays } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface GeneratedQna {
  id: string;
  question: string;
  answer: string;
  isEditing: boolean;
  originalQuestion: string;
  originalAnswer: string;
}

interface EnhancedGeneratedQnaDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  generatedQna: { question: string; answer: string }[];
  onScheduleAll: () => void;
  onClearAll: () => void;
  userId: string;
  // Add location and account info
  locationId?: string | null;
  accountName?: string | null;
}

const QNA_PER_PAGE = 3;

const EnhancedGeneratedQnaDialog: React.FC<EnhancedGeneratedQnaDialogProps> = ({
  isOpen,
  onOpenChange,
  generatedQna,
  onScheduleAll,
  onClearAll,
  userId,
  locationId,
  accountName,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [qnaList, setQnaList] = useState<GeneratedQna[]>([]);
  const [scheduleDate, setScheduleDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    if (generatedQna.length > 0) {
      setQnaList(
        generatedQna.map((qna, idx) => ({
          id: `qna-${idx}`,
          question: qna.question,
          answer: qna.answer,
          isEditing: false,
          originalQuestion: qna.question,
          originalAnswer: qna.answer,
        }))
      );
      setCurrentPage(1);
    }
  }, [generatedQna]);

  const totalPages = Math.ceil(qnaList.length / QNA_PER_PAGE);
  const startIndex = (currentPage - 1) * QNA_PER_PAGE;
  const endIndex = startIndex + QNA_PER_PAGE;
  const currentQna = qnaList.slice(startIndex, endIndex);

  const handleEditToggle = (qnaId: string) => {
    setQnaList(prev => prev.map(qna =>
      qna.id === qnaId ? { ...qna, isEditing: !qna.isEditing } : qna
    ));
  };

  const handleQnaUpdate = (qnaId: string, field: 'question' | 'answer', value: string) => {
    setQnaList(prev => prev.map(qna =>
      qna.id === qnaId ? { ...qna, [field]: value } : qna
    ));
  };

  const handleSaveEdit = (qnaId: string) => {
    setQnaList(prev => prev.map(qna =>
      qna.id === qnaId ? {
        ...qna,
        isEditing: false,
        originalQuestion: qna.question,
        originalAnswer: qna.answer,
      } : qna
    ));
  };

  const handleCancelEdit = (qnaId: string) => {
    setQnaList(prev => prev.map(qna =>
      qna.id === qnaId ? {
        ...qna,
        isEditing: false,
        question: qna.originalQuestion,
        answer: qna.originalAnswer,
      } : qna
    ));
  };

  const handleRemoveQna = (qnaId: string) => {
    setQnaList(prev => prev.filter(qna => qna.id !== qnaId));
  };

  const handleScheduleAllQna = async () => {
    if (qnaList.length === 0) {
      toast.error('No QnA to schedule');
      return;
    }
    if (!scheduleDate) {
      toast.error('Please select a schedule date');
      return;
    }
    setScheduling(true);
    try {
      // Get location_id from props first, then from storage
      let finalLocationId = locationId || null;
      
      // If no location ID from props, try to get it from storage
      if (!finalLocationId) {
        if (window.location.pathname.includes('/business-data')) {
          finalLocationId = localStorage.getItem('selectedLocationId');
          console.log('Location ID from localStorage:', finalLocationId);
        }
        
        // If still no location ID, try to get it from sessionStorage
        if (!finalLocationId) {
          finalLocationId = sessionStorage.getItem('selectedLocationId');
          console.log('Location ID from sessionStorage:', finalLocationId);
        }
      } else {
        console.log('Location ID from props:', finalLocationId);
      }
      
      // If still no location ID, show a warning but continue
      if (!finalLocationId) {
        console.warn('No location ID found - QnA will be scheduled without location filtering');
      }
      
      console.log('Final Location ID for scheduling:', finalLocationId);
      console.log('Account name from props:', accountName);
      
      const res = await fetch('/api/business/scheduled-qna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          qna: qnaList.map(qna => ({
            question: qna.question,
            answer: qna.answer,
            location_id: finalLocationId,
            account_name: accountName,
          })),
          scheduled_publish_time: scheduleDate,
          location_id: finalLocationId,
          account_name: accountName,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success('Scheduled QnA saved!');
        setQnaList([]);
        onOpenChange(false);
        onScheduleAll();
      } else {
        toast.error('Failed to schedule QnA: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      toast.error('Failed to schedule QnA');
    } finally {
      setScheduling(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[900px] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Schedule QnA</DialogTitle>
          <DialogDescription>
            Review, edit, and schedule your generated QnA pairs. All will be scheduled for the selected date.
          </DialogDescription>
        </DialogHeader>
        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Label htmlFor="schedule-date" className="font-medium">Schedule Date</Label>
          <Input
            id="schedule-date"
            type="date"
            min={new Date().toISOString().slice(0, 10)}
            value={scheduleDate}
            onChange={e => setScheduleDate(e.target.value)}
            className="w-full sm:w-48"
          />
        </div>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {currentQna.map(qna => (
            <Card key={qna.id} className="border-2 border-gray-200 hover:border-blue-300 transition-colors">
              <CardContent className="py-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-blue-600" />
                    {qna.isEditing ? (
                      <Textarea
                        value={qna.question}
                        onChange={e => handleQnaUpdate(qna.id, 'question', e.target.value)}
                        rows={2}
                        className="flex-1"
                        placeholder="Edit question"
                      />
                    ) : (
                      <span className="font-medium text-sm flex-1">{qna.question}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-green-600" />
                    {qna.isEditing ? (
                      <Textarea
                        value={qna.answer}
                        onChange={e => handleQnaUpdate(qna.id, 'answer', e.target.value)}
                        rows={2}
                        className="flex-1"
                        placeholder="Edit answer"
                      />
                    ) : (
                      <span className="text-muted-foreground text-sm flex-1">{qna.answer}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {qna.isEditing ? (
                      <>
                        <Button size="sm" variant="default" onClick={() => handleSaveEdit(qna.id)}>
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleCancelEdit(qna.id)}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => handleEditToggle(qna.id)}>
                        Edit
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => handleRemoveQna(qna.id)}>
                      Remove
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {totalPages > 1 && (
          <Pagination className="mt-4">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious onClick={() => setCurrentPage(p => Math.max(1, p - 1))} />
              </PaginationItem>
              {Array.from({ length: totalPages }).map((_, idx) => (
                <PaginationItem key={idx}>
                  <PaginationLink isActive={currentPage === idx + 1} onClick={() => setCurrentPage(idx + 1)}>
                    {idx + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClearAll} disabled={scheduling}>
            Cancel All
          </Button>
          <Button variant="default" onClick={handleScheduleAllQna} disabled={scheduling || qnaList.length === 0}>
            {scheduling ? 'Scheduling...' : 'Schedule All'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedGeneratedQnaDialog; 