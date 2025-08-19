"use client";

import React, { useState, useEffect } from 'react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  HelpCircle,
  MessageSquare,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Clock,
  User,
  Building,
  Send,
  AlertCircle,
  CheckCircle,
  Filter,
  Search,
  Zap,
  Calendar,
  CalendarDays,
  Check,
  X
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { format } from 'date-fns';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format as formatDate } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import EnhancedGeneratedQnaDialog from './business-data/dialogs/EnhancedGeneratedQnaDialog';

// Types for Q&A data
interface Question {
  name: string;
  text: string;
  createTime: string;
  updateTime: string;
  author?: {
    displayName: string;
    profilePhotoUri?: string;
    type: string;
  };
  upvoteCount?: number;
  totalAnswerCount?: number;
  topAnswers?: Answer[];
}

interface Answer {
  name: string;
  text: string;
  createTime: string;
  updateTime: string;
  author?: {
    displayName: string;
    profilePhotoUri?: string;
    type: string;
  };
  upvoteCount?: number;
}

interface ScheduledQna {
  id: number;
  user_id: string;
  question: string;
  answer: string | null;
  account_name?: string; // Add account name field
  scheduled_publish_time: string;
  status: 'scheduled' | 'published' | 'failed';
  published_at: string | null;
  batch_id: string | null;
  created_at: string;
  updated_at: string;
}

interface QnaManagementProps {
  locationName: string;
  locationTitle?: string;
  businessInfo?: any;
  userId: string;
  accountName?: string; // Add account name prop
}

