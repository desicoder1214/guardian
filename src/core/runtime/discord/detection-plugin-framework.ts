import { DetectionContext, DetectionResult } from './detection-engine';
import { SecurityActionType as SecurityPolicyActionType } from './security-policy-types';

export interface DetectorPlugin {
  readonly detectorId: string;
  readonly version: string;
  readonly priority: number;
  readonly supportedActionTypes: readonly SecurityPolicyActionType[];
  enabled(context: DetectionContext): boolean;
  evaluate(context: DetectionContext): Promise<DetectionResult>;
}

export interface DetectorPluginRegistry {
  register(plugin: DetectorPlugin): void;
  unregister(detectorId: string): void;
  getPlugins(): readonly DetectorPlugin[];
  getPlugin(detectorId: string): DetectorPlugin | undefined;
}

export interface DetectorExecutionPlan {
  readonly plugins: readonly DetectorPlugin[];
  readonly actionType: SecurityPolicyActionType;
  readonly metadata?: Record<string, unknown>;
}

export class InMemoryDetectorPluginRegistry implements DetectorPluginRegistry {
  private readonly plugins = new Map<string, DetectorPlugin>();

  register(plugin: DetectorPlugin): void {
    if (this.plugins.has(plugin.detectorId)) {
      throw new Error(`Detector plugin ${plugin.detectorId} is already registered`);
    }

    this.plugins.set(plugin.detectorId, plugin);
  }

  unregister(detectorId: string): void {
    this.plugins.delete(detectorId);
  }

  getPlugins(): readonly DetectorPlugin[] {
    return Object.freeze([...this.plugins.values()].sort(compareDetectorPlugins));
  }

  getPlugin(detectorId: string): DetectorPlugin | undefined {
    return this.plugins.get(detectorId);
  }
}

export function createDetectorExecutionPlan(
  context: DetectionContext,
  plugins: readonly DetectorPlugin[] | DetectorPluginRegistry,
): DetectorExecutionPlan {
  const pluginList = isDetectorPluginRegistry(plugins) ? plugins.getPlugins() : plugins;
  const uniquePlugins = new Map<string, DetectorPlugin>();

  for (const plugin of pluginList) {
    if (uniquePlugins.has(plugin.detectorId)) {
      continue;
    }

    if (!plugin.supportedActionTypes.includes(context.actionType)) {
      continue;
    }

    if (!plugin.enabled(context)) {
      continue;
    }

    uniquePlugins.set(plugin.detectorId, plugin);
  }

  const orderedPlugins = [...uniquePlugins.values()].sort(compareDetectorPlugins);

  return Object.freeze({
    plugins: Object.freeze(orderedPlugins),
    actionType: context.actionType,
    metadata: Object.freeze({
      pluginCount: orderedPlugins.length,
      correlationId: context.correlationId,
    }),
  });
}

function compareDetectorPlugins(left: DetectorPlugin, right: DetectorPlugin): number {
  if (left.priority !== right.priority) {
    return right.priority - left.priority;
  }

  return left.detectorId.localeCompare(right.detectorId);
}

function isDetectorPluginRegistry(value: readonly DetectorPlugin[] | DetectorPluginRegistry): value is DetectorPluginRegistry {
  return typeof value === 'object' && value !== null && 'getPlugins' in value;
}