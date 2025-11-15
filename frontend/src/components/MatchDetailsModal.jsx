import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";

const API_BASE = "http://localhost:4000";

export function MatchDetailsModal({ fixture, onClose }) {
  const [events, setEvents] = useState([]);
  const [lineups, setLineups] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingLineups, setLoadingLineups] = useState(true);

  const fixtureId = fixture?.fixture?.id;

  useEffect(() => {
    if (!fixtureId) return;

    // Fetch events
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

    // Fetch lineups
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

  // Try to match lineups to home/away team names
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

  if (!fixture) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.4)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          padding: "16px",
          borderRadius: "8px",
          width: "95%",
          maxWidth: "900px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: teams + score */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <div>
            <h3 style={{ margin: 0 }}>
              {homeName} vs {awayName}
            </h3>
            <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
              {fixture.league.name} ({fixture.league.country}) • {koTime}
            </p>
            <p style={{ margin: "4px 0", fontSize: "12px", color: "#555" }}>
              {statusLong}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>
              {homeGoals} : {awayGoals}
            </div>
            <button onClick={onClose}>Close</button>
          </div>
        </div>

        {/* Layout: left = events, right = lineups */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: "16px",
          }}
        >
          {/* Events / timeline */}
          <div>
            <h4>Match Events</h4>
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
            <h4>Lineups</h4>
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
    </div>
  );
}
