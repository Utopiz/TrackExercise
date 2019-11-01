const express = require("express");
const app = express();
const cors = require("cors");
var mongodb = require("mongodb");
const mongoose = require("mongoose");
const shortid = require("shortid");

/** connecting to the database**/

mongoose.Promise = global.Promise;
mongoose.set("useNewUrlParser", true);
mongoose.set("useCreateIndex", true);
mongoose.set("useUnifiedTopology", true);
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });
app.use(cors());

/** this project needs to parse POST bodies **/
//mount the body-parser
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//Node to find static content
app.use("/public", express.static(process.cwd() + "/public"));
app.get("/", function(req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

//Create a user model
const Schema = mongoose.Schema;
const userSchema = new Schema({
  username: { type: String, required: true },
  shortid: { type: String, require: true }
});

var User = mongoose.model("User", userSchema);

//Create a exercise model
const exerciseSchema = new Schema({
  username: { type: String, require: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  data: { type: Date, require: true }
});

var Exercise = mongoose.model("Exercise", exerciseSchema);

// Create User
app.post("/api/exercise/new-user", function(req, res) {
  var username = req.body.username;
  if (username === "") {
    return res.send("username cannot be blank");
  } else {
    var newUser = new User({
      username: username,
      shortid: shortid.generate()
    });

    newUser.save((err, data) => {
      if (err) {
        return res.send("error in saving, please try another username");
      } else {
        return res.json({ username: data.username, _id: data.shortid });
      }
    });
  }
});

// get user array at api/exercise/users
app.get("/api/exercise/users", (req, res) => {
  var usernames = [];
  User.find((err, data) => {
    if (err) {
      return res.send("Error");
    } else {
      data.forEach(function(user) {
        usernames.push(user.username);
      });
    }
    res.json(usernames.sort());
  });
});

//Add Exercise
app.post("/api/exercise/add", (req, res) => {
  var userId = req.body.userId;
  var description = req.body.description;
  var duration = req.body.duration;
  var date = req.body.date;
  console.log(userId);
  console.log(description);
  console.log(duration);
  console.log(date);
  if (userId === "" || description === "" || duration === "") {
    return res.send("Please fill required fields");
  } else if (isNaN(duration)) {
    return res.send("Duration should be a number");
  } else if (date != "" && isNaN(Date.parse(date)) === true) {
    return res.send("Invalid Date");
  } else {
    User.findOne({ shortid: userId }, (err, data) => {
      if (err || data === null) {
        return res.send("Unknown Id");
      } else {
        console.log("found user");
        if (date === "") {
          date = new Date();
        } else {
          var dateInt = Date.parse(date);
          date = new Date(dateInt);
        }
        const addExercise = new Exercise({
          username: data.username,
          description: description,
          duration: duration,
          date: date
        });
        addExercise.save(err => {
          if (err) {
            return res.send("error in saving, please try another username");
          }
          return res.json({
            username: data.username,
            description: description,
            duration: duration,
            data: date.toUTCString()
          });
        });
      }
    });
  }
});

//return user logs
app.get("/api/exercise", (req, res) => {
  let username = req.query.username;
  console.log(username);
  let from = req.query.from;
  let to = req.query.to;
  let limit = req.query.limit;
  const query = {};
  if (username === "") {
    res.send("Please type usename");
  } else if (from !== undefined && isNaN(from)) {
    res.send("From date is not valid");
  } else if (to !== undefined && isNaN(to)) {
    res.send("To date is not valid");
  } else {
    Exercise.findOne({ username: username }, (err, data) => {
      if (err || username === undefined) {
        return res.send("Error");
      } else if (data === null) {
        return res.send("Can't find Information");
      } else {
        console.log(username);
        // MongoDB comparison query operators
        // https://docs.mongodb.com/manual/reference/operator/query-comparison/
        if (from !== undefined) {
          from = new Date(from);
          query.date = { $gte: from };
        }
        if (to !== undefined) {
          to = new Date(to);
          query.date = { $lt: to };
        }
        if (limit !== undefined) {
          limit = Number(limit);
        }
        Exercise.find(query)
          .limit(limit)
          .select({ _id: 0 })
          .exec((err, exercise) => {
            if (err) {
              return console.error(err);
            } else if (exercise === undefined) {
              return res.send("can not find user");
            }
            return res.json(exercise);
          });
      }
    });
  }
});

// Listen to see is everything is working
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
