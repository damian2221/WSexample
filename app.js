const mysql = require('mysql');
const WebSocket = require('ws');
const express = require('express')
const PORT = 3000;

const connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'togg',
  database : 'togg'
});

connection.connect();

const app = express();

app.set('views', __dirname);
app.engine('html', require('ejs').renderFile);

app.get('/', function(req, res) {
  res.render('index.html');
});

app.get('/patients', async (req, res) => {
  connection.query('SELECT `id`, `patient_name` FROM patient WHERE `access_role`=?',
    [parseInt(req.query.access_role)],
    (error, results, fields) => {
      if (error) throw error;
      res.send(results);
    });
});

app.listen(PORT, () => console.log(`Example app listening at http://localhost:${PORT}`));

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      message = JSON.parse(message);
      if (message.type === 'authorize') {
        ws.accessRole = parseInt(message.accessRole);
      }
      if (message.type === 'update_patient') {
        connection.query('UPDATE `patient` SET `patient_name`=? WHERE `id`=? AND `access_role`=?',
          [message.patient_name, parseInt(message.patient_id), ws.accessRole],
          (error, results, fields) => {
            if (error) {
              console.log(error);
            } else {
              if (results.affectedRows > 0) {
                wss.clients.forEach((client) => {
                  if (client !== ws && client.readyState === WebSocket.OPEN && client.accessRole === ws.accessRole) {
                    client.send(JSON.stringify({
                      type: 'update_patient',
                      patient_id: message.patient_id,
                      patient_name: message.patient_name
                    }));
                  }
                });
              }
            }
          });
      }
    } catch(e) {
      console.log(e);
    }
  });
});