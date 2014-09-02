'use strict';

var stations = {},
    data,
    asyncCallsRemaining = 2,
    n,
    m,
    stack,
    layers,
    yGroupMax,
    yStackMax,
    x,
    y,
    margin,
    width,
    height,
    rect;

var timeout = setTimeout(function() {
  d3.select('input[value="grouped"]').property('checked', true).each(change);
}, 2000);

d3.csv('data/201402_station_data.csv', function(d){
  return d;
}, function(error, rows) {
  rows.forEach(function(d){
    stations[d.name] = d.landmark;
  })
  asyncCallComplete();
});

d3.csv('data/201402_trip_data.csv', function(error, csv_data) {
  csv_data.forEach(function(d){
    d.city = stations[d['Start Station']]
  });
  data = d3.nest()
    .key(function(d) { return d.city })
    .key(function(d) { return d['Subscription Type']})
    .sortKeys(d3.ascending)
    .rollup(function(d){
      return d3.mean(d, function(g) { return g.Duration / 60; });
    }).entries(csv_data);
  data.forEach(function(d){
    d.city = d.key;
    d.subscriberDuration = Math.round(d.values[1].values * 100) / 100;
    d.customerDuration = Math.round(d.values[0].values * 100) / 100;
    d.avgMinutes = d.subscriberDuration + d.customerDuration;
  });
  asyncCallComplete();
});

function asyncCallComplete() {
  --asyncCallsRemaining;
  if (asyncCallsRemaining <= 0) makeGraph();
}

function makeGraph(){
  n = 2;
  m = 5;
  var stack = d3.layout.stack(),
      layers = stack(d3.range(n).map(function(i) { return getVariableValues(i); }))
  yGroupMax = d3.max(layers, function(layer) { return d3.max(layer, function(d) { return d.y; }); }),
  yStackMax = d3.max(layers, function(layer) { return d3.max(layer, function(d) { return d.y0 + d.y; }); });

  margin = {top: 20, right: 30, bottom: 30, left: 40};
  width = 600 - margin.left - margin.right;
  height = 500 - margin.top - margin.bottom;

  x = d3.scale.ordinal()
      .domain(data.map(function(d) { return d.city; }))
      // .domain(d3.range(m))
      .rangeRoundBands([0, width], .1);

  y = d3.scale.linear()
      .domain([0, yStackMax])
      .range([height, 0]);

  var color = d3.scale.linear()
    .domain([0, n - 1])
    .range([{ color: '#7C858B', 'text': 'Customer' }, { color: '#D75662', 'text': 'Subscriber' }]);

  var xAxis = d3.svg.axis()
      .scale(x)
      .tickSize(0)
      .tickPadding(6)
      .orient('bottom');

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient('left')
      .ticks(10);

  var chart = d3.select('.chart')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
    .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  chart.append('g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0,' + height + ')')
      .call(xAxis);

  chart.append('g')
      .attr('class', 'y axis')
      .call(yAxis)
    .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - 40)
      .attr('x', 0 - (.67 * height))
      .attr('dy', '.71em')
      .style('text-anchor', 'end')
      .attr('style', 'font-size:14px;')
      .text('Mean Trip Duration (minutes)');
  console.log(height);

  var layer = chart.selectAll('.layer')
      .data(layers)
    .enter().append('g')
      .attr('class', 'layer')
      .style('fill', function(d, i) { return color(i).color; });

  var legend = chart.selectAll('.legend')
      .data(color.range().map(function(d) { return d.text; }).reverse())
    .enter().append('g')
      .attr('class', 'legend')
      .attr('transform', function(d, i) { return 'translate(0,' + i * 20 + ')'; });

  var legendOffset = 120;
  legend.append('rect')
      .attr('x', legendOffset + 6)
      .attr('width', 18)
      .attr('height', 18)
      .style('fill', function(d, i) { return color(i).color });

  legend.append('text')
      .attr('x', legendOffset)
      .attr('y', 9)
      .attr('dy', '.35em')
      .style('text-anchor', 'end')
      .text(function(d) {
        console.log(color(d));
        return d; });

  rect = layer.selectAll('rect')
      .data(function(d) { return d; })
    .enter().append('rect')
      .attr('class', 'bar')
      .attr('x', function(d) { return x(d.x); })
      .attr('y', height)
      .attr('width', x.rangeBand())
      .attr('height', 0);

  rect.transition()
      .delay(function(d, i) { return i * 10; })
      .attr('y', function(d) { return y(d.y0 + d.y); })
      .attr("height", function(d) { return y(d.y0) - y(d.y0 + d.y); });

  d3.selectAll('input').on('change', change);

}

function change() {
  // check for data population
  if (asyncCallsRemaining > 0) return;
  clearTimeout(timeout);
  if (this.value === 'grouped') transitionGrouped();
  else transitionStacked();
}

function transitionGrouped() {
  y.domain([0, yGroupMax]);

  rect.transition()
      .duration(500)
      .delay(function(d, i) { return i * 10; })
      .attr('x', function(d, i, j) { return x(d.x) + x.rangeBand() / n * j; })
      .attr('width', x.rangeBand() / n)
    .transition()
      .attr('y', function(d) { return y(d.y); })
      .attr('height', function(d) { return height - y(d.y); });
}

function transitionStacked() {
  y.domain([0, yStackMax]);

  rect.transition()
      .duration(500)
      .delay(function(d, i) { return i * 10; })
      .attr('y', function(d) { return y(d.y0 + d.y); })
      .attr('height', function(d) { return y(d.y0) - y(d.y0 + d.y); })
    .transition()
      .attr('x', function(d) { return x(d.x); })
      .attr('width', x.rangeBand());
}

function getVariableValues(n) {
  if (n == 0) return data.map(function(d) { return {x: d.city, y: d.subscriberDuration, totalMinutes: d.avgMinutes} });
  else return data.map(function(d) { return {x: d.city, y: d.customerDuration, totalMinutes: d.avgMinutes} });
}