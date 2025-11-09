const express=require('express');
const app=express();
const path=require("path");
const mongoose=require('mongoose');
const connectDB = require('./init/db.js');

// Connect to Database
connectDB();

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.static(path.join(__dirname,"public")));
app.use(express.urlencoded({extended:true}));



// Schema for signup
const signupSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
    email:{
        type:String,
        required:true,
        unique: true // It's good practice to ensure emails are unique
    },
    password:{
        type:String,
        required:true,
    }
});

// Model
const Signup = mongoose.model('Signup', signupSchema);

//schema for carbonfootprint
const carbonSchema = new mongoose.Schema({
   electricity_kwh:{
    type:Number,
   },
   household_size:{
    type:Number,
   },
   commute_method:{
    type:String,
   },
   car_distance_km:{
    type:Number,
   },
   annual_flights:{
    type:String,
   },
   diet_type:{
    type:String,},


});
const Carbon = mongoose.model('Carbon', carbonSchema);



app.get('/home',(req,res)=>{
    res.render("home");
})
app.get("/signup",(req,res)=>{
    res.render("signup");
});

app.post("/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const newUser = new Signup({ name, email, password });
        await newUser.save();
        console.log("New user saved:", newUser);
        res.render("userdashboard", { signup: newUser });
    } catch (error) {
        console.error("Error during signup:", error);
        // This could happen if the email is not unique, for example.
        res.status(500).send("Error creating user. The email might already be in use.");
    }
});

app.get("/calculator", (req, res) => {
    res.render("calculator");
});

app.get("/userdashboard", (req, res) => {
    // This route needs data, so for now we'll send a placeholder.
    // In a real login system, you'd get the user from the session.
    res.render("userdashboard", { signup: { name: "User" } });
});

app.get("/aboutus", (req, res) => {
    res.render("aboutus");
});

app.get("/learn", (req, res) => {
    res.render("learn");
});

app.get("/carbon", (req, res) => {
    res.render("carbon");
});

app.post("/carbon",async(req,res)=>{
    try {
        // 1. Get raw data from the form
        const { energy_intensity, electricity_kwh, household_size, commute_method, car_distance_km, annual_flights, diet_type } = req.body;
        
        // Save the raw data to the database
        const newCarbon = new Carbon({ electricity_kwh, household_size, commute_method, car_distance_km, annual_flights, diet_type });
        await newCarbon.save();
        console.log("New carbon data saved:", newCarbon);

        // 2. Perform the calculation on the server
        const KG_PER_TON = 1000;
        const EMISSION_FACTORS = {
            energy_intensity_baseline: { '1': 1000, '2': 1800, '3': 2600, '4': 3500, '5': 4500 },
            commute_method_baseline: { 'public': 500, 'electric': 1500, 'gas_efficient': 2000, 'gas_inefficient': 2800 },
            annual_flights_impact: { 'none': 0, 'low': 750, 'medium': 2500, 'high': 6000 },
            diet_type_impact: { 'vegan': 800, 'vegetarian': 1200, 'low_meat': 1800, 'high_meat': 3300 },
            ELECTRICITY_KG_PER_KWH: 0.45,
            KM_TO_KG_CO2E_PER_LITER_GAS: 2.31,
        };

        let totalFootprintKg = 0;

        // Home Energy
        let homeFootprint = EMISSION_FACTORS.energy_intensity_baseline[energy_intensity] || 0;
        const electricityImpact = (parseFloat(electricity_kwh) || 0) * EMISSION_FACTORS.ELECTRICITY_KG_PER_KWH;
        homeFootprint += electricityImpact / (parseFloat(household_size) || 1);
        totalFootprintKg += homeFootprint;

        // Transportation
        let transportFootprint = EMISSION_FACTORS.commute_method_baseline[commute_method] || 0;
        if (commute_method.includes('gas') && car_distance_km > 0) {
            const assumed_fuel_efficiency_L_per_KM = 0.1;
            const fuel_consumed_liters = (parseFloat(car_distance_km) || 0) * assumed_fuel_efficiency_L_per_KM;
            transportFootprint += fuel_consumed_liters * EMISSION_FACTORS.KM_TO_KG_CO2E_PER_LITER_GAS;
        }
        transportFootprint += EMISSION_FACTORS.annual_flights_impact[annual_flights] || 0;
        totalFootprintKg += transportFootprint;

        // Diet
        const dietFootprint = EMISSION_FACTORS.diet_type_impact[diet_type] || 0;
        totalFootprintKg += dietFootprint;

        // 3. Render the results page with the calculated data
        res.render("carbon", {
            carbon: newCarbon,
            totalFootprint: (totalFootprintKg / KG_PER_TON).toFixed(2),
            homeFootprint: (homeFootprint / KG_PER_TON).toFixed(2),
            transportFootprint: (transportFootprint / KG_PER_TON).toFixed(2),
            dietFootprint: (dietFootprint / KG_PER_TON).toFixed(2)
        });
    } catch (error) {
        console.error("Error in /carbon route:", error);
        res.status(500).send("Error processing your request.");
    }
    
})


app.listen(3000,()=>{
    console.log("server started");
})