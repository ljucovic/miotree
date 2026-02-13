document.addEventListener('DOMContentLoaded', function() {
  const strokeWidth = 3;
  let levels = families;

  const margins = {
    top: 50,
    bottom: 300,
    left: 30,
    right: 100,
  };

  // Height and width for the svg image
  const svgWidth = 2000;
  const minNodeSpacing = 28;
  const nodeCount = levels.flat().length;
  const svgHeight = Math.max(1000, nodeCount * minNodeSpacing);
  const totalWidth = svgWidth + margins.left + margins.right;
  const totalHeight = svgHeight + margins.top + margins.bottom;

  const parseDate = d3.timeParse('%Y-%m');

  // Compute start and end dates dynamically from family data
  const allFamilies = levels.flat();
  const allFirstSeen = allFamilies.map(f => f.first_seen).filter(Boolean).map(d => parseDate(d));
  const allLastSeen = allFamilies.map(f => f.last_seen).filter(Boolean).map(d => parseDate(d));
  const allDates = allFirstSeen.concat(allLastSeen);

  const startDate = d3.min(allFirstSeen);
  // End date: latest of all last_seen dates, or if none, latest first_seen + 1 year
  let endDate;
  if (allLastSeen.length > 0) {
    endDate = d3.max(allDates);
  } else {
    endDate = d3.max(allFirstSeen);
  }
  // Add a 1-year buffer to the end date
  endDate = d3.timeYear.offset(endDate, 1);
  const endDateStr = d3.timeFormat('%Y-%m')(endDate);

  const div = d3.select('.svgdiv').node();
  // Append SVG element scaled to fit viewport
  const svg = d3.select('.svgdiv')
    .append('svg')
    .attr('viewBox', `0 0 ${div.clientWidth} ${totalHeight}`);

  // Create x scale
  const xScale = d3.scaleTime()
    .range([10, div.clientWidth - 30])
    .domain([startDate, endDate]);

  // Create x axis
  const xAxis = d3.axisBottom(xScale)
    .tickFormat(function (d) { return d3.timeFormat("%Y")(d); })
    .ticks(d3.timeMonth.every(12));

  const graphGroup = svg.append('g')
    .attr("class", "x-axis")
    .attr("y", "60")
    .attr("transform", `translate(50, ${150})`)
    .call(xAxis);

  // Prepend an empty level for the pseudo root node.
  // Note: levels contains a single sub-array with all families,
  // so we only unshift — not shift — to preserve the data.
  levels.unshift([]);

  // We add one pseudo node to every level to deal with parentless nodes
  levels.forEach((l, i) => {
    l.forEach((n, j) => {
      n.level = i;
      if (n.parents !== undefined) {
        n.parent = n.parents[0];
      } else {
        n.parent = `pseudo-${i - 1}`;
      }
    });
    l.unshift({
      id: `pseudo-${i}`,
      parent: i > 0 ? `pseudo-${i - 1}` : "",
      level: i
    });
  });

  const nodes = levels.flat();
  const colours = d3.scaleOrdinal()
    .domain(nodes.filter(n => n.parents)
      .map(n => n.parents.sort()
        .join("-")))
    .range(d3.schemePaired);

  function getLinks(nodes) {
    return nodes
      .filter(n => n.data.parents !== undefined)
      .map(n => n.data.parents.map(p => ({
        source: nodes.find(n => n.id === p),
        target: n
      })))
      .flat();
  }

  const offsetPerPartner = 5;
  const drawNodePath = d => {
    const radius = 4;
    // The number of partners determines the node height
    // But when a node has only one partner,
    // treat it the same as when it has zero
    const nPartners = (d.data.partners && d.data.partners.length > 1)
      ? d.data.partners.length + 4
      : 0;

    // We want to centre each node
    const straightLineOffset = (nPartners * offsetPerPartner) / 2;
    const context = d3.path();
    context.moveTo(-radius, 0);
    context.lineTo(-radius, -straightLineOffset);
    context.arc(0, -straightLineOffset, radius, -Math.PI, 0);
    context.lineTo(radius, straightLineOffset);
    context.arc(0, straightLineOffset, radius, 0, Math.PI);
    context.closePath();

    return context + "";
  };

  // Hover above family and shows how long this family is active with a black line
  const drawActivePath = d => {
    const radius = 0;
    const lastSeenDate = d.data.last_seen ? d.data.last_seen : endDateStr;
    const linelength = xScale(parseDate(lastSeenDate)) - xScale(parseDate(d.data.first_seen));
    const context = d3.path();
    context.moveTo(0, -20);
    context.arc(0, 0, radius, -Math.PI, 0);
    context.lineTo(linelength, 0);
    context.arc(0, 0, radius, 0, Math.PI);
    context.closePath();
    return context + "";
  };


  const drawLinkCurve = (x0, y0, x1, y1, offset, radius) => {
    const context = d3.path();
    context.moveTo(x0, y0);
    context.lineTo(x1 - 2 * radius - offset, y0);

    // If there is not enough space to draw two corners, reduce the corner radius
    if (Math.abs(y0 - y1) < 2 * radius) {
      radius = Math.abs(y0 - y1) / 2;
    }

    if (y0 < y1) {
      context.arcTo(x1 - offset - radius, y0, x1 - offset - radius, y0 + radius, radius);
      context.lineTo(x1 - offset - radius, y1 - radius);
      context.arcTo(x1 - offset - radius, y1, x1 - offset, y1, radius);
    } else if (y0 > y1) {
      context.arcTo(x1 - offset - radius, y0, x1 - offset - radius, y0 - radius, radius);
      context.lineTo(x1 - offset - radius, y1 + radius);
      context.arcTo(x1 - offset - radius, y1, x1 - offset, y1, radius);
    }
    context.lineTo(x1, y1);
    return context + "";
  };

  const partnershipsPerLevel = {};
  const getPartnershipOffset = (parent, partner) => {
    let partnershipId, level;
    if (partner !== undefined) {
      // On every level, every relationship gets its own offset. If a relationship
      // spans multiple levels, the furthest level is chosen
      level = Math.max(parent.depth, partner.level);
      if (!partnershipsPerLevel[level]) { partnershipsPerLevel[level] = []; }
      partnershipId = [parent.id, partner.id].sort().join("-");
    } else {
      level = parent.depth;
      if (!partnershipsPerLevel[level]) { partnershipsPerLevel[level] = []; }
      partnershipId = parent.id;
    }

    // Assume that the partnership already has a slot assigned
    const partnershipOffset = partnershipsPerLevel[level].indexOf(partnershipId);
    if (partnershipOffset === -1) {
      // Apparently not
      return partnershipsPerLevel[level].push(partnershipId) - 1;
    }
    return partnershipOffset;
  };

  const lineRadius = 10;
  const offsetStep = 5;
  const linkFn = link => {
    const thisParent = link.source;
    const partnerId = link.target.data.parents.find(p => p !== thisParent.id);
    const partners = thisParent.data.partners || [];

    // Let the first link start with this negative offset
    // But when a node has only one partner,
    // treat it the same as when it has zero
    const startOffset = (partners.length > 1)
      ? -(partners.length * offsetPerPartner) / 2
      : 0;

    const partner = partners.find(p => p.id === partnerId);

    const nthPartner = partner !== undefined
      ? partners.indexOf(partner)
      : (partners || []).length;
    const partnershipOffset = getPartnershipOffset(thisParent, partner);

    return drawLinkCurve(
      xScale(parseDate(thisParent.data.first_seen)),
      thisParent.x + startOffset + offsetPerPartner * nthPartner,
      xScale(parseDate(link.target.data.first_seen)),
      link.target.x,
      offsetStep * partnershipOffset,
      lineRadius
    );
  };

  function draw(root) {
    // Now every node has had its position set, we can draw them now
    const nodes = root.descendants()
      .filter(n => !n.id.startsWith("pseudo-"));
    const links = getLinks(nodes)
      .filter(l => !l.source.id.startsWith("pseudo-"));

    const link = graphGroup.selectAll(".link")
      .data(links);
    link.exit().remove();
    link.enter()
      .append("path")
      .attr("class", "link")
      .merge(link)
      .attr("stroke", d => colours(d.target.data.parents.sort().join("-")))
      .attr("d", linkFn);

    const node = graphGroup.selectAll(".node")
      .data(nodes);

    node.exit().remove();
    const newNode = node.enter()
      .append("g")
      .attr("class", "node");
    newNode.append("path")
      .attr("d", drawNodePath);
    newNode.append("object")
      .attr("id", d => d.id)
      .attr("first_seen", d => d.data.first_seen)
      .attr("last_seen", d => d.data.last_seen ? d.data.last_seen : endDateStr);
    newNode.append("path")
      .attr("d", drawActivePath)
      .attr("class", "active_path")
      .style("visibility", "hidden")
      .attr("id", d => "active_path_" + d.id);

    newNode.append("text")
      .attr("dy", -8)
      .attr("x", 10)
      .attr("class", "ui label tooltip_text")
      .style("fill", "currentcolor")
      .style("text-anchor", "start")
      .text(d => d.data.name)
      .call(getBB);
    newNode.insert("rect", "text")
      .attr("class", "ui label")
      .attr("y", -23)
      .attr("x", 5)
      .attr("width", function (d) { return d.bbox.width; })
      .attr("height", function (d) { return d.bbox.height; })
      .style("fill", "white")
      .style("fill-opacity", 0.7);

    let tooltip = newNode.append("foreignObject");
    tooltip = tooltip.attr("class", "mytooltip")
      .attr("y", -70)
      .attr("x", 50)
      .attr("dataNode", d => d.data)
      .attr("id", d => "tooltip_" + d.id)
      .attr("width", "300")
      .attr("height", "900")
      .style("background-color", "white")
      .style("visibility", "hidden");

    tooltip.append("xhtml:div")
      .attr("class", "ui segment custom-segment")
      .attr("id", d => "tooltip2_" + d.id)
      .style("background-color", "white");

    newNode.merge(node)
      .attr("transform", d => `translate(${xScale(parseDate(d.data.first_seen))},${d.x})`);

    d3.selectAll(".active_path")
      .attr("transform", d => `translate(${0},${25})`);

    const text = d3.selectAll("text");
    text.attr("transform", d => `translate(${0},${-5})`);
  }

  function getBB(selection) {
    selection.each(function (d) { d.bbox = this.getBBox(); });
  }

  function bringTooltipToFront(tooltipId) {
    const tooltipElement = d3.select("#" + tooltipId).node();
    tooltipElement.parentNode.appendChild(tooltipElement);
  }

  let tooltipOpen = false;
  function showTooltip(tooltip) {
    tooltip.style("visibility", "visible");
    tooltipOpen = true;
  }

  function hideTooltip(tooltip) {
    if (tooltipOpen) return;
    setTimeout(function() {
      if (!tooltipOpen) {
        tooltip.style("visibility", "hidden");
        tooltip.select("*").remove();
      }
    }, 600);
  }

  function convertUrlsToLinks(urls) {
    return urls.map(url => `<a href="${url}" target="_blank">${url}</a>`).join("<br>");
  }

  function add_tooltip_info(root) {
    // Now every node has had its position set, we can draw them now
    const nodes = root.descendants()
      .filter(n => !n.id.startsWith("pseudo-"));

    const text = graphGroup.selectAll(".tooltip_text")
      .data(nodes);

    text
      .on("mouseover", function (event, d) {
        const check_id = "tooltip_" + d.id;
        const active_path = d3.select("#active_path_" + d.id);
        const tooltip = d3.select("#" + check_id);
        const informations = d.data.informations ? JSON.parse(d.data.informations) : null;
        const urlsHtml = informations && informations.urls ? convertUrlsToLinks(informations.urls) : "";

        const html = `<h3 class="ui header">${d.data.name}</h3>
                        <p> ${d.data.first_seen} - ${d.data.last_seen ? d.data.last_seen : "still active"}</p>
                        <p class="alias" style="color:grey">${d.data.alias}</p>
                        <table class= "ui celled table">
                          <thead>
                            <tr>
                              <th></th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td data-label="Parents Ids">Parents Ids</td>
                              <td data-label="parents_value">${d.data.parents ? d.data.parents : "N/A"}</td>
                            </tr>
                            ${informations && informations.cpu ? `<tr><td data-label="CPU">CPU</td><td data-label="cpu_value">  ${informations.cpu}</td></tr>` : ``}
                            <tr>
                              <td data-label="Botsize">Botsize</td>
                              <td data-label="botsize_value">${d.data.bot_size}</td>
                            </tr>
                            <tr>
                              <td data-label="Opensource">Opensource</td>
                              <td data-label="Opensource_value">${d.data.open_source}</td>
                            </tr>
                            <tr>
                              <td data-label="Name">White-Malware</td>
                              <td data-label="whitemalware_value"> ${d.data.white_malware}</td>
                            </tr>
                            ${informations && informations.info ? `<tr><td data-label="Info">Info</td><td data-label="info_value">  ${informations.info}</td></tr>` : ``}
                            ${informations && urlsHtml ? `<tr><td data-label="Info">Links</td><td data-label="urls_value">  ${urlsHtml}</td></tr>` : ``}
                          </tbody>
                        </table>`;

        const tooltipContainer = d3.select("#tooltip-container");
        // Clear previous tooltip content before adding new
        tooltipContainer.selectAll("*").remove();
        tooltipContainer
          .attr("class", "ui segment custom-segment")
          .style("width", "700px")
          .style("background-color", "white");

        // Get tooltip dimensions
        const tooltipWidth = parseInt(tooltipContainer.style("width"), 10);
        const tooltipHeight = parseInt(tooltipContainer.style("height"), 10);

        // Get SVG container dimensions
        const svgContainerWidth = parseInt(d3.select("svg").style("width"), 10);
        const svgContainerHeight = parseInt(d3.select("svg").style("height"), 10);

        const offset = -50;

        // Calculate tooltip position
        let tooltipX = event.clientX + offset;
        let tooltipY = event.clientY - tooltipHeight / 2;

        // If tooltip extends beyond right edge, move it to the left
        if (tooltipX + tooltipWidth > svgContainerWidth) {
          tooltipX = event.clientX - tooltipWidth - offset;
        }

        // Clamp tooltip within vertical bounds
        if (tooltipY < 0) {
          tooltipY = 0;
        }
        if (tooltipY + tooltipHeight > svgContainerHeight) {
          tooltipY = svgContainerHeight - tooltipHeight;
        }

        const tooltipDiv = tooltipContainer.append("div");
        tooltipContainer.style("left", tooltipX + "px")
          .style("top", tooltipY + "px");
        if (tooltip.attr("id") === check_id) {
          showTooltip(tooltipContainer);
          active_path
            .style("stroke-width", strokeWidth)
            .style("stroke", "black")
            .style("visibility", "visible");
          return tooltipDiv.style("opacity", 1)
            .attr("id", check_id)
            .html(html);
        }
      })
      .on("mouseout", function (event, d) {
        const check_id = "tooltip_" + d.id;
        const tooltip = d3.select("#" + check_id);
        const active_path = d3.select("#active_path_" + d.id);
        const tooltipContainer = d3.select("#tooltip-container");
        tooltipOpen = false;

        hideTooltip(tooltipContainer);
        if (tooltip.attr("id") === check_id) {
          active_path
            .style("stroke-width", "1")
            .style("stroke", "rgba(147, 147, 147, 0.475)")
            .style("visibility", "hidden");
          return tooltipContainer;
        }
      });
  }

  // Keep tooltip visible when hovering over the tooltip container itself
  d3.select("#tooltip-container")
    .on("mouseover", function () {
      tooltipOpen = true;
      d3.select(this).style("visibility", "visible");
    })
    .on("mouseout", function () {
      tooltipOpen = false;
      hideTooltip(d3.select(this));
    });

  function add_tooltip_activ_path(root) {
    // Now every node has had its position set, we can draw them now
    const nodes = root.descendants()
      .filter(n => !n.id.startsWith("pseudo-"));

    const text = graphGroup.selectAll(".active_path")
      .data(nodes);

    text
      .on("mouseover", function (event, d) {
        const check_id = "active_path_" + d.id;
        const activePath = d3.select("#" + check_id);
        if (activePath.node()) {
          if (activePath.attr("id") === check_id) {
            return activePath.style("stroke-width", strokeWidth).style("stroke", "black").style("visibility", "visible");
          }
        }
      })
      .on("mousemove", function (event, d) {
        const check_id = "active_path_" + d.id;
        const activePath = d3.select("#" + check_id);
        if (activePath.node()) {
          if (activePath.attr("id") === check_id) {
            return activePath.style("stroke-width", strokeWidth).style("stroke", "black").style("visibility", "visible");
          }
        }
      })
      .on("mouseout", function (event, d) {
        const check_id = "active_path_" + d.id;
        const activePath = d3.select("#" + check_id);

        if (activePath.node()) {
          if (activePath.attr("id") === check_id) {
            hideTooltip(activePath);
            return activePath.style("stroke-width", "1").style("stroke", "rgba(147, 147, 147, 0.475)").style("visibility", "hidden");
          }
        }
      });
  }


  const root = d3.stratify()
    .parentId(d => d.parent)
    (nodes);

  // Map the different sets of parents,
  // assigning each parent an array of partners
  getLinks(root.descendants())
    .filter(l => l.target.data.parents)
    .forEach(l => {
      const parentNames = l.target.data.parents;

      if (parentNames.length > 1) {
        const parentNodes = parentNames.map(p => nodes.find(n => n.id === p));
        parentNodes.forEach(p => {
          if (!p.partners) {
            p.partners = [];
          }
          parentNodes
            .filter(n => n !== p && !p.partners.includes(n))
            .forEach(n => {
              p.partners.push(n);
            });
        });
      }
    });


  // Take nodes with more partners first,
  // also counting the partners of the children
  root
    .sum(d => (d.value || 0) + (d.partners || []).length)
    .sort((a, b) => b.value - a.value);

  const tree = d3.tree()
    .size([svgHeight, svgWidth])
    .separation((a, b) => {
      // More separation between nodes with many children
      const totalPartners = (a.data.partners || []).length + (b.data.partners || []).length;
      return 1 + (totalPartners / 5);
    });

  const laidOutRoot = tree(root);

  // Resolve overlapping labels by nudging nodes apart vertically.
  // Labels extend ~120px to the right of the node, so two nodes overlap
  // when they are close vertically AND their horizontal ranges intersect.
  // Runs multiple passes until all overlaps are resolved.
  const labelWidth = 120;
  const minVerticalGap = 20;
  const visibleNodes = laidOutRoot.descendants()
    .filter(n => !n.id.startsWith("pseudo-"));

  let hasOverlap = true;
  while (hasOverlap) {
    hasOverlap = false;
    visibleNodes.sort((a, b) => a.x - b.x);

    for (let i = 0; i < visibleNodes.length - 1; i++) {
      const a = visibleNodes[i];
      const b = visibleNodes[i + 1];
      const vertDist = b.x - a.x;

      if (vertDist >= minVerticalGap) continue;

      const ax = xScale(parseDate(a.data.first_seen));
      const bx = xScale(parseDate(b.data.first_seen));
      const horizOverlap = Math.abs(ax - bx) < labelWidth;

      if (horizOverlap) {
        b.x += minVerticalGap - vertDist;
        hasOverlap = true;
      }
    }
  }

  draw(laidOutRoot);

  window.onload = function () {
    add_tooltip_info(laidOutRoot);
    add_tooltip_activ_path(laidOutRoot);
  };

});
