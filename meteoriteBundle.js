(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var inside = require('point-in-polygon')

var width = 100, height = 100

var worldsvg = d3.select('#worldView').append('svg')
  .attr('width', width+'%')
  .attr('height', height+'%')
  .attr('viewBox', '0 0 100 100')

//zoom in by 20 percentage points
var zoomIn = d3.select('.zoom-in').on('click', function() {
  var zLevel = worldsvg.node().width.baseVal.valueInSpecifiedUnits + 20,
      border = -100 * (zLevel - 100)/(2 * zLevel)
  worldsvg
    .attr('width', zLevel + '%')
    .attr('height', zLevel + '%')
    .style('transform', 'translate('+ border +'%,'+ border +'%)')
  if (zLevel >= 300) d3.select(this).attr('disabled', true)
  if (zLevel > 100) zoomOut.attr('disabled', null)
})
//zoom out by 20 percentage points
var zoomOut = d3.select('.zoom-out').on('click', function() {
  var zLevel = worldsvg.node().width.baseVal.valueInSpecifiedUnits - 20,
      border = -100 * (zLevel - 100)/(2 * zLevel)
  worldsvg
    .attr('width', zLevel + '%')
    .attr('height', zLevel + '%')
    .style('transform', 'translate('+ border +'%,'+ border +'%)')
  if (zLevel <= 100) d3.select(this).attr('disabled', true)
  if (zLevel < 300) zoomIn.attr('disabled', null)
})

//Create Earth
d3.json('earth.json', function(err, data) {
  if (err) console.error(err)
  createWorld(data)
})

function createWorld(world) {
  // greate global variable
  earth = world
  // define features
  var countries = topojson.feature(world, world.objects.countries),
      lands = topojson.feature(world, world.objects.land),
      urbans = topojson.feature(world, world.objects.urbans),
      cities = topojson.feature(world, world.objects.cities)

  // define projection type and scale
  var projection = d3.geo.orthographic()
    .scale(40)
    .translate([width/2, height/2])
    .clipAngle(90)
  // make path from projection
  var earthPath = d3.geo.path()
    .projection(projection)
    .pointRadius(.5)
  var cityPath = earthPath
  var meteorPath = d3.geo.path()
    .projection(projection)
    .pointRadius(function(d) {
      return (parseInt(d.properties.mass) + '').length/16
    })

  // sun gradient
  var svgDef = worldsvg.append('defs')
  var solGrad = svgDef.append('radialGradient')
    .attr('id', 'sol')
  solGrad.append('stop')
    .attr('offset', '0%').attr('stop-color', 'gold')
  solGrad.append('stop')
    .attr('offset', '70%').attr('stop-color', 'gold')
  solGrad.append('stop')
    .attr('offset', '100%').attr('stop-color', 'black')
  
  //DRAW EARTH

  var sun = worldsvg.append('circle')
    .attr('r', 27)
    .attr('fill', 'url(#sol)')
    .attr('class', 'sun')
    .attr('transform', 'translate('+width/2.9+','+height/2.5+')')
  //draw circle for water
  var water = worldsvg.append('circle')
    .attr('x', 0)
    .attr('y', 0)
    .attr('r', 40)
    .attr('class', 'water')
    .attr('transform', 'translate('+width/2+','+height/2+')')
  // draw countries
  var land = worldsvg.append('g')
    .attr('class', 'lands')
  land.append('path')
    .datum(lands)
    .attr('class', 'land')
    .attr('d', earthPath)

  // draw urban areas
  // var dense = svg.append('g')
  //   .attr('class', 'urbans')
  // dense.append('path')
  //   .datum(urbans)
  //   .attr('class', 'urban')
  //   .attr('d', earthPath)

  // // draw cities
  // var popCenter = svg.append('g')
  //   .attr('class', 'cities')
  // popCenter.selectAll('.city')
  //     .data(cities.features)
  //   .enter().append('path')
  //     .attr('d', cityPath)
  //     .attr('class', function(d) {
  //       return 'city ' + d.properties.city.replace(/\s/g, '-')
  //     })
  // // popCenter.selectAll('.city-label')
  // //     .data(cities.features)
  // //   .enter().append('text')
  // //     .text( function(d) { return d.properties.city })
  // //     .attr('class', function(d) {
  // //       return 'city-label ' + d.properties.city.replace(/\s/g, '-')
  // //     })
  // //     .attr('transform', function(d) {
  // //       if (d.geometry.coordinates[1] == -90) return ''
  // //       return 'translate('+projection(d.geometry.coordinates)+')' 
  // //     })
  
  //MAKE MENUS

  //add cities to dropdown menu
  var cityForm = d3.select('#city-form').append('select')
  cityForm.selectAll('option')
      .data(['empty'].concat(cities.features.sort(function(a, b) { 
        return a.properties.city > b.properties.city ? 1 : -1})
      ))
    .enter().append('option')
      .attr('value', function(d) {
        return d.properties ? d.properties.city : ''
      })
      .text(function(d) {
        return d.properties ? d.properties.city : 'CHOOSE A CITY'
      })
  cityForm.on('change', spin)
  worldsvg.append('path')
    .attr('class', 'city')

  //add countries to dropdown menu
  var countryForm = d3.select('#country-form').append('select')
  countryForm.selectAll('option')
      .data(['empty'].concat(countries.features.sort(function(a, b) {
        return a.properties.name > b.properties.name ? 1 : -1})
      ))
    .enter().append('option')
      .attr('value', function(d) {
        return d.properties ? d.properties.name : ''
      })
      .text(function(d) {
        return d.properties ? d.properties.name : 'CHOOSE A COUNTRY'
      })
  countryForm.on('change', spin)
  worldsvg.append('path')
    .attr('class', 'country')

  //change radius of meteorites of interest
  var distForm = d3.select('#distance-form')
  var distBtn = distForm.select('button')
    .on('click', regDistForm)
  distForm.select('input').on('keypress', function() { 
    if(d3.event.keyCode == 13) {
      regDistForm()
      d3.event.preventDefault() 
    }
  })

  function regDistForm() {
   var dInput = d3.select('input[name="distance"]').node(),
       cityElem = d3.select('.city'),
       unitSelect = distForm.select('select').node(),
       cityPath = earthPath.pointRadius(unitSelect.value === 'mi' ? dInput.value/100: dInput.value/161)
   //redraw city radius and meteorite styles
   if (!cityElem.classed('hidden') || !cityElem.attr('d')) {
     cityElem.attr('d', cityPath)
     //redraw meteorites         
     var cityLoc,
         citySelect = d3.select('#city-form').select('select').node()
     cities.features.forEach(function(city) {
       if (citySelect.value === city.properties.city)
         return cityLoc = city
     })
     mapInfo(cityLoc, 'city', dInput.value, unitSelect.value)
   }
  }

  //ADD MOTION

  function spin(){
    var loc = this.value
    if (!loc) return
    var parent = d3.select(this.parentNode),
        geoType = parent.attr('id').replace('-form', ''),
        choose = parent.select('option'),
        distanceForm = d3.select('#distance-form'),
        currentSpin = projection.rotate(),
        dInput = d3.select('input[name="distance"]').node(),
        unitSelect = distForm.select('select').node(),
        targetC, locCoords, feat, name

    //disable SELECT option
    if (!choose.attr('disabled'))
      choose.attr('disabled', true)

    if (geoType === 'city') {
      feat = cities.features
      name = 'city'
      //reset country form, show distance form
      d3.select('#country-form').node().reset()
      distanceForm.classed('hidden', false)
      cityPath = earthPath.pointRadius(unitSelect.value === 'mi' ? dInput.value/100: dInput.value/161)
    }
    else if (geoType === 'country') {
      feat = countries.features
      name = 'name'
      //reset city form, hide distance form 
      d3.select('#city-form').node().reset()
      distanceForm.classed('hidden', true)
    }
    else console.error('Form ID unrecognized')

    // get gloabl coordinates of target location 
    feat.forEach(function(place) {
      if (place.properties[name] === loc)
        return targetC = place
    })
    if (geoType === 'country') {
      var countryPath = d3.geo.path()
        .projection(projection.rotate[0,0])
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
    worldsvg.selectAll('.country')
      .classed('hidden', true)

    //reset interval loop
    var i = 0;  
    //update rotation and draw paths
    var travel = setInterval( function(){
      if (i >= 30){
        clearInterval(travel)
        if (geoType === 'city') {
          //draw/show city
          worldsvg.selectAll('.city')
            .data([targetC])
            .attr('d', cityPath)
            .classed('hidden', false)
        }
        else if (geoType === 'country') {
          //draw country
          worldsvg.selectAll('.country')
            .data([targetC])
            .attr('d', earthPath)
            .classed('hidden', false)
          //hide city  
          worldsvg.selectAll('.city')
            .classed('hidden', true)
        }

        //show meteorites inside border
        return mapInfo(targetC, geoType, dInput.value, unitSelect.value)

      } //end final cleanup 

      //set new rotation
      projection.rotate([
        projection.rotate()[0] + distance[0], 
        projection.rotate()[1] + distance[1]
      ])
      //redraw paths
      worldsvg.selectAll('.land')
        .attr('d', earthPath)
      // svg.selectAll('.urban')
      //   .attr('d', earthPath)
      worldsvg.select('.city')
        .attr('d', cityPath)
      worldsvg.selectAll('.meteor')
        .attr('d', meteorPath)

      i++
    }, 16)

  }
  
  //get meteorite info for given location
  function mapInfo(loc, geoType, dist, units) {
    if (!loc) return
    var polygon = loc.geometry.coordinates,
        dist = dist || 3
        name
    //topojson naming quirk
    if (geoType === 'city') name = 'city'
    else if (geoType === 'country') name = 'name'

    //check if each meteorite is inside country boundary
    meteorites.forEach(function(meteorite) {
      var mLoc = meteorite.geometry.coordinates
      // if meteorite point is inside country polygon
      d3.select('.m'+meteorite.properties.id )
        .classed('interest', function(d) {
          var isInside = false

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

  // get meteorites
  function getMeteors(limit, offset, massMin, massMax, year) {
    var query = "$where=reclong!='0.000000' AND reclat!='0.000000'"
    if (massMin) query += ' AND mass >= ' + (massMin * 1000)
    if (massMax) query += ' AND mass <= ' + (massMax * 1000)
    if (limit) query += '&$limit=' + limit
    if (offset)
      query += '&$order=:id&$offset=' + (offset == 'random' ? Math.round(Math.random()*(34513 - limit)) : offset)
    if (year) query += '&year='+(year ? year : 1800)+'-01-01T00:00:00'

    d3.xhr('https://data.nasa.gov/resource/gh4g-9sfh.json?' + query)
      .header('X-App-Token', 'dDfZ8lS0kSxDD4os5DTIrdWAb')
      .get(function(err, data) {
        if (err) console.error(err)
          jsonData = data
        meteorites = JSON.parse(data.response)
        // convert to GeoJSON
        meteorites.forEach(function(meteorite, i) {
          meteorites[i] = {
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
        //Add meteorites to SVG
        var meteorG = worldsvg.append('g')
            .attr('class', 'meteorites')
        var mGmeteors = meteorG.selectAll('.meteor')
            .data(meteorites)

        mGmeteors.enter().append('path')
            .attr('d', meteorPath)
            .attr('class', function(d) {
              return 'meteor m'+d.properties.id
            })
            .append('title')
            .text(function(d) {
              return d.properties.name+': '+Math.round(d.properties.mass)/1000+'kg, '+d.properties.year.substr(0,4)
            })

        mGmeteors.exit()
            .remove()

        // var info = d3.select('.info').append('ul')
        // info.selectAll('li')
        //     .data(data)
        //   .enter().append('li')
        //     .text(function(d) {
        //       return d.properties.name+': '+Math.round(d.properties.mass)/1000+'kg, '+d.properties.year.substr(0,4)
        //     })

      }) //end xhr get
  }// end get meteors

  getMeteors(500, null, 10, 100, null)
}// end createWorld

function GeoCoordDistance(start, end, units) {
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

function makeHistogram(hook, data, accessor) {
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
    .domain([0, d3.max(hist, function(d) { return d.y }) ])
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
    .tickValues(y.domain()[1] < 10 ? d3.range(y.domain()[1] + 1) : null)
    .tickFormat(d3.format('f'))

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

  if (data.length < 2 && !plot.selectAll('.no-data').node()) {
    return plot.append('text')
      .attr('class', 'no-data')
      .attr('transform', 'translate(80, 40)')
      .text('DATA UNAVAILABLE')
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
      .attr('dy', '-2.3em')
      .text('# meteorites')

  // plot.append('text')
  //     .attr('dy', '.35em')
  //     .attr('y', 1)
  //     .attr('x', x(hist[0].dx)/2)
  //     .attr('text-anchor', 'middle')
  //     .text(function(d) { return d.y })
    
}



},{"point-in-polygon":2}],2:[function(require,module,exports){
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
