import { IncidentContext } from './incident-correlation-types';
import {
  IncidentEscalationLevel,
  IncidentEscalationResult,
  IncidentSeverityEvaluator,
} from './incident-severity-types';

export interface IncidentSeverityThresholds {
  readonly mediumMinScore: number;
  readonly highMinScore: number;
  readonly criticalMinScore: number;
}

interface IncidentSeverityEvaluatorOptions {
  readonly now?: () => number;
  readonly thresholds?: Partial<IncidentSeverityThresholds>;
  readonly lowConfidenceCutoff?: number;
  readonly highConfidenceCutoff?: number;
}

const DEFAULT_THRESHOLDS: IncidentSeverityThresholds = {
  mediumMinScore: 2.5,
  highMinScore: 4.0,
  criticalMinScore: 6.0,
};

const DEFAULT_LOW_CONFIDENCE_CUTOFF = 0.4;
const DEFAULT_HIGH_CONFIDENCE_CUTOFF = 0.9;

export class InMemoryIncidentSeverityEvaluator implements IncidentSeverityEvaluator {
  private readonly now: () => number;
  private readonly thresholds: IncidentSeverityThresholds;
  private readonly lowConfidenceCutoff: number;
  private readonly highConfidenceCutoff: number;

  constructor(options: IncidentSeverityEvaluatorOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.thresholds = {
      ...DEFAULT_THRESHOLDS,
      ...(options.thresholds ?? {}),
    };
    this.lowConfidenceCutoff = options.lowConfidenceCutoff ?? DEFAULT_LOW_CONFIDENCE_CUTOFF;
    this.highConfidenceCutoff = options.highConfidenceCutoff ?? DEFAULT_HIGH_CONFIDENCE_CUTOFF;
  }

  evaluate(incident: IncidentContext): IncidentEscalationResult {
    const detections = incident.detections;
    const detectionCount = detections.length;

    if (detectionCount === 0) {
      return {
        incidentId: incident.incidentId,
        escalationLevel: IncidentEscalationLevel.NONE,
        reasons: ['No detections are attached to this incident.'],
        confidence: 0,
        recommendedActions: ['Continue monitoring incident telemetry.'],
        evaluatedAt: new Date(this.now()).toISOString(),
      };
    }

    const maxConfidence = detections.reduce((max, detection) => Math.max(max, detection.confidence), 0);
    const averageConfidence = detections.reduce((sum, detection) => sum + detection.confidence, 0) / detectionCount;
    const detectorDiversity = new Set(detections.map((detection) => detection.detectorId)).size;

    const score = this.calculateScore(detectionCount, maxConfidence, detectorDiversity);
    const escalationLevel = this.resolveEscalationLevel(score);

    return {
      incidentId: incident.incidentId,
      escalationLevel,
      reasons: this.buildReasons(detectionCount, maxConfidence, detectorDiversity, score, escalationLevel),
      confidence: this.normalizeConfidence(averageConfidence, maxConfidence),
      recommendedActions: this.buildRecommendedActions(escalationLevel),
      evaluatedAt: new Date(this.now()).toISOString(),
    };
  }

  private calculateScore(detectionCount: number, maxConfidence: number, detectorDiversity: number): number {
    const detectionFactor = Math.min(detectionCount * 0.8, 4);
    const confidenceFactor = maxConfidence * 2;
    const diversityFactor = Math.min(detectorDiversity, 4) * 0.5;

    return detectionFactor + confidenceFactor + diversityFactor;
  }

  private resolveEscalationLevel(score: number): IncidentEscalationLevel {
    if (score >= this.thresholds.criticalMinScore) {
      return IncidentEscalationLevel.CRITICAL;
    }

    if (score >= this.thresholds.highMinScore) {
      return IncidentEscalationLevel.HIGH;
    }

    if (score >= this.thresholds.mediumMinScore) {
      return IncidentEscalationLevel.MEDIUM;
    }

    return IncidentEscalationLevel.LOW;
  }

  private buildReasons(
    detectionCount: number,
    maxConfidence: number,
    detectorDiversity: number,
    score: number,
    escalationLevel: IncidentEscalationLevel,
  ): readonly string[] {
    const reasons: string[] = [
      `Detection count factor: ${detectionCount}.`,
      `Maximum detector confidence factor: ${maxConfidence.toFixed(2)}.`,
      `Detector diversity factor: ${detectorDiversity}.`,
      `Escalation score: ${score.toFixed(2)}.`,
      `Escalation level resolved to ${escalationLevel}.`,
    ];

    if (maxConfidence >= this.highConfidenceCutoff) {
      reasons.push('High-confidence detection(s) increased severity.');
    } else if (maxConfidence <= this.lowConfidenceCutoff) {
      reasons.push('Low-confidence profile constrained escalation.');
    }

    if (detectorDiversity > 1) {
      reasons.push('Multiple detector families observed on the same incident.');
    }

    if (detectionCount >= 3) {
      reasons.push('Repeated related detections increased escalation pressure.');
    }

    return reasons;
  }

  private normalizeConfidence(averageConfidence: number, maxConfidence: number): number {
    const weighted = (averageConfidence * 0.6) + (maxConfidence * 0.4);
    return Number(Math.min(1, Math.max(0, weighted)).toFixed(4));
  }

  private buildRecommendedActions(level: IncidentEscalationLevel): readonly string[] {
    switch (level) {
      case IncidentEscalationLevel.NONE:
        return ['Continue monitoring incident telemetry.'];
      case IncidentEscalationLevel.LOW:
        return ['Increase observation frequency for this actor and guild.'];
      case IncidentEscalationLevel.MEDIUM:
        return [
          'Notify on-call responders with correlated incident evidence.',
          'Prioritize triage for the affected guild scope.',
        ];
      case IncidentEscalationLevel.HIGH:
        return [
          'Open a priority incident response workflow for immediate investigation.',
          'Capture additional forensic context for all related detections.',
        ];
      case IncidentEscalationLevel.CRITICAL:
        return [
          'Escalate to incident commander with critical urgency.',
          'Activate continuous monitoring and forensic evidence preservation.',
        ];
      default:
        return ['Continue monitoring incident telemetry.'];
    }
  }
}
