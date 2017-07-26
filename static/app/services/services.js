angular.module('App')
    .factory('CarList', ['$http', function($http) {
        return {
            getCars: function(params) {
                var list = "";
                return $http.post('/api/search', params).then(function(res) {
                    if (res.data === undefined) {
                        list = null;
                    } else {
                        list = res.data;
                    }
                    return list;
                });
            }
        }
    }])
