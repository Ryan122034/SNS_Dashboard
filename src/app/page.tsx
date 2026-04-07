import {
  calculateDelta,
  calculateDeltaRate,
  channels,
  formatCompactNumber,
  metricCards,
  posts,
  syncJobs
} from "@/lib/dashboard-data";

const toneClassName: Record<string, string> = {
  positive: "metric-card__delta metric-card__delta--positive",
  neutral: "metric-card__delta metric-card__delta--neutral",
  caution: "metric-card__delta metric-card__delta--caution"
};

const syncClassName: Record<string, string> = {
  Healthy: "pill pill--healthy",
  Review: "pill pill--review",
  Blocked: "pill pill--blocked"
};

export default function Home() {
  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero__copy">
          <span className="eyebrow">Internal Monitoring Dashboard</span>
          <h1>Cross-platform content performance, organized for daily ops.</h1>
          <p>
            Start with official APIs, store point-in-time snapshots, and compare
            every post by view, like, and comment movement without switching
            tools.
          </p>
        </div>
        <div className="hero__panel">
          <div className="hero__badge">MVP Focus</div>
          <strong>YouTube-first rollout</strong>
          <p>
            The foundation is ready for Vercel deployment, cron-based sync jobs,
            and a database-backed history table.
          </p>
        </div>
      </section>

      <section className="metrics-grid" aria-label="Overview metrics">
        {metricCards.map((card) => (
          <article className="metric-card" key={card.id}>
            <span className="metric-card__label">{card.label}</span>
            <strong className="metric-card__value">{card.value}</strong>
            <span className={toneClassName[card.tone]}>{card.delta}</span>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel__header">
            <div>
              <span className="eyebrow">Tracked Channels</span>
              <h2>Account health at a glance</h2>
            </div>
            <span className="panel__hint">Mock seed data for MVP layout</span>
          </div>
          <div className="channel-list">
            {channels.map((channel) => (
              <div className="channel-card" key={channel.id}>
                <div>
                  <span className="channel-card__platform">{channel.platform}</span>
                  <h3>{channel.name}</h3>
                  <p>{channel.handle}</p>
                </div>
                <dl>
                  <div>
                    <dt>Posts</dt>
                    <dd>{channel.contentCount}</dd>
                  </div>
                  <div>
                    <dt>Followers</dt>
                    <dd>{formatCompactNumber(channel.followers)}</dd>
                  </div>
                  <div>
                    <dt>Growth</dt>
                    <dd>+{channel.growthRate}%</dd>
                  </div>
                </dl>
                <span className="channel-card__sync">
                  Last sync {channel.lastSyncAt}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel__header">
            <div>
              <span className="eyebrow">Sync Pipeline</span>
              <h2>Platform readiness</h2>
            </div>
            <span className="panel__hint">What needs setup before live sync</span>
          </div>
          <div className="sync-list">
            {syncJobs.map((job) => (
              <div className="sync-row" key={job.id}>
                <div>
                  <strong>{job.platform}</strong>
                  <p>{job.note}</p>
                </div>
                <div className="sync-row__meta">
                  <span className={syncClassName[job.status]}>{job.status}</span>
                  <span>{job.cadence}</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <span className="eyebrow">Post Movement</span>
            <h2>Recent content snapshot deltas</h2>
          </div>
          <span className="panel__hint">
            Compare each sync point to show per-post change
          </span>
        </div>
        <div className="table-scroll">
          <table className="performance-table">
            <thead>
              <tr>
                <th>Post</th>
                <th>Published</th>
                <th>Views</th>
                <th>Likes</th>
                <th>Comments</th>
                <th>Change Rate</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => {
                const viewDelta = calculateDelta(
                  post.current.views,
                  post.previous.views
                );
                const likeDelta = calculateDelta(
                  post.current.likes,
                  post.previous.likes
                );
                const commentDelta = calculateDelta(
                  post.current.comments,
                  post.previous.comments
                );
                const growthRate = calculateDeltaRate(
                  post.current.views,
                  post.previous.views
                );

                return (
                  <tr key={post.id}>
                    <td>
                      <div className="post-cell">
                        <span className="post-cell__platform">{post.platform}</span>
                        <div>
                          <strong>{post.title}</strong>
                          <p>
                            {post.kind} ·{" "}
                            <a href={post.url} target="_blank" rel="noreferrer">
                              Open post
                            </a>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>{post.publishedAt}</td>
                    <td>
                      {formatCompactNumber(post.current.views)}
                      <span className="delta-text">+{formatCompactNumber(viewDelta)}</span>
                    </td>
                    <td>
                      {formatCompactNumber(post.current.likes)}
                      <span className="delta-text">+{formatCompactNumber(likeDelta)}</span>
                    </td>
                    <td>
                      {formatCompactNumber(post.current.comments)}
                      <span className="delta-text">
                        +{formatCompactNumber(commentDelta)}
                      </span>
                    </td>
                    <td className="growth-rate">
                      +{growthRate.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
