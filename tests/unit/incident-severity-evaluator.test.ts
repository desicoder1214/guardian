import { DetectionResult } from '../../src/core/runtime/discord/generic-detector-types';
import { IncidentContext, IncidentSeverity } from '../../src/core/runtime/discord/incident-correlation-types';
import { InMemoryIncidentSeverityEvaluator } from '../../src/core/runtime/discord/incident-severity-evaluator';
import { IncidentEscalationLevel } from '../../src/core/runtime/discord/incident-severity-types';

function detection(overrides: Partial<DetectionResult> = {}): DetectionResult {
  return {
    detectorId: 'detector-a',
    detectorName: 'DetectorA',
    eventType: 'GUILD_MEMBER_UPDATE',
    detected: true,
    confidence: 0.25,
    metadata: {
      guildId: 'guild-1',
      actorId: 'actor-1',
    },
    correlationId: 'corr-1',
    ...overrides,
  };
}

function incident(overrides: Partial<IncidentContext> = {}): IncidentContext {
  const baseDetections = [detection()];

  return {
    incidentId: 'incident-000001',
    guildId: 'guild-1',
    actorId: 'actor-1',
    correlationIds: baseDetections.map((entry) => entry.correlationId),
    firstSeen: '2026-01-01T00:00:00.000Z',
    lastSeen: '2026-01-01T00:00:01.000Z',
    severity: IncidentSeverity.LOW,
    detections: baseDetections,
    metadata: {},
    ...overrides,
  };
}

test('single low-confidence detection remains LOW', () => {
  const evaluator = new InMemoryIncidentSeverityEvaluator({ now: () => Date.parse('2026-01-01T10:00:00.000Z') });

  const result = evaluator.evaluate(incident());

  expect(result.escalationLevel).toBe(IncidentEscalationLevel.LOW);
  expect(result.reasons).toContain('Low-confidence profile constrained escalation.');
});

test('multiple related detections escalate', () => {
  const evaluator = new InMemoryIncidentSeverityEvaluator({ now: () => Date.parse('2026-01-01T10:00:00.000Z') });

  const result = evaluator.evaluate(
    incident({
      detections: [
        detection({ correlationId: 'corr-1', confidence: 0.35 }),
        detection({ correlationId: 'corr-2', confidence: 0.4 }),
        detection({ correlationId: 'corr-3', confidence: 0.45 }),
      ],
      correlationIds: ['corr-1', 'corr-2', 'corr-3'],
    }),
  );

  expect(result.escalationLevel).toBe(IncidentEscalationLevel.MEDIUM);
  expect(result.reasons).toContain('Repeated related detections increased escalation pressure.');
});

test('high-confidence detections increase severity', () => {
  const evaluator = new InMemoryIncidentSeverityEvaluator({ now: () => Date.parse('2026-01-01T10:00:00.000Z') });

  const result = evaluator.evaluate(
    incident({
      detections: [
        detection({ detectorId: 'detector-a', confidence: 0.2, correlationId: 'corr-1' }),
        detection({ detectorId: 'detector-b', confidence: 0.97, correlationId: 'corr-2' }),
      ],
      correlationIds: ['corr-1', 'corr-2'],
    }),
  );

  expect(result.escalationLevel).toBe(IncidentEscalationLevel.HIGH);
  expect(result.reasons).toContain('High-confidence detection(s) increased severity.');
  expect(result.reasons).toContain('Multiple detector families observed on the same incident.');
});

test('severity escalates from LOW to MEDIUM, HIGH, and CRITICAL', () => {
  const evaluator = new InMemoryIncidentSeverityEvaluator({ now: () => Date.parse('2026-01-01T10:00:00.000Z') });

  const low = evaluator.evaluate(
    incident({
      detections: [detection({ detectorId: 'detector-a', confidence: 0.2, correlationId: 'corr-low-1' })],
      correlationIds: ['corr-low-1'],
    }),
  );
  const medium = evaluator.evaluate(
    incident({
      detections: [
        detection({ detectorId: 'detector-a', confidence: 0.35, correlationId: 'corr-med-1' }),
        detection({ detectorId: 'detector-a', confidence: 0.4, correlationId: 'corr-med-2' }),
        detection({ detectorId: 'detector-a', confidence: 0.45, correlationId: 'corr-med-3' }),
      ],
      correlationIds: ['corr-med-1', 'corr-med-2', 'corr-med-3'],
    }),
  );
  const high = evaluator.evaluate(
    incident({
      detections: [
        detection({ detectorId: 'detector-a', confidence: 0.2, correlationId: 'corr-high-1' }),
        detection({ detectorId: 'detector-b', confidence: 0.97, correlationId: 'corr-high-2' }),
      ],
      correlationIds: ['corr-high-1', 'corr-high-2'],
    }),
  );
  const critical = evaluator.evaluate(
    incident({
      detections: [
        detection({ detectorId: 'detector-a', confidence: 0.91, correlationId: 'corr-crit-1' }),
        detection({ detectorId: 'detector-b', confidence: 0.94, correlationId: 'corr-crit-2' }),
        detection({ detectorId: 'detector-c', confidence: 0.96, correlationId: 'corr-crit-3' }),
        detection({ detectorId: 'detector-d', confidence: 0.98, correlationId: 'corr-crit-4' }),
        detection({ detectorId: 'detector-e', confidence: 0.99, correlationId: 'corr-crit-5' }),
      ],
      correlationIds: ['corr-crit-1', 'corr-crit-2', 'corr-crit-3', 'corr-crit-4', 'corr-crit-5'],
    }),
  );

  expect(low.escalationLevel).toBe(IncidentEscalationLevel.LOW);
  expect(medium.escalationLevel).toBe(IncidentEscalationLevel.MEDIUM);
  expect(high.escalationLevel).toBe(IncidentEscalationLevel.HIGH);
  expect(critical.escalationLevel).toBe(IncidentEscalationLevel.CRITICAL);
});

test('identical incident input yields deterministic result', () => {
  const fixedNow = Date.parse('2026-01-01T10:00:00.000Z');
  const evaluator = new InMemoryIncidentSeverityEvaluator({ now: () => fixedNow });

  const candidate = incident({
    detections: [
      detection({ detectorId: 'detector-a', confidence: 0.45, correlationId: 'corr-1' }),
      detection({ detectorId: 'detector-b', confidence: 0.55, correlationId: 'corr-2' }),
      detection({ detectorId: 'detector-c', confidence: 0.65, correlationId: 'corr-3' }),
    ],
    correlationIds: ['corr-1', 'corr-2', 'corr-3'],
  });

  const first = evaluator.evaluate(candidate);
  const second = evaluator.evaluate(candidate);

  expect(second).toEqual(first);
});

test('incident severity evaluator has no side effects', () => {
  const previousFetch = (globalThis as { fetch?: unknown }).fetch;
  const fetchMock = jest.fn();
  (globalThis as { fetch?: unknown }).fetch = fetchMock;

  try {
    const evaluator = new InMemoryIncidentSeverityEvaluator({ now: () => Date.parse('2026-01-01T10:00:00.000Z') });
    evaluator.evaluate(incident());

    expect(fetchMock).not.toHaveBeenCalled();
  } finally {
    (globalThis as { fetch?: unknown }).fetch = previousFetch;
  }
});
