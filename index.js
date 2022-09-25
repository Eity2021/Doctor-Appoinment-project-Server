const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.7dde7.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  // console.log('abc');
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorization access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();
    const servicesCollection = client
      .db("Doctor_appoint")
      .collection("Services");
    const bookingCollection = client.db("Doctor_appoint").collection("booking");
    const usersCollection = client.db("Doctor_appoint").collection("users");
    // get services
    app.get("/services", async (req, res) => {
      const query = {};
      const cursor = servicesCollection.find(query);
      const service = await cursor.toArray();
      res.send(service);
    });
    //available get
    app.get("/available", async (req, res) => {
      const date = req.query.date || "Sep 3, 2022";
      //step 1 : get all services

      const services = await servicesCollection.find().toArray();
      //step 2 : get the booking of the day
      const query = { date: date };
      const bookings = await bookingCollection.find(query).toArray();
      //step 3 : for each service
      services.forEach((service) => {
        //step 4 : find bookings for that service
        const serviceBookings = bookings.filter(
          (b) => b.treatment === service.name
        );
        //step 5 : select slots for the service Bookings: ['', '' , '', '']
        const booked = serviceBookings.map((book) => book.slots);
        //step 6 : select those slots that are not in bookedSlots
        const available = service.slots.filter(
          (slots) => !booked.includes(slots)
        );
        service.slots = available;
      });
      res.send(services);
    });
    //bookings get

    app.get("/booking", verifyJWT, async (req, res) => {
      const patientEmail = req.query.patientEmail;
      const decodedEmail = req.decoded.email;
      if (patientEmail === decodedEmail) {
        const query = { patientEmail: patientEmail };
        const bookings = await bookingCollection.find(query).toArray();
        res.send(bookings);
      } else {
        return res.status(403).send({ message: "Forbidden access" });
      }
    });
    //  booking post
    app.post("/booking", async (req, res) => {
      const booking = req.body;
      const query = {
        treatment: booking.treatment,
        slots: booking.slots,
        patientEmail: booking.patientEmail,
      };
      const exists = await bookingCollection.findOne(query);
      if (exists) {
        return res.send({ success: false, booking: exists });
      }

      const result = await bookingCollection.insertOne(booking);
      return res.send({ success: true, result });
    });

    //all user
    app.get("/user", verifyJWT, async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.send(users);
    });
    //admin
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({email:email});
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });
    //make admin
    app.put("/user/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await usersCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        const filter = { email: email };
        const updateDoc = {
          $set: { role: "admin" },
        };
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.send(result);
      } else {
        res.status(403).send({ message: "forbidden" });
      }
    });
    // app.put("/user/admin/:email", verifyJWT, async (req, res) =>{
    //   const email = req.params.email;
    //   const filter = {email : email};
    //   const updateDoc = {
    //     $set : {role : 'admin'},
    //   };
    //   const result = await usersCollection.updateOne(filter,updateDoc);
    //   res.send(result)
    // });

    //put per  user

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1d" }
      );
      res.send({ result, token });
    });
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello Eity! How are you? tui valo na");
});

app.listen(port, () => {
  console.log(`Doctor app listening on port ${port}`);
});
