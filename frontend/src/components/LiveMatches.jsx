import React, { useState, useMemo } from "react";
import { useTodayFixtures } from "../hooks/useTodayFixtures";
import { useFavouriteTeams } from "../hooks/useFavouriteTeams";
import { MatchCard } from "./MatchCard";
import { MatchDetailsModal } from "./MatchDetailsModal";

export function LiveMatches() {
  const [activeTab, setActiveTab] = useState("today"); // 'today' | 'live'
  const [selectedLeagueId, setSelectedLeagueId] = useState("");
  const [showFavouritesOnly, setShowFavouritesOnly] = useState(false);
  const [selectedFixture, setSelectedFixture] = useState(null);

  const { fixtures, leagues, loading, error } =
    useTodayFixtures(selectedLeagueId || null);
  const { favourites, toggleFavourite } = useFavouriteTeams(1); // hard-coded userId 1 for now

  const filteredFixtures = useMemo(() => {
    let list = fixtures;

    // "Live Now" tab: only matches in progress
    if (activeTab === "live") {
      list = list.filter((item) => {
        const status = item.fixture.status?.short;
        return status && status !== "NS" && status !== "FT";
      });
    }

    // Favourites filter
    if (showFavouritesOnly) {
      list = list.filter((item) => {
        const home = item.teams.home.name;
        const away = item.teams.away.name;
        return favourites.includes(home) || favourites.includes(away);
      });
    }

    return list;
  }, [fixtures, activeTab, showFavouritesOnly, favourites]);

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "16px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI'",
      }}
    >
      <h1 style={{ textAlign: "center" }}>Football Dashboard</h1>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "12px",
          gap: "8px",
        }}
      >
        <button
          onClick={() => setActiveTab("today")}
          style={{
            padding: "8px 16px",
            borderRadius: "999px",
            border: activeTab === "today" ? "2px solid #007bff" : "1px solid #ccc",
            background: activeTab === "today" ? "#e6f0ff" : "#fff",
            cursor: "pointer",
          }}
        >
          Today's Fixtures
        </button>
        <button
          onClick={() => setActiveTab("live")}
          style={{
            padding: "8px 16px",
            borderRadius: "999px",
            border: activeTab === "live" ? "2px solid #007bff" : "1px solid #ccc",
            background: activeTab === "live" ? "#e6f0ff" : "#fff",
            cursor: "pointer",
          }}
        >
          Live Now
        </button>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <div>
          <label style={{ fontSize: "14px", marginRight: "6px" }}>
            League:
          </label>
          <select
            value={selectedLeagueId}
            onChange={(e) => setSelectedLeagueId(e.target.value)}
          >
            <option value="">All leagues</option>
            {leagues.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.country})
              </option>
            ))}
          </select>
        </div>

        <label
          style={{
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <input
            type="checkbox"
            checked={showFavouritesOnly}
            onChange={(e) => setShowFavouritesOnly(e.target.checked)}
          />
          Show only favourite teams
        </label>
      </div>

      {/* Status + list */}
      {loading && <p>Loading fixtures...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && filteredFixtures.length === 0 && (
        <p>No fixtures found for the selected filters.</p>
      )}

      <div>
        {filteredFixtures.map((fixture) => {
          const home = fixture.teams.home.name;
          const isFav = favourites.includes(home);

          return (
            <MatchCard
              key={fixture.fixture.id}
              fixture={fixture}
              isFavourite={isFav}
              onToggleFavourite={() => toggleFavourite(home)}
              onClick={() => setSelectedFixture(fixture)}
            />
          );
        })}
      </div>

      {/* Modal */}
      {selectedFixture && (
        <MatchDetailsModal
          fixture={selectedFixture}
          onClose={() => setSelectedFixture(null)}
        />
      )}
    </div>
  );
}
