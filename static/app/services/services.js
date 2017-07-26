angular.module('App')
    .factory('CarList', ['$http', function($http) {
        return {
            getCars: function() {
                var list = "";
                var req = {
                    url: '/api/cars/all',
                    method: "GET"
                };
                return $http(req).then(function(res) {
                    if (res.data === undefined) {
                        list = null;
                    } else {
                        list = res.data;
                    }
                    return list;
                });
            },
            archiveCar: function(id){
                var req = {
                    url: '/api/cars/archive/'+id,
                    method: "PUT"
                };
                console.log("archiving car ", id);
                return $http(req);
            },
            updateList: function(){
                var req = {
                    url:'/api/updateList',
                    method: "GET"
                };
                console.log('updating list');
                return $http(req);
            }
        }
    }])
