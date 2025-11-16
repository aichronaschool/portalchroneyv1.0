import type { BusinessAccount } from "../schema";

// BusinessAccountDto with normalized boolean feature flags for API/client
export type BusinessAccountDto = Omit<BusinessAccount, "shopifyEnabled" | "appointmentsEnabled" | "voiceModeEnabled"> & {
  shopifyEnabled: boolean;
  appointmentsEnabled: boolean;
  voiceModeEnabled: boolean;
};

// Convert database BusinessAccount (text flags) to BusinessAccountDto (boolean flags)
export function toBusinessAccountDto(account: BusinessAccount): BusinessAccountDto {
  return {
    ...account,
    shopifyEnabled: account.shopifyEnabled === "true",
    appointmentsEnabled: account.appointmentsEnabled === "true",
    voiceModeEnabled: account.voiceModeEnabled === "true",
  };
}

// Convert BusinessAccountDto (boolean flags) back to database format (text flags)
export function fromBusinessAccountDto(dto: BusinessAccountDto): BusinessAccount {
  return {
    ...dto,
    shopifyEnabled: dto.shopifyEnabled ? "true" : "false",
    appointmentsEnabled: dto.appointmentsEnabled ? "true" : "false",
    voiceModeEnabled: dto.voiceModeEnabled ? "true" : "false",
  };
}
