import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";

const API_BASE = "http://localhost:4000";

export function MatchDetailsPanel({ fixture }) {
  const [events, setEvents] = useState([]);
  const [lineups, setLineups] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingLineups, setLoadingLineups] = useState(false);

  const fixtureId = fixture?.fixture?.id;

  useEffect(() => {
    if (!fixtureId) return;

    async function fetchEvents() {
      setLoadingEvents(true);
      try {
        const res = await axios.get(
          `${API_BASE}/api/fixtures/${fixtureId}/events`
        );
        setEvents(res.data?.response || []);
      } catch (err) {
        console.error("Error fetching events:", err);
      } finally {
        setLoadingEvents(false);
      }
    }

    async function fetchLineups() {
      setLoadingLineups(true);
      try {
        const res = await axios.get(
          `${API_BASE}/api/fixtures/${fixtureId}/lineups`
        );
        setLineups(res.data?.response || []);
      } catch (err) {
        console.error("Error fetching lineups:", err);
      } finally {
        setLoadingLineups(false);
      }
    }

    fetchEvents();
    fetchLineups();
  }, [fixtureId]);

  const homeName = fixture?.teams?.home?.name;
  const awayName = fixture?.teams?.away?.name;
  const homeGoals = fixture?.goals?.home ?? "-";
  const awayGoals = fixture?.goals?.away ?? "-";
  const statusLong = fixture?.fixture?.status?.long || "";
  const koTime = fixture?.fixture?.date
    ? new Date(fixture.fixture.date).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const homeLogo = fixture?.teams?.home?.logo;
  const awayLogo = fixture?.teams?.away?.logo;
  const leagueLogo = fixture?.league?.logo;


  const { homeLineup, awayLineup } = useMemo(() => {
    if (!lineups || lineups.length === 0) {
      return { homeLineup: null, awayLineup: null };
    }

    let home = lineups.find((l) => l.team?.name === homeName) || lineups[0];
    let away =
      lineups.find((l) => l.team?.name === awayName && l !== home) ||
      (lineups.length > 1 ? lineups[1] : null);

    return { homeLineup: home, awayLineup: away };
  }, [lineups, homeName, awayName]);

  if (!fixture) {
    return (
      <div
        style={{
          background: "#fff",
          borderRadius: "8px",
          padding: "16px",
          border: "1px solid #eee",
          height: "100%",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Match details</h3>
        <p style={{ fontSize: "13px", color: "#666" }}>
          Select a match from the left to see full details (events & lineups).
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "8px",
        padding: "16px",
        border: "1px solid #eee",
        height: "100%",
        overflowY: "auto",
      }}
    >
     {/* Header: league info + big row [home logo] Home 1:0 Away [away logo] */}
<div style={{ marginBottom: "12px" }}>
  {/* League row */}
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 6,
      marginBottom: 6,
    }}
  >
    {leagueLogo && (
      <img
        src={leagueLogo}
        alt="league logo"
        style={{ width: 18, height: 18, objectFit: "contain" }}
      />
    )}
    <span style={{ fontSize: "12px", color: "#666" }}>
      {fixture.league?.name} ({fixture.league?.country}) • {koTime}
    </span>
  </div>

  {/* Main row: [home logo] Home 1:0 Away [away logo] */}
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
    }}
  >
    {/* Home side */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flex: 1,
      }}
    >
      {homeLogo && (
        <img
          src={homeLogo}
          alt={homeName}
          style={{ width: 28, height: 28, objectFit: "contain" }}
        />
      )}
      <span style={{ fontWeight: 600 }}>{homeName}</span>
    </div>

    {/* Score in the middle */}
    <div
      style={{
        fontSize: "26px",
        fontWeight: "bold",
        minWidth: 80,
        textAlign: "center",
      }}
    >
      {homeGoals} : {awayGoals}
    </div>

    {/* Away side */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 8,
        flex: 1,
      }}
    >
      <span style={{ fontWeight: 600, textAlign: "right" }}>{awayName}</span>
      {awayLogo && (
        <img
          src={awayLogo}
          alt={awayName}
          style={{ width: 28, height: 28, objectFit: "contain" }}
        />
      )}
    </div>
  </div>

  {/* Status text */}
  <p
    style={{
      marginTop: 6,
      fontSize: "12px",
      color: "#555",
    }}
  >
    {statusLong}
  </p>
</div>



      {/* Layout: left = events, right = lineups */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.3fr 1fr",
          gap: "16px",
        }}
      >
        {/* Events / timeline */}
        <div>
          <h4 style={{ marginTop: 0 }}>Match Events</h4>
          {loadingEvents ? (
            <p>Loading events...</p>
          ) : events.length === 0 ? (
            <p style={{ fontSize: "13px" }}>No events available yet.</p>
          ) : (
            <ul style={{ paddingLeft: "16px", fontSize: "13px" }}>
              {events.map((ev, idx) => (
                <li key={idx} style={{ marginBottom: "4px" }}>
                  <strong>{ev.time?.elapsed ?? "-"}'</strong> –{" "}
                  {ev.team?.name || "Unknown team"} –{" "}
                  {ev.player?.name || "N/A"}{" "}
                  {!!ev.type && (
                    <>
                      {" "}
                      ({ev.type}
                      {ev.detail ? ` – ${ev.detail}` : ""})
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Lineups */}
        <div>
          <h4 style={{ marginTop: 0 }}>Lineups</h4>
          {loadingLineups ? (
            <p>Loading lineups...</p>
          ) : !homeLineup && !awayLineup ? (
            <p style={{ fontSize: "13px" }}>
              Lineups not available for this match.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                fontSize: "12px",
              }}
            >
              {/* Home lineup */}
              <div>
                <strong>{homeLineup?.team?.name || homeName}</strong>
                {homeLineup?.formation && (
                  <div>Formation: {homeLineup.formation}</div>
                )}
                <div style={{ marginTop: "4px" }}>Starting XI:</div>
                <ul style={{ paddingLeft: "16px" }}>
                  {homeLineup?.startXI?.map((p, idx) => (
                    <li key={idx}>
                      #{p.player?.number} {p.player?.name} ({p.player?.pos})
                    </li>
                  )) || <li>No data</li>}
                </ul>
              </div>

              {/* Away lineup */}
              <div>
                <strong>{awayLineup?.team?.name || awayName}</strong>
                {awayLineup?.formation && (
                  <div>Formation: {awayLineup.formation}</div>
                )}
                <div style={{ marginTop: "4px" }}>Starting XI:</div>
                <ul style={{ paddingLeft: "16px" }}>
                  {awayLineup?.startXI?.map((p, idx) => (
                    <li key={idx}>
                      #{p.player?.number} {p.player?.name} ({p.player?.pos})
                    </li>
                  )) || <li>No data</li>}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