export default function QnaManagement({ locationName, locationTitle, businessInfo, userId, accountName }: QnaManagementProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [isCreateQuestionOpen, setIsCreateQuestionOpen] = useState(false);
  const [isAnswerDialogOpen, setIsAnswerDialogOpen] = useState(false);
  const [isEditQuestionOpen, setIsEditQuestionOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [orderBy, setOrderBy] = useState('updateTime desc');
  const [creatingQuestion, setCreatingQuestion] = useState(false);
  const [creatingAnswer, setCreatingAnswer] = useState(false);
  const [deletingQuestion, setDeletingQuestion] = useState<string | null>(null);
  const [deletingAnswer, setDeletingAnswer] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);
  const [showGeneratedQuestions, setShowGeneratedQuestions] = useState(false);
  const [generatingAnswerFor, setGeneratingAnswerFor] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [generatedQnA, setGeneratedQnA] = useState<any[]>([]);
  const [showGeneratedQnA, setShowGeneratedQnA] = useState(false);
  const [autoGenerateAnswer, setAutoGenerateAnswer] = useState(false);
  // Add state to control visibility of AI options
  const [showAIGenerationOptions, setShowAIGenerationOptions] = useState(false);

  // Scheduled QnA state
  const [scheduledQna, setScheduledQna] = useState<ScheduledQna[]>([]);
  const [loadingScheduledQna, setLoadingScheduledQna] = useState(false);
  const [editingScheduledQna, setEditingScheduledQna] = useState<ScheduledQna | null>(null);
  const [pendingDeleteQna, setPendingDeleteQna] = useState<ScheduledQna | null>(null);

  // Form states
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newAnswerText, setNewAnswerText] = useState('');
  const [editQuestionText, setEditQuestionText] = useState('');

  // Add state for prompt, quantity, and generateAnswersWithQuestions
  const [questionPrompt, setQuestionPrompt] = useState('');
  const [questionQty, setQuestionQty] = useState(3);
  const [generateAnswersWithQuestions, setGenerateAnswersWithQuestions] = useState(false);

  // Add state to store answers for each question
  const [questionAnswers, setQuestionAnswers] = useState<{ [questionName: string]: Answer[] }>({});
  const [showAllAnswersFor, setShowAllAnswersFor] = useState<string | null>(null);

  // Add state for multiple manual questions/answers
  const [manualQuestions, setManualQuestions] = useState([
    { question: '', answer: '', postDate: '' }
  ]);

  // Add state for post date (manual and AI)
  const todayStr = formatDate(new Date(), 'yyyy-MM-dd');
  const [manualPostDate, setManualPostDate] = useState(todayStr);
  const [aiPostDate, setAIPostDate] = useState(todayStr);

  // Scheduled QnA form state
  const [scheduledQnaForm, setScheduledQnaForm] = useState({
    question: '',
    answer: '',
    scheduled_publish_time: todayStr
  });

  // Handler to update a manual question/answer
  const handleManualQnAChange = (idx: number, field: 'question' | 'answer', value: string) => {
    setManualQuestions(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  // Handler to add a new manual QnA pair
  const handleAddManualQnA = () => {
    setManualQuestions(prev => [...prev, { question: '', answer: '', postDate: '' }]);
  };

  // Handler to remove a manual QnA pair
  const handleRemoveManualQnA = (idx: number) => {
    setManualQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  // Handler to submit all manual QnA pairs
  const handleSubmitManualQnA = async () => {
    // Validate all questions
    for (const qna of manualQuestions) {
      if (!qna.question.trim() || qna.question.trim().length < 15) {
        toast.error('Each question must be at least 15 characters long');
        return;
      }
      if (!qna.answer.trim() || qna.answer.trim().length < 5) {
        toast.error('Each answer must be at least 5 characters long');
        return;
      }
    }
    if (!manualPostDate) {
      toast.error('Please select a date to post the questions');
      return;
    }
    setCreatingQuestion(true);
    try {
      const response = await fetch('/api/business/qna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'bulk-create',
          locationName,
          questions: manualQuestions.map(qna => ({ question: qna.question.trim(), answer: qna.answer.trim(), postDate: manualPostDate }))
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        toast.success('Questions and answers added successfully!');
        setManualQuestions([{ question: '', answer: '', postDate: '' }]);
        setIsCreateQuestionOpen(false);
        await loadQuestions();
      } else {
        toast.error(result.error || 'Failed to add questions');
      }
    } catch (error) {
      toast.error('Error adding questions');
    } finally {
      setCreatingQuestion(false);
    }
  };

  // Move this useEffect to the top level, after useState declarations
  useEffect(() => {
    if (showGeneratedQnA && generatedQnA.length > 0) {
      setManualQuestions(generatedQnA.map(qna => ({ ...qna })));
    }
  }, [showGeneratedQnA, generatedQnA]);

  // After loading questions, fetch answers for each question
  useEffect(() => {
    if (questions.length > 0) {
      questions.forEach(async (q) => {
        const res = await fetch(`/api/business/qna?type=answers&questionName=${encodeURIComponent(q.name)}&orderBy=updateTime desc&pageSize=10`);
        const data = await res.json();
        setQuestionAnswers(prev => ({ ...prev, [q.name]: data.answers || [] }));
      });
    }
  }, [questions]);

  useEffect(() => {
    if (locationName) {
      loadQuestions();
      loadScheduledQna();
    } else {
      // If no locationName, keep loading state to show skeleton
      setLoading(true);
    }

    // Listen for AI generated questions from parent component
    const handleQuestionsGenerated = (event: CustomEvent) => {
      setGeneratedQuestions(event.detail);
      setShowGeneratedQuestions(true);
    };

    // Listen for AI generated Q&A from parent component (backward compatibility)
    const handleQnAGenerated = (event: CustomEvent) => {
      setGeneratedQnA(event.detail);
      setShowGeneratedQnA(true);
    };

    window.addEventListener('questionsGenerated' as any, handleQuestionsGenerated);
    window.addEventListener('qnaGenerated' as any, handleQnAGenerated);
    
    // Check localStorage for generated questions
    const storedQuestions = localStorage.getItem('generatedQuestions');
    if (storedQuestions) {
      try {
        const parsed = JSON.parse(storedQuestions);
        setGeneratedQuestions(parsed);
        setShowGeneratedQuestions(true);
        localStorage.removeItem('generatedQuestions'); // Clear after loading
      } catch (error) {
        console.error('Error parsing stored questions:', error);
      }
    }
    
    // Check localStorage for generated Q&A (backward compatibility)
    const storedQnA = localStorage.getItem('generatedQnA');
    if (storedQnA) {
      try {
        const parsed = JSON.parse(storedQnA);
        setGeneratedQnA(parsed);
        setShowGeneratedQnA(true);
        localStorage.removeItem('generatedQnA'); // Clear after loading
      } catch (error) {
        console.error('Error parsing stored Q&A:', error);
      }
    }

    return () => {
      window.removeEventListener('questionsGenerated' as any, handleQuestionsGenerated);
      window.removeEventListener('qnaGenerated' as any, handleQnAGenerated);
    };
  }, [locationName, filter, orderBy]);

  // AI Generation handler
  const handleAIGeneration = async () => {
    setIsGeneratingAI(true);
    try {
      const response = await fetch('/api/ai-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'questions',
          prompt: 'Generate a common question customers might ask about this business',
          businessInfo: businessInfo || {
            name: locationTitle || 'Loading...',
            locationName,
          },
          count: 1,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate question');
      }

      if (result.success && result.data && result.data.questions) {
        setGeneratedQuestions(result.data.questions);
        setShowGeneratedQuestions(true);
        toast.success(`Generated question suggestion!`);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('AI Generation Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate questions with AI');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Generate AI answer for a question
  const handleGenerateAnswer = async (questionText: string, questionObj?: Question) => {
    setGeneratingAnswerFor(questionText);
    
    try {
      const response = await fetch('/api/ai-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'answer',
          questionText,
          businessInfo: businessInfo || {
            name: locationTitle,
            locationName,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate answer');
      }

      if (result.success && result.data && result.data.answer) {
        setNewAnswerText(result.data.answer);
        
        // If questionObj is provided, set it as selected and open answer dialog
        if (questionObj) {
          setSelectedQuestion(questionObj);
          setIsAnswerDialogOpen(true);
        }
        
        toast.success('Answer generated! Review and submit it.');
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('AI Answer Generation Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate answer with AI');
    } finally {
      setGeneratingAnswerFor(null);
    }
  };

  // Use generated question
  const handleUseGeneratedQuestion = async (question: string) => {
    setNewQuestionText(question);
    setIsCreateQuestionOpen(true);
    
    // Remove used question from generated list
    setGeneratedQuestions(prev => prev.filter(item => item !== question));
  };

  // Use generated Q&A
  const handleUseGeneratedQnA = async (qna: any) => {
    setCreatingQuestion(true);
    try {
      const response = await fetch('/api/business/qna', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'create-question',
          locationName,
          questionText: qna.question
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // After creating the question, add the answer
          const answerResponse = await fetch('/api/business/qna', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'create-answer',
              questionName: result.question.name,
              answerText: qna.answer
            }),
          });

          if (answerResponse.ok) {
            toast.success('Q&A pair added successfully!');
            await loadQuestions(); // Refresh the list
            
            // Remove used Q&A from generated list
            setGeneratedQnA(prev => prev.filter(item => item !== qna));
          } else {
            toast.warning('Question created but failed to add answer. You can add it manually.');
            await loadQuestions();
          }
        } else {
          toast.error(result.error || 'Failed to create question');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to create question');
      }
    } catch (error) {
      console.error('Error using generated Q&A:', error);
      toast.error('Error adding Q&A pair');
    } finally {
      setCreatingQuestion(false);
    }
  };

  // Load questions
  const loadQuestions = async () => {
    if (!locationName) {
      setLoading(true);
      return;
    }
    
    try {
      setLoading(true);
      const params = new URLSearchParams({
        type: 'questions',
        locationName,
        orderBy,
        pageSize: '10'
      });
      
      if (filter && filter !== 'all') {
        params.append('filter', filter);
      }

      const response = await fetch(`/api/business/qna?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
      } else {
        console.log('Questions not available or access restricted');
        setQuestions([]);
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Load answers for a specific question
  const loadAnswers = async (questionName: string) => {
    try {
      setLoadingAnswers(true);
      const params = new URLSearchParams({
        type: 'answers',
        questionName,
        orderBy: 'updateTime desc',
        pageSize: '10'
      });

      const response = await fetch(`/api/business/qna?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setAnswers(data.answers || []);
      } else {
        console.log('Answers not available');
        setAnswers([]);
      }
    } catch (error) {
      console.error('Error loading answers:', error);
      setAnswers([]);
    } finally {
      setLoadingAnswers(false);
    }
  };

  // Create new question
  const handleCreateQuestion = async (autoGenerateAnswer = false) => {
    if (!newQuestionText.trim()) {
      toast.error('Please enter a question text');
      return;
    }

    if (newQuestionText.trim().length < 15) {
      toast.error('Question must be at least 15 characters long');
      return;
    }

    setCreatingQuestion(true);
    try {
      const response = await fetch('/api/business/qna', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'create-question',
          locationName,
          questionText: newQuestionText.trim()
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setQuestions([result.question, ...questions]);
          setIsCreateQuestionOpen(false);
          setNewQuestionText('');
          toast.success(result.message || 'Question created successfully');
          await loadQuestions();
          // If auto-generate answer is enabled, generate and submit the answer
          if (autoGenerateAnswer) {
            // Generate answer via AI
            setGeneratingAnswerFor(result.question.text);
            try {
              const aiResponse = await fetch('/api/ai-generation', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  type: 'answer',
                  questionText: result.question.text,
                  businessInfo: businessInfo || {
                    name: locationTitle,
                    locationName,
                  },
                }),
              });
              const aiResult = await aiResponse.json();
              if (aiResponse.ok && aiResult.success && aiResult.data && aiResult.data.answer) {
                // Submit the answer
                await fetch('/api/business/qna', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    type: 'upsert-answer',
                    questionName: result.question.name,
                    answerText: aiResult.data.answer
                  }),
                });
                toast.success('AI-generated answer added!');
                await loadAnswers(result.question.name);
                await loadQuestions();
              } else {
                toast.warning('Question created, but failed to generate answer with AI. You can add it manually.');
              }
            } catch (err) {
              toast.warning('Question created, but failed to generate answer with AI. You can add it manually.');
            } finally {
              setGeneratingAnswerFor(null);
            }
          }
        } else {
          toast.error(result.error || 'Failed to create question');
        }
      } else {
        const errorData = await response.json();
        if (errorData.error && errorData.error.includes('Question is too short')) {
          toast.error('Question is too short. Please use at least 15 characters.');
        } else {
          toast.error(errorData.error || 'Failed to create question');
        }
      }
    } catch (error) {
      console.error('Error creating question:', error);
      toast.error('Error creating question');
    } finally {
      setCreatingQuestion(false);
    }
  };

  // Create/update answer
  const handleCreateAnswer = async () => {
    if (!newAnswerText.trim() || !selectedQuestion) {
      toast.error('Please enter an answer text');
      return;
    }

    setCreatingAnswer(true);
    try {
      const response = await fetch('/api/business/qna', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'upsert-answer',
          questionName: selectedQuestion.name,
          answerText: newAnswerText.trim()
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setIsAnswerDialogOpen(false);
          setNewAnswerText('');
          toast.success(result.message || 'Answer created successfully');
          await loadAnswers(selectedQuestion.name);
          await loadQuestions();
        } else {
          toast.error(result.error || 'Failed to create answer');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to create answer');
      }
    } catch (error) {
      console.error('Error creating answer:', error);
      toast.error('Error creating answer');
    } finally {
      setCreatingAnswer(false);
    }
  };

  // Delete question
  const handleDeleteQuestion = async (questionName: string) => {
    setDeletingQuestion(questionName);
    try {
      const response = await fetch(`/api/business/qna?type=question&questionName=${encodeURIComponent(questionName)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setQuestions(questions.filter(q => q.name !== questionName));
          toast.success(result.message || 'Question deleted successfully');
        } else {
          toast.error(result.error || 'Failed to delete question');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to delete question');
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Error deleting question');
    } finally {
      setDeletingQuestion(null);
    }
  };

  // Update question
  const handleUpdateQuestion = async (questionName: string) => {
    if (!editQuestionText.trim()) {
      toast.error('Please enter question text');
      return;
    }

    setEditingQuestion(questionName);
    try {
      const response = await fetch(`/api/business/qna?questionName=${encodeURIComponent(questionName)}&updateMask=text`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: editQuestionText.trim()
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setQuestions(questions.map(q => q.name === questionName ? result.question : q));
          setIsEditQuestionOpen(false);
          setEditQuestionText('');
          toast.success(result.message || 'Question updated successfully');
        } else {
          toast.error(result.error || 'Failed to update question');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update question');
      }
    } catch (error) {
      console.error('Error updating question:', error);
      toast.error('Error updating question');
    } finally {
      setEditingQuestion(null);
    }
  };

  // Delete answer
  const handleDeleteAnswer = async (questionName: string) => {
    setDeletingAnswer(questionName);
    try {
      const response = await fetch(`/api/business/qna?type=answer&questionName=${encodeURIComponent(questionName)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          await loadAnswers(questionName);
          await loadQuestions();
          toast.success(result.message || 'Answer deleted successfully');
        } else {
          toast.error(result.error || 'Failed to delete answer');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to delete answer');
      }
    } catch (error) {
      console.error('Error deleting answer:', error);
      toast.error('Error deleting answer');
    } finally {
      setDeletingAnswer(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadQuestions();
    setRefreshing(false);
    toast.success('Q&A data refreshed');
  };

  const handleViewAnswers = async (question: Question) => {
    setSelectedQuestion(question);
    await loadAnswers(question.name);
  };

  const handleAnswerQuestion = (question: Question) => {
    setSelectedQuestion(question);
    setIsAnswerDialogOpen(true);
  };

  const handleEditQuestion = (question: Question) => {
    setSelectedQuestion(question);
    setEditQuestionText(question.text);
    setIsEditQuestionOpen(true);
  };

  const getAnswerCount = (question: Question) => {
    return question.totalAnswerCount || question.topAnswers?.length || 0;
  };

  const isBusinessAuthor = (author?: { type: string }) => {
    return author?.type === 'MERCHANT';
  };

  // Add new handler for AI generation with options
  const handleAIGenerationWithOptions = async () => {
    setIsGeneratingAI(true);
    try {
      const response = await fetch('/api/ai-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: generateAnswersWithQuestions ? 'qna' : 'questions',
          prompt: questionPrompt,
          businessInfo: businessInfo || { name: locationTitle || 'Loading...', locationName },
          count: questionQty,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate questions');
      }
      if (generateAnswersWithQuestions) {
        // Expecting result.data.questions as array of { question, answer }
        if (result.success && result.data && result.data.questions) {
          setGeneratedQnA(result.data.questions);
          setShowGeneratedQnA(true);
          toast.success(`Generated ${result.data.questions.length} Q&A suggestion(s)!`);
        } else {
          throw new Error('Invalid response format');
        }
      } else {
        // Only questions, but if user wants answers, generate them now
        if (result.success && result.data && result.data.questions) {
          if (generateAnswersWithQuestions) {
            // For each question, generate answer
            const qnaPairs = [];
            for (const question of result.data.questions) {
              const answerRes = await fetch('/api/ai-generation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'answer',
                  questionText: question,
                  businessInfo: businessInfo || { name: locationTitle || 'Loading...', locationName },
                }),
              });
              const answerData = await answerRes.json();
              qnaPairs.push({ question, answer: answerData.data?.answer || '' });
            }
            setGeneratedQnA(qnaPairs);
            setShowGeneratedQnA(true);
            toast.success(`Generated ${qnaPairs.length} Q&A suggestion(s)!`);
          } else {
            setGeneratedQuestions(result.data.questions);
            setShowGeneratedQuestions(true);
            toast.success(`Generated ${result.data.questions.length} question suggestion(s)!`);
          }
        } else {
          throw new Error('Invalid response format');
        }
      }
    } catch (error) {
      console.error('AI Generation Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate questions with AI');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Handler to update editable QnA
  const handleEditQnAChange = (index: number, field: 'question' | 'answer', value: string) => {
    setManualQuestions(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  // Handler to post a single QnA pair
  const handlePostQnA = async (index: number) => {
    const qna = manualQuestions[index];
    if (!qna.question || qna.question.trim().length < 15) {
      toast.error('Question must be at least 15 characters long');
      return;
    }
    if (!qna.answer || qna.answer.trim().length < 5) {
      toast.error('Answer must be at least 5 characters long');
      return;
    }
    try {
      // Step 1: Create question
      const questionRes = await fetch('/api/business/qna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'create-question',
          locationName,
          questionText: qna.question.trim(),
        }),
      });
      const questionData = await questionRes.json();
      if (!questionRes.ok || !questionData.success || !questionData.question?.name) {
        toast.error(questionData.error || 'Failed to create question');
        return;
      }
      // Step 2: Wait for question to be available, then post answer
      let questionName = questionData.question.name;
      let answerPosted = false;
      let retries = 0;
      while (!answerPosted && retries < 3) {
        const answerRes = await fetch('/api/business/qna', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'upsert-answer',
            questionName,
            answerText: qna.answer.trim(),
          }),
        });
        if (answerRes.ok) {
          toast.success('Q&A pair posted successfully!');
          answerPosted = true;
          await loadQuestions();
          // Remove from manualQuestions
          setManualQuestions(prev => prev.filter((_, i) => i !== index));
        } else {
          retries++;
          await new Promise(res => setTimeout(res, 1000 * retries)); // Exponential backoff
        }
      }
      if (!answerPosted) {
        toast.warning('Question created, but failed to add answer after several attempts. You can add it manually.');
      }
    } catch (err) {
      toast.error('Failed to post Q&A pair');
    }
  };

  // Scheduled QnA functions
  const loadScheduledQna = async () => {
    if (!userId) {
      setLoadingScheduledQna(true);
      return;
    }
    
    setLoadingScheduledQna(true);
    try {
      const response = await fetch(`/api/business/scheduled-qna?user_id=${userId}`);
      const data = await response.json();
      if (response.ok && data.qna) {
        setScheduledQna(data.qna);
      } else {
        setScheduledQna([]);
      }
    } catch (error) {
      console.error('Error loading scheduled QnA:', error);
      setScheduledQna([]);
    } finally {
      setLoadingScheduledQna(false);
    }
  };

  const handleCreateScheduledQna = async () => {
    if (!scheduledQnaForm.question.trim() || scheduledQnaForm.question.trim().length < 15) {
      toast.error('Question must be at least 15 characters long');
      return;
    }
    if (!scheduledQnaForm.answer.trim() || scheduledQnaForm.answer.trim().length < 5) {
      toast.error('Answer must be at least 5 characters long');
      return;
    }
    if (!scheduledQnaForm.scheduled_publish_time) {
      toast.error('Please select a publish date');
      return;
    }

    try {
      // Extract location ID from locationName and use accountName prop
      const locationId = locationName?.split('/').pop() || null;
      
      console.log('Creating scheduled QnA with location ID:', locationId);
      console.log('Creating scheduled QnA with account name:', accountName);
      
      const response = await fetch('/api/business/scheduled-qna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          qna: [{
            question: scheduledQnaForm.question.trim(),
            answer: scheduledQnaForm.answer.trim(),
            location_id: locationId,
            account_name: accountName,
          }],
          scheduled_publish_time: scheduledQnaForm.scheduled_publish_time,
          location_id: locationId,
          account_name: accountName,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success('Scheduled QnA created successfully!');
        setScheduledQnaForm({ question: '', answer: '', scheduled_publish_time: todayStr });
        setIsCreateQuestionOpen(false);
        await loadScheduledQna();
      } else {
        toast.error(data.error || 'Failed to create scheduled QnA');
      }
    } catch (error) {
      console.error('Error creating scheduled QnA:', error);
      toast.error('Failed to create scheduled QnA');
    }
  };

  const handleUpdateScheduledQna = async (id: number) => {
    if (!editingScheduledQna) return;

    if (!editingScheduledQna.question.trim() || editingScheduledQna.question.trim().length < 15) {
      toast.error('Question must be at least 15 characters long');
      return;
    }
    if (!editingScheduledQna.answer?.trim() || editingScheduledQna.answer.trim().length < 5) {
      toast.error('Answer must be at least 5 characters long');
      return;
    }

    try {
      const response = await fetch(`/api/business/scheduled-qna/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: editingScheduledQna.question.trim(),
          answer: editingScheduledQna.answer.trim(),
          scheduled_publish_time: editingScheduledQna.scheduled_publish_time
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success('QnA updated successfully');
        setEditingScheduledQna(null);
        await loadScheduledQna();
      } else {
        toast.error(data.error || 'Failed to update scheduled QnA');
      }
    } catch (error) {
      console.error('Error updating scheduled QnA:', error);
      toast.error('Failed to update scheduled QnA');
    }
  };

  const handleDeleteScheduledQna = async (id: number) => {
    try {
      const response = await fetch(`/api/business/scheduled-qna/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success('QnA deleted successfully');
        await loadScheduledQna();
      } else {
        toast.error(data.error || 'Failed to delete scheduled QnA');
      }
    } catch (error) {
      console.error('Error deleting scheduled QnA:', error);
      toast.error('Failed to delete scheduled QnA');
    }
  };

  const handleRegenerateScheduledQna = async (id: number) => {
    try {
      // This is a placeholder for regeneration logic
      // You can implement AI regeneration here
      toast.info('Regeneration feature coming soon!');
    } catch (error) {
      console.error('Error regenerating scheduled QnA:', error);
      toast.error('Failed to regenerate scheduled QnA');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Questions & Answers</h3>
          <p className="text-muted-foreground">Manage customer questions for {locationTitle || 'Loading...'}</p>
        </div>
        <div className="flex gap-2">
          {/* Generate with AI button added to main QnA page header */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setIsCreateQuestionOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ask Question
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setShowAIGenerationOptions(true);
              // Do NOT open manual dialog here
              // setIsCreateQuestionOpen(false); // ensure manual dialog is not opened
            }}
          >
            <Zap className="h-4 w-4 mr-2" />
            Generate with AI
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsCreateQuestionOpen(true)}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Scheduled QnA
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter questions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Questions</SelectItem>
            <SelectItem value="ignore_answered=true">Unanswered Only</SelectItem>
          </SelectContent>
        </Select>

        <Select value={orderBy} onValueChange={setOrderBy}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updateTime desc">Newest First</SelectItem>
            <SelectItem value="upvoteCount desc">Most Upvoted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Generated Questions Section */}
      {showGeneratedQuestions && generatedQuestions.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-900/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  AI Generated Question Suggestions
                </CardTitle>
                <CardDescription>
                  Review and add these AI-generated questions to your business profile
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGeneratedQuestions(false)}
              >
                ×
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {generatedQuestions.map((question, index) => (
              <Card key={index} className="bg-white dark:bg-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2 flex-1">
                      <HelpCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                      <p className="text-sm">{question}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleUseGeneratedQuestion(question)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Use Question
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Generated Q&A Section (Backward Compatibility) */}
      {showGeneratedQnA && manualQuestions.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-900/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  AI Generated Q&A Suggestions
                </CardTitle>
                <CardDescription>
                  Review, edit, and post these Q&A pairs to your business profile
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGeneratedQnA(false)}
              >
                ×
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {manualQuestions.map((qna, index) => (
              <Card key={index} className="bg-white dark:bg-gray-800">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-start gap-2 mb-2">
                        <HelpCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                        <input
                          className="font-medium text-sm w-full border rounded px-2 py-1"
                          value={qna.question}
                          onChange={e => handleEditQnAChange(index, 'question', e.target.value)}
                          placeholder="Edit question"
                          aria-label="Edit question"
                        />
                      </div>
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-green-600 mt-0.5" />
                        <textarea
                          className="text-sm text-muted-foreground w-full border rounded px-2 py-1"
                          value={qna.answer}
                          onChange={e => handleEditQnAChange(index, 'answer', e.target.value)}
                          rows={2}
                          placeholder="Edit answer"
                          aria-label="Edit answer"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => handlePostQnA(index)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Post
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Scheduled QnA Section */}
      {scheduledQna.length > 0 ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Scheduled Q&A
            </h4>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {scheduledQna.length} {scheduledQna.length === 1 ? 'question' : 'questions'}
            </div>
          </div>

          <div className="grid gap-4">
            {scheduledQna.map((qna) => (
              <Card key={qna.id} className="group border-0 shadow-sm bg-white dark:bg-gray-900 hover:shadow-md transition-all duration-200">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Q&A Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                        <Badge variant="secondary" className="w-fit bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300 border-orange-200 dark:border-orange-800">
                          Scheduled
                        </Badge>
                        {qna.scheduled_publish_time && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            {new Date(qna.scheduled_publish_time).toLocaleString()}
                          </span>
                        )}
                        {qna.account_name && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            Account: {qna.account_name}
                          </span>
                        )}
                      </div>

                      {editingScheduledQna?.id === qna.id ? (
                        <>
                          <Input
                            className="mb-2 text-sm sm:text-base"
                            value={editingScheduledQna.question}
                            onChange={e => setEditingScheduledQna(prev => prev ? { ...prev, question: e.target.value } : null)}
                            placeholder="Edit question"
                          />
                          <Input
                            className="mb-2 text-sm sm:text-base"
                            value={editingScheduledQna.answer || ''}
                            onChange={e => setEditingScheduledQna(prev => prev ? { ...prev, answer: e.target.value } : null)}
                            placeholder="Edit answer"
                          />
                          <Input
                            type="date"
                            className="mb-2 text-sm sm:text-base"
                            value={editingScheduledQna.scheduled_publish_time?.slice(0, 10) || ''}
                            onChange={e => setEditingScheduledQna(prev => prev ? { ...prev, scheduled_publish_time: e.target.value } : null)}
                          />
                        </>
                      ) : (
                        <>
                          <div className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                            Q: {qna.question}
                          </div>
                          {qna.answer && (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              A: {qna.answer}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex sm:flex-col gap-2 justify-center sm:justify-start">
                      {editingScheduledQna?.id === qna.id ? (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 rounded-full hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20 dark:hover:text-green-400 transition-colors duration-200"
                                onClick={() => handleUpdateScheduledQna(qna.id)}
                              >
                                <span className="sr-only">Save</span>
                                <Check className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Save</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 rounded-full hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-400 transition-colors duration-200"
                                onClick={() => setEditingScheduledQna(null)}
                              >
                                <span className="sr-only">Cancel</span>
                                <X className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Cancel</TooltipContent>
                          </Tooltip>
                        </>
                      ) : (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 rounded-full hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-colors duration-200"
                                onClick={() => setEditingScheduledQna(qna)}
                              >
                                <span className="sr-only">Edit</span>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit Q&A</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 rounded-full hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors duration-200"
                                onClick={() => setPendingDeleteQna(qna)}
                              >
                                <span className="sr-only">Delete</span>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete Q&A</TooltipContent>
                          </Tooltip>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mb-4">
            <HelpCircle className="h-8 w-8 sm:h-10 sm:w-10 text-orange-600 dark:text-orange-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No scheduled Q&A yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
            Create your first scheduled Q&A to see it appear here
          </p>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : questions.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Questions</p>
                    <p className="text-lg font-semibold">{questions.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Answered</p>
                    <p className="text-lg font-semibold">
                      {questions.filter(q => getAnswerCount(q) > 0).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Unanswered</p>
                    <p className="text-lg font-semibold">
                      {questions.filter(q => getAnswerCount(q) === 0).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4 text-purple-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Upvotes</p>
                    <p className="text-lg font-semibold">
                      {questions.reduce((sum, q) => sum + (q.upvoteCount || 0), 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {questions.map((question, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <HelpCircle className="h-4 w-4 text-blue-600" />
                        <Badge variant={getAnswerCount(question) > 0 ? 'default' : 'secondary'}>
                          {getAnswerCount(question) > 0 ? 'Answered' : 'Unanswered'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(question.createTime), 'MMM d, yyyy')}
                        </span>
                      </div>
                      
                      <p className="text-sm mb-3 font-medium">{question.text}</p>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={question.author?.profilePhotoUri} />
                            <AvatarFallback>
                              {question.author?.displayName?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span>{question.author?.displayName || 'Anonymous'}</span>
                          {isBusinessAuthor(question.author) && (
                            <Building className="h-3 w-3 text-blue-600" />
                          )}
                        </div>
                        
                        {question.upvoteCount !== undefined && (
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" />
                            <span>{question.upvoteCount}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          <span>{(questionAnswers[question.name]?.length || 0)} answers</span>
                        </div>
                      </div>

                      {/* Show latest answer and Show all button */}
                      {questionAnswers[question.name] && questionAnswers[question.name].length > 0 && (
                        <div className="mt-4 border-l-2 border-blue-200 pl-4">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="h-3 w-3 text-blue-600" />
                            <span className="text-xs font-medium text-blue-600">Latest Answer</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {questionAnswers[question.name][0].text}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={questionAnswers[question.name][0].author?.profilePhotoUri} />
                              <AvatarFallback>
                                {questionAnswers[question.name][0].author?.displayName?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span>{questionAnswers[question.name][0].author?.displayName || 'Anonymous'}</span>
                            {isBusinessAuthor(questionAnswers[question.name][0].author) && (
                              <Building className="h-3 w-3 text-blue-600" />
                            )}
                            <span>•</span>
                            <span>{format(new Date(questionAnswers[question.name][0].createTime), 'MMM d, yyyy')}</span>
                            {questionAnswers[question.name][0].upvoteCount !== undefined && (
                              <>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  <ThumbsUp className="h-3 w-3" />
                                  <span>{questionAnswers[question.name][0].upvoteCount}</span>
                                </div>
                              </>
                            )}
                          </div>
                          {questionAnswers[question.name].length > 1 && showAllAnswersFor !== question.name && (
                            <Button size="sm" variant="outline" className="mt-2" onClick={() => setShowAllAnswersFor(question.name)}>
                              Show all answers ({questionAnswers[question.name].length})
                            </Button>
                          )}
                          {showAllAnswersFor === question.name && (
                            <div className="mt-2 space-y-2">
                              {questionAnswers[question.name].map((answer, idx) => (
                                <div key={idx} className="p-2 border rounded-lg">
                                  <p className="text-sm mb-1">{answer.text}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Avatar className="h-4 w-4">
                                      <AvatarImage src={answer.author?.profilePhotoUri} />
                                      <AvatarFallback>
                                        {answer.author?.displayName?.charAt(0) || 'U'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span>{answer.author?.displayName || 'Anonymous'}</span>
                                    {isBusinessAuthor(answer.author) && (
                                      <Building className="h-3 w-3 text-blue-600" />
                                    )}
                                    <span>•</span>
                                    <span>{format(new Date(answer.createTime), 'MMM d, yyyy')}</span>
                                    {answer.upvoteCount !== undefined && (
                                      <>
                                        <span>•</span>
                                        <div className="flex items-center gap-1">
                                          <ThumbsUp className="h-3 w-3" />
                                          <span>{answer.upvoteCount}</span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                              <Button size="sm" variant="ghost" className="mt-2" onClick={() => setShowAllAnswersFor(null)}>
                                Hide answers
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleAnswerQuestion(question)}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleGenerateAnswer(question.text, question)}
                        disabled={generatingAnswerFor === question.text}
                        title="Generate AI answer"
                      >
                        {generatingAnswerFor === question.text ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Zap className="h-4 w-4" />
                        )}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleViewAnswers(question)}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEditQuestion(question)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteQuestion(question.name)}
                        disabled={deletingQuestion === question.name}
                        className="text-red-600 hover:text-red-700"
                      >
                        {deletingQuestion === question.name ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <HelpCircle className="inline-block h-12 w-12 opacity-20" />
          <h3 className="text-lg font-medium mb-2">No Questions Yet</h3>
          <p className="text-muted-foreground mb-4">
            Be the first to ask a question about this business
          </p>
          <div className="flex gap-2 justify-center">
            {/* Generate with AI button removed from empty QnA state as per requirements */}
            <Button onClick={() => setIsCreateQuestionOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ask First Question
            </Button>
          </div>
        </div>
      )}

      {/* AI Generation Dialog */}
      <Dialog open={showAIGenerationOptions} onOpenChange={open => setShowAIGenerationOptions(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Questions with AI</DialogTitle>
            <DialogDescription>
              Generate question and answer suggestions for {locationTitle || 'Loading...'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 border-t pt-4 mt-4">
            <div>
              <Label htmlFor="ai-post-date">Post on</Label>
              <Input
                id="ai-post-date"
                type="date"
                min={todayStr}
                value={aiPostDate}
                onChange={e => setAIPostDate(e.target.value)}
                className="w-48"
              />
            </div>
            <div>
              <Label htmlFor="question-prompt">Custom Prompt / Topic (optional)</Label>
              <input
                id="question-prompt"
                type="text"
                value={questionPrompt}
                onChange={e => setQuestionPrompt(e.target.value)}
                placeholder="e.g. About our refund policy"
                className="w-full border rounded px-2 py-1 mt-1"
              />
            </div>
            <div className="flex items-center gap-4">
              <div>
                <Label htmlFor="question-qty">How many questions?</Label>
                <input
                  id="question-qty"
                  type="number"
                  min={1}
                  max={10}
                  value={questionQty}
                  onChange={e => setQuestionQty(Number(e.target.value))}
                  className="w-20 border rounded px-2 py-1 ml-2"
                  placeholder="Qty"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="generate-answers">Generate answers for each question</Label>
                <Switch
                  id="generate-answers"
                  checked={generateAnswersWithQuestions}
                  onCheckedChange={setGenerateAnswersWithQuestions}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAIGenerationOptions(false)}
                disabled={isGeneratingAI}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleAIGenerationWithOptions()}
                disabled={isGeneratingAI || !aiPostDate}
              >
                {isGeneratingAI ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Generate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateQuestionOpen} onOpenChange={open => setIsCreateQuestionOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ask a Question</DialogTitle>
            <DialogDescription>
              {`Ask a question about ${locationTitle || 'Loading...'}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="manual-post-date">Post on</Label>
              <Input
                id="manual-post-date"
                type="date"
                min={todayStr}
                value={manualPostDate}
                onChange={e => setManualPostDate(e.target.value)}
                className="w-48"
              />
            </div>
            {manualQuestions.map((qna, idx) => (
              <div key={idx} className="border rounded p-3 mb-2 bg-muted/30">
                <Label>Question</Label>
                <Textarea
                  value={qna.question}
                  onChange={e => handleManualQnAChange(idx, 'question', e.target.value)}
                  placeholder="What would you like to know?"
                  className="mt-1 mb-2"
                  rows={2}
                />
                <Label>Answer</Label>
                <Textarea
                  value={qna.answer}
                  onChange={e => handleManualQnAChange(idx, 'answer', e.target.value)}
                  placeholder="Type the answer here..."
                  className="mt-1"
                  rows={2}
                />
                {manualQuestions.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-red-600"
                    onClick={() => handleRemoveManualQnA(idx)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={handleAddManualQnA}>
              + Add another question
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateQuestionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitManualQnA} disabled={creatingQuestion}>
              {creatingQuestion ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Submit
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAnswerDialogOpen} onOpenChange={setIsAnswerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Answer Question</DialogTitle>
            <DialogDescription>
              {selectedQuestion?.text}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="answer-text">Your Answer</Label>
              <Button 
                onClick={() => selectedQuestion && handleGenerateAnswer(selectedQuestion.text)} 
                disabled={generatingAnswerFor === selectedQuestion?.text}
                variant="outline"
                size="sm"
              >
                {generatingAnswerFor === selectedQuestion?.text ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Generate with AI
              </Button>
            </div>
            <div>
              <Textarea
                id="answer-text"
                value={newAnswerText}
                onChange={(e) => setNewAnswerText(e.target.value)}
                placeholder="Provide a helpful answer..."
                className="mt-1"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAnswerDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAnswer} disabled={!newAnswerText.trim() || creatingAnswer}>
              {creatingAnswer ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Answer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditQuestionOpen} onOpenChange={setIsEditQuestionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
            <DialogDescription>
              Update your question text
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-question-text">Question</Label>
              <Textarea
                id="edit-question-text"
                value={editQuestionText}
                onChange={(e) => setEditQuestionText(e.target.value)}
                placeholder="Update your question..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditQuestionOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedQuestion && handleUpdateQuestion(selectedQuestion.name)} 
              disabled={!editQuestionText.trim() || (editingQuestion === selectedQuestion?.name)}
            >
              {editingQuestion === selectedQuestion?.name ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Update Question
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedQuestion && !isAnswerDialogOpen && !isEditQuestionOpen} onOpenChange={() => setSelectedQuestion(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Question & Answers</DialogTitle>
            <DialogDescription>
              {selectedQuestion?.text}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {loadingAnswers ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="p-4 border rounded-lg">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : answers.length > 0 ? (
              answers.map((answer, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <p className="text-sm mb-3">{answer.text}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={answer.author?.profilePhotoUri} />
                        <AvatarFallback>
                          {answer.author?.displayName?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span>{answer.author?.displayName || 'Anonymous'}</span>
                      {isBusinessAuthor(answer.author) && (
                        <Building className="h-3 w-3 text-blue-600" />
                      )}
                      <span>•</span>
                      <span>{format(new Date(answer.createTime), 'MMM d, yyyy')}</span>
                      {answer.upvoteCount !== undefined && (
                        <>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" />
                            <span>{answer.upvoteCount}</span>
                          </div>
                        </>
                      )}
                    </div>
                    {isBusinessAuthor(answer.author) && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => selectedQuestion && handleDeleteAnswer(selectedQuestion.name)}
                        disabled={deletingAnswer === selectedQuestion?.name}
                        className="text-red-600 hover:text-red-700"
                      >
                        {deletingAnswer === selectedQuestion?.name ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="inline-block h-8 w-8 opacity-20" />
                <p className="text-sm text-muted-foreground mt-2">
                  No answers yet for this question
                </p>
                <Button 
                  className="mt-3" 
                  size="sm"
                  onClick={() => {
                    setIsAnswerDialogOpen(true);
                  }}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Be the first to answer
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => selectedQuestion && handleAnswerQuestion(selectedQuestion)}
            >
              <Send className="h-4 w-4 mr-2" />
              Add Answer
            </Button>
            <Button variant="outline" onClick={() => setSelectedQuestion(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EnhancedGeneratedQnaDialog
        isOpen={showGeneratedQnA}
        onOpenChange={(open) => {
          setShowGeneratedQnA(open);
          if (!open) setGeneratedQnA([]); // Clear generated QnA when dialog closes
        }}
        generatedQna={generatedQnA}
        onScheduleAll={async () => {
          setShowGeneratedQnA(false);
          setGeneratedQnA([]);
          await loadScheduledQna();
        }}
        onClearAll={() => {
          setShowGeneratedQnA(false);
          setGeneratedQnA([]);
        }}
        userId={userId}
        locationId={locationName?.split('/').pop() || null}
        accountName={accountName || null}
      />

      {pendingDeleteQna && (
        <Dialog open={!!pendingDeleteQna} onOpenChange={() => setPendingDeleteQna(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this scheduled Q&A? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPendingDeleteQna(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => pendingDeleteQna && handleDeleteScheduledQna(pendingDeleteQna.id)}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}