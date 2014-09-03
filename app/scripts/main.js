'use strict';

var stations = {},
    data,
    asyncCallsRemaining = 2,
    n,
    m,
    yGroupMax,
    yStackMax,
    x,
    y,
    margin,
    width,
    height,
    rect;

function makeGraph(){
  n = 4;
  m = 5;
  var stack = d3.layout.stack(),
      layers = stack(d3.range(n).map(function(i) { return getVariableValues(i); }));
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
    .range(['#7C858B', '#D75662']);

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
      .text('Trip Duration (minutes)');

  var layer = chart.selectAll('.layer')
      .data(layers)
    .enter().append('g')
      .attr('class', 'layer')
      .style('fill', function(d, i) { return color(i); });

  var legendLabels = ['Subscriber (mean)', 'Customer (mean)', 'Subscriber (median)', 'Customer (median)']
  var legend = chart.selectAll('.legend')
      .data(d3.range(n).map(function(i) { return {color: color(i), type: legendLabels[i]}; }))
    .enter().append('g')
      .attr('class', 'legend')
      .attr('transform', function(d, i) { return 'translate(0,' + i * 20 + ')'; });

  var legendOffset = 185;
  legend.append('rect')
      .attr('x', legendOffset + 6)
      .attr('width', 18)
      .attr('height', 18)
      .style('fill', function(d, i) { return color(i); });

  legend.append('text')
      .attr('x', legendOffset)
      .attr('y', 9)
      .attr('dy', '.35em')
      .style('text-anchor', 'end')
      .text(function(d) { return d.type; });

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
      .attr('height', function(d) { return y(d.y0) - y(d.y0 + d.y); });

  d3.selectAll('input').on('change', change);
}

function change() {
  // check for data population
  if (asyncCallsRemaining > 0) { return; }
  clearTimeout(timeout);
  if (this.value === 'grouped') { transitionGrouped(); }
  else { transitionStacked(); }
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
  if (n === 0) { return data.map(function(d) { return {x: d.city, y: d.mean.subscriber, totalMinutes: d.mean.total}; }); }
  if (n === 1) { return data.map(function(d) { return {x: d.city, y: d.mean.customer, totalMinutes: d.mean.total}; }); }
  if (n === 2) { return data.map(function(d) { return {x: d.city, y: d.median.subscriber, totalMinutes: d.median.total}; }); }
  if (n === 3) { return data.map(function(d) { return {x: d.city, y: d.median.customer, totalMinutes: d.median.total}; }); }
}

function asyncCallComplete() {
  --asyncCallsRemaining;
  if (asyncCallsRemaining <= 0) { makeGraph(); }
}

var timeout = setTimeout(function() {
  d3.select('input[value="grouped"]').property('checked', true).each(change);
}, 2000);

d3.csv('data/201402_station_data.csv', function(d){
  return d;
}, function(error, rows) {
  rows.forEach(function(d){
    stations[d.name] = d.landmark;
  });
  asyncCallComplete();
});

d3.csv('data/201402_trip_data.csv', function(error, csvData) {
  csvData.forEach(function(d){
    d.city = stations[d['Start Station']];
  });
  data = d3.nest()
    .key(function(d) { return d.city; })
    .key(function(d) { return d['Subscription Type']; })
    .sortKeys(d3.ascending)
    .rollup(function(d){
      return {
        mean: d3.mean(d, function(g) { return g.Duration / 60; }),
        median: d3.median(d, function(g) { return g.Duration / 60; })
      };
    }).entries(csvData);
  data.forEach(function(d){
    d.city = d.key;
    d.mean = {
      subscriber: Math.round(d.values[1].values.mean * 100) / 100,
      customer: Math.round(d.values[0].values.mean * 100) / 100
    }
    d.median = {
      subscriber: Math.round(d.values[1].values.median * 100) / 100,
      customer: Math.round(d.values[0].values.median * 100) / 100
    }
    d.mean.total = d.subscriberMeanDuration + d.customerMeanDuration;
    d.median.total = d.subscriberMedianDuration + d.customerMedianDuration;
  });
  asyncCallComplete();
});