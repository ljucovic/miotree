document.addEventListener('DOMContentLoaded', function() {
  const data = familyData;
  const parseDate = d3.timeParse('%Y-%m');

  // Logo colors
  const COLOR_PINK = '#e91e8c';
  const COLOR_CYAN = '#00bcd4';
  const COLOR_GRAY = '#9e9e9e';

  // --- Populate Steckbrief dynamic fields ---

  const parentsCell = document.getElementById('parents-cell');
  if (data.parents && data.parents.length > 0) {
    parentsCell.innerHTML = data.parents
      .map(p => '<a href="/family/' + p.id + '/">' + p.name + '</a>')
      .join(', ');
  } else {
    parentsCell.textContent = 'N/A';
  }

  const info = data.informations;
  if (info) {
    if (info.cpu && info.cpu.length && info.cpu[0] !== '') {
      document.getElementById('cpu-row').style.display = '';
      document.getElementById('cpu-cell').textContent = Array.isArray(info.cpu) ? info.cpu.join(', ') : info.cpu;
    }
    if (info.topologie) {
      document.getElementById('topology-row').style.display = '';
      document.getElementById('topology-cell').textContent = info.topologie;
    }
    if (info.code_similarity) {
      document.getElementById('similarity-row').style.display = '';
      document.getElementById('similarity-cell').textContent = info.code_similarity;
    }
    if (info.category) {
      document.getElementById('category-row').style.display = '';
      document.getElementById('category-cell').textContent = Array.isArray(info.category) ? info.category.join(', ') : info.category;
    }
    if (info.attack) {
      document.getElementById('attack-row').style.display = '';
      document.getElementById('attack-cell').textContent = Array.isArray(info.attack) ? info.attack.join(', ') : info.attack;
    }
    if (info.info) {
      document.getElementById('info-row').style.display = '';
      document.getElementById('info-cell').textContent = Array.isArray(info.info) ? info.info.join(', ') : info.info;
    }
    if (info.urls && info.urls.length && info.urls[0] !== '') {
      document.getElementById('urls-row').style.display = '';
      document.getElementById('urls-cell').innerHTML = info.urls
        .map(function(url) { return '<a href="' + url + '" target="_blank">' + url + '</a>'; })
        .join('<br>');
    }
  }

  // --- D3 Timeline with semantic zoom ---

  const container = document.getElementById('timeline-svg');
  const width = container.clientWidth || 800;
  const height = 160;
  const margin = { top: 30, right: 40, bottom: 40, left: 40 };

  const startDate = parseDate(data.first_seen);
  if (!startDate) return;

  const now = new Date();
  let endDate;
  if (data.last_seen) {
    endDate = parseDate(data.last_seen);
  }
  if (!endDate || endDate > now) {
    endDate = now;
  }
  endDate = d3.timeMonth.offset(endDate, 2);

  const svg = d3.select('#timeline-svg')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  // Clip path so content doesn't overflow
  svg.append('defs').append('clipPath')
    .attr('id', 'timeline-clip')
    .append('rect')
    .attr('x', margin.left)
    .attr('y', 0)
    .attr('width', width - margin.left - margin.right)
    .attr('height', height);

  const contentGroup = svg.append('g')
    .attr('clip-path', 'url(#timeline-clip)');

  // Base scale (never mutated) and working scale
  const xScaleBase = d3.scaleTime()
    .domain([d3.timeMonth.offset(startDate, -1), endDate])
    .range([margin.left, width - margin.right]);

  let xScale = xScaleBase.copy();

  const axisY = height - margin.bottom;

  // Axis
  const xAxisFn = d3.axisBottom(xScale)
    .ticks(d3.timeYear.every(1))
    .tickFormat(d3.timeFormat('%Y'));

  const axisGroup = svg.append('g')
    .attr('class', 'timeline-axis')
    .attr('transform', 'translate(0,' + axisY + ')')
    .call(xAxisFn);

  function styleAxis() {
    axisGroup.selectAll('line').attr('stroke', COLOR_GRAY);
    axisGroup.selectAll('path').attr('stroke', COLOR_GRAY);
    axisGroup.selectAll('text').attr('fill', COLOR_GRAY);
  }
  styleAxis();

  // Activity bar
  const activityEndDate = data.last_seen ? parseDate(data.last_seen) : now;
  const activityBar = contentGroup.append('rect')
    .attr('class', 'activity-bar')
    .attr('y', axisY - 20)
    .attr('height', 8)
    .attr('rx', 4)
    .attr('fill', COLOR_GRAY)
    .attr('opacity', 0.3);

  // first_seen marker
  const firstSeenCircle = contentGroup.append('circle')
    .attr('cy', axisY - 16)
    .attr('r', 6)
    .attr('fill', COLOR_CYAN)
    .attr('stroke', '#fff')
    .attr('stroke-width', 2);

  const firstSeenLabel = contentGroup.append('text')
    .attr('y', axisY - 30)
    .attr('text-anchor', 'middle')
    .attr('font-size', '11px')
    .attr('fill', COLOR_GRAY)
    .text('first seen');

  // last_seen marker
  var lastSeenCircle, lastSeenLabel;
  if (data.last_seen) {
    lastSeenCircle = contentGroup.append('circle')
      .attr('cy', axisY - 16)
      .attr('r', 6)
      .attr('fill', COLOR_PINK)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    lastSeenLabel = contentGroup.append('text')
      .attr('y', axisY - 30)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('fill', COLOR_GRAY)
      .text('last seen');
  }

  // Event markers
  var eventGroups;
  var tooltip;
  if (data.events && data.events.length > 0) {
    tooltip = d3.select('#timeline-container')
      .append('div')
      .attr('class', 'timeline-tooltip')
      .style('position', 'absolute')
      .style('background', '#333')
      .style('color', '#fff')
      .style('padding', '4px 8px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('opacity', 0);

    eventGroups = contentGroup.selectAll('.event-marker')
      .data(data.events)
      .enter()
      .append('g')
      .attr('class', 'event-marker')
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        tooltip.style('opacity', 1)
          .html('<strong>' + d.date + '</strong>: ' + d.label)
          .style('left', (event.offsetX + 10) + 'px')
          .style('top', (event.offsetY - 30) + 'px');
      })
      .on('mouseout', function() {
        tooltip.style('opacity', 0);
      });

    // Non-attack: cyan circle
    eventGroups.filter(function(d) { return d.type !== 'attack'; })
      .append('circle')
      .attr('r', 5)
      .attr('fill', COLOR_CYAN)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5);

    // Attack: pink crosshair
    var attacks = eventGroups.filter(function(d) { return d.type === 'attack'; });
    var ch = 7;
    attacks.append('circle').attr('r', ch).attr('fill', 'none').attr('stroke', COLOR_PINK).attr('stroke-width', 2);
    attacks.append('circle').attr('r', 2).attr('fill', COLOR_PINK);
    attacks.append('line').attr('x1', -ch - 3).attr('x2', ch + 3).attr('y1', 0).attr('y2', 0).attr('stroke', COLOR_PINK).attr('stroke-width', 1.5);
    attacks.append('line').attr('x1', 0).attr('x2', 0).attr('y1', -ch - 3).attr('y2', ch + 3).attr('stroke', COLOR_PINK).attr('stroke-width', 1.5);
  }

  // --- Update positions based on current xScale ---
  function updatePositions() {
    // Activity bar
    activityBar
      .attr('x', xScale(startDate))
      .attr('width', Math.max(0, xScale(activityEndDate) - xScale(startDate)));

    // first_seen
    firstSeenCircle.attr('cx', xScale(startDate));
    firstSeenLabel.attr('x', xScale(startDate));

    // last_seen
    if (data.last_seen) {
      var ld = parseDate(data.last_seen);
      lastSeenCircle.attr('cx', xScale(ld));
      lastSeenLabel.attr('x', xScale(ld));
    }

    // Events
    if (eventGroups) {
      eventGroups.attr('transform', function(d) {
        return 'translate(' + xScale(parseDate(d.date)) + ',' + (axisY - 16) + ')';
      });
    }
  }

  // Initial draw
  updatePositions();

  // --- Semantic Zoom ---
  const zoom = d3.zoom()
    .scaleExtent([1, 20])
    .translateExtent([[margin.left, 0], [width - margin.right, height]])
    .extent([[margin.left, 0], [width - margin.right, height]])
    .on('zoom', function(event) {
      xScale = event.transform.rescaleX(xScaleBase);
      axisGroup.call(xAxisFn.scale(xScale));
      styleAxis();
      updatePositions();
    });

  svg.call(zoom);
});
