require('dotenv').config();
var db = require('./models');
var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var app = express();
var cheerio = require('cheerio');
var nodemailer = require('nodemailer');
var request = require('request-promise');

// var updaterInterval;

app.use(bodyParser.urlencoded({
    extended: false
}));

app.use(express.static(path.join(__dirname + '/static/')));

app.get('/api/search', function(req, res) {
    //need to grab the parameters from the search and build a query
    //pass that query to the function to set that as the url

    .then(function(cars) {
        res.send({cars: cars,updaterStatus: Boolean(updaterInterval)});
    });
});

// app.put('/api/cars/archive/:id', function(req, res) {
//     db.car.findOne({
//         where: {
//             id: req.params.id
//         }
//     }).then(function(car) {
//         car.update({
//             archived: true
//         });
//     }).then(function(car) {
//         res.sendStatus(200);
//     });
// });

// app.get('/api/updateList', function(req, res) {
//         if (updaterInterval){
//             console.log("clearing updater");
//             clearInterval(updaterInterval)
//             updaterInterval = null;
//         } else {
//             console.log("starting updater");
//             updaterInterval = setInterval(updateList, 60 * 60 * 1000);
//             updateList();
//         }
//         res.sendStatus(200)
// });

//root route and server port
app.get('/*', function(req, res) {
    res.sendFile(path.join(__dirname, 'static/index.html'));
});
var server = app.listen((process.env.PORT || 1337), function() {
    console.log('listening on 1337');
});




//helper functions

function updateList() {
    return new Promise(function(resolve, reject){
        var OPTIONS = {
            url: 'http://www.autotrader.com/cars-for-sale/2017/Ford/Mustang/Lynnwood+WA-98036?zip=98036&extColorsSimple=BLUE&startYear=2017&numRecords=100&incremental=all&endYear=2017&modelCodeList=MUST&makeCodeList=FORD&sortBy=distanceASC&firstRecord=0&searchRadius=1200&trimCodeList=MUST%7CShelby%20GT350',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36'
            }

        };
        var newCarsListed = [];
        var url = ""
        var distance = ""
        //grab the search results and then send each listed URL to the function that grabs the data we want.
        request(OPTIONS).then(function(body) {
            var carsScraped = [];
            if (body) {
                var $ = cheerio.load(body);
                var results = $('a[data-qaid="lnk-lstgTtlf"]');
                var dist = $('[data-qaid="cntnr-dlrlstng-radius"]');
                console.log("found " + results.length);
                for (var i = 0; i < results.length; i++) {
                    url = "http://www.autotrader.com" + results[i].attribs.href;
                    distance = dist[i].children[0].data;
                    carsScraped.push([url, distance]);
                }
            };
            console.log("parsed ", carsScraped.length, " cars")
            return carsScraped;
        }).then(function(cars){
            var counter = 0;
            cars.forEach(function(singleCar){
                url = singleCar[0];
                distance = singleCar[1];
                getCarDetails(OPTIONS, url, distance).then(function(carDetails){
                    updateDB(carDetails).then(function(carUpdated){
                        if(carUpdated){
                            newCarsListed.push(carUpdated);
                        }
                        counter++;
                        if (counter == cars.length){
                            console.log("everything is updated at,", timeStamp()," checking is newCarsListed has anything");
                            if (newCarsListed.length > 0) {
                                //send email with new cars
                                console.log("new car(s) found, should send email with ", newCarsListed);
                                // send_simple_message();
                                sendEmail(newCarsListed);
                            } else {
                                console.log("no new cars to email");
                            }
                            deleteExpiredListings();
                            resolve();
                        }
                    })
                })
            })
        }).catch(function(error){
            console.log("something went wrong", error.message);
        })

    })
}


function getCarDetails(OPTIONS, url, dist) {
    return new Promise(function(resolve,reject){
        OPTIONS.url = url;
        request(OPTIONS).then(function(body) {
            if (body) {
                var $ = cheerio.load(body);
                var car = {
                    name: $('[data-qaid="cntnr-vehicle-title-header"] [title]').text(),
                    url: url,
                    color: $('[data-qaid="cntnr-exteriorColor"]').text(),
                    price: $('[data-qaid="cntnr-pricing-cmp-outer"]').text(),
                    vin: $('[data-qaid="tbl-value-VIN"]').text(),
                    dealer: $('[data-qaid="dealer_name"]').text(),
                    address: $('[itemprop="address"]').text(),
                    phone: $('[data-qaid="dlr_phone"]').text(),
                    pic: $('.media-viewer img').attr('src'),
                    dist: dist

                }
            }
            if (car)
                resolve(car);
            });
    });
}

