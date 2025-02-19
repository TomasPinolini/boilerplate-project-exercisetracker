const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

mongoose.connect("mongodb://localhost/exerciseTracker", {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("Connected to database!"))
  .catch((err) => console.error("Connection failed!", err));

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
});

const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);

app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;
    const newUser = new User({ username });
    const savedUser = await newUser.save();
    res.json({ username: savedUser.username, _id: savedUser._id });

  } catch (error) {
    res.status(400).json({ error: "Username already taken or invalid" });
  }
});

app.get('/api/users', async (req, res) => {
  const users = await User.find({}, 'username _id'); 
  res.json(users);
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { _id } = req.params;
    const { description, duration, date } = req.body;

    const user = await User.findById(_id);
    
    if (!user) return res.status(404).json({ error: "User not found" });

    const exercise = new Exercise({
      userId: _id,
      description,
      duration: Number(duration),
      date: date && !isNaN(Date.parse(date)) ? new Date(date) : new Date()
    });

    const savedExercise = await exercise.save();

    res.json({
      _id: user._id.toString(),
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString()
    });

  } catch (error) {
    res.status(400).json({ error: "Invalid input data" });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { _id } = req.params;
    const { from, to, limit } = req.query;

    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: "User not found" });

    let query = { userId: _id };
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    const exercises = await Exercise.find(query)
      .limit(limit ? Math.max(parseInt(limit), 0) : 500)
      .select("description duration date");

    res.json({
      username: user.username,
      _id: user._id.toString(),
      count: exercises.length,
      log: exercises.map(e => ({
        description: String(e.description),
        duration: Number(e.duration),
        date: e.date.toDateString()
      }))
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
