import React from "react";

export function MatchCard({ fixture, isFavourite, onToggleFavourite, onClick }) {
  const { league, teams, goals, fixture: fixtureInfo } = fixture;

  const startTime = fixtureInfo.date
    ? new Date(fixtureInfo.date).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

  const statusShort = fixtureInfo.status?.short || "";
  const score = `${goals.home ?? "-"} : ${goals.away ?? "-"}`;

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "10px",
        marginBottom: "10px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        cursor: "pointer",
      }}
      onClick={onClick}
    >
      {/* Top bar with league + star */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "4px",
        }}
      >
        <span style={{ fontSize: "12px", color: "#666" }}>
          {league.name} ({league.country})
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation(); // don't trigger card click
            onToggleFavourite();
          }}
          style={{
            border: "none",
            background: "none",
            fontSize: "16px",
            cursor: "pointer",
          }}
          title={isFavourite ? "Remove from favourites" : "Add to favourites"}
        >
          {isFavourite ? "★" : "☆"}
        </button>
      </div>

      {/* Teams + score */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontWeight: "bold",
        }}
      >
        <span>{teams.home.name}</span>
        <span>{score}</span>
        <span>{teams.away.name}</span>
      </div>

      {/* Time + status */}
      <div
        style={{
          fontSize: "12px",
          color: "#555",
          display: "flex",
          justifyContent: "space-between",
          marginTop: "4px",
        }}
      >
        <span>{startTime}</span>
        <span>{statusShort}</span>
      </div>
    </div>
  );
}
