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

