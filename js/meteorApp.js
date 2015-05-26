(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var World = require('./world'),
		Meteorites = require('./meteorite')

//Create Earth
d3.json('earth.json', function(err, data) {
  if (err) console.error(err)

  window.meteorites = new Meteorites()
	window.world = new World(data)

  //initialize Meteorites
  meteorites.getMeteors(world, 500, null, 10, 100, null)
	
  //enable view change
  world.setZoom()
  //let there be light
  world.makeSun()
  // fill the vaccuum
  world.makeEarth()
  world.makeMenus() 
})

GeoCoordDistance = function(start, end, units) {
  var r = 6371, //Earth r in km
      piRad = Math.PI / 180,
      angle = (1 - Math.cos((end[1] - start[1]) * piRad))/2 + 
        Math.cos(start[1] * piRad) * Math.cos(end[1] * piRad) * 
        (1 - Math.cos((end[0] - start[0]) * piRad))/2;

  var km = r * 2 * Math.asin(Math.sqrt(angle))

  if (units === 'mi')
    return km / 1.60934
  else return km
}

makeHistogram = function(hook, data, accessor) {
  var dMin = d3.min(data, accessor) || 0,
      dMax = d3.max(data, accessor) || 1

  var x = d3.scale.linear()
    .domain([dMin, dMax])
    .range([0, 160])
    .nice()

  var hist = d3.layout.histogram()
    .value(accessor)
    .bins(x.ticks())
    (data)

  var y = d3.scale.linear()
    .domain([0, d3.max(hist, function(d) { return d.y }) || 1 ])
    .range([70, 0])
    .nice()

  var xAxis = d3.svg.axis()
    .scale(x)
    .orient('bottom')
    .tickSize(2)
    .tickFormat(d3.format('s'), d3.formatPrefix(1e3))
  var yAxis = d3.svg.axis()
    .scale(y)
    .orient('left')
    .tickSize(3)
    .tickPadding(0)
    .tickValues(y.domain()[1] < 10 ? d3.range(y.domain()[1] + 1) : null)
    .tickFormat(d3.format('f'))

  // create <SVG> if necessary
  if (!d3.select(hook).select('.plot').node()) {
    var hSVG = d3.select(hook).append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', '0 0 200 100')
      .attr('class', 'histogram')

    var plot = hSVG.append('g')
      .attr('class', 'plot')
      .attr('transform', 'translate(20, 10)')

  }
  else var plot = d3.select(hook).select('.plot')

  // refresh graph
  var bar = plot.selectAll('.bar')
      .data(hist)
  bar.enter().append('rect')
      .attr('class', 'bar')
  bar.attr('transform', function(d) {
        return 'translate('+x(d.x)+', '+y(d.y)+')'
      })
      .attr('x', 1)
      .attr('width', function(d) { return x(hist[0].x + hist[0].dx) - 2 })
      .attr('height', function(d) { return y(0) - y(d.y) })
  bar.exit().remove()

  // clear chart if not enough data
  if (data.length < 2) {
    if (!plot.selectAll('.no-data').node()) {
      plot.selectAll('.axis').remove()
      plot.append('text')
        .attr('class', 'no-data')
        .attr('transform', 'translate(80, 40)')
        .text('DATA UNAVAILABLE')
      }
    return 
  }
  else if (data.length >=2) plot.select('.no-data').remove()

  plot.select('.x').remove()
  plot.append('g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0, '+y(0)+')')
      .call(xAxis)
    .append('text')
      .attr('text-anchor', 'middle')
      .attr('x', x(dMax)/2)
      .attr('dy', '2.7em')
      .text('mass(g)')

  plot.select('.y').remove()
  plot.append('g')
      .attr('class', 'y axis')
      .call(yAxis)
    .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('text-anchor', 'middle')
      .attr('x', -y(0)/2)
      .attr('dy', '-2.7em')
      .text('# meteorites')

  d3.selectAll('.bar').on('click', function(d, i) {
    meteorites.getMeteors(world, 500, null, d.x/1000, (d.x + d.dx)/1000, null)
  })    
}

readInputs = function() {
  var meteorsShow = d3.select('input[name=total-meteors]')
      number = meteorsShow.node().value,
      display = d3.select('.range-display'),
      minMass = d3.select('input[name=min-mass]').node().value,
      maxMass = d3.select('input[name=max-mass]').node().value
  meteorsShow.on('change', function() {
    display.text( ('000'+number).substr(-4) )
  })
}


},{"./meteorite":2,"./world":3}],2:[function(require,module,exports){
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

  if (self.query && query == self.query) return
  else self.query = query

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
  else if (countryVal)
    this.mapInfo(d3.select('.country').data()[0], 'country')
  else 
    this.mapInfo(true, 'world')
}

module.exports = Meteorites

},{"point-in-polygon":4}],3:[function(require,module,exports){
World = function (earth, meteorites) {
  window.earth = earth
  // define features
  this.countries = topojson.feature(earth, earth.objects.countries),
  this.lands = topojson.feature(earth, earth.objects.land),
  this.urbans = topojson.feature(earth, earth.objects.urbans),
  this.cities = topojson.feature(earth, earth.objects.cities)

  // define sizes
  this.width = 100
  this.height = 100

  this.svg = d3.select('#worldView').append('svg')
  .attr('width', this.width+'%')
  .attr('height', this.height+'%')
  .attr('viewBox', '0 0 100 100')

  // define projection type and scale
  this.projection = d3.geo.orthographic()
    .scale(40)
    .translate([this.width/2, this.height/2])
    .clipAngle(90)
  // make paths from projection
  this.earthPath = d3.geo.path()
    .projection(this.projection)
    .pointRadius(.5)
  this.cityPath = this.earthPath
  this.meteorPath = d3.geo.path()
    .projection(this.projection)
    .pointRadius(function(d) {
      return (parseInt(d.properties.mass) + '').length/16
    })

}

World.prototype.setZoom = function() {
  var self = this
  //zoom in by 20 percentage points
  var zoomIn = d3.select('.zoom-in').on('click', function() {
    var zLevel = self.svg.node().width.baseVal.valueInSpecifiedUnits + 20,
        border = -100 * (zLevel - 100)/(2 * zLevel)
    self.svg
      .attr('width', zLevel + '%')
      .attr('height', zLevel + '%')
      .style('transform', 'translate('+ border +'%,'+ border +'%)')
    if (zLevel >= 300) d3.select(this).attr('disabled', true)
    if (zLevel > 100) zoomOut.attr('disabled', null)
  })
  //zoom out by 20 percentage points
  var zoomOut = d3.select('.zoom-out').on('click', function() {
    var zLevel = self.svg.node().width.baseVal.valueInSpecifiedUnits - 20,
        border = -100 * (zLevel - 100)/(2 * zLevel)
    self.svg
      .attr('width', zLevel + '%')
      .attr('height', zLevel + '%')
      .style('transform', 'translate('+ border +'%,'+ border +'%)')
    if (zLevel <= 100) d3.select(this).attr('disabled', true)
    if (zLevel < 300) zoomIn.attr('disabled', null)
  })
}

World.prototype.makeSun = function() {
  var svgDef = this.svg.append('defs')
  var solGrad = svgDef.append('radialGradient')
    .attr('id', 'sol')
  solGrad.append('stop')
    .attr('offset', '0%').attr('stop-color', 'gold')
  solGrad.append('stop')
    .attr('offset', '70%').attr('stop-color', 'gold')
  solGrad.append('stop')
    .attr('offset', '100%').attr('stop-color', 'black')

  this.svg.append('circle')
    .attr('r', 27)
    .attr('fill', 'url(#sol)')
    .attr('class', 'sun')
    .attr('transform', 'translate('+this.width/2.9+','+this.height/2.5+')')
}

World.prototype.makeEarth = function() {
  // draw circle for water
  var water = this.svg.append('circle')
    .attr('x', 0)
    .attr('y', 0)
    .attr('r', 40)
    .attr('class', 'water')
    .attr('transform', 'translate('+this.width/2+','+this.height/2+')')
  // draw continents
  var land = this.svg.append('g')
    .attr('class', 'lands')
  land.append('path')
    .datum(this.lands)
    .attr('class', 'land')
    .attr('d', this.earthPath)
}

World.prototype.makeMenus = function() {
  var self = this
  //add cities to dropdown menu
  self.cityForm = d3.select('#city-form').append('select')
  self.cityForm.selectAll('option')
      .data(['empty'].concat(self.cities.features.sort(function(a, b) { 
        return a.properties.city > b.properties.city ? 1 : -1})
      ))
    .enter().append('option')
      .attr('value', function(d) {
        return d.properties ? d.properties.city : ''
      })
      .text(function(d) {
        return d.properties ? d.properties.city : 'CHOOSE A CITY'
      })
  self.cityForm.on('change', function() { self.spin.call(self) } )
  self.svg.append('path')
    .attr('class', 'city')

  //add countries to dropdown menu
  self.countryForm = d3.select('#country-form').append('select')
  self.countryForm.selectAll('option')
      .data(['empty'].concat(self.countries.features.sort(function(a, b) {
        return a.properties.name > b.properties.name ? 1 : -1})
      ))
    .enter().append('option')
      .attr('value', function(d) {
        return d.properties ? d.properties.name : ''
      })
      .text(function(d) {
        return d.properties ? d.properties.name : 'CHOOSE A COUNTRY'
      })
  self.countryForm.on('change', function() { self.spin.call(self) } )
  self.svg.append('path')
    .attr('class', 'country')

  //connect meteorite number input to display
  self.meteorsShow = d3.select('input[name=total-meteors]')
    .on('change', function() {
      d3.select('.range-display').text( ('000'+self.meteorsShow.node().value).substr(-4) )
    })
  
  self.distForm = d3.select('#distance-form')
  self.submitBtn = self.distForm.select('button')
    .on('click', function() { self.regInputUpdate.call(self) })
  //change radius of meteorites of interest
  
  self.distForm.on('keypress', function() { 
      if (d3.event.keyCode == 13) {
        if (d3.event.target == self.submitBtn.node())
          self.regInputUpdate.call(self)
        else
          self.regDistance.call(self)
        d3.event.preventDefault()
      }
    })
  //change selected meteorites on distance form change
  self.distForm.select('input').on('change', function() { self.regDistance.call(self) })
  self.distForm.select('select').on('change', function() { self.regDistance.call(self) })
}

World.prototype.regInputUpdate = function() {
  var meteorsShow = d3.select('input[name=total-meteors]'),
      number = meteorsShow.node().value,
      display = d3.select('.range-display'),
      minMass = d3.select('input[name=min-mass]').node().value,
      maxMass = d3.select('input[name=max-mass]').node().value

  meteorites.getMeteors(this, number, null, minMass, maxMass, null)
}

World.prototype.regDistance = function() {
  var distance = d3.select('input[name="distance"]').node().value,
      cityElem = d3.select('.city'),
      dUnits = this.distForm.select('select').node().value,
      cityPath = this.earthPath.pointRadius(dUnits === 'mi' ? distance/100: distance/161)
  //redraw city radius and meteorite styles
  if (!cityElem.classed('hidden') || !cityElem.attr('d')) {
    cityElem.attr('d', cityPath)
    meteorites.mapInfo(cityElem.data()[0], 'city', distance, dUnits)
  }
}

World.prototype.spin = function() {
  if (!d3.event || !d3.event.target) return
  var self = this,
      form = d3.event.target,
      loc = form.value,
      parent = d3.select(form.parentNode),
      geoType = parent.attr('id').replace('-form', ''),
      choose = parent.select('option'),
      currentSpin = self.projection.rotate(),
      dInput = d3.select('input[name="distance"]').node(),
      unitSelect = self.distForm.select('select').node(),
      targetC, locCoords, feat, name

  //disable SELECT option
  if (!choose.attr('disabled'))
    choose.attr('disabled', true)

  if (geoType === 'city') {
    feat = self.cities.features
    name = 'city'
    //reset country form, show distance form
    d3.select('#country-form').node().reset()
    self.distForm.select('fieldset').classed('hidden', false)
    self.cityPath = self.earthPath.pointRadius(unitSelect.value === 'mi' ? dInput.value/100: dInput.value/161)
  }
  else if (geoType === 'country') {
    feat = self.countries.features
    name = 'name'
    //reset city form, hide distance form 
    d3.select('#city-form').node().reset()
    self.distForm.select('fieldset').classed('hidden', true)
  }
  else console.error('Form ID unrecognized')

  // get gloabl coordinates of target location 
  feat.forEach(function(place) {
    if (place.properties[name] === loc)
      return targetC = place
  })
  if (geoType === 'country') {
    var countryPath = d3.geo.path()
      .projection(self.projection.rotate[0,0])
    locCoords = countryPath.centroid(targetC)
  }
  else if (geoType === 'city')
    locCoords = targetC.geometry.coordinates
  else
    locCoords = [0,0]

  // get increments of change
  var distance = [
     (-locCoords[0] - currentSpin[0])/30,
     (-locCoords[1] - currentSpin[1])/30
  ]

  //hide country
  self.svg.selectAll('.country')
    .classed('hidden', true)
  //hide meteors
  self.svg.selectAll('.meteor')
    .classed('hidden', true)

  //reset interval loop
  var i = 0;  
  //update rotation and draw paths
  var travel = setInterval( function(){
    if (i >= 30){
      clearInterval(travel)

      //rotate and show all meteors
      self.svg.selectAll('.meteor')
        .attr('d', self.meteorPath)
        .classed('hidden', false)

      if (geoType === 'city') {
        //draw/show city
        self.svg.selectAll('.city')
          .data([targetC])
          .attr('d', self.cityPath)
          .classed('hidden', false)
      }
      else if (geoType === 'country') {
        //draw country
        self.svg.selectAll('.country')
          .data([targetC])
          .attr('d', self.earthPath)
          .classed('hidden', false)
        //hide city  
        self.svg.selectAll('.city')
          .classed('hidden', true)
      }

      //show meteorites inside border
      return meteorites.mapInfo(targetC, geoType, dInput.value, unitSelect.value)

    } //end final cleanup 

    //set new rotation
    self.projection.rotate([
      self.projection.rotate()[0] + distance[0], 
      self.projection.rotate()[1] + distance[1]
    ])
    //redraw paths
    self.svg.selectAll('.land')
      .attr('d', self.earthPath)
    // svg.selectAll('.urban')
    //   .attr('d', earthPath)
    self.svg.select('.city')
      .attr('d', self.cityPath)
    //meteors not rotated until final pass
    
    i++
  }, 16)

}

module.exports = World

},{}],4:[function(require,module,exports){
module.exports = function (point, vs) {
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
    
    var x = point[0], y = point[1];
    
    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i][0], yi = vs[i][1];
        var xj = vs[j][0], yj = vs[j][1];
        
        var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    
    return inside;
};

},{}]},{},[1]);
