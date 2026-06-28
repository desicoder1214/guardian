export enum RuntimeThreatOverrideType {
  FORCE_BLOCK = 'FORCE_BLOCK'
}

export interface RuntimeThreatOverride {
  readonly type: RuntimeThreatOverrideType;
  readonly applicableEventTypes: readonly string[];
  readonly reason?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface RuntimeThreatInterpretation {
  readonly overrides: readonly RuntimeThreatOverride[];
}

export interface RuntimeThreatInterpreter<TDetectionResult = unknown> {
  interpret(detectionResult: TDetectionResult): RuntimeThreatInterpretation;
}

interface RuntimeThreatOverrideShape {
  readonly type?: unknown;
  readonly applicableEventTypes?: unknown;
  readonly reason?: unknown;
  readonly metadata?: unknown;
}

interface DetectionMetadataCarrier {
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly findings?: readonly {
    readonly metadata?: Readonly<Record<string, unknown>>;
  }[];
}

const EMPTY_INTERPRETATION: RuntimeThreatInterpretation = Object.freeze({
  overrides: Object.freeze([])
});

export class MetadataRuntimeThreatInterpreter
  implements RuntimeThreatInterpreter<DetectionMetadataCarrier>
{
  public interpret(
    detectionResult: DetectionMetadataCarrier
  ): RuntimeThreatInterpretation {
    const rawOverrides = [
      ...(this.readOverrides(detectionResult.metadata) ?? []),
      ...((detectionResult.findings ?? []).flatMap(
        (finding) => this.readOverrides(finding.metadata) ?? []
      ) as readonly unknown[]),
    ];

    if (!Array.isArray(rawOverrides) || rawOverrides.length === 0) {
      return EMPTY_INTERPRETATION;
    }

    const overrides = rawOverrides
      .map((override) => this.toRuntimeThreatOverride(override))
      .filter(
        (override): override is RuntimeThreatOverride => override !== undefined
      );

    if (overrides.length === 0) {
      return EMPTY_INTERPRETATION;
    }

    return Object.freeze({
      overrides: Object.freeze(overrides)
    });
  }

  private readOverrides(
    metadata?: Readonly<Record<string, unknown>>
  ): readonly unknown[] | undefined {
    const rawOverrides = metadata?.runtimeThreatOverrides;

    return Array.isArray(rawOverrides) ? rawOverrides : undefined;
  }

  private toRuntimeThreatOverride(
    input: unknown
  ): RuntimeThreatOverride | undefined {
    if (!input || typeof input !== 'object') {
      return undefined;
    }

    const candidate = input as RuntimeThreatOverrideShape;

    if (candidate.type !== RuntimeThreatOverrideType.FORCE_BLOCK) {
      return undefined;
    }

    if (!Array.isArray(candidate.applicableEventTypes)) {
      return undefined;
    }

    const applicableEventTypes = candidate.applicableEventTypes.filter(
      (eventType): eventType is string => typeof eventType === 'string'
    );

    if (applicableEventTypes.length === 0) {
      return undefined;
    }

    const reason =
      typeof candidate.reason === 'string' ? candidate.reason : undefined;

    const metadata =
      candidate.metadata && typeof candidate.metadata === 'object'
        ? Object.freeze({ ...(candidate.metadata as Record<string, unknown>) })
        : undefined;

    return Object.freeze({
      type: RuntimeThreatOverrideType.FORCE_BLOCK,
      applicableEventTypes: Object.freeze([...applicableEventTypes]),
      reason,
      metadata
    });
  }
}