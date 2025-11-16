import type { User } from "../schema";
import type { BusinessAccountDto } from "./businessAccount";

// MeResponseDto - Response type for /api/auth/me endpoint
export type MeResponseDto = User & {
  businessAccount?: {
    id: string;
    name: string;
    status: string;
    shopifyEnabled: boolean;
    appointmentsEnabled: boolean;
    voiceModeEnabled: boolean;
  } | null;
};

// Convert User with optional BusinessAccount to MeResponseDto
export function toMeResponseDto(
  user: User,
  businessAccount?: BusinessAccountDto | null
): MeResponseDto {
  if (businessAccount) {
    return {
      ...user,
      businessAccount: {
        id: businessAccount.id,
        name: businessAccount.name,
        status: businessAccount.status,
        shopifyEnabled: businessAccount.shopifyEnabled,
        appointmentsEnabled: businessAccount.appointmentsEnabled,
        voiceModeEnabled: businessAccount.voiceModeEnabled,
      },
    };
  }
  
  return {
    ...user,
    businessAccount: null,
  };
}
