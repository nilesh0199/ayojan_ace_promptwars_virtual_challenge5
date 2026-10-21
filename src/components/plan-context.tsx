'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  EventPlan,
  IntakeFormData,
  FollowUpResponse,
  ReplanRequest,
  ReplanDiffResponse,
  RiskRegister,
  VendorStatus,
} from '@/lib/schemas';
import { SAVED_EXAMPLES } from '@/data/savedExamples';
import { computePlanDiff, applyReplanDiff, PlanDiffView } from '@/lib/diff';
import { reflowTimelineDates } from '@/lib/timeline';
import { useAuth } from './auth-context';
import { saveUserPlan } from '@/lib/firebase/firestore';

interface PlanContextType {
  activePlan: EventPlan | null;
  planHistory: EventPlan[];
  activeRisks: RiskRegister | null;
  pendingDiff: PlanDiffView | null;
  rawDiffResponse: ReplanDiffResponse | null;
  isLoading: boolean;
  isReplanning: boolean;
  isLoadingRisks: boolean;
  error: string | null;
  followUp: FollowUpResponse | null;
  followUpCount: number;
  lastIntake: IntakeFormData | null;
  lastFollowUpAnswers: Array<{ questionId: string; answer: string }>;
  dateReflowNotice: string | null;
  loadSavedExample: (key: string) => void;
  startPlanGeneration: (intake: IntakeFormData) => Promise<void>;
  submitFollowUp: (answer: string) => Promise<void>;
  skipFollowUp: () => Promise<void>;
  requestReplan: (changes: ReplanRequest['changes']) => Promise<void>;
  acceptReplan: () => void;
  rejectReplan: () => void;
  undoReplan: () => void;
  generateRisks: () => Promise<void>;
  toggleTaskCompletion: (taskId: string) => void;
  updateVendorStatus: (vendorId: string, status: VendorStatus) => void;
  updateEventDate: (newDate: string) => void;
  saveToCloud: () => Promise<boolean>;
  setActivePlan: (plan: EventPlan | null) => void;
  clearError: () => void;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'aayojan_ace_active_plan';
const LOCAL_STORAGE_HIST_KEY = 'aayojan_ace_plan_history';

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [activePlan, setActivePlanState] = useState<EventPlan | null>(null);
  const [planHistory, setPlanHistory] = useState<EventPlan[]>([]);
  const [activeRisks, setActiveRisks] = useState<RiskRegister | null>(null);
  const [pendingDiff, setPendingDiff] = useState<PlanDiffView | null>(null);
  const [rawDiffResponse, setRawDiffResponse] = useState<ReplanDiffResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReplanning, setIsReplanning] = useState(false);
  const [isLoadingRisks, setIsLoadingRisks] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState<FollowUpResponse | null>(null);
  const [followUpCount, setFollowUpCount] = useState(0);
  const [lastIntake, setLastIntake] = useState<IntakeFormData | null>(null);
  const [lastFollowUpAnswers, setLastFollowUpAnswers] = useState<
    Array<{ questionId: string; answer: string }>
  >([]);
  const [dateReflowNotice, setDateReflowNotice] = useState<string | null>(null);

  const { user, openSaveModal } = useAuth();

  // Load from session storage / local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setActivePlanState(parsed);
      }
      const storedHist = localStorage.getItem(LOCAL_STORAGE_HIST_KEY);
      if (storedHist) {
        const parsedHist = JSON.parse(storedHist);
        if (Array.isArray(parsedHist)) setPlanHistory(parsedHist);
      }
    } catch {
      // Ignore corrupt storage
    }
  }, []);

  // Sync to local storage
  const setActivePlan = (plan: EventPlan | null) => {
    setActivePlanState(plan);
    try {
      if (plan) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(plan));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    } catch {
      // Storage unavailable
    }
  };

  const loadSavedExample = (key: string) => {
    setError(null);
    setPendingDiff(null);
    setActiveRisks(null);
    const example = SAVED_EXAMPLES[key];
    if (example) {
      setActivePlan(example);
      setPlanHistory([]);
    }
  };

  const startPlanGeneration = async (intake: IntakeFormData) => {
    setIsLoading(true);
    setError(null);
    setLastIntake(intake);
    setFollowUp(null);
    setFollowUpCount(0);
    setLastFollowUpAnswers([]);

    try {
      // Step 1: Check if Gemini has an adaptive follow-up question
      const followUpRes = await fetch('/api/plan/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intake, previousFollowUpsCount: 0 }),
      });

      if (!followUpRes.ok) {
        const errJson = await followUpRes.json().catch(() => ({}));
        throw new Error(errJson.message || 'AI service alert');
      }

      const followUpData: FollowUpResponse = await followUpRes.json();
      if (followUpData.needsFollowUp && followUpData.questionText) {
        setFollowUp(followUpData);
        setFollowUpCount(1);
        setIsLoading(false);
        return; // Pause for user input
      }

      // Step 2: Proceed immediately to plan generation
      await triggerPlanGeneration(intake, []);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to contact planning service. Please retry or try an example plan.'
      );
      setIsLoading(false);
    }
  };

  const submitFollowUp = async (answer: string) => {
    if (!lastIntake || !followUp) return;
    setIsLoading(true);
    setError(null);

    const answers = [
      ...lastFollowUpAnswers,
      { questionId: followUp.questionId || 'q1', answer },
    ];
    setLastFollowUpAnswers(answers);
    setFollowUp(null);

    try {
      // Check if second follow-up needed
      if (followUpCount < 2) {
        const followUpRes = await fetch('/api/plan/followup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            intake: lastIntake,
            previousFollowUpsCount: followUpCount,
          }),
        });

        if (followUpRes.ok) {
          const secondFollowUp: FollowUpResponse = await followUpRes.json();
          if (secondFollowUp.needsFollowUp && secondFollowUp.questionText) {
            setFollowUp(secondFollowUp);
            setFollowUpCount((prev) => prev + 1);
            setIsLoading(false);
            return;
          }
        }
      }

      await triggerPlanGeneration(lastIntake, answers);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error processing answer');
      setIsLoading(false);
    }
  };

  const skipFollowUp = async () => {
    if (!lastIntake) return;
    setFollowUp(null);
    setIsLoading(true);
    await triggerPlanGeneration(lastIntake, lastFollowUpAnswers);
  };

  const triggerPlanGeneration = async (
    intake: IntakeFormData,
    followUpAnswers: Array<{ questionId: string; answer: string }>
  ) => {
    try {
      const res = await fetch('/api/plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intake, followUpAnswers }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'AI service failed to generate plan');
      }

      const generatedPlan: EventPlan = await res.json();
      setActivePlan(generatedPlan);
      setPlanHistory([]);
      setActiveRisks(null);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'AI service is currently busy or unavailable. Please retry or choose a saved example.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const requestReplan = async (changes: ReplanRequest['changes']) => {
    if (!activePlan) return;
    setIsReplanning(true);
    setError(null);

    try {
      const res = await fetch('/api/plan/replan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPlan: activePlan, changes }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Replanning service failed');
      }

      const diffRes: ReplanDiffResponse = await res.json();
      setRawDiffResponse(diffRes);
      const diffView = computePlanDiff(activePlan, diffRes, changes.totalBudget);
      setPendingDiff(diffView);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to calculate replan diff');
    } finally {
      setIsReplanning(false);
    }
  };

  const acceptReplan = () => {
    if (!activePlan || !rawDiffResponse) return;
    // Push current plan onto history stack for undo
    setPlanHistory((prev) => [...prev, activePlan]);
    const updated = applyReplanDiff(activePlan, rawDiffResponse, pendingDiff?.newTotalBudget);
    setActivePlan(updated);
    setPendingDiff(null);
    setRawDiffResponse(null);
  };

  const rejectReplan = () => {
    setPendingDiff(null);
    setRawDiffResponse(null);
  };

  const undoReplan = () => {
    if (planHistory.length === 0) return;
    const previous = planHistory[planHistory.length - 1];
    setPlanHistory((prev) => prev.slice(0, prev.length - 1));
    setActivePlan(previous);
  };

  const generateRisks = async () => {
    if (!activePlan) return;
    setIsLoadingRisks(true);
    setError(null);

    try {
      const res = await fetch('/api/plan/risks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activePlan),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Risk assessment service failed');
      }

      const risks: RiskRegister = await res.json();
      setActiveRisks(risks);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate risk register');
    } finally {
      setIsLoadingRisks(false);
    }
  };

  const toggleTaskCompletion = (taskId: string) => {
    if (!activePlan) return;
    const updatedTasks = activePlan.timeline.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    setActivePlan({ ...activePlan, timeline: updatedTasks, updatedAt: new Date().toISOString() });
  };

  const updateVendorStatus = (vendorId: string, status: VendorStatus) => {
    if (!activePlan) return;
    const updatedVendors = activePlan.vendors.map((v) =>
      v.id === vendorId ? { ...v, status } : v
    );
    setActivePlan({ ...activePlan, vendors: updatedVendors, updatedAt: new Date().toISOString() });
  };

  const updateEventDate = (newDate: string) => {
    if (!activePlan) return;
    const reflow = reflowTimelineDates(activePlan.timeline, activePlan.date, newDate);
    setDateReflowNotice(reflow.summaryText);
    setActivePlan({
      ...activePlan,
      date: newDate,
      timeline: reflow.updatedTasks,
      updatedAt: new Date().toISOString(),
    });
  };

  const saveToCloud = async (): Promise<boolean> => {
    if (!activePlan) return false;
    if (!user) {
      openSaveModal();
      return false;
    }

    try {
      await saveUserPlan(user.uid, activePlan);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save plan to Firebase');
      return false;
    }
  };

  return (
    <PlanContext.Provider
      value={{
        activePlan,
        planHistory,
        activeRisks,
        pendingDiff,
        rawDiffResponse,
        isLoading,
        isReplanning,
        isLoadingRisks,
        error,
        followUp,
        followUpCount,
        lastIntake,
        lastFollowUpAnswers,
        dateReflowNotice,
        loadSavedExample,
        startPlanGeneration,
        submitFollowUp,
        skipFollowUp,
        requestReplan,
        acceptReplan,
        rejectReplan,
        undoReplan,
        generateRisks,
        toggleTaskCompletion,
        updateVendorStatus,
        updateEventDate,
        saveToCloud,
        setActivePlan,
        clearError: () => setError(null),
      }}
    >
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error('usePlan must be used within a PlanProvider');
  }
  return context;
}
