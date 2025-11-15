require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const API_BASE = 'https://v3.football.api-sports.io';
const API_KEY = process.env.API_FOOTBALL_KEY;

// ----- Helper: call API-Football -----
async function callApiFootball(path, params = {}) {
  const url = `${API_BASE}${path}`;
  const res = await axios.get(url, {
    params,
    headers: {
  'x-apisports-key': API_KEY,
},
  });
  return res.data;
}

// Helper: today's date as YYYY-MM-DD
function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ----- Sync today's fixtures into MySQL -----
async function syncTodayFixtures() {
  const today = getTodayDateString();
  console.log(`Syncing fixtures for ${today} from API-Football...`);

  try {
    const data = await callApiFootball('/fixtures', { date: today });
    const fixtures = data.response || [];

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      for (const item of fixtures) {
        const { league, fixture, teams, goals } = item;

        // Upsert league
        await conn.execute(
          `
          INSERT INTO leagues (id, name, country, logo, flag)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            country = VALUES(country),
            logo = VALUES(logo),
            flag = VALUES(flag)
          `,
          [
            league.id,
            league.name,
            league.country,
            league.logo || null,
            league.flag || null,
          ]
        );

        // Upsert fixture
        const startTime = fixture.date ? new Date(fixture.date) : null;

             await conn.execute(
        `
        INSERT INTO fixtures (
          id,
          league_id,
          home_team,
          home_logo,
          away_team,
          away_logo,
          start_time,
          status_short,
          status_long,
          status_elapsed,
          home_goals,
          away_goals
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          league_id       = VALUES(league_id),
          home_team       = VALUES(home_team),
          home_logo       = VALUES(home_logo),
          away_team       = VALUES(away_team),
          away_logo       = VALUES(away_logo),
          start_time      = VALUES(start_time),
          status_short    = VALUES(status_short),
          status_long     = VALUES(status_long),
          status_elapsed  = VALUES(status_elapsed),
          home_goals      = VALUES(home_goals),
          away_goals      = VALUES(away_goals)
        `,
        [
          fixture.id,
          league.id,
          teams.home.name,
          teams.home.logo || null,
          teams.away.name,
          teams.away.logo || null,
          startTime,
          fixture.status.short,
          fixture.status.long,
          fixture.status.elapsed || null,
          goals.home ?? null,
          goals.away ?? null,
        ]
      );


      }

      await conn.commit();
      console.log(`Synced ${fixtures.length} fixtures for today.`);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Error syncing today fixtures:', err.response?.data || err.message);
  }
}

