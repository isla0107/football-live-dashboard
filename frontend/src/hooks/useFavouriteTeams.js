import { useEffect, useState, useCallback } from "react";
import axios from "axios";

const API_BASE = "http://localhost:4000";

export function useFavouriteTeams(userId = 1) {
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFavourites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/favourites/teams`, {
        params: { userId },
      });
      setFavourites(res.data?.favourites || []);
    } catch (err) {
      console.error("Error fetching favourites:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchFavourites();
  }, [fetchFavourites]);

  const toggleFavourite = async (teamName) => {
    const isFav = favourites.includes(teamName);

    try {
      if (isFav) {
        await axios.delete(`${API_BASE}/api/favourites/teams`, {
          data: { userId, teamName },
        });
        setFavourites((prev) => prev.filter((t) => t !== teamName));
      } else {
        await axios.post(`${API_BASE}/api/favourites/teams`, {
          userId,
          teamName,
        });
        setFavourites((prev) => [...prev, teamName]);
      }
    } catch (err) {
      console.error("Error toggling favourite:", err);
    }
  };

  return { favourites, loading, toggleFavourite };
}
