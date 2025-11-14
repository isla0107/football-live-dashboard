import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:4000";

export function useTodayFixtures(selectedLeagueId) {
  const [fixtures, setFixtures] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchFixtures() {
      setLoading(true);
      setError(null);

      try {
        const res = await axios.get(`${API_BASE}/api/fixtures/today`, {
          params: selectedLeagueId ? { league: selectedLeagueId } : {},
        });

        const data = res.data?.response || [];

        setFixtures(data);

        // Build unique league list from fixtures
        const leagueMap = new Map();
        data.forEach((item) => {
          if (!leagueMap.has(item.league.id)) {
            leagueMap.set(item.league.id, {
              id: item.league.id,
              name: item.league.name,
              country: item.league.country,
            });
          }
        });

        setLeagues(Array.from(leagueMap.values()));
      } catch (err) {
        console.error("Error fetching fixtures:", err);
        setError("Failed to load fixtures");
      } finally {
        setLoading(false);
      }
    }

    fetchFixtures();
  }, [selectedLeagueId]);

  return { fixtures, leagues, loading, error };
}
