'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  isIntakeUnclear,
} from '@/lib/schemas';
import { SAVED_EXAMPLES, SAVED_EXAMPLE_RISKS } from '@/data/savedExamples';
import { getPreparedPlan } from '@/data/preparedPlans';
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
  retryLastAction: (() => Promise<void | boolean>) | null;
  followUp: FollowUpResponse | null;
  followUpCount: number;
  lastIntake: IntakeFormData | null;
  lastFollowUpAnswers: Array<{ questionId: string; answer: string }>;
  dateReflowNotice: string | null;
  guestPlanPrompt: EventPlan | null;
  importGuestPlan: () => Promise<void>;
  dismissGuestImport: () => void;
  loadSavedExample: (key: string, userDate?: string) => void;
  loadPreparedPlan: (plan: EventPlan, risks: RiskRegister) => void;
  startPlanGeneration: (intake: IntakeFormData) => Promise<boolean>;
  submitFollowUp: (answer: string) => Promise<boolean>;
  skipFollowUp: () => Promise<boolean>;
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

export const FOLLOWUP_TIMEOUT_MS = 3500;

/**
 * Robust non-blocking helper for adaptive follow-up questions.
 * Enforces a short timeout and catches any network error, HTTP error, or malformed JSON,
 * returning null so generation proceeds straight to plan creation without interruption.
 */
