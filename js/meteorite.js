var inside = require('point-in-polygon')

Meteorites = function() { 
  this.list = []
}

//get meteorite info for given location
Meteorites.prototype.mapInfo = function(loc, geoType, dist, units) {
  if (!loc) return
  var polygon = (geoType === 'world' ? null : loc.geometry.coordinates),
      dist = dist || 3
      name
  //topojson naming quirk
  if (geoType === 'city') name = 'city'
  else if (geoType === 'country') name = 'name'

  //check if each meteorite is inside country boundary
  this.list.forEach(function(meteorite) {
    var mLoc = meteorite.geometry.coordinates
    // if meteorite point is inside country polygon
    d3.select('.m'+meteorite.properties.id )
      .classed('interest', function(d) {
        var isInside = false

        if (geoType === 'world')
          isInside = true
        if (geoType === 'country') {
          //account for multiple layers of arrays in topojson
          if (inside(mLoc, polygon)) return isInside = true
          polygon.forEach(function(poly1) {
            if (inside(mLoc, poly1)) return isInside = true
            poly1.forEach(function(poly2) {
              if (inside(mLoc, poly2)) return isInside = true
            })
            if (isInside) return
          })
        }
        else if (geoType === 'city') {
          if (GeoCoordDistance(polygon, mLoc, units) <= dist)
            isInside = true
        }
        return isInside
      })
  }) //end meteorites forEach

  //update meteor size histogram
  makeHistogram('.sizes', d3.selectAll('.interest').data(), function(d){ 
        return d.properties.mass })

} //end mapInfo

Meteorites.prototype.getMeteors = function(scope, limit, offset, massMin, massMax, year) {
  var self = this,
      query = "$where=reclong!='0.000000' AND reclat!='0.000000'"
  if (massMin) query += ' AND mass >= ' + (massMin * 1000)
  if (massMax) query += ' AND mass <= ' + (massMax * 1000)
  if (limit) query += '&$limit=' + limit
  if (offset)
    query += '&$order=:id&$offset=' + (offset == 'random' ? Math.round(Math.random()*(34513 - limit)) : offset)
  if (year) query += '&year='+year+'-01-01T00:00:00'

  d3.xhr('https://data.nasa.gov/resource/gh4g-9sfh.json?' + query)
    .header('X-App-Token', 'dDfZ8lS0kSxDD4os5DTIrdWAb')
    .get(function(err, data) {
      if (err) console.error(err)
      //clear list
      self.list = []
      // convert to GeoJSON
      JSON.parse(data.response).forEach(function(meteorite, i) {
        self.list[i] = {
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [+meteorite.reclong, +meteorite.reclat]
          },
          "properties": {
            "id": i,
            "name": meteorite.name,
            "mass": +meteorite.mass,
            "year": +meteorite.year || 'none'
          }
        }
      })

      self.addMeteorites(self.list, scope)
    }) //end xhr get
} // end get meteors

Meteorites.prototype.addMeteorites = function(meteorites, scope) {
  //Add meteorites to SVG if necessary
  if (!scope.svg.select('.meteorites').node() ) {
    var meteorG = scope.svg.append('g')
      .attr('class', 'meteorites')
  }
  else meteorG = scope.svg.select('.meteorites')

  var meteors = meteorG.selectAll('.meteor')
    .data(meteorites)

  meteors.enter().append('path')
    .attr('class', 'meteor')
  meteors.attr('d', scope.meteorPath)
      .attr('class', function(d) {
        return 'meteor m'+d.properties.id
      })
    .append('title')
    .text(function(d) {
      return d.properties.name+': '+Math.round(d.properties.mass)/1000+'kg, '+d.properties.year.substr(0,4)
    })

  meteors.exit()
    .remove()

  var cityVal = d3.select('#city-form').select('select').node().value,
      countryVal = d3.select('#country-form').select('select').node().value  
  if (cityVal) {
    var radius = d3.select('input[name=distance]').node().value,
        dUnits = d3.select('#distance-form').select('select').node().value
    this.mapInfo(d3.select('.city').data()[0], 'city', radius, dUnits)
  }
  else if (cityVal)
    this.mapInfo(d3.select('.country').data()[0], 'country')
  else 
    this.mapInfo(true, 'world')
}

module.exports = Meteorites
