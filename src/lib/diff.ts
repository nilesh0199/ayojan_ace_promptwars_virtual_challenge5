import { EventPlan, ReplanDiffResponse, BudgetCategory, TimelineTask } from './schemas';

export interface CategoryDiff {
  id: string;
  name: string;
  oldTarget: number;
  newTarget: number;
  delta: number;
  oldMin: number;
  newMin: number;
  oldMax: number;
  newMax: number;
  notes: string;
}

export interface TaskDiff {
  id: string;
  title: string;
  oldDueDate: string;
  newDueDate: string;
  oldPhase: string;
  newPhase: string;
}

export interface PlanDiffView {
  summaryOfChanges: string;
  why: string;
  tradeOffOptions: string[];
  categoryDiffs: CategoryDiff[];
  taskDiffs: TaskDiff[];
  oldContingencyPercent: number;
  newContingencyPercent: number;
  oldTotalBudget: number;
  newTotalBudget: number;
}

/**
 * Computes a detailed before-and-after comparison between the current plan and proposed replan items.
 */
export function computePlanDiff(
  currentPlan: EventPlan,
  diff: ReplanDiffResponse,
  newTotalBudgetOverride?: number
): PlanDiffView {
  const categoryDiffs: CategoryDiff[] = diff.affectedBudgetCategories.map((newCat) => {
    const existing = currentPlan.budget.categories.find((c) => c.id === newCat.id);
    const oldTarget = existing ? existing.targetEstimate : 0;
    const oldMin = existing ? existing.minEstimate : 0;
    const oldMax = existing ? existing.maxEstimate : 0;

    return {
      id: newCat.id,
      name: newCat.name,
      oldTarget,
      newTarget: newCat.targetEstimate,
      delta: newCat.targetEstimate - oldTarget,
      oldMin,
      newMin: newCat.minEstimate,
      oldMax,
      newMax: newCat.maxEstimate,
      notes: newCat.notes || existing?.notes || '',
    };
  });

  const taskDiffs: TaskDiff[] = diff.affectedTimelineTasks.map((newTask) => {
    const existing = currentPlan.timeline.find((t) => t.id === newTask.id);
    return {
      id: newTask.id,
      title: newTask.title,
      oldDueDate: existing ? existing.dueDate : newTask.dueDate,
      newDueDate: newTask.dueDate,
      oldPhase: existing ? existing.phase : newTask.phase,
      newPhase: newTask.phase,
    };
  });

  return {
    summaryOfChanges: diff.summaryOfChanges,
    why: diff.why,
    tradeOffOptions: diff.tradeOffOptions,
    categoryDiffs,
    taskDiffs,
    oldContingencyPercent: currentPlan.budget.contingencyPercent,
    newContingencyPercent: diff.newContingencyPercent ?? currentPlan.budget.contingencyPercent,
    oldTotalBudget: currentPlan.totalBudget,
    newTotalBudget: newTotalBudgetOverride ?? currentPlan.totalBudget,
  };
}

/**
 * Merges the approved replan diff into the active plan, creating an immutable next version.
 */
export function applyReplanDiff(
  currentPlan: EventPlan,
  diff: ReplanDiffResponse,
  budgetOverride?: number
): EventPlan {
  // Update budget categories
  const categoryMap = new Map<string, BudgetCategory>(
    currentPlan.budget.categories.map((c) => [c.id, c])
  );
  for (const cat of diff.affectedBudgetCategories) {
    categoryMap.set(cat.id, cat);
  }

  // Update timeline tasks
  const taskMap = new Map<string, TimelineTask>(
    currentPlan.timeline.map((t) => [t.id, t])
  );
  for (const task of diff.affectedTimelineTasks) {
    const existing = taskMap.get(task.id);
    taskMap.set(task.id, {
      ...task,
      completed: existing ? existing.completed : task.completed,
    });
  }

  const updatedBudget = {
    ...currentPlan.budget,
    categories: Array.from(categoryMap.values()),
    contingencyPercent:
      diff.newContingencyPercent !== undefined
        ? diff.newContingencyPercent
        : currentPlan.budget.contingencyPercent,
  };

  return {
    ...currentPlan,
    totalBudget: budgetOverride ?? currentPlan.totalBudget,
    budget: updatedBudget,
    timeline: Array.from(taskMap.values()),
    version: currentPlan.version + 1,
    updatedAt: new Date().toISOString(),
  };
}
