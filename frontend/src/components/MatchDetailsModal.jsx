import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:4000";

export function MatchDetailsModal({ fixture, onClose }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fixtureId = fixture?.fixture?.id;

  useEffect(() => {
    if (!fixtureId) return;

    async function fetchEvents() {
      setLoading(true);
      try {
        const res = await axios.get(
          `${API_BASE}/api/fixtures/${fixtureId}/events`
        );
        setEvents(res.data?.response || []);
      } catch (err) {
        console.error("Error fetching events:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [fixtureId]);

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
          width: "90%",
          maxWidth: "500px",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "8px",
          }}
        >
          <h3 style={{ margin: 0 }}>
            {fixture.teams.home.name} vs {fixture.teams.away.name}
          </h3>
          <button onClick={onClose}>X</button>
        </div>

        <p style={{ marginTop: 0, fontSize: "12px", color: "#666" }}>
          {fixture.league.name} ({fixture.league.country})
        </p>

        <h4>Events</h4>
        {loading ? (
          <p>Loading events...</p>
        ) : events.length === 0 ? (
          <p>No events available.</p>
        ) : (
          <ul style={{ paddingLeft: "16px" }}>
            {events.map((ev, idx) => (
              <li key={idx} style={{ marginBottom: "4px", fontSize: "13px" }}>
                <strong>{ev.time?.elapsed ?? "-"}'</strong> –{" "}
                {ev.team?.name || "Unknown team"} – {ev.player?.name || "N/A"}{" "}
                ({ev.type} {ev.detail ? `- ${ev.detail}` : ""})
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
