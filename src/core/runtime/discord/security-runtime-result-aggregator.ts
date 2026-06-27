import { SecurityRuntimeResult } from './security-runtime-orchestrator';
import { ExecutionState } from './security-execution-types';

export interface RuntimeExecutionSummary {
  readonly correlationId: string;
  readonly totalActions: number;
  readonly successCount: number;
  readonly failedCount: number;
  readonly deniedCount: number;
  readonly skippedCount: number;
  readonly dryRunCount: number;
  readonly executedCount: number;
  readonly finalState: ExecutionState;
  readonly processedAt: string;
  readonly metadata?: Record<string, unknown>;
}

export interface RuntimeResultAggregator {
  aggregate(runtimeResult: SecurityRuntimeResult): RuntimeExecutionSummary;
}

export class InMemoryRuntimeResultAggregator implements RuntimeResultAggregator {
  aggregate(runtimeResult: SecurityRuntimeResult): RuntimeExecutionSummary {
    const counts = this.countExecutionResults(runtimeResult);

    return Object.freeze({
      correlationId: runtimeResult.correlationId,
      totalActions: runtimeResult.executionResults.length,
      successCount: counts.successCount,
      failedCount: counts.failedCount,
      deniedCount: counts.deniedCount,
      skippedCount: counts.skippedCount,
      dryRunCount: counts.dryRunCount,
      executedCount: counts.executedCount,
      finalState: this.resolveFinalState(counts),
      processedAt: new Date().toISOString(),
      metadata: Object.freeze({
        aggregator: 'in-memory-runtime-result-aggregator',
        correlationId: runtimeResult.correlationId,
        ...(runtimeResult.metadata ?? {}),
      }),
    });
  }

  private countExecutionResults(runtimeResult: SecurityRuntimeResult): {
    successCount: number;
    failedCount: number;
    deniedCount: number;
    skippedCount: number;
    dryRunCount: number;
    executedCount: number;
  } {
    return runtimeResult.executionResults.reduce(
      (counts, executionResult) => {
        switch (executionResult.state) {
          case ExecutionState.SUCCESS:
            return {
              ...counts,
              successCount: counts.successCount + 1,
              executedCount: counts.executedCount + 1,
            };
          case ExecutionState.FAILED:
            return {
              ...counts,
              failedCount: counts.failedCount + 1,
            };
          case ExecutionState.DENIED:
            return {
              ...counts,
              deniedCount: counts.deniedCount + 1,
            };
          case ExecutionState.SKIPPED:
            return {
              ...counts,
              skippedCount: counts.skippedCount + 1,
            };
          case ExecutionState.DRY_RUN:
            return {
              ...counts,
              dryRunCount: counts.dryRunCount + 1,
            };
          default:
            return {
              ...counts,
              skippedCount: counts.skippedCount + 1,
            };
        }
      },
      {
        successCount: 0,
        failedCount: 0,
        deniedCount: 0,
        skippedCount: 0,
        dryRunCount: 0,
        executedCount: 0,
      },
    );
  }

  private resolveFinalState(counts: {
    failedCount: number;
    deniedCount: number;
    skippedCount: number;
    dryRunCount: number;
  }): ExecutionState {
    if (counts.failedCount > 0) {
      return ExecutionState.FAILED;
    }

    if (counts.deniedCount > 0) {
      return ExecutionState.DENIED;
    }

    if (counts.dryRunCount > 0) {
      return ExecutionState.DRY_RUN;
    }

    if (counts.skippedCount > 0) {
      return ExecutionState.SKIPPED;
    }

    return ExecutionState.SUCCESS;
  }
}