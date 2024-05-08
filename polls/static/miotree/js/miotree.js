document.addEventListener('DOMContentLoaded', function() {
  var strocke_width = 3
  let levels = families

  const margins = {
    top: 50,
    bottom: 300,
    left: 30,
    right: 100,
  };

  // hight and width for the svg image
  const svgHeight = 1000;
  const svgWidth = 2000;
  const totalWidth = svgWidth + margins.left + margins.right;
  const totalHeight = svgHeight + margins.top + margins.bottom;

  // init start date
  var startDate = moment('2007-01', 'YYYY-MM');
  var endDate = moment('2024-01', 'YYYY-MM');
  var strEndDate = '2024-01'

  const div = d3.select('.svgdiv').node()
  // Fügen ein SVG Object hinzu.
  const svg = d3.select('.svgdiv')
    .append('svg')
    .attr('viewBox', `0 0 ${div.clientWidth} ${totalHeight}`)

  //Erstellen die xSkala 
  const xScale = d3.scaleTime()
    .range([10, div.clientWidth - 30])
    .domain([startDate, endDate]); // Daten automatisieren

  console.log(xScale(
    ('2005', 'YYYY')))

  // X Achse erstellen
  const xAxis = d3.axisBottom(xScale)
    .tickFormat(function (d) { return d3.timeFormat("%Y")(d); })
    .ticks(d3.timeMonth.every(12));

  const graphGroup = svg.append('g')
    .attr("class", "x-axis")
    .attr("y", "60")
    .attr("transform", `translate(50, ${150})`) // Anpassen falls höhe nicht stimmt
    .call(xAxis);

  levels.shift
  levels.unshift([]);

  // Define time format
  const timeFormat = d3.timeFormat('%Y');

  // We add one pseudo node to every level to deal with parentless nodes
  levels.forEach((l, i) => {
    l.forEach((n, j) => {
      console.log(n)
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
  console.log(levels)

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
    linelength = xScale(moment(strEndDate, 'YYYY-MM')) - xScale(moment(d.data.first_seen, 'YYYY-MM'))
    console.log(linelength)
    const context = d3.path();
    context.moveTo(-radius, 0);
    context.lineTo(-radius, -straightLineOffset);
    context.arc(0, -straightLineOffset, radius, -Math.PI, 0);
    //context.rect(0,10, linelength, 0);
    context.lineTo(radius, straightLineOffset);
    context.arc(0, straightLineOffset, radius, 0, Math.PI);
    context.closePath();

    return context + "";
  };

  // Hover above family and shows how long this family is active with a black line
  const drawActivePath = d => {
    console.log(d)
    const nPartners = (d.data.partners && d.data.partners.length > 1)
      ? d.data.partners.length
      : 0;
    const radius = 0;

    linelength = xScale(moment(d.data.last_seen ? d.data.last_seen : strEndDate, 'YYYY-MM')) - xScale(moment(d.data.first_seen, 'YYYY-MM'))
    //const straightLineOffset = (nPartners * offsetPerPartner) / 2;
    const context = d3.path();
    //context.rect(0,10, linelength, 0);
    context.moveTo(0, -20);
    context.arc(0, 0, radius, -Math.PI, 0);
    context.lineTo(linelength, 00);
    context.arc(0, 0, radius, 0, Math.PI);
    //ontext.arc(0, straightLineOffset, radius, 0, Math.PI);
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
  }

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

    // Chaos has no partner, nor Zeus with Athena
    const nthPartner = partner !== undefined
      ? partners.indexOf(partner)
      : (partners || []).length;
    const partnershipOffset = getPartnershipOffset(thisParent, partner);

    return drawLinkCurve(
      //this.parent.y,
      xScale(moment(thisParent.data.first_seen, 'YYYY-MM')),
      thisParent.x + startOffset + offsetPerPartner * nthPartner, // Hier nichts anpacken, alles richtig so 
      //link.target.y,
      xScale(moment(link.target.data.first_seen, 'YYYY-MM')),
      link.target.x,
      offsetStep * partnershipOffset,
      lineRadius
    );
  };

  function draw(root) {
    // Now every node has had it's position set, we can draw them now
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
      .attr("d", linkFn)
      .style("z-index", "999");

    const node = graphGroup.selectAll(".node")
      .data(nodes);

    node.exit().remove();
    const newNode = node.enter()
      .append("g")
      .attr("class", "node")
      .style("margin", "10px")
    newNode.append("path")
      .attr("d", drawNodePath)
      .style("position", "absolute")
      .style("z-index", "-1");
    newNode.append("object")
      .attr("id", d => d.id)
      .attr("first_seen", d => d.data.first_seen)
      .attr("last_seen", d => d.data.last_seen ? d.data.last_seen : strEndDate);
    newNode.append("path")
      .attr("d", drawActivePath)
      .attr("class", "active_path")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("z-index", "400")
      .attr("id", d => "active_path_" + d.id);

    // var tooltip = d3.select(document.createElement("div"));
    // tooltip.attr("class", "mytooltip")




    newNode.append("text")
      .attr("dy", -8)
      .attr("x", 10)
      .attr("class", "ui label tooltip_text")
      .style("z-index", "800")
      .style("fill", "currentcolor")
      .style("text-anchor", "start")
      .text(d => d.data.name)
      .call(getBB)
    newNode.insert("rect", "text")
      .attr("class", "ui label")
      .attr("y", -23)
      .attr("x", 5)
      .attr("width", function (d) { return d.bbox.width })
      .attr("height", function (d) { return d.bbox.height })
      .style("fill", "white")
      .style("fill-opacity", 0.7)


    var tooltip = newNode.append("foreignObject")
    tooltip = tooltip.attr("class", "mytooltip")
      .attr("y", -70)
      .attr("x", 50)
      .attr("dataNode", d => d.data)
      .attr("id", d => "tooltip_" + d.id)
      .attr("width", "300")
      .attr("height", "900")
      .style("position", "absolute")
      .style("z-index", "999")
      .style("background-color", "white")
      .style("visibility", "hidden");

    tooltip.append("xhtml:div")
      .attr("class", "ui segment custom-segment")
      .attr("id", d => "tooltip2_" + d.id)
      .style("z-index", "999")
      .style("background-color", "white");

    newNode.merge(node)
      .attr("transform", d => `translate(${xScale(moment(d.data.first_seen, 'YYYY-MM'))},${d.x})`)
      .selectAll("text")

    newNode.merge(node)
      .attr("transform", d => `translate(${xScale(moment(d.data.first_seen, 'YYYY-MM'))},${d.x})`)
      .selectAll("rect")

    d3.selectAll(".active_path")
      .attr("transform", d => `translate(${0},${25})`);

    const text = d3.selectAll("text");
    text.attr("transform", d => `translate(${0},${-5})`);
    console.log("Text")
    console.log(text)
    //text.raise();

  }
  function getBB(selection) {
    selection.each(function (d) { d.bbox = this.getBBox(); })
  }

  function bringTooltipToFront(tooltipId) {

    var tooltipElement = d3.select("#" + tooltipId).node();
    tooltipElement.parentNode.appendChild(tooltipElement);
  }

  var tooltipOpen = false;
  function showTooltip(tooltip) {
    tooltip.style("visibility", "visible");
    tooltipOpen = true;
}

function hideTooltip(tooltip) {
    if (tooltipOpen) return;
    setTimeout(function() {
        if (!tooltipOpen) 
        tooltip.style("visibility", "hidden");
        tooltip.select("*").remove();
      }, 600); // Verzögerung gibt dem Benutzer Zeit, die Maus über das Tooltip zu bewegen
}
function convertUrlsToLinks(urls) {
  return urls.map(url => `<a href="${url}" target="_blank">${url}</a>`).join("<br>");
}

  function add_tooltip_info(root) {
    // Now every node has had it's position set, we can draw them now
    const nodes = root.descendants()
      .filter(n => !n.id.startsWith("pseudo-"));
    const links = getLinks(nodes)
      .filter(l => !l.source.id.startsWith("pseudo-"));
    const node = graphGroup.selectAll(".node")
      .data(nodes);

    const text = graphGroup.selectAll(".tooltip_text")
      .data(nodes);

    const tooltipContainerZ = d3.select("#tooltip-container");
    if (tooltipContainerZ.empty()){
        const text = graphGroup.selectAll(".tooltip_text")
        .data(nodes);
        const tooltipZZZ = tooltipContainerZ.append("div")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      ;

    }



    //text.exit().remove();
    //const newNode = text.enter()


    text
      .on("mouseover", function (event, d) {
        var check_id = "tooltip_" + d.id;
        var active_path = d3.select("#active_path_" + d.id);
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
       

        const tooltipContainerZ = d3.select("#tooltip-container")
        .attr("class", "ui segment custom-segment")
        .style("width", "700px")
        .style("background-color", "white");
        
          // Breite und Höhe des Tooltips ermitteln
          const tooltipWidth = parseInt(tooltipContainerZ.style("width"), 10);
          const tooltipHeight = parseInt(tooltipContainerZ.style("height"), 10);

          // Breite und Höhe des SVG-Containers ermitteln
          const svgWidth = parseInt(d3.select("svg").style("width"), 10);
          const svgHeight = parseInt(d3.select("svg").style("height"), 10);

          // Abstand vom Hover-Bereich
          const offset = -50;

          // Tooltip-Position berechnen
          let tooltipX = event.clientX + offset;
          let tooltipY = event.clientY - tooltipHeight / 2;

          // Wenn das Tooltip rechts aus dem SVG-Bereich hinausragt, verschieben Sie es nach links
          if (tooltipX + tooltipWidth > svgWidth) {
            tooltipX = event.clientX - tooltipWidth - offset;
          }

          // Wenn das Tooltip oben aus dem SVG-Bereich hinausragt, verschieben Sie es nach unten
          if (tooltipY < 0) {
            tooltipY = 0;
          }

          // Wenn das Tooltip unten aus dem SVG-Bereich hinausragt, verschieben Sie es nach oben
          if (tooltipY + tooltipHeight > svgHeight) {
            tooltipY = svgHeight - tooltipHeight;
          }
        const tooltipzzz = tooltipContainerZ.append("div")
        tooltipContainerZ.style("left", tooltipX + "px")
            .style("top", tooltipY + "px");
        if (tooltip.attr("id") === check_id) {
          showTooltip(tooltipContainerZ)
          active_path
            .style("stroke-width", strocke_width)
            .style("stroke", "black")
            .style("visibility", "visible");
          return tooltipzzz.style("opacity", 1)
            .attr("id", check_id)
            .html(html);
        }
      })
      .on("mouseout", function (event, d) {
        var check_id = "tooltip_" + d.id;
        var tooltip = d3.select("#" + check_id);
        var active_path = d3.select("#active_path_" + d.id);
        const tooltipContainerZ = d3.select("#tooltip-container");
        //  .style("visibility", "hidden");
        tooltipOpen = false;
        
        hideTooltip(tooltipContainerZ)
        if (tooltip.attr("id") === check_id) {
        
          active_path
            .style("stroke-width", "1")
            .style("stroke", "rgba(147, 147, 147, 0.475)")
            .style("visibility", "hidden");
          return tooltipContainerZ
        }
      });
  }

  function add_tooltip_activ(root) {
    // Now every node has had it's position set, we can draw them now
    const nodes = root.descendants()
      .filter(n => !n.id.startsWith("pseudo-"));
    const links = getLinks(nodes)
      .filter(l => !l.source.id.startsWith("pseudo-"));
    const node = graphGroup.selectAll(".node")
      .data(nodes);

      const tooltipContainerZ = d3.select("#tooltip-container")
      .data(nodes);

    tooltipContainerZ
  .on("mouseover", function (event, d) {
    showTooltip(tooltipContainerZ);
    tooltipOpen = true;
  })
  .on("mouseout", function (event, d) {
    tooltipOpen = false;
    hideTooltip(tooltipContainerZ);
  });
  }

  function add_tooltip_activ_path(root) {
    // Now every node has had it's position set, we can draw them now
    const nodes = root.descendants()
      .filter(n => !n.id.startsWith("pseudo-"));
    const links = getLinks(nodes)
      .filter(l => !l.source.id.startsWith("pseudo-"));
    const node = graphGroup.selectAll(".node")
      .data(nodes);

    const text = graphGroup.selectAll(".active_path")
      .data(nodes);


    //text.exit().remove();
    //const newNode = text.enter()
    text
      .on("mouseover", function (event, d) {

        var check_id = "active_path_" + d.id

        var tooltip = d3.select("#active_path_" + check_id)
        if (tooltip.node()) {
          if (tooltip.attr("id") === check_id) {
            return tooltip.style("stroke-width", strocke_width).style("stroke", "black").style("visibility", "visible");
          }
        }
      })
      .on("mousemove", function (event, d) {

        var check_id = "active_path_" + d.id
        var tooltip = d3.select("#" + check_id)
        if (tooltip.node()) {
          if (tooltip.attr("id") === check_id) {
            return tooltip.style("stroke-width", strocke_width).style("stroke", "black").style("visibility", "visible");
          }
        }
      })
      .on("mouseout", function (event, d) {
        var check_id = "active_path_" + d.id
        var tooltip = d3.select("#" + check_id)

        if (tooltip.node()) {
          if (tooltip.attr("id") === check_id) {
            hideTooltip(tooltip);
            return tooltip.style("stroke-width", "1").style("stroke", "rgba(147, 147, 147, 0.475)").style("visibility", "hidden");
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
        console.log(parentNodes)
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


  // Append x-axis to graph group
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
  draw(tree(root));

  //var tip = d3.tip()
  //.attr('class', 'd3-tip') // benutzerdefinierte CSS-Klasse hinzufügen
  //.offset([-10, 0]) // Offset des Tooltips festlegen

  // Tooltips zu Nodes hinzufügen
  //var allText = d3.selectAll(".tooltip_text")
  //allTetxt=call(tip);
  window.onload = function () {
    add_tooltip_info(tree(root))
    //add_tooltip_activ(tree(root))
    add_tooltip_activ_path(tree(root))
  };

});