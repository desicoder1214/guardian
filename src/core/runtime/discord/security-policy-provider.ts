import { GuildSecurityPolicy } from './security-policy-types';

export interface SecurityPolicyProvider {
  getPolicy(guildId: string): GuildSecurityPolicy | undefined;
  setPolicy(guildId: string, policy: GuildSecurityPolicy): void;
}

export class InMemorySecurityPolicyProvider implements SecurityPolicyProvider {
  private readonly policies = new Map<string, GuildSecurityPolicy>();

  getPolicy(guildId: string): GuildSecurityPolicy | undefined {
    return this.policies.get(guildId);
  }

  setPolicy(guildId: string, policy: GuildSecurityPolicy): void {
    this.policies.set(guildId, policy);
  }
}
