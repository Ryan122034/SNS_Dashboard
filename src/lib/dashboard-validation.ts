import { platformOrder, workContentTypeOptions, workStatusOptions } from "@/lib/dashboard-data";
import type {
  CreateManagedChannelInput,
  PlatformKey,
  SaveWorkHistoryInput,
  UpdateManagedChannelAliasInput,
  WorkContentType,
  WorkStatus
} from "@/types/dashboard";

export function isPlatformKey(value: string): value is PlatformKey {
  return platformOrder.includes(value as PlatformKey);
}

export function isWorkContentType(value: string): value is WorkContentType {
  return workContentTypeOptions.includes(value as WorkContentType);
}

export function isWorkStatus(value: string): value is WorkStatus {
  return workStatusOptions.includes(value as WorkStatus);
}

export function normalizeUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function normalizeCampaignId(value: string) {
  const digitsOnly = value.trim().replace(/\D/g, "");

  if (digitsOnly.length !== 4) {
    return "";
  }

  return digitsOnly;
}

export function normalizeUsd(value: string) {
  return value.trim().replace(/^\$/, "");
}

export function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

export function parseManagedChannelInput(
  value: unknown
): CreateManagedChannelInput | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const input = value as Record<string, unknown>;
  const platform = typeof input.platform === "string" ? input.platform : "";
  const alias = typeof input.alias === "string" ? input.alias.trim() : "";
  const url = typeof input.url === "string" ? normalizeUrl(input.url) : "";

  if (!isPlatformKey(platform) || !alias || !url) {
    return null;
  }

  return {
    platform,
    alias,
    url
  };
}

export function parseManagedChannelAliasInput(
  value: unknown
): UpdateManagedChannelAliasInput | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const input = value as Record<string, unknown>;
  const alias = typeof input.alias === "string" ? input.alias.trim() : "";

  if (!alias) {
    return null;
  }

  return {
    alias
  };
}

export function parseWorkHistoryInput(
  value: unknown
): SaveWorkHistoryInput | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const input = value as Record<string, unknown>;
  const channelId =
    typeof input.channelId === "string" ? input.channelId.trim() : "";
  const date = typeof input.date === "string" ? input.date.trim() : "";
  const contentType =
    typeof input.contentType === "string" ? input.contentType : "";
  const taskStatus =
    typeof input.taskStatus === "string" ? input.taskStatus : "";
  const url = typeof input.url === "string" ? normalizeUrl(input.url) : "";
  const campaignId =
    typeof input.campaignId === "string"
      ? normalizeCampaignId(input.campaignId)
      : "";
  const quantity =
    typeof input.quantity === "string" ? input.quantity.trim() : "";
  const costUsd =
    typeof input.costUsd === "string" ? normalizeUsd(input.costUsd) : "";

  if (
    !channelId ||
    !isIsoDate(date) ||
    !isWorkContentType(contentType) ||
    !isWorkStatus(taskStatus) ||
    !url ||
    !campaignId ||
    !quantity ||
    !costUsd
  ) {
    return null;
  }

  return {
    channelId,
    date,
    contentType,
    taskStatus,
    url,
    campaignId,
    quantity,
    costUsd
  };
}
