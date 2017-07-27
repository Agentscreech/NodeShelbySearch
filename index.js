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

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(express.static(path.join(__dirname + '/static/')));

app.post('/api/search', function(req, res) {
    // console.log("request received with", req.body);
    //need to grab the parameters from the search and build a query
    //pass that query to the function to set that as the url
    var options = req.body;
    options.color = [];
    options.trim = [];
    //change each color to array index
    for (color in options.colors) {
        options.color.push(color.toString());
    }
    if (options.color.length > 1) {
        //replace the array with the properly formatted query string
        temp = options.color[0].toUpperCase();
        for (var i = 1; i < options.color.length; i++) {
            temp += "%2C";
            temp += options.color[i].toUpperCase();
        }
        options.color = temp;

    } else {
        options.color = options.color[0].toUpperCase();
    }
    // change trims to an array, then replace it with the proper format for query
    for (trim in options.trims) {
        options.trim.push(trim)
    }
    temp = "MUST%7C"
    if (options.trim.length > 1) {
        temp += options.trim[0].split(" ").join("%20");
        temp += "%2CMUST%7C"
        temp += options.trim[1].split(" ").join("%20");
    } else {
        temp += options.trim[0].split(" ").join("%20");
    }
    options.trim = temp;
    // console.log(options)
    findCars(options).then(function(cars){
        console.log('findCars is done')
        parseCars(cars, options).then(function(output){
            console.log("$$$$$$parseCars DONE$$$$$, sending ", output);
            res.send(output)
        })
    })
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
var server = app.listen((process.env.PORT || 1350), function() {
    console.log('listening on 1350');
});




//helper functions

function findCars(params) {
    return new Promise(function(resolve,reject){
        var OPTIONS = {
            url: "http://www.autotrader.com/cars-for-sale//Ford/Mustang/?zip=" + params.zipcode + "&extColorsSimple=" + params.color + "&startYear=" + params.minYear + "&numRecords=100&endYear=" + params.maxYear + "&modelCodeList=MUST&makeCodeList=FORD&sortBy=distanceASC&firstRecord=0&searchRadius=" + params.radius + "&trimCodeList=" + params.trim,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36'
            }

        };
        var carsListed = [];
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
        }).then(function(cars) {
            console.log("!!!!!!!!!!!!!resolving findCars!!!!!!!!!!!!")
            resolve(cars)
        }).catch(function(error) {
            console.log("something went wrong in the findCars function", error.message);
        });
    })

}

async function parseCars(cars, OPTIONS) {
    carsListed = [];
    for(var i = 0; i < cars.length; i++){
        url = cars[i][0];
        distance = cars[i][1];
        var newCar = await getCarDetails(OPTIONS, url, distance)
        carsListed.push(newCar)
    }
    console.log("######resolving parseCars######")
    return carsListed
}

function getCarDetails(OPTIONS, url, dist) {
    return new Promise(function(resolve, reject) {
        OPTIONS.url = url;
        OPTIONS.headers =  {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36'
        }
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
            if (car) {
                console.log("%%%%%resolving carDeatils%%%%%")
                resolve(car);
            }
        });
    });
}




function timeStamp() {
    // Create a date object with the current time
    var now = new Date();

    // Create an array with the current month, day and time
    var date = [now.getMonth() + 1, now.getDate(), now.getFullYear()];

    // Create an array with the current hour, minute and second
    var time = [now.getHours(), now.getMinutes(), now.getSeconds()];

    // Determine AM or PM suffix based on the hour
    var suffix = (time[0] < 12) ? "AM" : "PM";

    // Convert hour from military time
    time[0] = (time[0] < 12) ? time[0] : time[0] - 12;

    // If hour is 0, set it to 12
    time[0] = time[0] || 12;

    // If seconds and minutes are less than 10, add a zero
    for (var i = 1; i < 3; i++) {
        if (time[i] < 10) {
            time[i] = "0" + time[i];
        }
    }

    // Return the formatted string
    return date.join("/") + " " + time.join(":") + " " + suffix;
}
