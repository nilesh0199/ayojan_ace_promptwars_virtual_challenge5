'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  EventPlan,
  IntakeFormData,
  FollowUpResponse,
  ReplanRequest,
  ReplanDiffResponse,
  RiskRegister,
  VendorStatus,
  TimelineTask,
  eventPlanSchema,
} from '@/lib/schemas';
import { SAVED_EXAMPLES } from '@/data/savedExamples';
import { computePlanDiff, applyReplanDiff, PlanDiffView } from '@/lib/diff';
import { reflowTimelineDates } from '@/lib/timeline';
import { GeminiErrorCode, getFriendlyAiError } from '@/lib/gemini';
import { useAuth } from './auth-context';
import {
  saveUserPlan,
  savePlanVersion,
  getFriendlyFirestoreErrorMessage,
} from '@/lib/firebase/firestore';

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
  errorCode: GeminiErrorCode | null;
  retryLastAction: (() => Promise<void>) | null;
  followUp: FollowUpResponse | null;
  followUpCount: number;
  lastIntake: IntakeFormData | null;
  lastFollowUpAnswers: Array<{ questionId: string; answer: string }>;
  dateReflowNotice: string | null;
  guestPlanPrompt: EventPlan | null;
  importGuestPlan: () => Promise<void>;
  dismissGuestImport: () => void;
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
  updateTimelineTasks: (tasks: TimelineTask[]) => void;
  updateVendorStatus: (vendorId: string, status: VendorStatus) => void;
  updateEventDate: (newDate: string) => void;
  saveToCloud: () => Promise<boolean>;
  saveSuccessNotice: { message: string; link?: string } | null;
  clearSaveSuccessNotice: () => void;
  setActivePlan: (plan: EventPlan | null) => void;
  clearError: () => void;
  cancelGeneration: () => void;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'aayojan_ace_active_plan';
const LOCAL_STORAGE_HIST_KEY = 'aayojan_ace_plan_history';