// ----- Sync events for a fixture into DB -----
async function syncFixtureEvents(fixtureId) {
  const data = await callApiFootball('/fixtures/events', { fixture: fixtureId });
  const events = data.response || [];

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute('DELETE FROM events WHERE fixture_id = ?', [fixtureId]);

    for (const e of events) {
      await conn.execute(
        `
        INSERT INTO events (
          fixture_id, time_elapsed, team_name, player_name, type, detail
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          fixtureId,
          e.time?.elapsed || null,
          e.team?.name || null,
          e.player?.name || null,
          e.type || null,
          e.detail || null,
        ]
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return events;
}

// ----- API endpoints -----

// 1) Today's fixtures, optional league filter
app.get('/api/fixtures/today', async (req, res) => {
  const today = getTodayDateString();
  const leagueId = req.query.league ? parseInt(req.query.league, 10) : null;

  try {
    const params = [today];
        let sql = `
      SELECT
        f.id,
        f.league_id,
        l.name    AS league_name,
        l.country AS league_country,
        l.logo    AS league_logo,
        f.home_team,
        f.home_logo,
        f.away_team,
        f.away_logo,
        f.start_time,
        f.status_short,
        f.status_long,
        f.status_elapsed,
        f.home_goals,
        f.away_goals
      FROM fixtures f
      JOIN leagues l ON f.league_id = l.id
      WHERE DATE(f.start_time) = ?
    `;



    if (!Number.isNaN(leagueId) && leagueId) {
      sql += ' AND f.league_id = ?';
      params.push(leagueId);
    }

    sql += ' ORDER BY f.start_time ASC';

    const [rows] = await pool.execute(sql, params);

        const response = rows.map((r) => ({
      fixture: {
        id: r.id,
        status: {
          short: r.status_short,
          long: r.status_long,
          elapsed: r.status_elapsed,
        },
        date: r.start_time,
      },
      league: {
        id: r.league_id,
        name: r.league_name,
        country: r.league_country,
        logo: r.league_logo,
      },
      teams: {
        home: {
          name: r.home_team,
          logo: r.home_logo,
        },
        away: {
          name: r.away_team,
          logo: r.away_logo,
        },
      },
      goals: {
        home: r.home_goals,
        away: r.away_goals,
      },
    }));



    res.json({ response });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch today fixtures from DB' });
  }
});

// 2) Events for a fixture (from DB or API)
app.get('/api/fixtures/:id/events', async (req, res) => {
  const fixtureId = parseInt(req.params.id, 10);
  if (Number.isNaN(fixtureId)) {
    return res.status(400).json({ error: 'Invalid fixture id' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM events WHERE fixture_id = ? ORDER BY time_elapsed ASC, id ASC',
      [fixtureId]
    );

    if (rows.length > 0) {
      const response = rows.map((r) => ({
        time: { elapsed: r.time_elapsed },
        team: { name: r.team_name },
        player: { name: r.player_name },
        type: r.type,
        detail: r.detail,
      }));
      return res.json({ response });
    }

    const events = await syncFixtureEvents(fixtureId);
    res.json({ response: events });
  } catch (err) {
    console.error('Error fetching events:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// 3) Favourite teams CRUD

// Get favourite teams (user_id=1 for now)
app.get('/api/favourites/teams', async (req, res) => {
  const userId = parseInt(req.query.userId || '1', 10);
  try {
    const [rows] = await pool.execute(
      'SELECT team_name FROM favourite_teams WHERE user_id = ? ORDER BY team_name ASC',
      [userId]
    );
    res.json({ favourites: rows.map((r) => r.team_name) });
  } catch (err) {
    console.error('Error fetching favourites:', err.message);
    res.status(500).json({ error: 'Failed to fetch favourite teams' });
  }
});

// Add favourite
app.post('/api/favourites/teams', async (req, res) => {
  const userId = parseInt(req.body.userId || '1', 10);
  const { teamName } = req.body;

  if (!teamName) {
    return res.status(400).json({ error: 'teamName is required' });
  }

  try {
    await pool.execute(
      `
      INSERT INTO favourite_teams (user_id, team_name)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE team_name = VALUES(team_name)
      `,
      [userId, teamName]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error adding favourite:', err.message);
    res.status(500).json({ error: 'Failed to add favourite team' });
  }
});

// Remove favourite
app.delete('/api/favourites/teams', async (req, res) => {
  const userId = parseInt(req.body.userId || '1', 10);
  const { teamName } = req.body;

  if (!teamName) {
    return res.status(400).json({ error: 'teamName is required' });
  }

  try {
    await pool.execute(
      'DELETE FROM favourite_teams WHERE user_id = ? AND team_name = ?',
      [userId, teamName]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error removing favourite:', err.message);
    res.status(500).json({ error: 'Failed to remove favourite team' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);

  // Start syncing today fixtures every 60s (adjust for rate limits)
  syncTodayFixtures();
  setInterval(syncTodayFixtures, 1800000);
});

// 4) Lineups for a fixture (directly from API-Football)
app.get('/api/fixtures/:id/lineups', async (req, res) => {
  const fixtureId = parseInt(req.params.id, 10);
  if (Number.isNaN(fixtureId)) {
    return res.status(400).json({ error: 'Invalid fixture id' });
  }

  try {
    const data = await callApiFootball('/fixtures/lineups', { fixture: fixtureId });
    res.json({ response: data.response || [] });
  } catch (err) {
    console.error('Error fetching lineups:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch lineups' });
  }
});