export async function fetchFollowUpNonBlocking(
  payload: { intake: IntakeFormData; previousFollowUpsCount: number },
  userAbortSignal?: AbortSignal
): Promise<FollowUpResponse | null> {
  if (userAbortSignal?.aborted) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, FOLLOWUP_TIMEOUT_MS);

  const onUserAbort = () => {
    controller.abort();
  };

  if (userAbortSignal) {
    userAbortSignal.addEventListener('abort', onUserAbort, { once: true });
  }

  try {
    const res = await fetch('/api/plan/followup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return null;
    }

    const data: FollowUpResponse = await res.json();
    return data;
  } catch {
    // Non-blocking: catch network/fetch errors, timeouts, aborts, JSON errors
    return null;
  } finally {
    clearTimeout(timeoutId);
    if (userAbortSignal) {
      userAbortSignal.removeEventListener('abort', onUserAbort);
    }
  }
}

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
  const [retryLastAction, setRetryLastAction] = useState<(() => Promise<void | boolean>) | null>(null);
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

  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setIsReplanning(false);
    setIsLoadingRisks(false);
  }, []);

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

  const activePlanRef = useRef<EventPlan | null>(activePlan);
  activePlanRef.current = activePlan;

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

      const currentActive = activePlanRef.current;
      if (hadPendingSave && currentActive) {
        // Automatically complete cloud save for the plan after sign-in
        const planToSave: EventPlan = {
          ...currentActive,
          id: currentActive.id.startsWith('sample-')
            ? (typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `plan_${Date.now()}`)
            : currentActive.id,
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
  }, [user]);

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
    errPayload: { code?: string; message?: string; retryAfterSeconds?: number; status?: number; statusCode?: number; error?: string } | unknown,
    retryFn?: () => Promise<void | boolean>
  ) => {
    let resolvedCode: GeminiErrorCode = 'AI_ERROR';
    let rateLimitSeconds: number | null = null;

    if (typeof errPayload === 'string') {
      resolvedCode = (errPayload as GeminiErrorCode);
    } else if (typeof errPayload === 'object' && errPayload !== null) {
      const obj = errPayload as Record<string, unknown>;
      if (typeof obj.retryAfterSeconds === 'number' && obj.retryAfterSeconds > 0) {
        rateLimitSeconds = obj.retryAfterSeconds;
      }
      if (typeof obj.code === 'string' && obj.code.length > 0) {
        if (obj.code === 'RATE_LIMIT_EXCEEDED') {
          resolvedCode = 'AI_BUSY';
        } else {
          resolvedCode = obj.code as GeminiErrorCode;
        }
      } else {
        const rawStatus = obj.status ?? obj.statusCode;
        const status = typeof rawStatus === 'number' ? rawStatus : Number(rawStatus || 0);
        const rawMsg = String(
          obj.message || obj.error || (obj instanceof Error ? obj.message : '')
        ).toLowerCase();

        if (
          rawMsg.includes('failed to fetch') ||
          rawMsg.includes('fetch failed') ||
          rawMsg.includes('network') ||
          rawMsg.includes('econnrefused') ||
          rawMsg.includes('enotfound') ||
          rawMsg.includes('offline')
        ) {
          resolvedCode = 'AI_NETWORK_ERROR';
        } else if (
          status === 504 ||
          rawMsg.includes('hosting') ||
          rawMsg.includes('execution budget') ||
          rawMsg.includes('function_invocation_timeout')
        ) {
          resolvedCode = 'HOSTING_TIMEOUT';
        } else if (
          status === 408 ||
          rawMsg.includes('timeout') ||
          rawMsg.includes('timed out') ||
          rawMsg.includes('deadline exceeded')
        ) {
          resolvedCode = 'AI_TIMEOUT';
        } else if (
          status === 401 ||
          status === 403 ||
          rawMsg.includes('invalid key') ||
          rawMsg.includes('api_key_invalid') ||
          rawMsg.includes('unauthorized') ||
          rawMsg.includes('forbidden')
        ) {
          resolvedCode = 'AI_INVALID_KEY';
        } else if (
          status === 404 ||
          rawMsg.includes('not found') ||
          rawMsg.includes('does not exist') ||
          rawMsg.includes('unknown model')
        ) {
          resolvedCode = 'AI_MODEL_NOT_FOUND';
        } else if (
          status === 400 ||
          status === 422 ||
          status === 502 ||
          rawMsg.includes('validation') ||
          rawMsg.includes('format') ||
          rawMsg.includes('schema') ||
          rawMsg.includes('malformed')
        ) {
          resolvedCode = 'AI_VALIDATION_FAILED';
        } else if (
          status === 429 ||
          status === 503 ||
          rawMsg.includes('busy') ||
          rawMsg.includes('quota') ||
          rawMsg.includes('overload') ||
          rawMsg.includes('high demand') ||
          rawMsg.includes('rate limit') ||
          rawMsg.includes('resource_exhausted')
        ) {
          resolvedCode = 'AI_BUSY';
        }
      }
    }
    const friendly = getFriendlyAiError(resolvedCode);
    let finalMessage = friendly.message;
    if (rateLimitSeconds) {
      finalMessage = `Rate limit reached. Please wait ${rateLimitSeconds} seconds before requesting another plan.`;
    }
    setError(finalMessage);
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

  const dismissGuestImport = useCallback(() => {
    setGuestPlanPrompt(null);
  }, []);

  const loadSavedExample = useCallback(
    (key: string, userDate?: string) => {
      setError(null);
      setErrorCode(null);
      setRetryLastAction(null);
      setPendingDiff(null);
      const prepared = getPreparedPlan(key, userDate);
      if (prepared) {
        setActivePlan(prepared.plan);
        setActiveRisks(prepared.risks);
        setPlanHistory([]);
        return;
      }
      const example = SAVED_EXAMPLES[key];
      if (example) {
        setActivePlan(example);
        const risks = SAVED_EXAMPLE_RISKS[key] || null;
        setActiveRisks(risks);
        setPlanHistory([]);
      }
    },
    [setActivePlan]
  );

  const loadPreparedPlan = useCallback(
    (plan: EventPlan, risks: RiskRegister) => {
      setError(null);
      setErrorCode(null);
      setRetryLastAction(null);
      setPendingDiff(null);
      setActivePlan(plan);
      setActiveRisks(risks);
      setPlanHistory([]);
    },
    [setActivePlan]
  );

  const startPlanGeneration = async (intake: IntakeFormData): Promise<boolean> => {
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
      // Step 1: Check if intake is genuinely unclear before calling follow-up (saves AI requests)
      if (isIntakeUnclear(intake)) {
        const followUpData = await fetchFollowUpNonBlocking(
          { intake, previousFollowUpsCount: 0 },
          abortControllerRef.current.signal
        );

        // Check if user explicitly cancelled during the follow-up check
        if (abortControllerRef.current?.signal.aborted) {
          setIsLoading(false);
          return false;
        }

        if (followUpData?.needsFollowUp && followUpData.questionText) {
          setFollowUp(followUpData);
          setFollowUpCount(1);
          setIsLoading(false);
          return false; // Pause for user input — not a failure, but not ready to navigate
        }
      }

      // Step 2: Proceed immediately to plan generation (single AI call when intake is clear)
      return await triggerPlanGeneration(intake, []);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setIsLoading(false);
        return false;
      }
      setMappedError(err, () => startPlanGeneration(intake));
      setIsLoading(false);
      return false;
    }
  };

  const submitFollowUp = async (answer: string): Promise<boolean> => {
    if (!lastIntake || !followUp) return false;
    setIsLoading(true);
    setError(null);
    setErrorCode(null);
    setRetryLastAction(null);

    const answers = [
      ...lastFollowUpAnswers,
      { questionId: followUp.questionId || 'q1', answer },
    ];
    setLastFollowUpAnswers(answers);
    setFollowUp(null);

    abortControllerRef.current = new AbortController();

    try {
      // Check if second follow-up needed (strictly non-blocking with short timeout)
      let secondFollowUp: FollowUpResponse | null = null;
      if (followUpCount < 2) {
        secondFollowUp = await fetchFollowUpNonBlocking(
          { intake: lastIntake, previousFollowUpsCount: followUpCount },
          abortControllerRef.current.signal
        );
      }

      // Check if user explicitly cancelled during the second follow-up check
      if (abortControllerRef.current?.signal.aborted) {
        setIsLoading(false);
        return false;
      }

      if (secondFollowUp?.needsFollowUp && secondFollowUp.questionText) {
        setFollowUp(secondFollowUp);
        setFollowUpCount((prev) => prev + 1);
        setIsLoading(false);
        return false; // Pause for user input — not a failure, but not ready to navigate
      }

      return await triggerPlanGeneration(lastIntake, answers);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setIsLoading(false);
        return false;
      }
      setMappedError(err, () => triggerPlanGeneration(lastIntake, answers));
      setIsLoading(false);
      return false;
    }
  };

  const skipFollowUp = async (): Promise<boolean> => {
    if (!lastIntake) return false;
    setFollowUp(null);
    setIsLoading(true);
    return await triggerPlanGeneration(lastIntake, lastFollowUpAnswers);
  };

  const triggerPlanGeneration = async (
    intake: IntakeFormData,
    followUpAnswers: Array<{ questionId: string; answer: string }>
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current?.signal,
        body: JSON.stringify({ intake, followUpAnswers }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        setMappedError({ ...errJson, status: res.status }, () =>
          triggerPlanGeneration(intake, followUpAnswers)
        );
        return false;
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
      return true;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setIsLoading(false);
        return false;
      }
      setMappedError(err, () => triggerPlanGeneration(intake, followUpAnswers));
      return false;
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
        setMappedError({ ...errJson, status: res.status }, () => requestReplan(changes));
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

  const rejectReplan = useCallback(() => {
    setPendingDiff(null);
    setRawDiffResponse(null);
  }, []);

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
        setMappedError({ ...errJson, status: res.status }, () => generateRisks());
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

  const toggleTaskCompletion = useCallback((taskId: string) => {
    setActivePlanState((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        timeline: prev.timeline.map((t) =>
          t.id === taskId ? { ...t, completed: !t.completed } : t
        ),
        updatedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Storage unavailable
      }
      return updated;
    });
  }, []);

  const updateTimelineTasks = useCallback((tasks: TimelineTask[]) => {
    setActivePlanState((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        timeline: tasks,
        updatedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Storage unavailable
      }
      return updated;
    });
  }, []);

  const updateVendorStatus = useCallback((vendorId: string, status: VendorStatus) => {
    setActivePlanState((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        vendors: prev.vendors.map((v) =>
          v.id === vendorId ? { ...v, status } : v
        ),
        updatedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Storage unavailable
      }
      return updated;
    });
  }, []);

  const updateEventDate = useCallback((newDate: string) => {
    setActivePlanState((prev) => {
      if (!prev) return null;
      const reflow = reflowTimelineDates(prev.timeline, prev.date, newDate);
      setDateReflowNotice(reflow.summaryText);
      const updated = {
        ...prev,
        date: newDate,
        timeline: reflow.updatedTasks,
        updatedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Storage unavailable
      }
      return updated;
    });
  }, []);

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

  const clearSaveSuccessNotice = useCallback(() => {
    setSaveSuccessNotice(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setErrorCode(null);
    setRetryLastAction(null);
  }, []);

  const contextValue = useMemo<PlanContextType>(
    () => ({
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
      loadPreparedPlan,
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
      clearSaveSuccessNotice,
      setActivePlan,
      clearError,
      cancelGeneration,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
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
      dismissGuestImport,
      loadSavedExample,
      loadPreparedPlan,
      toggleTaskCompletion,
      updateTimelineTasks,
      updateVendorStatus,
      updateEventDate,
      saveSuccessNotice,
      clearSaveSuccessNotice,
      setActivePlan,
      clearError,
      cancelGeneration,
    ]
  );

  return (
    <PlanContext.Provider value={contextValue}>
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