export function PlanProvider({
  children,
  initialPlan = null,
}: {
  children: React.ReactNode;
  initialPlan?: EventPlan | null;
}) {
  const [activePlan, setActivePlanState] = useState<EventPlan | null>(initialPlan);
  const [planHistory, setPlanHistory] = useState<EventPlan[]>([]);
  const [activeRisks, setActiveRisks] = useState<RiskRegister | null>(null);
  const [pendingDiff, setPendingDiff] = useState<PlanDiffView | null>(null);
  const [rawDiffResponse, setRawDiffResponse] = useState<ReplanDiffResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReplanning, setIsReplanning] = useState(false);
  const [isLoadingRisks, setIsLoadingRisks] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<GeminiErrorCode | null>(null);
  const [retryLastAction, setRetryLastAction] = useState<(() => Promise<void>) | null>(null);
  const [followUp, setFollowUp] = useState<FollowUpResponse | null>(null);
  const [followUpCount, setFollowUpCount] = useState(0);
  const [lastIntake, setLastIntake] = useState<IntakeFormData | null>(null);
  const [lastFollowUpAnswers, setLastFollowUpAnswers] = useState<
    Array<{ questionId: string; answer: string }>
  >([]);
  const [dateReflowNotice, setDateReflowNotice] = useState<string | null>(null);
  const [guestPlanPrompt, setGuestPlanPrompt] = useState<EventPlan | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<{
    message: string;
    link?: string;
  } | null>(null);

  const { user, openSaveModal } = useAuth();
  const prevUserRef = useRef(user);
  const pendingCloudSaveRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setIsReplanning(false);
    setIsLoadingRisks(false);
  };

  // Load from local storage on mount (Guest Mode schema-validated)
  useEffect(() => {
    if (initialPlan) {
      setActivePlanState(initialPlan);
      return;
    }
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const validated = eventPlanSchema.safeParse(parsed);
        if (validated.success) {
          setActivePlanState(validated.data);
        }
      }
      const storedHist = localStorage.getItem(LOCAL_STORAGE_HIST_KEY);
      if (storedHist) {
        const parsedHist = JSON.parse(storedHist);
        if (Array.isArray(parsedHist)) setPlanHistory(parsedHist);
      }
    } catch {
      // Ignore corrupt storage
    }
  }, [initialPlan]);

  // Handle user state transitions: Sign-out wipe & Sign-in guest import detection
  useEffect(() => {
    const prevUser = prevUserRef.current;
    prevUserRef.current = user;

    // Transition: Signed out
    if (prevUser && !user) {
      setActivePlanState(null);
      setPlanHistory([]);
      setActiveRisks(null);
      setPendingDiff(null);
      setRawDiffResponse(null);
      setDateReflowNotice(null);
      setGuestPlanPrompt(null);
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        localStorage.removeItem(LOCAL_STORAGE_HIST_KEY);
      } catch {
        // Storage unavailable
      }
      return;
    }

    // Transition: Signed in
    if (!prevUser && user) {
      const hadPendingSave =
        pendingCloudSaveRef.current ||
        (typeof sessionStorage !== 'undefined' &&
          sessionStorage.getItem('pending_cloud_save') === 'true');

      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('pending_cloud_save');
      }
      pendingCloudSaveRef.current = false;

      if (hadPendingSave && activePlan) {
        // Automatically complete cloud save for the plan after sign-in
        const planToSave: EventPlan = {
          ...activePlan,
          id: activePlan.id.startsWith('sample-')
            ? (typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `plan_${Date.now()}`)
            : activePlan.id,
          isSavedExample: false,
          updatedAt: new Date().toISOString(),
        };

        saveUserPlan(user.uid, planToSave)
          .then(() => savePlanVersion(user.uid, planToSave.id, planToSave))
          .then(() => {
            setActivePlanState(planToSave);
            setSaveSuccessNotice({
              message: `Plan "${planToSave.title}" saved successfully to your cloud account!`,
              link: '/saved',
            });
          })
          .catch((err) => {
            setError(getFriendlyFirestoreErrorMessage(err));
          });
      } else {
        try {
          const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            const validated = eventPlanSchema.safeParse(parsed);
            if (validated.success && !validated.data.isSavedExample) {
              setGuestPlanPrompt(validated.data);
            }
          }
        } catch {
          // Ignore
        }
      }
    }
  }, [user, activePlan]);

  // Debounced auto-save to Firestore for signed-in users
  useEffect(() => {
    if (!user || !activePlan || activePlan.isSavedExample) return;

    const timer = setTimeout(async () => {
      try {
        await saveUserPlan(user.uid, activePlan);
      } catch {
        // Non-blocking auto-save failure
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [user, activePlan]);

  // Sync to local storage for guests
  const setActivePlan = useCallback((plan: EventPlan | null) => {
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
  }, []);

  const setMappedError = (
    errPayload: { code?: string; message?: string } | unknown,
    retryFn?: () => Promise<void>
  ) => {
    let resolvedCode: GeminiErrorCode = 'AI_BUSY';
    if (typeof errPayload === 'object' && errPayload !== null && 'code' in errPayload) {
      resolvedCode = ((errPayload as { code: string }).code as GeminiErrorCode) || 'AI_BUSY';
    }
    const friendly = getFriendlyAiError(resolvedCode);
    setError(friendly.message);
    setErrorCode(resolvedCode);
    if (retryFn) {
      setRetryLastAction(() => retryFn);
    }
  };

  const importGuestPlan = async () => {
    if (!user || !guestPlanPrompt) return;
    try {
      await saveUserPlan(user.uid, guestPlanPrompt);
      await savePlanVersion(user.uid, guestPlanPrompt.id, guestPlanPrompt);
      setActivePlanState(guestPlanPrompt);
      setGuestPlanPrompt(null);
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch {
        // Ignore
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import guest plan');
    }
  };

  const dismissGuestImport = () => {
    setGuestPlanPrompt(null);
  };

  const loadSavedExample = (key: string) => {
    setError(null);
    setErrorCode(null);
    setRetryLastAction(null);
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
    setErrorCode(null);
    setRetryLastAction(null);
    setLastIntake(intake);
    setFollowUp(null);
    setFollowUpCount(0);
    setLastFollowUpAnswers([]);
    abortControllerRef.current = new AbortController();

    try {
      // Step 1: Check if Gemini has an adaptive follow-up question
      const followUpRes = await fetch('/api/plan/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({ intake, previousFollowUpsCount: 0 }),
      });

      if (!followUpRes.ok) {
        const errJson = await followUpRes.json().catch(() => ({}));
        setMappedError(errJson, () => startPlanGeneration(intake));
        setIsLoading(false);
        return;
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
      if (err instanceof Error && err.name === 'AbortError') {
        setIsLoading(false);
        return;
      }
      setMappedError(err, () => startPlanGeneration(intake));
      setIsLoading(false);
    }
  };

  const submitFollowUp = async (answer: string) => {
    if (!lastIntake || !followUp) return;
    setIsLoading(true);
    setError(null);
    setErrorCode(null);
    setRetryLastAction(null);

    const answers = [
      ...lastFollowUpAnswers,
      { questionId: followUp.questionId || 'q1', answer },
    ];
    setLastFollowUpAnswers(answers);
    const currentFollowUp = followUp;
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
      setMappedError(err, () => {
        setFollowUp(currentFollowUp);
        return submitFollowUp(answer);
      });
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
        signal: abortControllerRef.current?.signal,
        body: JSON.stringify({ intake, followUpAnswers }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        setMappedError(errJson, () => triggerPlanGeneration(intake, followUpAnswers));
        return;
      }

      const generatedPlan: EventPlan = await res.json();
      setActivePlan(generatedPlan);
      setPlanHistory([]);
      setActiveRisks(null);

      // Save initial version to Firestore if authenticated
      if (user) {
        try {
          await saveUserPlan(user.uid, generatedPlan);
          await savePlanVersion(user.uid, generatedPlan.id, generatedPlan);
        } catch {
          // Non-blocking version save
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setIsLoading(false);
        return;
      }
      setMappedError(err, () => triggerPlanGeneration(intake, followUpAnswers));
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const requestReplan = async (changes: ReplanRequest['changes']) => {
    if (!activePlan) return;
    setIsReplanning(true);
    setError(null);
    setErrorCode(null);
    setRetryLastAction(null);

    try {
      const res = await fetch('/api/plan/replan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPlan: activePlan, changes }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        setMappedError(errJson, () => requestReplan(changes));
        return;
      }

      const diffRes: ReplanDiffResponse = await res.json();
      setRawDiffResponse(diffRes);
      const diffView = computePlanDiff(activePlan, diffRes, changes.totalBudget);
      setPendingDiff(diffView);
    } catch (err: unknown) {
      setMappedError(err, () => requestReplan(changes));
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

    // Save snapshot version to Firestore if user is authenticated
    if (user) {
      savePlanVersion(user.uid, updated.id, updated).catch(() => {});
    }
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
    setErrorCode(null);
    setRetryLastAction(null);

    try {
      const res = await fetch('/api/plan/risks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activePlan),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        setMappedError(errJson, () => generateRisks());
        return;
      }

      const risks: RiskRegister = await res.json();
      setActiveRisks(risks);
    } catch (err: unknown) {
      setMappedError(err, () => generateRisks());
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

  const updateTimelineTasks = (tasks: TimelineTask[]) => {
    if (!activePlan) return;
    setActivePlan({
      ...activePlan,
      timeline: tasks,
      updatedAt: new Date().toISOString(),
    });
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
      pendingCloudSaveRef.current = true;
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('pending_cloud_save', 'true');
      }
      openSaveModal();
      return false;
    }

    try {
      const planToSave: EventPlan = {
        ...activePlan,
        id: activePlan.id.startsWith('sample-')
          ? (typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `plan_${Date.now()}`)
          : activePlan.id,
        isSavedExample: false,
        updatedAt: new Date().toISOString(),
      };

      await saveUserPlan(user.uid, planToSave);
      await savePlanVersion(user.uid, planToSave.id, planToSave);
      setActivePlanState(planToSave);
      setSaveSuccessNotice({
        message: `Plan "${planToSave.title}" saved successfully to your cloud account!`,
        link: '/saved',
      });
      return true;
    } catch (err) {
      setError(getFriendlyFirestoreErrorMessage(err));
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
        errorCode,
        retryLastAction,
        followUp,
        followUpCount,
        lastIntake,
        lastFollowUpAnswers,
        dateReflowNotice,
        guestPlanPrompt,
        importGuestPlan,
        dismissGuestImport,
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
        updateTimelineTasks,
        updateVendorStatus,
        updateEventDate,
        saveToCloud,
        saveSuccessNotice,
        clearSaveSuccessNotice: () => setSaveSuccessNotice(null),
        setActivePlan,
        clearError: () => {
          setError(null);
          setErrorCode(null);
          setRetryLastAction(null);
        },
        cancelGeneration,
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
