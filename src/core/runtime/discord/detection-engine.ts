import { DiscordGatewayNormalizedEvent } from './pipeline-types';
import { SecurityActionType as SecurityPolicyActionType } from './security-policy-types';

export enum DetectionSeverity {
  INFO = 'INFO',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum DetectionConfidence {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CERTAIN = 'CERTAIN',
}

export enum DetectionDisposition {
  CLEAN = 'CLEAN',
  SUSPICIOUS = 'SUSPICIOUS',
  MALICIOUS = 'MALICIOUS',
  UNKNOWN = 'UNKNOWN',
}

export interface DetectionContext {
  readonly normalizedEvent: DiscordGatewayNormalizedEvent;
  readonly actorId: string;
  readonly guildId: string;
  readonly actionType: SecurityPolicyActionType;
  readonly correlationId: string;
  readonly timestamp: string;
  readonly metadata?: Record<string, unknown>;
}

export interface DetectionFinding {
  readonly detectorId: string;
  readonly severity: DetectionSeverity;
  readonly confidence: DetectionConfidence;
  readonly disposition: DetectionDisposition;
  readonly reason: string;
  readonly correlationId: string;
  readonly metadata?: Record<string, unknown>;
}

export interface DetectionResult {
  readonly detectorId: string;
  readonly matched: boolean;
  readonly findings: readonly DetectionFinding[];
  readonly correlationId: string;
  readonly metadata?: Record<string, unknown>;
}

export interface SecurityDetector {
  readonly detectorId: string;
  readonly supportedActionTypes: readonly SecurityPolicyActionType[];
  evaluate(context: DetectionContext): Promise<DetectionResult>;
}

export interface DetectionEngine {
  evaluate(context: DetectionContext, detectors: readonly SecurityDetector[]): Promise<readonly DetectionResult[]>;
}

export class InMemoryDetectionEngine implements DetectionEngine {
  async evaluate(context: DetectionContext, detectors: readonly SecurityDetector[]): Promise<readonly DetectionResult[]> {
    const orderedDetectors = this.orderDetectors(detectors);
    const results: DetectionResult[] = [];
    const executedDetectorIds = new Set<string>();

    for (const detector of orderedDetectors) {
      if (executedDetectorIds.has(detector.detectorId)) {
        continue;
      }

      if (!detector.supportedActionTypes.includes(context.actionType)) {
        continue;
      }

      executedDetectorIds.add(detector.detectorId);

      try {
        const result = await detector.evaluate(context);
        results.push(this.freezeResult(result));
      } catch (error) {
        results.push(
          this.freezeResult({
            detectorId: detector.detectorId,
            matched: false,
            findings: [
              {
                detectorId: detector.detectorId,
                severity: DetectionSeverity.INFO,
                confidence: DetectionConfidence.LOW,
                disposition: DetectionDisposition.UNKNOWN,
                reason: error instanceof Error ? error.message : 'Unknown detector evaluation error',
                correlationId: context.correlationId,
                metadata: {
                  safelyHandled: true,
                  isolatedFailure: true,
                },
              },
            ],
            correlationId: context.correlationId,
            metadata: {
              safelyHandled: true,
              isolatedFailure: true,
            },
          }),
        );
      }
    }

    return Object.freeze(results);
  }

  private orderDetectors(detectors: readonly SecurityDetector[]): readonly SecurityDetector[] {
    return [...detectors].sort((left, right) => left.detectorId.localeCompare(right.detectorId));
  }

  private freezeResult(result: DetectionResult): DetectionResult {
    return Object.freeze({
      detectorId: result.detectorId,
      matched: result.matched,
      findings: Object.freeze(
        result.findings.map((finding) =>
          Object.freeze({
            detectorId: finding.detectorId,
            severity: finding.severity,
            confidence: finding.confidence,
            disposition: finding.disposition,
            reason: finding.reason,
            correlationId: finding.correlationId,
            metadata: finding.metadata ? Object.freeze({ ...finding.metadata }) : undefined,
          }),
        ),
      ),
      correlationId: result.correlationId,
      metadata: result.metadata ? Object.freeze({ ...result.metadata }) : undefined,
    });
  }
}