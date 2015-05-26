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
