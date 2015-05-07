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
      return (parseInt(d.properties.mass) + '').length/20
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
        var dInput = d3.select('input[name="distance"]').node(),
            unitSelect = distForm.select('select').node()
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
        .attr('d', earthPath)
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

  } //end mapInfo

  // get meteorites
  d3.xhr('https://data.nasa.gov/resource/gh4g-9sfh.json?')
    .header('X-App-Token', 'dDfZ8lS0kSxDD4os5DTIrdWAb')
    .get(function(err, data) {
      if (err) console.error(err)
      meteorites = JSON.parse(data.response)
      // convert to GeoJSON
      meteorites.forEach(function(meteorite, i) {
        meteorites[i] = {
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [meteorite.reclong+0, meteorite.reclat+0]
          },
          "properties": {
            "id": i,
            "name": meteorite.name,
            "mass": meteorite.mass+0,
            "year": meteorite.year
          }
        }
      })
      //Add meteorites to SVG
      var meteorG = worldsvg.append('g')
          .attr('class', 'meteorites')
      meteorG.selectAll('.meteor')
          .data(meteorites)
        .enter().append('path')
          .attr('d', meteorPath)
          .attr('class', function(d) {
            return 'meteor m'+d.properties.id
          })
          .append('title')
          .text(function(d) {
            return d.properties.name+': '+Math.round(d.properties.mass)/1000+'kg, '+d.properties.year.substr(0,4)
          })

      // var info = d3.select('.info').append('ul')
      // info.selectAll('li')
      //     .data(data)
      //   .enter().append('li')
      //     .text(function(d) {
      //       return d.properties.name+': '+Math.round(d.properties.mass)/1000+'kg, '+d.properties.year.substr(0,4)
      //     })

    })// end get meteorites
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

