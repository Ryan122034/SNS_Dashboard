import type {
  ManagedChannelEntry,
  ManagedChannelPage,
  PlatformKey,
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

export const initialManagedChannels: ManagedChannelEntry[] = [
  {
    id: "youtube-1",
    platform: "youtube",
    alias: "Brand Main",
    url: "https://www.youtube.com/@brandmain"
  },
  {
    id: "tiktok-1",
    platform: "tiktok",
    alias: "Brand Clips",
    url: "https://www.tiktok.com/@brandclips"
  },
  {
    id: "x-1",
    platform: "x",
    alias: "Brand Updates",
    url: "https://x.com/brand_updates"
  },
  {
    id: "instagram-1",
    platform: "instagram",
    alias: "Brand Story",
    url: "https://www.instagram.com/brand.story"
  },
  {
    id: "facebook-1",
    platform: "facebook",
    alias: "Brand Page",
    url: "https://www.facebook.com/brandmain"
  }
];

export const managedChannelPages: Record<PlatformKey, ManagedChannelPage> = {
  youtube: {
    key: "youtube",
    name: "YouTube",
    shortName: "YT",
    description: "Videos, Shorts, Channel 관리 (Subs, Views, Likes, Comments)",
    lastUpdated: "2026-04-08 00:10 KST",
    postStatusRows: [
      {
        id: "yt-post-1",
        date: "2026-04-07",
        url: "https://www.youtube.com/watch?v=launch001",
        title: "April Product Launch Walkthrough",
        currentViews: 42815,
        dailyViewDelta: 6175,
        currentLikes: 2910,
        dailyLikeDelta: 422,
        currentComments: 214,
        dailyCommentDelta: 32
      },
      {
        id: "yt-post-2",
        date: "2026-04-07",
        url: "https://www.youtube.com/shorts/quicktip002",
        title: "3 Tips in 30 Seconds",
        currentViews: 96320,
        dailyViewDelta: 25100,
        currentLikes: 6842,
        dailyLikeDelta: 1432,
        currentComments: 96,
        dailyCommentDelta: 23
      },
      {
        id: "yt-post-3",
        date: "2026-04-06",
        url: "https://www.youtube.com/watch?v=review003",
        title: "Customer Review Highlights",
        currentViews: 18360,
        dailyViewDelta: -420,
        currentLikes: 1408,
        dailyLikeDelta: 18,
        currentComments: 87,
        dailyCommentDelta: -4
      }
    ],
    workHistoryRows: [
      {
        id: "yt-log-1",
        date: "2026-04-07",
        contentType: "Videos",
        taskStatus: "Completed",
        url: "https://www.youtube.com/watch?v=launch001",
        campaignId: "3102",
        quantity: "5000",
        costUsd: "52.50"
      },
      {
        id: "yt-log-2",
        date: "2026-04-07",
        contentType: "Shorts",
        taskStatus: "Processing",
        url: "https://www.youtube.com/shorts/quicktip002",
        campaignId: "1198",
        quantity: "1200",
        costUsd: "31.00"
      },
      {
        id: "yt-log-3",
        date: "2026-04-06",
        contentType: "Videos",
        taskStatus: "Pending",
        url: "https://www.youtube.com/watch?v=review003",
        campaignId: "4421",
        quantity: "80",
        costUsd: "14.40"
      }
    ]
  },
  tiktok: {
    key: "tiktok",
    name: "TikTok",
    shortName: "TT",
    description: "Videos, Channel 관리 (Subs, Views, Likes, Comments)",
    lastUpdated: "2026-04-08 00:10 KST",
    postStatusRows: [
      {
        id: "tt-post-1",
        date: "2026-04-07",
        url: "https://www.tiktok.com/@brandclips/video/74511001",
        title: "Quick Feature Demo",
        currentViews: 51400,
        dailyViewDelta: 9350,
        currentLikes: 4398,
        dailyLikeDelta: 687,
        currentComments: 147,
        dailyCommentDelta: 28
      },
      {
        id: "tt-post-2",
        date: "2026-04-07",
        url: "https://www.tiktok.com/@brandclips/video/74511002",
        title: "One Minute Comparison",
        currentViews: 27840,
        dailyViewDelta: 2210,
        currentLikes: 1894,
        dailyLikeDelta: 146,
        currentComments: 64,
        dailyCommentDelta: 5
      }
    ],
    workHistoryRows: [
      {
        id: "tt-log-1",
        date: "2026-04-07",
        contentType: "Videos",
        taskStatus: "Completed",
        url: "https://www.tiktok.com/@brandclips/video/74511001",
        campaignId: "2450",
        quantity: "10000",
        costUsd: "47.80"
      },
      {
        id: "tt-log-2",
        date: "2026-04-06",
        contentType: "Videos",
        taskStatus: "Processing",
        url: "https://www.tiktok.com/@brandclips/video/74511002",
        campaignId: "1181",
        quantity: "1500",
        costUsd: "23.40"
      }
    ]
  },
  x: {
    key: "x",
    name: "X",
    shortName: "X",
    description: "Posts, Channel 관리 (Subs, Posts, Likes, Comments)",
    lastUpdated: "2026-04-08 00:10 KST",
    postStatusRows: [
      {
        id: "x-post-1",
        date: "2026-04-07",
        url: "https://x.com/brand_updates/status/190010001",
        title: "Launch announcement thread",
        currentViews: 21340,
        dailyViewDelta: 1840,
        currentLikes: 1186,
        dailyLikeDelta: 93,
        currentComments: 74,
        dailyCommentDelta: 7
      },
      {
        id: "x-post-2",
        date: "2026-04-06",
        url: "https://x.com/brand_updates/status/190010002",
        title: "Feature teaser post",
        currentViews: 13880,
        dailyViewDelta: -150,
        currentLikes: 860,
        dailyLikeDelta: -8,
        currentComments: 31,
        dailyCommentDelta: 2
      }
    ],
    workHistoryRows: [
      {
        id: "x-log-1",
        date: "2026-04-07",
        contentType: "Posts",
        taskStatus: "Completed",
        url: "https://x.com/brand_updates/status/190010001",
        campaignId: "7740",
        quantity: "4000",
        costUsd: "28.00"
      }
    ]
  },
  instagram: {
    key: "instagram",
    name: "Instagram",
    shortName: "IG",
    description: "Posts, Channels 관라 (Subs, Posts, Likes, Comments)",
    lastUpdated: "2026-04-08 00:10 KST",
    postStatusRows: [
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
    workHistoryRows: [
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
    ]
  },
  facebook: {
    key: "facebook",
    name: "Facebook",
    shortName: "FB",
    description: "Posts, Channels 관라 (Subs, Posts, Likes, Comments)",
    lastUpdated: "2026-04-08 00:10 KST",
    postStatusRows: [
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
    ],
    workHistoryRows: [
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
  }
};

export function createInitialWorkHistoryByPlatform(): Record<
  PlatformKey,
  WorkHistoryRow[]
> {
  return {
    youtube: managedChannelPages.youtube.workHistoryRows.map((row) => ({ ...row })),
    tiktok: managedChannelPages.tiktok.workHistoryRows.map((row) => ({ ...row })),
    x: managedChannelPages.x.workHistoryRows.map((row) => ({ ...row })),
    instagram: managedChannelPages.instagram.workHistoryRows.map((row) => ({
      ...row
    })),
    facebook: managedChannelPages.facebook.workHistoryRows.map((row) => ({
      ...row
    }))
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
