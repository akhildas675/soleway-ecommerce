const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const nocache = require('nocache');
const userRoute = require('./routes/userRoutes'); 
const adminRoute = require('./routes/adminRoute'); 
const app = express();

require('dotenv').config();

const passport=require('passport')
require('./passport')




/** mongodb connected */
mongoose.connect("mongodb://localhost:27017/SoleWayDB", {
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((error) => {
    console.error('Error connecting to MongoDB', error.message);
});

//  parsing body data 
app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, 'views'));

app.use(nocache());

app.use(session({
    secret:"mySiteSessionSecret",
    resave: false,
    saveUninitialized: false
}));


app.use('/', userRoute);
app.use('/admin',adminRoute)




app.use('*', (req, res) => {
    res.render('user/404')
  })
  
  
app.use((err,req,res,next)=>{
    console.log(err.stack);
    res.render('user/500')
})




const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
});
