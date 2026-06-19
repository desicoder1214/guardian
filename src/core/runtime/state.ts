export type RuntimeState = 'starting' | 'started' | 'stopping' | 'stopped';

export class RuntimeStateManager {
  private state: RuntimeState = 'stopped';

  setState(state: RuntimeState): void {
    this.state = state;
  }

  getState(): RuntimeState {
    return this.state;
  }
}
