const express = require("express");
const cors = require("cors");
require("dotenv").config();

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


    app.get('/booking' , async(req,res) =>{
      const patientEmail = req.query.patientEmail;
      const query = {patientEmail : patientEmail};
      const bookings = await bookingCollection.find(query).toArray();
      res.send(bookings);
    })
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

//put 

app.put('/user/:email' , async (req,res) => {
  const email = req.params.email;
  const user = req.body;
  const filter = {email : email};
  const options = {upsert : true};
  const updateDoc = {
    $set : user,
  };
  const result = await usersCollection.updateOne(filter,updateDoc,options);
  res.send(result);
})


  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello Eity! How are you? tui valo na");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
