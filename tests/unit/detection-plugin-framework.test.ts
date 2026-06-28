import { DetectionConfidence, DetectionContext, DetectionDisposition, DetectionSeverity } from '../../src/core/runtime/discord/detection-engine';
import {
  createDetectorExecutionPlan,
  DetectorPlugin,
  InMemoryDetectorPluginRegistry,
} from '../../src/core/runtime/discord/detection-plugin-framework';
import { DiscordGatewayNormalizedEvent } from '../../src/core/runtime/discord/pipeline-types';
import { SecurityActionType as SecurityPolicyActionType } from '../../src/core/runtime/discord/security-policy-types';

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
  return Object.freeze({
    normalizedEvent: normalizedEvent(),
    actorId: 'actor-1',
    guildId: 'guild-1',
    actionType,
    correlationId: 'corr-1',
    timestamp: '2026-01-01T00:00:00.000Z',
    metadata: Object.freeze({ source: 'test' }),
  });
}

function createPlugin(
  detectorId: string,
  priority: number,
  options: {
    enabled?: boolean;
    supportedActionTypes?: readonly SecurityPolicyActionType[];
  } = {},
): DetectorPlugin {
  return {
    detectorId,
    version: '1.0.0',
    priority,
    supportedActionTypes: options.supportedActionTypes ?? [SecurityPolicyActionType.CHANNEL_DELETE],
    enabled: () => options.enabled ?? true,
    async evaluate(context) {
      return Object.freeze({
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
      });
    },
  };
}

test('plugin registration works', () => {
  const registry = new InMemoryDetectorPluginRegistry();
  const plugin = createPlugin('detector-a', 10);

  registry.register(plugin);

  expect(registry.getPlugin('detector-a')).toBe(plugin);
  expect(registry.getPlugins()).toEqual([plugin]);
});

test('duplicate registration is rejected', () => {
  const registry = new InMemoryDetectorPluginRegistry();
  const plugin = createPlugin('detector-a', 10);

  registry.register(plugin);

  expect(() => registry.register(plugin)).toThrow('Detector plugin detector-a is already registered');
});

test('deterministic ordering uses priority then detectorId', () => {
  const plan = createDetectorExecutionPlan(detectionContext(), [
    createPlugin('detector-c', 10),
    createPlugin('detector-a', 20),
    createPlugin('detector-b', 20),
  ]);

  expect(plan.plugins.map((plugin) => plugin.detectorId)).toEqual(['detector-a', 'detector-b', 'detector-c']);
});

test('disabled plugins are excluded', () => {
  const plan = createDetectorExecutionPlan(detectionContext(), [
    createPlugin('detector-a', 10, { enabled: false }),
    createPlugin('detector-b', 5),
  ]);

  expect(plan.plugins.map((plugin) => plugin.detectorId)).toEqual(['detector-b']);
});

test('supportedActionTypes are respected', () => {
  const plan = createDetectorExecutionPlan(detectionContext(SecurityPolicyActionType.CHANNEL_DELETE), [
    createPlugin('detector-a', 10, { supportedActionTypes: [SecurityPolicyActionType.ROLE_DELETE] }),
    createPlugin('detector-b', 10, { supportedActionTypes: [SecurityPolicyActionType.CHANNEL_DELETE] }),
  ]);

  expect(plan.plugins.map((plugin) => plugin.detectorId)).toEqual(['detector-b']);
});

test('duplicate detectorIds are suppressed in execution plan', () => {
  const plan = createDetectorExecutionPlan(detectionContext(), [
    createPlugin('detector-a', 10),
    createPlugin('detector-a', 20),
    createPlugin('detector-b', 5),
  ]);

  expect(plan.plugins.map((plugin) => plugin.detectorId)).toEqual(['detector-a', 'detector-b']);
  expect(plan.plugins).toHaveLength(2);
});

test('registry snapshots are deterministic by priority then detectorId', () => {
  const registry = new InMemoryDetectorPluginRegistry();
  registry.register(createPlugin('detector-c', 5));
  registry.register(createPlugin('detector-a', 10));
  registry.register(createPlugin('detector-b', 10));

  expect(registry.getPlugins().map((plugin) => plugin.detectorId)).toEqual(['detector-a', 'detector-b', 'detector-c']);
});

test('registry snapshots are immutable', () => {
  const registry = new InMemoryDetectorPluginRegistry();
  registry.register(createPlugin('detector-a', 10));

  const plugins = registry.getPlugins();

  expect(Object.isFrozen(plugins)).toBe(true);
  expect(() => {
    (plugins as unknown as unknown[]).push('mutated');
  }).toThrow(TypeError);
});

test('execution plan is immutable', () => {
  const plan = createDetectorExecutionPlan(detectionContext(), [
    createPlugin('detector-a', 10),
    createPlugin('detector-b', 5),
  ]);

  expect(Object.isFrozen(plan)).toBe(true);
  expect(Object.isFrozen(plan.plugins)).toBe(true);

  expect(() => {
    (plan.plugins as unknown as unknown[]).push('mutated');
  }).toThrow(TypeError);

  expect(() => {
    (plan as { actionType: SecurityPolicyActionType }).actionType = SecurityPolicyActionType.ROLE_DELETE;
  }).toThrow(TypeError);
});

test('plugin registry unregister removes plugin', () => {
  const registry = new InMemoryDetectorPluginRegistry();
  registry.register(createPlugin('detector-a', 10));
  registry.register(createPlugin('detector-b', 5));

  registry.unregister('detector-a');

  expect(registry.getPlugin('detector-a')).toBeUndefined();
  expect(registry.getPlugins().map((plugin) => plugin.detectorId)).toEqual(['detector-b']);
});

test('plugin framework remains side-effect free', async () => {
  const previousFetch = (globalThis as { fetch?: unknown }).fetch;
  const fetchMock = jest.fn();
  (globalThis as { fetch?: unknown }).fetch = fetchMock;

  try {
    const registry = new InMemoryDetectorPluginRegistry();
    const plugin = createPlugin('detector-a', 10);
    registry.register(plugin);
    const plan = createDetectorExecutionPlan(detectionContext(), registry.getPlugins());
    await plan.plugins[0]?.evaluate(detectionContext());

    expect(fetchMock).not.toHaveBeenCalled();
  } finally {
    (globalThis as { fetch?: unknown }).fetch = previousFetch;
  }
});