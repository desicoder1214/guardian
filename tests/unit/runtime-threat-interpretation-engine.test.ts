import {
  DetectionConfidence,
  DetectionDisposition,
  DetectionResult,
  DetectionSeverity,
} from '../../src/core/runtime/discord/detection-engine';
import {
  InMemoryRuntimeThreatInterpretationEngine,
  ThreatAssessment,
} from '../../src/core/runtime/discord/runtime-threat-interpretation-engine';

function buildDetectionResult(overrides: Partial<DetectionResult> = {}): DetectionResult {
  return Object.freeze({
    detectorId: 'detector-a',
    matched: true,
    findings: Object.freeze([
      Object.freeze({
        detectorId: 'detector-a',
        severity: DetectionSeverity.HIGH,
        confidence: DetectionConfidence.HIGH,
        disposition: DetectionDisposition.SUSPICIOUS,
        reason: 'suspicious audit pattern',
        correlationId: 'corr-a',
        metadata: Object.freeze({}),
      }),
    ]),
    correlationId: 'corr-a',
    metadata: Object.freeze({}),
    ...overrides,
  });
}

function asMutableArray<T>(value: readonly T[]): T[] {
  return value as unknown as T[];
}

test('escalates to MALICIOUS/CRITICAL using detector findings', () => {
  const engine = new InMemoryRuntimeThreatInterpretationEngine();

  const result = engine.assess(
    Object.freeze([
      buildDetectionResult(),
      buildDetectionResult({
        detectorId: 'detector-b',
        findings: Object.freeze([
          Object.freeze({
            detectorId: 'detector-b',
            severity: DetectionSeverity.CRITICAL,
            confidence: DetectionConfidence.CERTAIN,
            disposition: DetectionDisposition.MALICIOUS,
            reason: 'unauthorized bot add',
            correlationId: 'corr-b',
            metadata: Object.freeze({}),
          }),
        ]),
        correlationId: 'corr-b',
      }),
    ]),
  );

  expect(result.disposition).toBe(DetectionDisposition.MALICIOUS);
  expect(result.severity).toBe(DetectionSeverity.CRITICAL);
  expect(result.confidence).toBe(DetectionConfidence.CERTAIN);
  expect(result.rationale).toContain('detector-b: unauthorized bot add');
  expect(result.correlationIds).toEqual(['corr-a', 'corr-b']);
});

test('collects and deduplicates runtime overrides deterministically', () => {
  const engine = new InMemoryRuntimeThreatInterpretationEngine();

  const assessment = engine.assess(
    Object.freeze([
      buildDetectionResult({
        metadata: Object.freeze({
          runtimeThreatOverrides: Object.freeze([
            Object.freeze({
              type: 'FORCE_BLOCK',
              applicableEventTypes: Object.freeze(['BOT_ADD']),
              reason: 'malicious unauthorized bot add detected',
            }),
          ]),
        }),
      }),
      buildDetectionResult({
        detectorId: 'detector-b',
        metadata: Object.freeze({
          runtimeThreatOverrides: Object.freeze([
            Object.freeze({
              type: 'FORCE_BLOCK',
              applicableEventTypes: Object.freeze(['BOT_ADD']),
              reason: 'malicious unauthorized bot add detected',
            }),
          ]),
        }),
      }),
    ]),
  );

  expect(assessment.overrides).toHaveLength(1);
  expect(assessment.overrides[0]?.type).toBe('FORCE_BLOCK');
  expect(assessment.overrides[0]?.applicableEventTypes).toEqual(['BOT_ADD']);
});

test('returns clean default assessment when no detection results exist', () => {
  const engine = new InMemoryRuntimeThreatInterpretationEngine();

  const assessment = engine.assess(Object.freeze([]));

  expect(assessment).toEqual<ThreatAssessment>({
    severity: DetectionSeverity.INFO,
    confidence: DetectionConfidence.LOW,
    disposition: DetectionDisposition.CLEAN,
    rationale: 'No detection findings were produced',
    correlationIds: Object.freeze([]),
    overrides: Object.freeze([]),
  });
});

test('assessment output is immutable', () => {
  const engine = new InMemoryRuntimeThreatInterpretationEngine();
  const assessment = engine.assess(Object.freeze([buildDetectionResult()]));

  expect(Object.isFrozen(assessment)).toBe(true);
  expect(Object.isFrozen(assessment.correlationIds)).toBe(true);
  expect(Object.isFrozen(assessment.overrides)).toBe(true);

  expect(() => {
    (assessment as { rationale: string }).rationale = 'mutated';
  }).toThrow(TypeError);

  expect(() => {
    asMutableArray(assessment.correlationIds).push('corr-z');
  }).toThrow(TypeError);
});

test('assessment is deterministic for same input', () => {
  const engine = new InMemoryRuntimeThreatInterpretationEngine();
  const input = Object.freeze([buildDetectionResult()]);

  const first = engine.assess(input);
  const second = engine.assess(input);

  expect(second).toEqual(first);
});

test('engine remains side-effect free', () => {
  const previousFetch = (globalThis as { fetch?: unknown }).fetch;
  const fetchMock = jest.fn();
  (globalThis as { fetch?: unknown }).fetch = fetchMock;

  try {
    const engine = new InMemoryRuntimeThreatInterpretationEngine();
    engine.assess(Object.freeze([buildDetectionResult()]));

    expect(fetchMock).not.toHaveBeenCalled();
  } finally {
    (globalThis as { fetch?: unknown }).fetch = previousFetch;
  }
});
