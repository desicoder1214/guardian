import { DiscordGatewayNormalizedEvent } from '../../src/core/runtime/discord/pipeline-types';
import { SecurityActionType as SecurityPolicyActionType } from '../../src/core/runtime/discord/security-policy-types';
import {
  DetectionConfidence,
  DetectionContext,
  DetectionDisposition,
  DetectionSeverity,
  DetectionResult,
  InMemoryDetectionEngine,
  SecurityDetector,
} from '../../src/core/runtime/discord/detection-engine';

function normalizedEvent(): DiscordGatewayNormalizedEvent {
  return {
    eventName: 'CHANNEL_DELETE',
    source: 'discord-gateway',
    timestamp: '2026-01-01T00:00:00.000Z',
    correlationId: 'corr-1',
    payload: { id: 'event-1' },
  };
}

function detectionContext(actionType: SecurityPolicyActionType = SecurityPolicyActionType.CHANNEL_DELETE): DetectionContext {
  return {
    normalizedEvent: normalizedEvent(),
    actorId: 'actor-1',
    guildId: 'guild-1',
    actionType,
    correlationId: 'corr-1',
    timestamp: '2026-01-01T00:00:00.000Z',
    metadata: Object.freeze({ source: 'test' }),
  };
}

function createDetector(
  detectorId: string,
  supportedActionTypes: readonly SecurityPolicyActionType[],
  evaluateImpl?: (context: DetectionContext) => Promise<DetectionResult>,
): SecurityDetector {
  return {
    detectorId,
    supportedActionTypes,
    evaluate: evaluateImpl ??
      (async (context) => ({
        detectorId,
        matched: true,
        findings: Object.freeze([
          Object.freeze({
            detectorId,
            severity: DetectionSeverity.LOW,
            confidence: DetectionConfidence.MEDIUM,
            disposition: DetectionDisposition.SUSPICIOUS,
            reason: `${detectorId} matched`,
            correlationId: context.correlationId,
            metadata: Object.freeze({ mock: true }),
          }),
        ]),
        correlationId: context.correlationId,
        metadata: Object.freeze({ mock: true }),
      })),
  };
}

test('supported detectors execute', async () => {
  const engine = new InMemoryDetectionEngine();
  const detectors = [
    createDetector('detector-b', [SecurityPolicyActionType.CHANNEL_DELETE]),
    createDetector('detector-a', [SecurityPolicyActionType.CHANNEL_DELETE]),
  ];

  const results = await engine.evaluate(detectionContext(), detectors);

  expect(results).toHaveLength(2);
  expect(results.map((result) => result.detectorId)).toEqual(['detector-a', 'detector-b']);
});

test('unsupported detectors are skipped', async () => {
  const engine = new InMemoryDetectionEngine();
  const supported = createDetector('detector-a', [SecurityPolicyActionType.CHANNEL_DELETE]);
  const unsupported = createDetector('detector-b', [SecurityPolicyActionType.ROLE_CREATE]);

  const results = await engine.evaluate(detectionContext(), [unsupported, supported]);

  expect(results).toHaveLength(1);
  expect(results[0]?.detectorId).toBe('detector-a');
});

test('detector ordering is deterministic', async () => {
  const engine = new InMemoryDetectionEngine();
  const detectors = [
    createDetector('detector-c', [SecurityPolicyActionType.CHANNEL_DELETE]),
    createDetector('detector-a', [SecurityPolicyActionType.CHANNEL_DELETE]),
    createDetector('detector-b', [SecurityPolicyActionType.CHANNEL_DELETE]),
  ];

  const results = await engine.evaluate(detectionContext(), detectors);

  expect(results.map((result) => result.detectorId)).toEqual(['detector-a', 'detector-b', 'detector-c']);
});

test('detector exceptions become UNKNOWN findings', async () => {
  const engine = new InMemoryDetectionEngine();
  const detectors = [
    createDetector('detector-a', [SecurityPolicyActionType.CHANNEL_DELETE], async () => {
      throw new Error('detector failure');
    }),
  ];

  const results = await engine.evaluate(detectionContext(), detectors);

  expect(results).toHaveLength(1);
  expect(results[0]?.matched).toBe(false);
  expect(results[0]?.findings[0]).toMatchObject({
    detectorId: 'detector-a',
    severity: DetectionSeverity.INFO,
    confidence: DetectionConfidence.LOW,
    disposition: DetectionDisposition.UNKNOWN,
    reason: 'detector failure',
    correlationId: 'corr-1',
  });
});

test('duplicate detector IDs are not executed twice', async () => {
  const engine = new InMemoryDetectionEngine();
  const evaluateSpy = jest.fn(async (context: DetectionContext) => ({
    detectorId: 'detector-a',
    matched: true,
    findings: Object.freeze([]),
    correlationId: context.correlationId,
  }));

  const detectors = [
    createDetector('detector-a', [SecurityPolicyActionType.CHANNEL_DELETE], evaluateSpy),
    createDetector('detector-a', [SecurityPolicyActionType.CHANNEL_DELETE], evaluateSpy),
  ];

  const results = await engine.evaluate(detectionContext(), detectors);

  expect(evaluateSpy).toHaveBeenCalledTimes(1);
  expect(results).toHaveLength(1);
});

test('correlationId is preserved', async () => {
  const engine = new InMemoryDetectionEngine();
  const results = await engine.evaluate(
    detectionContext(SecurityPolicyActionType.CHANNEL_DELETE),
    [createDetector('detector-a', [SecurityPolicyActionType.CHANNEL_DELETE])],
  );

  expect(results[0]?.correlationId).toBe('corr-1');
  expect(results[0]?.findings[0]?.correlationId).toBe('corr-1');
});

test('results and findings are immutable', async () => {
  const engine = new InMemoryDetectionEngine();
  const results = await engine.evaluate(
    detectionContext(SecurityPolicyActionType.CHANNEL_DELETE),
    [createDetector('detector-a', [SecurityPolicyActionType.CHANNEL_DELETE])],
  );

  expect(Object.isFrozen(results)).toBe(true);
  expect(Object.isFrozen(results[0] ?? {})).toBe(true);
  expect(Object.isFrozen(results[0]?.findings ?? [])).toBe(true);
  expect(Object.isFrozen(results[0]?.findings[0] ?? {})).toBe(true);

  expect(() => {
    (results as unknown as unknown[]).push('mutated');
  }).toThrow(TypeError);

  expect(() => {
    (results[0] as { matched: boolean }).matched = false;
  }).toThrow(TypeError);
});

test('detection engine remains side-effect free', async () => {
  const previousFetch = (globalThis as { fetch?: unknown }).fetch;
  const fetchMock = jest.fn();
  (globalThis as { fetch?: unknown }).fetch = fetchMock;

  const engine = new InMemoryDetectionEngine();

  try {
    await engine.evaluate(
      detectionContext(SecurityPolicyActionType.CHANNEL_DELETE),
      [createDetector('detector-a', [SecurityPolicyActionType.CHANNEL_DELETE])],
    );
    expect(fetchMock).not.toHaveBeenCalled();
  } finally {
    (globalThis as { fetch?: unknown }).fetch = previousFetch;
  }
});