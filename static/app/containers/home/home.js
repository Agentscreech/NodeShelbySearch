angular.module('App')
    .component('homeComp', {
        templateUrl: 'app/containers/home/home.html',
        controller: HomeCompCtrl,
        controllerAs: 'homeComp'
    });

function HomeCompCtrl($scope,$window,CarList,$sce) {
    var homeComp = this;
    homeComp.cars = "";
    homeComp.colors = ["Black","Blue","Gray","Red","White", "Yellow"];
    homeComp.years = ["2016", "2017", "2018"];
    homeComp.trims = ["Shelby GT350", "Shelby GT350R"];
    search = {
        zipcode : "",
        radius : "",
        minYear : "",
        maxYear : "",
        trims : [],
        colors : []
    }


    homeComp.archive = function(id){
        //flag the car to be archived and not displayed.
        console.log('tried to archive car with id ', id);
        CarList.archiveCar(id).then(function(res){
            document.getElementById(id).remove();
        });
    };
    homeComp.update = function(){
        CarList.updateList().then(function(){
            console.log('trying to refresh');
            $window.location.reload();
        });
    };
    //get a list of the cars
    CarList.getCars().then(function(res){
        //rank cars by price and distance
        homeComp.updaterStatus = res.updaterStatus;
        console.log(homeComp.updaterStatus)
        homeComp.cars = rankCars(res.cars);
        homeComp.cars.forEach(function(car){
            car.pdf = $sce.trustAsResourceUrl("http://www.windowsticker.forddirect.com/windowsticker.pdf?vin="+car.vin);
            car.showPdf = false;
        });
    });
}
//sorting helper
function rankCars(cars){
    cars = cars.filter(function(car){
        return car.archived == false;
    });
    //Add the distance @ $1/mile to the price then sort it.  That would weight the distance more since you'll have pay to travel to the location.
    var carsByPrice = cars.slice(0).sort(function(a,b){
            var arr1 = a.price.split("$"), arr2 = b.price.split("$");
            var weight1 = a.dist.split(" "), weight2 = b.dist.split(" ")
            if (arr1 == ""){
                arr1 = ["","999,999"]
            }
            if (arr2 == ""){
                arr2 = ["","999,999"]
            }
            return parseInt(arr1[1].split(",").join(""))+parseInt(weight1[0]) > parseInt(arr2[1].split(",").join(""))+parseInt(weight2[0]) ? 1 : parseInt(arr1[1].split(",").join(""))+parseInt(weight1[0]) < parseInt(arr2[1].split(",").join(""))+parseInt(weight2[0]) ? -1 : 0;

    });
    return carsByPrice
}

HomeCompCtrl.$inject = ['$scope','$window','CarList','$sce'];
