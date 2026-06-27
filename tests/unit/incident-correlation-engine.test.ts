import { DetectionResult } from '../../src/core/runtime/discord/generic-detector-types';
import { InMemoryIncidentCorrelationEngine } from '../../src/core/runtime/discord/incident-correlation-engine';
import { IncidentSeverity } from '../../src/core/runtime/discord/incident-correlation-types';

class FakeClock {
  constructor(private nowMs: number) {}

  now(): number {
    return this.nowMs;
  }

  advance(ms: number): void {
    this.nowMs += ms;
  }
}

function detection(overrides: Partial<DetectionResult> = {}): DetectionResult {
  return {
    detectorId: 'dangerous-role-grant-detector',
    detectorName: 'DangerousRoleGrantDetector',
    eventType: 'GUILD_ROLE_UPDATE',
    detected: true,
    confidence: 0.9,
    metadata: {
      guildId: 'guild-1',
      actorId: 'actor-1',
    },
    correlationId: 'corr-1',
    ...overrides,
  };
}

test('related detections merge into one incident', () => {
  const clock = new FakeClock(Date.parse('2026-01-01T00:00:00.000Z'));
  const engine = new InMemoryIncidentCorrelationEngine({ correlationWindowMs: 60000, now: () => clock.now() });

  const first = engine.correlate(detection({ correlationId: 'corr-1' }));
  clock.advance(1000);
  const second = engine.correlate(
    detection({
      correlationId: 'corr-2',
      metadata: {
        guildId: 'guild-1',
        actorId: 'actor-1',
      },
    }),
  );

  expect(second.incidentId).toBe(first.incidentId);
  expect(second.detections).toHaveLength(2);
  expect(second.correlationIds).toEqual(['corr-1', 'corr-2']);
  expect(engine.listOpenIncidents()).toHaveLength(1);
});

test('unrelated actors create separate incidents', () => {
  const engine = new InMemoryIncidentCorrelationEngine();

  const first = engine.correlate(
    detection({ metadata: { guildId: 'guild-1', actorId: 'actor-1' }, correlationId: 'corr-a' }),
  );
  const second = engine.correlate(
    detection({ metadata: { guildId: 'guild-1', actorId: 'actor-2' }, correlationId: 'corr-b' }),
  );

  expect(first.incidentId).not.toBe(second.incidentId);
  expect(engine.listOpenIncidents()).toHaveLength(2);
});

test('incident expiration works by correlation window', () => {
  const clock = new FakeClock(Date.parse('2026-01-01T00:00:00.000Z'));
  const engine = new InMemoryIncidentCorrelationEngine({ correlationWindowMs: 5000, now: () => clock.now() });

  engine.correlate(detection({ correlationId: 'corr-expire' }));
  clock.advance(6000);

  const expired = engine.expire();

  expect(expired).toHaveLength(1);
  expect(expired[0].correlationIds).toEqual(['corr-expire']);
  expect(engine.listOpenIncidents()).toEqual([]);
});

test('correlation ids are preserved and severity escalates deterministically', () => {
  const engine = new InMemoryIncidentCorrelationEngine();

  const first = engine.correlate(detection({ correlationId: 'corr-1', confidence: 0.5 }));
  const second = engine.correlate(detection({ correlationId: 'corr-2', confidence: 0.8 }));
  const third = engine.correlate(detection({ correlationId: 'corr-3', confidence: 0.96 }));

  expect(first.severity).toBe(IncidentSeverity.LOW);
  expect(second.severity).toBe(IncidentSeverity.MEDIUM);
  expect(third.severity).toBe(IncidentSeverity.HIGH);
  expect(third.correlationIds).toEqual(['corr-1', 'corr-2', 'corr-3']);
});

test('listOpenIncidents returns deterministic ordering', () => {
  const clock = new FakeClock(Date.parse('2026-01-01T00:00:00.000Z'));
  const engine = new InMemoryIncidentCorrelationEngine({ now: () => clock.now() });

  engine.correlate(detection({ metadata: { guildId: 'guild-1', actorId: 'actor-1' }, correlationId: 'corr-1' }));
  clock.advance(1000);
  engine.correlate(detection({ metadata: { guildId: 'guild-2', actorId: 'actor-2' }, correlationId: 'corr-2' }));

  const incidents = engine.listOpenIncidents();
  expect(incidents).toHaveLength(2);
  expect(incidents[0].incidentId).toBe('incident-000001');
  expect(incidents[1].incidentId).toBe('incident-000002');
});

test('incident correlation engine has no side effects', () => {
  const previousFetch = (globalThis as { fetch?: unknown }).fetch;
  const fetchMock = jest.fn();
  (globalThis as { fetch?: unknown }).fetch = fetchMock;

  try {
    const engine = new InMemoryIncidentCorrelationEngine();
    engine.correlate(detection());
    engine.listOpenIncidents();
    engine.expire();

    expect(fetchMock).not.toHaveBeenCalled();
  } finally {
    (globalThis as { fetch?: unknown }).fetch = previousFetch;
  }
});
