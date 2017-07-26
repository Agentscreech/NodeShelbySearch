'use strict';
module.exports = function(sequelize, DataTypes) {
  var car = sequelize.define('car', {
    name: DataTypes.STRING,
    url: DataTypes.STRING(1000),
    price: DataTypes.STRING,
    vin: DataTypes.STRING,
    dealer: DataTypes.STRING,
    address: DataTypes.STRING,
    phone: DataTypes.STRING,
    color: DataTypes.STRING,
    pic: DataTypes.STRING,
    dist: DataTypes.STRING,
    archived: DataTypes.BOOLEAN
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
  return car;
};