function updateDB(car) {
    return new Promise(function(resolve, reject){
        db.car.find({
            where: {
                vin: car.vin
            }
        }).then(function(result) {
            if (!result) {
                console.log("adding new car", car);
                db.car.create({
                    name: car.name,
                    vin: car.vin,
                    url: car.url,
                    color: car.color,
                    price: car.price,
                    dealer: car.dealer,
                    address: car.address,
                    phone: car.phone,
                    pic: car.pic,
                    dist: car.dist
                });
                resolve(car)
            } else {
                //update the listing
                if (car.price != result.price && !car.archived) {
                    console.log("updating price");
                    db.car.update({
                        price: car.price
                    }, {
                        where: {
                            vin: car.vin,
                        }
                    });
                    };
                resolve();
            }

        });
    });
}

function deleteExpiredListings() {
    db.car.findAll().then(function(cars) {
        cars.forEach(function(car) {
            var url = car.dataValues.url;
            var options = {
                url: url,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36'
                }
            }
            request(options).then(function(body) {
                if (body) {
                    var $ = cheerio.load(body);
                    if (!$('[data-qaid="cntnr-vehicle-title-header"] [title]').text()) {
                        console.log('removing url', car.url);
                        db.car.destroy({
                            where: {
                                url: car.url
                            }
                        })
                    }
                } else {
                    console.log("delete check didn't return anything valid");
                }
            }).catch(function(err){
                console.log(err.body, "happend",'removing url', car.url);
                db.car.destroy({
                    where: {
                        url: car.url
                    }
                })
            })
        })
    });
}


//email setup

function send_simple_message(){
    return requests.post(
        "https://api.mailgun.net/v3/sandbox997eaaf4769941fc91309819e6e40bf3.mailgun.org",
        auth=("api", process.env.EMAIL_API),
        data={"from": "The Bot <you@carscraper.com>",
        "to": ["Me", "exoticimage@hotmail.com"],
        "subject": "New Car found",
        "text": "Check the site"})
}

function sendEmail(cars) {
    console.log("here are what the emailer was passed", cars);
    var transporter = nodemailer.createTransport({
        service: 'Mailgun',
        auth: {
            user: process.env.emailName,
            pass: process.env.emailPassword
        }
    });

    var mailOptions = {
        from: 'yourServer@Carscraper.com',
        to: 'exoticimage@hotmail.com',
        subject: cars.length + ' New car(s) found!',
        text: "At least one new car found.  "+cars[0].dealer+" has one.  They are "+cars[0].dist+" and it's "+cars[0].color+".  They want "+cars[0].price+" for it.  Check your site for more details and verify if VIN: "+cars[0].vin+" has the right options."
    };

    var emailStatus = transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
            return console.log(error);
        } else {
            return console.log('Email sent: ' + info.response);
        }
    });
    return emailStatus;
}


function timeStamp() {
// Create a date object with the current time
  var now = new Date();

// Create an array with the current month, day and time
  var date = [ now.getMonth() + 1, now.getDate(), now.getFullYear() ];

// Create an array with the current hour, minute and second
  var time = [ now.getHours(), now.getMinutes(), now.getSeconds() ];

// Determine AM or PM suffix based on the hour
  var suffix = ( time[0] < 12 ) ? "AM" : "PM";

// Convert hour from military time
  time[0] = ( time[0] < 12 ) ? time[0] : time[0] - 12;

// If hour is 0, set it to 12
  time[0] = time[0] || 12;

// If seconds and minutes are less than 10, add a zero
  for ( var i = 1; i < 3; i++ ) {
    if ( time[i] < 10 ) {
      time[i] = "0" + time[i];
    }
  }

// Return the formatted string
  return date.join("/") + " " + time.join(":") + " " + suffix;
}
