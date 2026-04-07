import type {
  DashboardInitialData,
  ManagedChannelEntry,
  PlatformKey,
  PlatformPageMeta,
  PostStatusRow,
  WorkContentType,
  WorkHistoryRow,
  WorkStatus
} from "@/types/dashboard";

export const platformOrder: PlatformKey[] = [
  "youtube",
  "tiktok",
  "x",
  "instagram",
  "facebook"
];

export const workContentTypeOptions: WorkContentType[] = [
  "Channel",
  "Videos",
  "Shorts",
  "Posts"
];

export const workStatusOptions: WorkStatus[] = [
  "Completed",
  "Processing",
  "Pending",
  "Failed"
];

export const platformPages: Record<PlatformKey, PlatformPageMeta> = {
  youtube: {
    key: "youtube",
    name: "YouTube",
    description: "Videos, Shorts, Channel 관리 (Subs, Views, Likes, Comments)",
    lastUpdated: "2026-04-08 00:10 KST"
  },
  tiktok: {
    key: "tiktok",
    name: "TikTok",
    description: "Videos, Channel 관리 (Subs, Views, Likes, Comments)",
    lastUpdated: "2026-04-08 00:10 KST"
  },
  x: {
    key: "x",
    name: "X",
    description: "Posts, Channel 관리 (Subs, Posts, Likes, Comments)",
    lastUpdated: "2026-04-08 00:10 KST"
  },
  instagram: {
    key: "instagram",
    name: "Instagram",
    description: "Posts, Channels 관라 (Subs, Posts, Likes, Comments)",
    lastUpdated: "2026-04-08 00:10 KST"
  },
  facebook: {
    key: "facebook",
    name: "Facebook",
    description: "Posts, Channels 관라 (Subs, Posts, Likes, Comments)",
    lastUpdated: "2026-04-08 00:10 KST"
  }
};

export const initialManagedChannels: ManagedChannelEntry[] = [
  {
    id: "youtube-1",
    platform: "youtube",
    alias: "myinvestmentmarkets",
    url: "https://www.youtube.com/@ranaakondo913"
  },
  {
    id: "tiktok-1",
    platform: "tiktok",
    alias: "Myinvestmentmarkets",
    url: "https://www.tiktok.com/@mim_global"
  },
  {
    id: "x-1",
    platform: "x",
    alias: "Myinvestmentmarkets",
    url: "https://x.com/mim_globalX"
  },
  {
    id: "instagram-1",
    platform: "instagram",
    alias: "Myinvestmentmarkets",
    url: "https://www.instagram.com/brand.story"
  },
  {
    id: "facebook-1",
    platform: "facebook",
    alias: "Myinvestmentmarkets",
    url: "https://www.facebook.com/brandmain"
  }
];

export const initialPostStatusRowsByPlatform: Record<PlatformKey, PostStatusRow[]> = {
  youtube: [],
  tiktok: [],
  x: [],
  instagram: [
    {
      id: "ig-post-1",
      date: "2026-04-07",
      url: "https://www.instagram.com/p/IGPOST001/",
      title: "Behind the scenes reel",
      currentViews: 28840,
      dailyViewDelta: 4730,
      currentLikes: 1802,
      dailyLikeDelta: 198,
      currentComments: 118,
      dailyCommentDelta: 15
    },
    {
      id: "ig-post-2",
      date: "2026-04-06",
      url: "https://www.instagram.com/p/IGPOST002/",
      title: "Carousel announcement post",
      currentViews: 9540,
      dailyViewDelta: 860,
      currentLikes: 724,
      dailyLikeDelta: 54,
      currentComments: 32,
      dailyCommentDelta: 3
    }
  ],
  facebook: [
    {
      id: "fb-post-1",
      date: "2026-04-07",
      url: "https://www.facebook.com/brandmain/posts/110001",
      title: "Weekly feature roundup",
      currentViews: 12480,
      dailyViewDelta: 940,
      currentLikes: 610,
      dailyLikeDelta: 42,
      currentComments: 27,
      dailyCommentDelta: 1
    },
    {
      id: "fb-post-2",
      date: "2026-04-06",
      url: "https://www.facebook.com/brandmain/posts/110002",
      title: "Customer story clip",
      currentViews: 8360,
      dailyViewDelta: 310,
      currentLikes: 422,
      dailyLikeDelta: 17,
      currentComments: 18,
      dailyCommentDelta: -1
    }
  ]
};

export const initialWorkHistoryRowsByPlatform: Record<PlatformKey, WorkHistoryRow[]> =
  {
    youtube: [],
    tiktok: [],
    x: [],
    instagram: [
      {
        id: "ig-log-1",
        date: "2026-04-07",
        contentType: "Posts",
        taskStatus: "Completed",
        url: "https://www.instagram.com/p/IGPOST001/",
        campaignId: "5078",
        quantity: "900",
        costUsd: "19.80"
      }
    ],
    facebook: [
      {
        id: "fb-log-1",
        date: "2026-04-06",
        contentType: "Posts",
        taskStatus: "Completed",
        url: "https://www.facebook.com/brandmain/posts/110001",
        campaignId: "2290",
        quantity: "3000",
        costUsd: "17.50"
      }
    ]
  };

export function createFallbackDashboardState(): DashboardInitialData {
  const managedChannels = initialManagedChannels.map((channel) => ({ ...channel }));
  const postStatusByChannelId = Object.fromEntries(
    managedChannels.map((channel) => [
      channel.id,
      initialPostStatusRowsByPlatform[channel.platform].map((row) => ({ ...row }))
    ])
  ) as Record<string, PostStatusRow[]>;

  const workHistoryByChannelId = Object.fromEntries(
    managedChannels.map((channel) => [
      channel.id,
      initialWorkHistoryRowsByPlatform[channel.platform].map((row) => ({ ...row }))
    ])
  ) as Record<string, WorkHistoryRow[]>;

  const channelAuthStatusByChannelId = Object.fromEntries(
    managedChannels.map((channel) => [
      channel.id,
      {
        connected: false,
        platform: channel.platform,
        expiresAt: null,
        scope: null
      }
    ])
  );

  return {
    dataSource: "fallback",
    managedChannels,
    postStatusByChannelId,
    workHistoryByChannelId,
    channelAuthStatusByChannelId,
    tiktokOAuthEnabled: false
  };
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatSignedNumber(value: number) {
  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${prefix}${new Intl.NumberFormat("en-US").format(Math.abs(value))}`;
}

export function formatUsdValue(value: string) {
  return value.startsWith("$") ? value : `$${value}`;
}
