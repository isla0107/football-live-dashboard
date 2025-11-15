import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { MatchDetailsPanel } from "./components/MatchDetailsPanel";

const API_BASE = "http://localhost:4000";

const LIVE_STATUS_SHORT = ["1H", "2H", "ET", "P", "BT", "LIVE"];

// Simple helper: get display for status/elapsed
function formatStatus(fixture) {
  const s = fixture.fixture.status;
  if (s.short === "FT") return "FT";
  if (LIVE_STATUS_SHORT.includes(s.short)) {
    return s.elapsed ? `${s.elapsed}'` : "LIVE";
  }
  return s.short || "";
}

function App() {
  const [tab, setTab] = useState("today"); // "today" | "live"
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);

  const [leagueFilter, setLeagueFilter] = useState("all");
  const [showOnlyFavourites, setShowOnlyFavourites] = useState(false);
  const [favouriteTeams, setFavouriteTeams] = useState([]);
  const [selectedFixture, setSelectedFixture] = useState(null);

  // Load fixtures once (today) and then filter in UI
  useEffect(() => {
    async function fetchFixtures() {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/api/fixtures/today`);
        setFixtures(res.data?.response || []);
      } catch (err) {
        console.error("Error fetching fixtures:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchFixtures();
  }, []);

  // Load favourites from backend
  useEffect(() => {
    async function fetchFavourites() {
      try {
        const res = await axios.get(
          `${API_BASE}/api/favourites/teams?userId=1`
        );
        setFavouriteTeams(res.data?.favourites || []);
      } catch (err) {
        console.error("Error fetching favourite teams:", err);
      }
    }
    fetchFavourites();
  }, []);

  // Unique leagues for dropdown
  const leagues = useMemo(() => {
    const map = new Map();
    for (const f of fixtures) {
      if (!map.has(f.league.id)) {
        map.set(f.league.id, {
          id: f.league.id,
          name: f.league.name,
          country: f.league.country,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [fixtures]);

  // Toggle favourite team (home team for now)
  async function toggleFavourite(teamName) {
    const isFav = favouriteTeams.includes(teamName);
    try {
      if (isFav) {
        await axios.delete(`${API_BASE}/api/favourites/teams`, {
          data: { userId: 1, teamName },
        });
        setFavouriteTeams((prev) => prev.filter((t) => t !== teamName));
      } else {
        await axios.post(`${API_BASE}/api/favourites/teams`, {
          userId: 1,
          teamName,
        });
        setFavouriteTeams((prev) => [...prev, teamName]);
      }
    } catch (err) {
      console.error("Error toggling favourite:", err);
    }
  }

  // Apply tab (today/live), league and favourites filters
  const visibleFixtures = useMemo(() => {
    let list = fixtures;

    if (tab === "live") {
      list = list.filter((f) =>
        LIVE_STATUS_SHORT.includes(f.fixture?.status?.short)
      );
    }

    if (leagueFilter !== "all") {
      const leagueId = parseInt(leagueFilter, 10);
      list = list.filter((f) => f.league.id === leagueId);
    }

    if (showOnlyFavourites) {
      list = list.filter(
        (f) =>
          favouriteTeams.includes(f.teams.home.name) ||
          favouriteTeams.includes(f.teams.away.name)
      );
    }

    return list;
  }, [fixtures, tab, leagueFilter, showOnlyFavourites, favouriteTeams]);

  // When fixtures list changes, keep selected if still visible; otherwise clear
  useEffect(() => {
    if (
      selectedFixture &&
      !visibleFixtures.some(
        (f) => f.fixture.id === selectedFixture.fixture.id
      )
    ) {
      setSelectedFixture(null);
    }
  }, [visibleFixtures, selectedFixture]);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <header
        style={{
          padding: "16px",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <h1 style={{ margin: "0 0 12px 0" }}>Football Dashboard</h1>

        {/* Tabs */}
        <div
          style={{
            display: "inline-flex",
            borderRadius: "999px",
            border: "1px solid #ddd",
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => setTab("today")}
            style={{
              padding: "6px 16px",
              border: "none",
              cursor: "pointer",
              background: tab === "today" ? "#000" : "transparent",
              color: tab === "today" ? "#fff" : "#000",
              fontSize: "14px",
            }}
          >
            Today&apos;s Fixtures
          </button>
          <button
            onClick={() => setTab("live")}
            style={{
              padding: "6px 16px",
              border: "none",
              cursor: "pointer",
              background: tab === "live" ? "#000" : "transparent",
              color: tab === "live" ? "#fff" : "#000",
              fontSize: "14px",
            }}
          >
            Live Now
          </button>
        </div>
      </header>

      {/* Main layout: left list, right details */}
      <main
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 16px 24px",
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1.4fr)",
          gap: "16px",
          alignItems: "flex-start",
        }}
      >
        {/* LEFT: filters + fixtures list */}
        <section>
          {/* Filters bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "8px",
              fontSize: "13px",
            }}
          >
            <label>
              League:&nbsp;
              <select
                value={leagueFilter}
                onChange={(e) => setLeagueFilter(e.target.value)}
              >
                <option value="all">All leagues</option>
                {leagues.map((lg) => (
                  <option key={lg.id} value={lg.id}>
                    {lg.name} ({lg.country})
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                type="checkbox"
                checked={showOnlyFavourites}
                onChange={(e) => setShowOnlyFavourites(e.target.checked)}
              />
              Show only favourite teams
            </label>
          </div>

          {/* Fixtures list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {loading ? (
              <p>Loading fixtures...</p>
            ) : visibleFixtures.length === 0 ? (
              <p>No fixtures found for current filters.</p>
            ) : (
              visibleFixtures.map((f) => {
                const status = formatStatus(f);
                const isFav = favouriteTeams.includes(f.teams.home.name);

                return (
                  <div
                    key={f.fixture.id}
                    onClick={() => setSelectedFixture(f)}
                    style={{
                      background: "#fff",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      border:
                        selectedFixture?.fixture?.id === f.fixture.id
                          ? "2px solid #007bff"
                          : "1px solid #eee",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "4px",
                        fontSize: "11px",
                        color: "#666",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {f.league.logo && (
                          <img
                            src={f.league.logo}
                            alt="league logo"
                            style={{ width: 14, height: 14, objectFit: "contain" }}
                          />
                        )}
                        {f.league.name} ({f.league.country})
                      </span>
                      <span>{status}</span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        {/* Home team */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {f.teams.home.logo && (
                            <img
                              src={f.teams.home.logo}
                              alt={f.teams.home.name}
                              style={{ width: 18, height: 18, objectFit: "contain" }}
                            />
                          )}
                          <span>{f.teams.home.name}</span>
                        </div>

                        {/* Away team */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: "12px",
                            color: "#444",
                            marginTop: 2,
                          }}
                        >
                          {f.teams.away.logo && (
                            <img
                              src={f.teams.away.logo}
                              alt={f.teams.away.name}
                              style={{ width: 18, height: 18, objectFit: "contain" }}
                            />
                          )}
                          <span>{f.teams.away.name}</span>
                        </div>
                      </div>

                      <div style={{ textAlign: "center", width: "60px" }}>
                        <div style={{ fontWeight: "bold" }}>
                          {f.goals.home ?? "-"} : {f.goals.away ?? "-"}
                        </div>
                        <div style={{ fontSize: "11px", color: "#555" }}>
                          {f.fixture.date
                            ? new Date(f.fixture.date).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" }
                              )
                            : ""}
                        </div>
                      </div>
                      {/* Favourite star (click stops event so it doesn't re-select) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavourite(f.teams.home.name);
                        }}
                        style={{
                          marginLeft: "8px",
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                          fontSize: "18px",
                        }}
                        title="Toggle favourite (home team)"
                      >
                        {isFav ? "★" : "☆"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* RIGHT: details panel */}
        <aside style={{ minHeight: "300px" }}>
          <MatchDetailsPanel fixture={selectedFixture} />
        </aside>
      </main>
    </div>
  );
}

export default App;

