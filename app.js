const express = require("express");
const app = express();

const path = require("path");
const dbpath = path.join(__dirname, "cricketMatchDetails.db");
app.use(express.json());

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server running at http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const playerObjectToDatabaseObject = (playerObject) => {
  return {
    playerId: playerObject.player_id,
    playerName: playerObject.player_name,
  };
};

const convertMatchObjectToDbResponseObj = (matchObj) => {
  return {
    matchId: matchObj.match_id,
    match: matchObj.match,
    year: matchObj.year,
  };
};

//players list in players table

app.get("/players/", async (request, response) => {
  const getPlayersQuery = `
        SELECT * 
        FROM player_details;
    `;
  const playersArray = await db.all(getPlayersQuery);
  response.send(
    playersArray.map((eachObject) => playerObjectToDatabaseObject(eachObject))
  );
});

//return a specifc player based on player id

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getSpecificPlayer = `
        SELECT * 
        FROM player_details
        WHERE player_id = ${playerId};
    `;
  const player = await db.get(getSpecificPlayer);
  response.send(playerObjectToDatabaseObject(player));
});

//update specific player

app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const updateSpecificPlayerQuery = `
        UPDATE player_details 
        SET 
            player_name = '${playerName}'
        WHERE 
            player_id = ${playerId};
    `;
  await db.run(updateSpecificPlayerQuery);
  response.send("Player Details Updated");
});

//get match details of a specific match
app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getSpecificMatch = `
        SELECT * 
        FROM match_details
        WHERE match_id = ${matchId};
    `;
  const match = await db.get(getSpecificMatch);
  response.send(convertMatchObjectToDbResponseObj(match));
});

//list of matches of a player

app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getMatchesOfPlayer = `
        SELECT * 
        FROM match_details 
        INNER JOIN player_match_score 
        ON match_details.match_id = player_match_score.match_id
        WHERE 
            player_id = ${playerId} 
    `;
  const matchesOfPlayer = await db.all(getMatchesOfPlayer);
  response.send(
    matchesOfPlayer.map((eachObject) =>
      convertMatchObjectToDbResponseObj(eachObject)
    )
  );
});

//get players of a specific match

app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const playersOfSpecificMatch = `
            SELECT * 
            FROM player_details 
            INNER JOIN player_match_score 
            ON player_details.player_id  = player_match_score.player_id
            WHERE match_id = ${matchId}
    `;
  const playersOfMatch = await db.all(playersOfSpecificMatch);
  response.send(
    playersOfMatch.map((eachObject) => playerObjectToDatabaseObject(eachObject))
  );
});

//statistics of total score, fours, sixes of a specific player

app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const statsOfspecificPlayerQuery = `
        SELECT player_details.player_id, 
            player_name AS playerName, 
            SUM(score) AS totalScore,
            SUM(fours) AS totalFours, 
            SUM(sixes) AS totalSixes 
        FROM player_details
        INNER JOIN player_match_score
        ON player_details.player_id = player_match_score.player_id
        WHERE player_details.player_id = ${playerId}
    `;
  const statsArray = await db.get(statsOfspecificPlayerQuery);
  response.send({
    playerId: statsArray.player_id,
    playerName: statsArray.playerName,
    totalScore: statsArray.totalScore,
    totalFours: statsArray.totalFours,
    totalSixes: statsArray.totalSixes,
  });
});

module.exports = app;
