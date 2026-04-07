"use client";

import { useMemo, useState } from "react";
import {
  formatNumber,
  formatSignedNumber,
  formatUsdValue,
  platformOrder,
  platformPages,
  workContentTypeOptions,
  workStatusOptions
} from "@/lib/dashboard-data";
import {
  normalizeCampaignId,
  normalizeUrl,
  normalizeUsd
} from "@/lib/dashboard-validation";
import type {
  CreateManagedChannelInput,
  DashboardInitialData,
  DetailTab,
  ManagedChannelEntry,
  PlatformKey,
  SaveWorkHistoryInput,
  WorkContentType,
  WorkHistoryRow,
  WorkStatus
} from "@/types/dashboard";

const tabLabels: Record<DetailTab, string> = {
  postStatus: "게시물 상태",
  workHistory: "작업 내역"
};

interface ChannelDashboardProps {
  initialData: DashboardInitialData;
}

export function ChannelDashboard({ initialData }: ChannelDashboardProps) {
  const [managedChannels, setManagedChannels] = useState<ManagedChannelEntry[]>(
    initialData.managedChannels
  );
  const [postStatusByChannelId, setPostStatusByChannelId] = useState(
    initialData.postStatusByChannelId
  );
  const [workHistoryByChannelId, setWorkHistoryByChannelId] = useState(
    initialData.workHistoryByChannelId
  );
  const [activeChannelId, setActiveChannelId] = useState<string>(
    initialData.managedChannels[0]?.id ?? ""
  );
  const [activeTab, setActiveTab] = useState<DetailTab>("postStatus");
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [isWorkHistoryModalOpen, setIsWorkHistoryModalOpen] = useState(false);
  const [workHistoryModalMode, setWorkHistoryModalMode] = useState<
    "create" | "edit"
  >("create");
  const [editingWorkRecordId, setEditingWorkRecordId] = useState<string | null>(
    null
  );
  const [channelSubmitPending, setChannelSubmitPending] = useState(false);
  const [workSubmitPending, setWorkSubmitPending] = useState(false);

  const [newPlatform, setNewPlatform] = useState<PlatformKey>("youtube");
  const [newAlias, setNewAlias] = useState("");
  const [newChannelUrl, setNewChannelUrl] = useState("");

  const [newWorkDate, setNewWorkDate] = useState("");
  const [newWorkContentType, setNewWorkContentType] =
    useState<WorkContentType>("Videos");
  const [newWorkStatus, setNewWorkStatus] = useState<WorkStatus>("Completed");
  const [newWorkUrl, setNewWorkUrl] = useState("");
  const [newCampaignId, setNewCampaignId] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [newCostUsd, setNewCostUsd] = useState("");

  const persistenceEnabled = initialData.dataSource === "supabase";
  const activeChannel =
    managedChannels.find((channel) => channel.id === activeChannelId) ??
    managedChannels[0] ??
    null;
  const activePlatform = activeChannel?.platform ?? "youtube";
  const currentPage = platformPages[activePlatform];
  const currentPostStatusRows = activeChannel
    ? postStatusByChannelId[activeChannel.id] ?? []
    : [];
  const currentWorkHistoryRows = activeChannel
    ? workHistoryByChannelId[activeChannel.id] ?? []
    : [];

  const groupedChannels = useMemo(
    () =>
      platformOrder
        .map((platform) => ({
          platform,
          page: platformPages[platform],
          channels: managedChannels.filter((channel) => channel.platform === platform)
        }))
        .filter((group) => group.channels.length > 0),
    [managedChannels]
  );

  async function handleCreateChannel() {
    const payload = createManagedChannelPayload({
      platform: newPlatform,
      alias: newAlias,
      url: newChannelUrl
    });

    if (!payload) {
      window.alert("플랫폼, 별칭, 관리 채널 주소를 모두 입력해 주세요.");
      return;
    }

    setChannelSubmitPending(true);

    try {
      const channel = persistenceEnabled
        ? await createManagedChannelRequest(payload)
        : {
            id: `${payload.platform}-${Date.now()}`,
            ...payload
          };

      setManagedChannels((current) => [...current, channel]);
      setPostStatusByChannelId((current) => ({
        ...current,
        [channel.id]: current[channel.id] ?? []
      }));
      setWorkHistoryByChannelId((current) => ({
        ...current,
        [channel.id]: current[channel.id] ?? []
      }));
      setActiveChannelId(channel.id);
      setActiveTab("postStatus");
      setNewPlatform("youtube");
      setNewAlias("");
      setNewChannelUrl("");
      setIsChannelModalOpen(false);
    } catch (error) {
      window.alert(getErrorMessage(error, "관리 채널을 저장하지 못했습니다."));
    } finally {
      setChannelSubmitPending(false);
    }
  }

  async function handleDeleteWorkHistory(id: string) {
    const confirmed = window.confirm("이 작업 내역을 삭제하시겠습니까?");

    if (!confirmed || !activeChannel) {
      return;
    }

    try {
      if (persistenceEnabled) {
        const response = await fetch(`/api/work-history/${id}`, {
          method: "DELETE"
        });

        if (!response.ok) {
          const result = (await response.json().catch(() => null)) as
            | { message?: string }
            | null;
          throw new Error(result?.message ?? "작업 내역 삭제에 실패했습니다.");
        }
      }

      setWorkHistoryByChannelId((current) => ({
        ...current,
        [activeChannel.id]: (current[activeChannel.id] ?? []).filter(
          (row) => row.id !== id
        )
      }));
    } catch (error) {
      window.alert(getErrorMessage(error, "작업 내역을 삭제하지 못했습니다."));
    }
  }

  async function saveWorkHistory() {
    if (!activeChannel) {
      return;
    }

    const payload = createWorkHistoryPayload({
      channelId: activeChannel.id,
      date: newWorkDate,
      contentType: newWorkContentType,
      taskStatus: newWorkStatus,
      url: newWorkUrl,
      campaignId: newCampaignId,
      quantity: newQuantity,
      costUsd: newCostUsd
    });

    if (!payload) {
      window.alert(
        "입력값을 확인해 주세요. 날짜는 YYYY-MM-DD, Campaign ID는 4자리 숫자여야 합니다."
      );
      return;
    }

    setWorkSubmitPending(true);

    try {
      const nextRecord =
        persistenceEnabled && workHistoryModalMode === "create"
          ? await createWorkHistoryRequest(payload)
          : persistenceEnabled && editingWorkRecordId
            ? await updateWorkHistoryRequest(editingWorkRecordId, payload)
            : createLocalWorkHistoryRecord(payload, editingWorkRecordId);

      setWorkHistoryByChannelId((current) => ({
        ...current,
        [activeChannel.id]:
          workHistoryModalMode === "edit"
            ? (current[activeChannel.id] ?? []).map((row) =>
                row.id === nextRecord.id ? nextRecord : row
              )
            : [nextRecord, ...(current[activeChannel.id] ?? [])]
      }));

      resetWorkHistoryForm();
      closeWorkHistoryModal();
    } catch (error) {
      window.alert(getErrorMessage(error, "작업 내역을 저장하지 못했습니다."));
    } finally {
      setWorkSubmitPending(false);
    }
  }

  function openCreateWorkHistoryModal() {
    setWorkHistoryModalMode("create");
    setEditingWorkRecordId(null);
    resetWorkHistoryForm();
    setIsWorkHistoryModalOpen(true);
  }

  function openEditWorkHistoryModal(row: WorkHistoryRow) {
    setWorkHistoryModalMode("edit");
    setEditingWorkRecordId(row.id);
    setNewWorkDate(row.date);
    setNewWorkContentType(row.contentType);
    setNewWorkStatus(row.taskStatus);
    setNewWorkUrl(row.url);
    setNewCampaignId(row.campaignId);
    setNewQuantity(row.quantity);
    setNewCostUsd(row.costUsd);
    setIsWorkHistoryModalOpen(true);
  }

  function closeWorkHistoryModal() {
    setIsWorkHistoryModalOpen(false);
    setEditingWorkRecordId(null);
  }

  function resetWorkHistoryForm() {
    setNewWorkDate("");
    setNewWorkContentType("Videos");
    setNewWorkStatus("Completed");
    setNewWorkUrl("");
    setNewCampaignId("");
    setNewQuantity("");
    setNewCostUsd("");
  }

  return (
    <>
      <main className="workspace">
        <aside className="sidebar">
          <div className="sidebar__brand">
            <p className="sidebar__eyebrow">SNS Dashboard</p>
            <h1>채널 관리</h1>
          </div>

          <nav className="sidebar__nav" aria-label="채널 메뉴">
            {groupedChannels.map((group) => (
              <section className="sidebar-group" key={group.platform}>
                <div className="sidebar-group__header">
                  <span className="sidebar-group__title">{group.page.name}</span>
                </div>
                <div className="sidebar-group__items">
                  {group.channels.map((channel) => {
                    const isActive = channel.id === activeChannel?.id;

                    return (
                      <button
                        key={channel.id}
                        type="button"
                        className={`nav-button${isActive ? " nav-button--active" : ""}`}
                        onClick={() => setActiveChannelId(channel.id)}
                      >
                        <span className="nav-button__content">
                          <strong>{channel.alias}</strong>
                          <span>{toChannelLabel(channel.url)}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </nav>

          <div className="sidebar__footer">
            <button
              type="button"
              className="sidebar-add-button"
              aria-label="관리 채널 추가"
              onClick={() => setIsChannelModalOpen(true)}
            >
              <span className="sidebar-add-button__icon">+</span>
            </button>
          </div>
        </aside>

        <section className="content">
          <header className="content__header">
            <div className="content__title">
              <p className="content__eyebrow">{currentPage.name}</p>
              <h2>{currentPage.description}</h2>
            </div>
          </header>

          <section className="panel">
            <div className="channel-link-card">
              <div className="channel-link-card__primary">
                <span className="label">관리 채널 주소</span>
                {activeChannel ? (
                  <a
                    className="channel-link"
                    href={activeChannel.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {toChannelLabel(activeChannel.url)}
                  </a>
                ) : (
                  <strong className="empty-inline-message">
                    관리 채널을 먼저 추가해 주세요.
                  </strong>
                )}
              </div>

              <div className="channel-link-card__meta">
                <span className="label">마지막 업데이트</span>
                <strong>{currentPage.lastUpdated}</strong>
              </div>
            </div>

            <div className="tab-toolbar">
              <div className="tab-row" role="tablist" aria-label="상세 구분">
                {(Object.keys(tabLabels) as DetailTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab}
                    className={`tab-button${activeTab === tab ? " tab-button--active" : ""}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tabLabels[tab]}
                  </button>
                ))}
              </div>

              {activeTab === "workHistory" ? (
                <button
                  type="button"
                  className="tab-action-button"
                  onClick={openCreateWorkHistoryModal}
                  disabled={!activeChannel}
                >
                  추가
                </button>
              ) : null}
            </div>

            {activeTab === "postStatus" ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>날짜</th>
                      <th>URL</th>
                      <th>제목</th>
                      <th>현재 조회수</th>
                      <th>전일대비 증가감수</th>
                      <th>현재 좋아요수</th>
                      <th>전일대비 증가감수</th>
                      <th>현재 댓글수</th>
                      <th>전일대비 증가감수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPostStatusRows.length > 0 ? (
                      currentPostStatusRows.map((row) => (
                        <tr key={row.id}>
                          <td>{row.date}</td>
                          <td className="url-cell url-cell--full">
                            <a href={row.url} target="_blank" rel="noreferrer">
                              {row.url}
                            </a>
                          </td>
                          <td>{row.title}</td>
                          <td>{formatNumber(row.currentViews)}</td>
                          <td className={deltaClassName(row.dailyViewDelta)}>
                            {formatSignedNumber(row.dailyViewDelta)}
                          </td>
                          <td>{formatNumber(row.currentLikes)}</td>
                          <td className={deltaClassName(row.dailyLikeDelta)}>
                            {formatSignedNumber(row.dailyLikeDelta)}
                          </td>
                          <td>{formatNumber(row.currentComments)}</td>
                          <td className={deltaClassName(row.dailyCommentDelta)}>
                            {formatSignedNumber(row.dailyCommentDelta)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="empty-state-cell">
                          표시할 게시물 상태 데이터가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table data-table--work-history">
                  <thead>
                    <tr>
                      <th>날짜</th>
                      <th>콘텐츠 유형</th>
                      <th>작업 상태</th>
                      <th>URL</th>
                      <th>Campaign ID</th>
                      <th>수량</th>
                      <th>비용($)</th>
                      <th>액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentWorkHistoryRows.length > 0 ? (
                      currentWorkHistoryRows.map((row) => (
                        <tr key={row.id}>
                          <td>{row.date}</td>
                          <td>{row.contentType}</td>
                          <td>{row.taskStatus}</td>
                          <td className="url-cell url-cell--full">
                            <a href={row.url} target="_blank" rel="noreferrer">
                              {row.url}
                            </a>
                          </td>
                          <td>{row.campaignId}</td>
                          <td>{row.quantity}</td>
                          <td>{formatUsdValue(row.costUsd)}</td>
                          <td className="actions-cell">
                            <button
                              type="button"
                              className="icon-button"
                              aria-label="작업 내역 편집"
                              onClick={() => openEditWorkHistoryModal(row)}
                            >
                              <PencilIcon />
                            </button>
                            <button
                              type="button"
                              className="icon-button icon-button--danger"
                              aria-label="작업 내역 삭제"
                              onClick={() => handleDeleteWorkHistory(row.id)}
                            >
                              <TrashIcon />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="empty-state-cell">
                          등록된 작업 내역이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </section>
      </main>

      {isChannelModalOpen ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setIsChannelModalOpen(false)}
        >
          <div
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-channel-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-panel__header">
              <div>
                <p className="content__eyebrow">채널 추가</p>
                <h3 id="add-channel-title">관리 채널을 추가합니다</h3>
              </div>
              <button
                type="button"
                className="modal-close-button"
                aria-label="팝업 닫기"
                onClick={() => setIsChannelModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-form">
              <label className="form-field">
                <span className="form-field__label">플랫폼</span>
                <select
                  className="form-field__control"
                  value={newPlatform}
                  onChange={(event) =>
                    setNewPlatform(event.target.value as PlatformKey)
                  }
                >
                  {platformOrder.map((platform) => (
                    <option key={platform} value={platform}>
                      {platformPages[platform].name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span className="form-field__label">별칭</span>
                <input
                  className="form-field__control"
                  value={newAlias}
                  onChange={(event) => setNewAlias(event.target.value)}
                  placeholder="예: Brand Main"
                />
              </label>

              <label className="form-field">
                <span className="form-field__label">관리 채널 주소</span>
                <input
                  className="form-field__control"
                  value={newChannelUrl}
                  onChange={(event) => setNewChannelUrl(event.target.value)}
                  placeholder="https://"
                />
              </label>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="modal-action-button"
                onClick={() => setIsChannelModalOpen(false)}
                disabled={channelSubmitPending}
              >
                취소
              </button>
              <button
                type="button"
                className="modal-action-button modal-action-button--primary"
                onClick={handleCreateChannel}
                disabled={channelSubmitPending}
              >
                {channelSubmitPending ? "저장 중..." : "추가"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isWorkHistoryModalOpen ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={closeWorkHistoryModal}
        >
          <div
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="work-history-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-panel__header">
              <div>
                <p className="content__eyebrow">운영 기록</p>
                <h3 id="work-history-modal-title">
                  {workHistoryModalMode === "create"
                    ? `${currentPage.name} 작업 내역을 추가합니다`
                    : `${currentPage.name} 작업 내역을 편집합니다`}
                </h3>
              </div>
              <button
                type="button"
                className="modal-close-button"
                aria-label="팝업 닫기"
                onClick={closeWorkHistoryModal}
              >
                ×
              </button>
            </div>

            <div className="modal-form">
              <label className="form-field">
                <span className="form-field__label">날짜</span>
                <input
                  className="form-field__control"
                  value={newWorkDate}
                  onChange={(event) => setNewWorkDate(event.target.value)}
                  placeholder="YYYY-MM-DD"
                />
              </label>

              <label className="form-field">
                <span className="form-field__label">콘텐츠 유형</span>
                <select
                  className="form-field__control"
                  value={newWorkContentType}
                  onChange={(event) =>
                    setNewWorkContentType(event.target.value as WorkContentType)
                  }
                >
                  {workContentTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span className="form-field__label">작업 상태</span>
                <select
                  className="form-field__control"
                  value={newWorkStatus}
                  onChange={(event) =>
                    setNewWorkStatus(event.target.value as WorkStatus)
                  }
                >
                  {workStatusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span className="form-field__label">URL</span>
                <input
                  className="form-field__control"
                  value={newWorkUrl}
                  onChange={(event) => setNewWorkUrl(event.target.value)}
                  placeholder="https://"
                />
              </label>

              <label className="form-field">
                <span className="form-field__label">Campaign ID</span>
                <input
                  inputMode="numeric"
                  maxLength={4}
                  className="form-field__control"
                  value={newCampaignId}
                  onChange={(event) =>
                    setNewCampaignId(
                      event.target.value.replace(/\D/g, "").slice(0, 4)
                    )
                  }
                  placeholder="예: 3102"
                />
              </label>

              <label className="form-field">
                <span className="form-field__label">수량</span>
                <input
                  className="form-field__control"
                  value={newQuantity}
                  onChange={(event) => setNewQuantity(event.target.value)}
                  placeholder="예: 5000"
                />
              </label>

              <label className="form-field">
                <span className="form-field__label">비용($)</span>
                <input
                  className="form-field__control"
                  value={newCostUsd}
                  onChange={(event) => setNewCostUsd(event.target.value)}
                  placeholder="예: 52.50"
                />
              </label>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="modal-action-button"
                onClick={closeWorkHistoryModal}
                disabled={workSubmitPending}
              >
                취소
              </button>
              <button
                type="button"
                className="modal-action-button modal-action-button--primary"
                onClick={saveWorkHistory}
                disabled={workSubmitPending || !activeChannel}
              >
                {workSubmitPending
                  ? "저장 중..."
                  : workHistoryModalMode === "create"
                    ? "추가"
                    : "저장"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

async function createManagedChannelRequest(payload: CreateManagedChannelInput) {
  const response = await fetch("/api/channels", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const result = (await response.json().catch(() => null)) as
    | { channel?: ManagedChannelEntry; message?: string }
    | null;

  if (!response.ok || !result?.channel) {
    throw new Error(result?.message ?? "관리 채널 생성에 실패했습니다.");
  }

  return result.channel;
}

async function createWorkHistoryRequest(payload: SaveWorkHistoryInput) {
  const response = await fetch("/api/work-history", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const result = (await response.json().catch(() => null)) as
    | { workHistory?: WorkHistoryRow; message?: string }
    | null;

  if (!response.ok || !result?.workHistory) {
    throw new Error(result?.message ?? "작업 내역 저장에 실패했습니다.");
  }

  return result.workHistory;
}

async function updateWorkHistoryRequest(id: string, payload: SaveWorkHistoryInput) {
  const response = await fetch(`/api/work-history/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const result = (await response.json().catch(() => null)) as
    | { workHistory?: WorkHistoryRow; message?: string }
    | null;

  if (!response.ok || !result?.workHistory) {
    throw new Error(result?.message ?? "작업 내역 수정에 실패했습니다.");
  }

  return result.workHistory;
}

function createManagedChannelPayload({
  platform,
  alias,
  url
}: CreateManagedChannelInput): CreateManagedChannelInput | null {
  const normalizedAlias = alias.trim();
  const normalizedUrl = normalizeUrl(url);

  if (!normalizedAlias || !normalizedUrl) {
    return null;
  }

  return {
    platform,
    alias: normalizedAlias,
    url: normalizedUrl
  };
}

function createWorkHistoryPayload(
  input: SaveWorkHistoryInput
): SaveWorkHistoryInput | null {
  const normalizedDate = input.date.trim();
  const normalizedUrl = normalizeUrl(input.url);
  const normalizedCampaignId = normalizeCampaignId(input.campaignId);
  const normalizedQuantity = input.quantity.trim();
  const normalizedCostUsd = normalizeUsd(input.costUsd);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate) ||
    !normalizedUrl ||
    !normalizedCampaignId ||
    !normalizedQuantity ||
    !normalizedCostUsd
  ) {
    return null;
  }

  return {
    ...input,
    date: normalizedDate,
    url: normalizedUrl,
    campaignId: normalizedCampaignId,
    quantity: normalizedQuantity,
    costUsd: normalizedCostUsd
  };
}

function createLocalWorkHistoryRecord(
  input: SaveWorkHistoryInput,
  existingId: string | null
): WorkHistoryRow {
  return {
    id: existingId ?? `${input.channelId}-log-${Date.now()}`,
    date: input.date,
    contentType: input.contentType,
    taskStatus: input.taskStatus,
    url: input.url,
    campaignId: input.campaignId,
    quantity: input.quantity,
    costUsd: input.costUsd
  };
}

function deltaClassName(value: number) {
  if (value > 0) {
    return "delta delta--positive";
  }

  if (value < 0) {
    return "delta delta--negative";
  }

  return "delta";
}

function toChannelLabel(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 20l4.5-1 9.2-9.2a2.1 2.1 0 0 0 0-3L16.2 5a2.1 2.1 0 0 0-3 0L4 14.2 3 18.8 4 20Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M12.8 6.5 17.5 11.2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 7h14"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
      <path
        d="M9 7V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M7.2 7 8 19.2A1.8 1.8 0 0 0 9.8 21h4.4A1.8 1.8 0 0 0 16 19.2L16.8 7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M10 11v5M14 11v5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}
