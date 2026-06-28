import {
  DetectionConfidence,
  DetectionDisposition,
  DetectionFinding,
  DetectionResult,
  DetectionSeverity,
} from './detection-engine';
import {
  MetadataRuntimeThreatInterpreter,
  RuntimeThreatOverride,
  RuntimeThreatOverrideType,
} from './runtime-threat-interpretation';

export interface ThreatAssessment {
  readonly severity: DetectionSeverity;
  readonly confidence: DetectionConfidence;
  readonly disposition: DetectionDisposition;
  readonly rationale: string;
  readonly correlationIds: readonly string[];
  readonly overrides: readonly RuntimeThreatOverride[];
}

export interface RuntimeThreatInterpretationEngine {
  assess(detectionResults: readonly DetectionResult[]): ThreatAssessment;
}

const DISPOSITION_RANK: Readonly<Record<DetectionDisposition, number>> = Object.freeze({
  [DetectionDisposition.CLEAN]: 0,
  [DetectionDisposition.UNKNOWN]: 1,
  [DetectionDisposition.SUSPICIOUS]: 2,
  [DetectionDisposition.MALICIOUS]: 3,
});

const SEVERITY_RANK: Readonly<Record<DetectionSeverity, number>> = Object.freeze({
  [DetectionSeverity.INFO]: 0,
  [DetectionSeverity.LOW]: 1,
  [DetectionSeverity.MEDIUM]: 2,
  [DetectionSeverity.HIGH]: 3,
  [DetectionSeverity.CRITICAL]: 4,
});

const CONFIDENCE_RANK: Readonly<Record<DetectionConfidence, number>> = Object.freeze({
  [DetectionConfidence.LOW]: 0,
  [DetectionConfidence.MEDIUM]: 1,
  [DetectionConfidence.HIGH]: 2,
  [DetectionConfidence.CERTAIN]: 3,
});

const EMPTY_ASSESSMENT: ThreatAssessment = Object.freeze({
  severity: DetectionSeverity.INFO,
  confidence: DetectionConfidence.LOW,
  disposition: DetectionDisposition.CLEAN,
  rationale: 'No detection findings were produced',
  correlationIds: Object.freeze([]),
  overrides: Object.freeze([]),
});

export class InMemoryRuntimeThreatInterpretationEngine implements RuntimeThreatInterpretationEngine {
  constructor(
    private readonly threatInterpreter: MetadataRuntimeThreatInterpreter = new MetadataRuntimeThreatInterpreter(),
  ) {}

  assess(detectionResults: readonly DetectionResult[]): ThreatAssessment {
    if (!Array.isArray(detectionResults) || detectionResults.length === 0) {
      return EMPTY_ASSESSMENT;
    }

    const findings: readonly DetectionFinding[] = detectionResults.flatMap((result) => result.findings);
    if (findings.length === 0) {
      return {
        ...EMPTY_ASSESSMENT,
        correlationIds: this.extractCorrelationIds(detectionResults),
      };
    }

    const disposition = findings.reduce<DetectionDisposition>((current, finding) =>
      DISPOSITION_RANK[finding.disposition] > DISPOSITION_RANK[current] ? finding.disposition : current,
    DetectionDisposition.CLEAN);

    const relevantFindings = findings.filter((finding) => finding.disposition === disposition);

    const severity = this.maxSeverity(relevantFindings);
    const confidence = this.maxConfidence(relevantFindings);
    const rationale = this.buildRationale(relevantFindings);
    const correlationIds = this.extractCorrelationIds(detectionResults);
    const overrides = this.collectOverrides(detectionResults);

    return Object.freeze({
      severity,
      confidence,
      disposition,
      rationale,
      correlationIds,
      overrides,
    });
  }

  private maxSeverity(findings: readonly DetectionFinding[]): DetectionSeverity {
    return findings.reduce<DetectionSeverity>((current, finding) =>
      SEVERITY_RANK[finding.severity] > SEVERITY_RANK[current] ? finding.severity : current,
    DetectionSeverity.INFO);
  }

  private maxConfidence(findings: readonly DetectionFinding[]): DetectionConfidence {
    return findings.reduce<DetectionConfidence>((current, finding) =>
      CONFIDENCE_RANK[finding.confidence] > CONFIDENCE_RANK[current] ? finding.confidence : current,
    DetectionConfidence.LOW);
  }

  private buildRationale(findings: readonly DetectionFinding[]): string {
    const reasons = findings
      .map((finding) => `${finding.detectorId}: ${finding.reason}`)
      .filter((reason, index, source) => source.indexOf(reason) === index)
      .sort((left, right) => left.localeCompare(right));

    if (reasons.length === 0) {
      return 'Findings matched without explicit rationale';
    }

    return reasons.join(' | ');
  }

  private collectOverrides(detectionResults: readonly DetectionResult[]): readonly RuntimeThreatOverride[] {
    const interpreted = detectionResults.map((result) => this.threatInterpreter.interpret(result));
    const overrides = interpreted.flatMap((interpretation) => interpretation.overrides);
    if (overrides.length === 0) {
      return Object.freeze([]);
    }

    const serialized = new Set<string>();
    const deduped: RuntimeThreatOverride[] = [];

    for (const override of overrides) {
      if (override.type !== RuntimeThreatOverrideType.FORCE_BLOCK) {
        continue;
      }

      const key = JSON.stringify({
        type: override.type,
        applicableEventTypes: [...override.applicableEventTypes].sort(),
        reason: override.reason ?? null,
      });

      if (serialized.has(key)) {
        continue;
      }

      serialized.add(key);
      deduped.push(
        Object.freeze({
          type: override.type,
          applicableEventTypes: Object.freeze([...override.applicableEventTypes]),
          reason: override.reason,
          metadata: override.metadata ? Object.freeze({ ...override.metadata }) : undefined,
        }),
      );
    }

    return Object.freeze(deduped);
  }

  private extractCorrelationIds(detectionResults: readonly DetectionResult[]): readonly string[] {
    const ids = new Set<string>();

    for (const detectionResult of detectionResults) {
      ids.add(detectionResult.correlationId);
      for (const finding of detectionResult.findings) {
        ids.add(finding.correlationId);
      }
    }

    return Object.freeze([...ids].sort((left, right) => left.localeCompare(right)));
  }
}
