var db = null;
var teams = {}; 

function runApplication() {
    console.log("Running application.");

    connectSqlite();
    initSchemaIfNeeded();

    loadTeams(function(team){
        displayTeam(team);
        registerActionButtons(team);
    });
    
    loadLog(Object.keys(teams), function(logLine){
        displayLogLine(logLine);
    });
}

function connectSqlite(){
    console.log("connecting to sqlite ....");

    if (window.cordova.platformId == 'browser'){
        db = window.openDatabase('sportbilly', "1", "sportbilly", 200000); 
        console.log("... using WEBSQL");

    } else {
        db = window.sqlitePlugin.openDatabase({name: 'sportbilly.db', location: 'default'});        
        console.log("... using cordova plugin");
    }

}

function runTransaction(transactionCallback){
    db.transaction(transactionCallback, function(error) {
        console.error('transaction ERROR: ' + error.message);
    }, function() {
        //console.log('transaction ok.');
    });
}

function initSchemaIfNeeded() {
    console.log('initSchemaIfNeeded...');

    runTransaction(function(tx){
        tx.executeSql('CREATE TABLE IF NOT EXISTS Team (id INTEGER PRIMARY KEY, label TEXT)');
        tx.executeSql('CREATE TABLE IF NOT EXISTS MatchLog (id INTEGER PRIMARY KEY, logDate TEXT, scoreIncrement NUMBER, teamId INTEGER, FOREIGN KEY(teamId) REFERENCES Team(id))');

        tx.executeSql('INSERT OR IGNORE INTO Team (id, label) VALUES (?, ?)', [1, 'Chicago Bulls']);
        tx.executeSql('INSERT OR IGNORE INTO Team (id, label) VALUES (?, ?)', [2, 'La Bourboule']);
    })

}

function registerActionButtons(team){
    var teamElement = team.element;
    var buttons = teamElement.querySelectorAll(".team__action li");
    for (var i = 0; i<buttons.length; i++) {

        buttons[i].addEventListener("click", function(event){
            var teamId = teamElement.getAttribute("data-team-id");
            var increment = event.target.getAttribute("data-increment");

            updateScore(teamId, parseInt(increment));
            displayScore(teamId);

            displayLogLine({
                team: team.label,
                score: parseInt(increment),
                date: Date.now()
            });

        });
    }
    
}

function updateScore(teamId, scoreIncrement) {
    teams[teamId].score += scoreIncrement;

    runTransaction(function(tx){
        tx.executeSql('INSERT INTO MatchLog (logDate, scoreIncrement, teamId) VALUES (date("now"), ?, ?)', [scoreIncrement, teamId]);
    });

    
}



function loadTeams(callback) {
    runTransaction(function(tx){

        var query = "SELECT Team.id as team_id, Team.label as team_label, sum(scoreIncrement) as team_score FROM Team LEFT JOIN MatchLog ON Team.id = MatchLog.teamId GROUP BY Team.id"
        tx.executeSql(query, [], function(tx, result) {

            for(var i=0; i<result.rows.length; i++) {

                var score = result.rows.item(i).team_score;

                callback({
                    id: result.rows.item(i).team_id,
                    label: result.rows.item(i).team_label,
                    score: score ? parseInt(score) : 0
                });
            }

            
        });  
    })
}

function displayTeam(team) {
    var teamElementClone = cloneTemplate('template_team');

    teamElementClone.setAttribute("data-team-id", team.id);
    teamElementClone.querySelector(".team__name").innerHTML = team.label;
    teamElementClone.querySelector(".team__score").innerHTML = team.score;

    team.element = teamElementClone;
    teams[team.id] = team;

    document.querySelector(".board").appendChild(teamElementClone);
}




function displayScore(teamId) {
    var team = teams[teamId];
    team.element.querySelector(".team__score").innerHTML = team.score;
}


function loadLog(teamIds, callback) {
    runTransaction(function(tx){

        var query = "SELECT Team.label as log_team, scoreIncrement as log_score, logDate as log_date FROM Team LEFT JOIN MatchLog ON Team.id = MatchLog.teamId GROUP BY Team.id"
        tx.executeSql(query, [], function(tx, result) {

            for(var i=0; i<result.rows.length; i++) {

                callback({
                    team: result.rows.item(i).log_team,
                    score: result.rows.item(i).log_score,
                    date: result.rows.item(i).log_date
                });
            }

        });  
    })
}



function displayLogLine(logLine) {
    var lineElementClone = cloneTemplate('template_log_line');

    lineElementClone.querySelector(".log__team").innerHTML = logLine.team;
    lineElementClone.querySelector(".log__score").innerHTML = logLine.score;
    lineElementClone.querySelector(".log__time").innerHTML = logLine.date;

    document.querySelector(".logs ul").appendChild(lineElementClone);
}




function cloneTemplate(id) {
    var template = document.getElementById(id);

    var clone = template.cloneNode(true);
    clone.removeAttribute("id");

    return clone;
}



/*
function addLogLine(teamId, scoreIncrement, dateTime) {
    var logElement = document.getElementById(".logs ul");

}*/

/*
function logElement(teams) {
    teams.forEach(function(teamId){
        loadTeam(teamId, function(teamData){
            score[teamId] = scoreForTeam ? scoreForTeam : 0;
            displayScore(teamId, scoreForTeam);
        });
    })

}*/


document.addEventListener('deviceready', runApplication);