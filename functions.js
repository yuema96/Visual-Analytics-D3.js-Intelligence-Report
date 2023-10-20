// Global ID variable
var ID = 1;

// Global selection variable
var selectedNodes = [];
var selectedGroups = [];
var displayFiles = [];
var mode = 0;

// Global constants
const TYPES = ['PERSON', 'ORG', 'DATE', 'GPE', 'PHONE', 'BANK'];

//******************************************************************************************************************
// showGraph
//   Creates or updates graph
//   Arguments
//     1. JSON data from file
//     2. List of nodes
//     3. List of links
//     4. Boolean indicating whether the graph is being updated (true) or created (false)
//     5. ID of the graph to update or create
//
//   Returns: SVG node containing the graph
//******************************************************************************************************************
function showGraph(data, nodes, links, update, id) {

    // ESTABLISHES BASE ATTRIBUTES

    var attributes = {
        padding: 40,
        width: 1000,         // Inner (data area) width
        height: 800,         // Inner (data area) height
        nodeOpacity: 0.7
    }

    // CREATES VISUAL PRESENTATION OF DATA

    // Creates X and Y scales

    var xCoords = [];
    var yCoords = [];
    Object.keys(data).forEach(key => {
        xCoords.push(Number(data[key][3][0]));
        yCoords.push(Number(data[key][3][1]));
    });

    var xScale = d3.scaleLinear()
        .domain([d3.min(xCoords, d => d), d3.max(xCoords, d => d)])
        .range([1, attributes.width - (attributes.padding * 2)]);

    var yScale = d3.scaleLinear()
        .domain([d3.min(yCoords, d => d), d3.max(yCoords, d => d)])
        .range([attributes.height - (attributes.padding * 2), 1]);
    
    // Creates or updates graph, depending on parameter value
    if (update)
        return updateGraph();
    else
        return createGraph();

    // GRAPH FUNCTIONS

    //**************************************************************************************************************
    // createGraph
    //   Inner function creates a new graph
    //
    //   Returns: SVG node containing the graph
    //**************************************************************************************************************
    function createGraph() {
        // Creates SVG
        var svg = d3.create("svg:svg")
            .attr("id", "plot-" + id)
            .attr("x", 0)                                                           // Inherits position from container
            .attr("y", 0)                                                           // Inherits position from container
            .attr("width", attributes.width + attributes.padding * 2)               // Outer width
            .attr("height", attributes.height + attributes.padding * 2);            // Outer height

        // Creates group for presentation
        var containerGroup = svg
            .append("g")
            .attr("transform", "translate(" + attributes.padding + ", " + attributes.padding + ")");

        // Creates group for links
        var linkGroup = containerGroup
            .append("g")
            .attr("id", "linkGroup-" + id);

        // Creates group for nodes
        var nodeGroup = containerGroup
            .append("g")
            .attr("id", "nodeGroup-" + id);

        // Creates group for data info panel overlay
        var panelGroup = containerGroup
            .append("g");

        // Creates DOM elements bound to the data
        var graphMarks = addMarks(linkGroup, nodeGroup);

        // Increments global ID for next chart
        ID += 1;

        // Returns data on most similar models
        return svg.node();
    }

    //**************************************************************************************************************
    // updateGraph
    //   Inner function updates an existing graph
    //
    //   Returns: SVG node containing the graph (selected through the DOM)
    //**************************************************************************************************************
    function updateGraph() {
        var linkGroup = d3.select("#linkGroup-" + id);
        linkGroup.selectAll("line").remove();
        
        var nodeGroup = d3.select("#nodeGroup-" + id);
        nodeGroup.selectAll("circle").remove();

        addMarks(linkGroup, nodeGroup);

        return d3.select("#plot-" + id);
    }

    //**************************************************************************************************************
    // addMarks
    //   Inner function adds nodes to SVG groups
    //   Arguments
    //     1. SVG group to which the links will be attached
    //     2. SVG group to which the nodes will be attached
    //**************************************************************************************************************
    function addMarks(linkGroup, nodeGroup) {

        var graphLinks = linkGroup
            .selectAll("line")
            .data(links)
            .enter()
            .append("line")
                .attr("x1", function(d) {
                    var obj1 = nodes.find(e => String(e.id) == String(d.source));
                    return xScale(Number(obj1.x));
                })
                .attr("y1", function(d) {
                    var obj2 = nodes.find(e => String(e.id) == String(d.source));
                    return yScale(Number(obj2.y));
                })
                .attr("x2", function(d) {
                    var obj3 = nodes.find(e => String(e.id) == String(d.destination));
                    return xScale(Number(obj3.x));
                })
                .attr("y2", function(d) {
                    var obj4 = nodes.find(e => String(e.id) == String(d.destination));
                    return yScale(Number(obj4.y));
                })
                .style("stroke", "#DDDDDD")
                .style("stroke-width", d => d.strength / 7);

        graphLinks.filter(function(lnk) {
            return selectedNodes.indexOf(lnk.source) != -1;
        })
            .style("stroke", "#119999");

        var graphNodes = nodeGroup
            .selectAll("circle")
            .data(nodes)
            .enter()
            .append("circle")
                .attr("cx", d => xScale(d["x"]))
                .attr("cy", d => yScale(d["y"]))
                .attr("r", d => d.relevance / 6)
                .style("fill", d => d3.interpolateRainbow(d.type / 7))
                .style("opacity", attributes.nodeOpacity)
                .on("mouseover", function() {
                    d3.selectAll("circle").style("fill", "#AAAAAA");
                    d3.select(this).style("fill", d => d3.interpolateRainbow(d.type / 7));
                    d3.selectAll(".selected").style("fill", d => d3.interpolateRainbow(d.type / 7));

                    graphLinks.filter(function(lnk) {
                        return lnk.source == this.id;
                    }).style("stroke-width", d => d.strength / 2);
                })
                .on("mouseout", function() {
                    d3.selectAll("circle").style("fill", d => d3.interpolateRainbow(d.type / 7));
                    d3.selectAll("lines").style("stroke-width", d => d.strength / 7);
                })
                .on("click", function(d) {
                    var obj = this.__data__;

                    // If this node is selected:
                    if (selectedNodes.indexOf(obj.id) == -1) {
                        selectedNodes.push(obj.id);
                        this.classList.add("selected");

                        graphLinks.filter(function(lnk) {
                            return lnk.source == obj.id;
                        }).style("stroke", "#119999");

                        // Loads relevant file names
                        var relatedFiles = data[obj.id][1];

                        // Adds relevant files to list of related files
                        d3.json("files.json").then(function(files) {
                            relatedFiles.forEach(function(i) {
                                if (displayFiles.indexOf(i) == -1) {
                                    displayFiles.push(i);
                                }
                            });
                        });

                        // Displays files
                        loadDocs(data, nodes);
                    }
                    // If this node is not selected:
                    else {
                        selectedNodes.splice(selectedNodes.indexOf(obj.id), 1);
                        this.classList.remove("selected");

                        graphLinks.filter(function(lnk) {
                            return lnk.source == obj.id;
                        }).style("stroke", "#DDDDDD");

                        // Loads relevant file names
                        var relatedFiles = [];
                        selectedNodes.forEach(function(i) {
                            relatedFiles.push(...data[i][1]);
                        });
                        displayFiles = relatedFiles;

                        // Displays files
                        loadDocs(data, nodes);
                    }
                })
                .append("svg:title")
                    .text(d => d.id);
    }
}

//**************************************************************************************************************
// loadDocs
//   Adds document nodes to DOM
//**************************************************************************************************************
function loadDocs(data, nodes) {
    // Removes all file nodes from DOM
    d3.selectAll(".embed").remove();

    // Re-adds relevant files to DOM
    d3.json("files.json").then(function(files) {
        var keys = Object.keys(files);
        var vals = Object.values(files);

        var matches = {};

        displayFiles.forEach(function(displayedFile) {
            // Creates header
            var text = document.createTextNode(displayedFile);
            var tag = document.createElement("h2");
            tag.setAttribute("id", displayedFile);
            tag.appendChild(text);

            var match;
            selectedNodes.forEach(function(selectedNode) {
                if (files[displayedFile].search(selectedNode) != -1) {
                    var this_type = TYPES.indexOf(data[selectedNode][0]);
                    if (matches.hasOwnProperty(displayedFile)) {
                        match = matches[displayedFile];
                    }
                    else {
                        match = files[displayedFile];
                        matches[displayedFile] = files[displayedFile];
                    }
                    matches[displayedFile] = match.replace(new RegExp(selectedNode, 'g'), "<span class='highlight' style='background-color: " + d3.interpolateRainbow(this_type / 7) + "'>" + selectedNode + "</span>");
                }
            });

            // Creates paragraph (text body)
            var fileText = document.createElement("p");
            fileText.setAttribute("id", displayedFile + "1");
            fileText.innerHTML = matches[displayedFile];

            // Adds elements to container
            var fileContainer = document.createElement("div");
            fileContainer.appendChild(tag);
            fileContainer.appendChild(fileText);

            // Adds container to DOM
            var element = document.getElementById("doc-view");
            element.appendChild(fileContainer);

            // Adds relevant classes
            tag.classList.add("embed", "embedded");
            fileText.classList.add("embed", "embedded");
            fileContainer.classList.add("embed", "embedder");
            fileContainer.classList.add("flex-item");
        });
    });
}        

//******************************************************************************************************************
// loadGraph
//   Processes data and loads appropriate graph to view
//******************************************************************************************************************
function loadGraph(update, id) {
    // Loads relevant data from file
    d3.json("terms.json").then(function(data) {

        // Removes selected nodes in unchecked type layer
        var tempNodes = [];
        selectedNodes.forEach(function(d) {
            if (selectedGroups.indexOf(data[d][0]) != -1)
                tempNodes.push(d);
        });
        selectedNodes = tempNodes;

        // Gets list of nodes
        var nodes = [];
        Object.keys(data).forEach(key => {
            if (selectedGroups.indexOf(data[key][0]) != -1) {
                nodes.push({
                    id : key,
                    type : TYPES.indexOf(data[key][0]),
                    x : data[key][3][0],
                    y : data[key][3][1],
                    relevance : Object.keys(data[key][2]).length
                });
            }
        });

        // Gets list of links
        var links = [];
        Object.keys(data).forEach(key => {
            if (selectedGroups.indexOf(data[key][0]) != -1) {
                Object.keys(data[key][2]).forEach(relatedKey => {
                    if (data.hasOwnProperty(relatedKey) && selectedGroups.indexOf(data[relatedKey][0]) != -1) {
                        links.push({
                            source : key,
                            destination : relatedKey,
                            strength : data[key][2][relatedKey]
                        });
                    }
                });
            }
        });

        // Loads relevant file names
        var relatedFiles = [];
        selectedNodes.forEach(function(i) {
            relatedFiles.push(...data[i][1]);
        });
        displayFiles = relatedFiles;

        // Updates file display
        loadDocs(data, nodes);

        // Creates or updates scatterplot, depending on parameter
        if (update)
            return showGraph(data, nodes, links, update, id);
        else {
            d3.select("#container-vis-1").append(function() {
                return showGraph(data, nodes, links, update, id);
            });
        }
    });
}

//******************************************************************************************************************
// Anonymous function (analogous to main function)
//   Draws visualizations once page is loaded
//******************************************************************************************************************
window.onload = function() {

    // Initializes "pretty" type list for printing
    var types_pretty = ['PERSON', 'ORGANIZATION', 'DATE', 'LOCATION', 'PHONE NUMBER', 'BANK ACCOUNT NUMBER'];

    // Adds check boxes and labels to DOM
    TYPES.forEach(function (d) {
        // Creates group
        var group = document.createElement("div");
        group.setAttribute("class", "flex-item");

        // Creates check box
        var checkBox = document.createElement("input");
        checkBox.type = "checkbox";
        checkBox.id = "entity-type-" + d;
        checkBox.name = "entity-type";
        checkBox.value = d;
        checkBox.classList.add("entities");

        // Creates label
        var label = document.createElement("label");
        label.setAttribute("for", "entity-type-" + d);
        label.appendChild(document.createTextNode(types_pretty[TYPES.indexOf(d)]));

        // Adds elements to group
        group.appendChild(checkBox);
        group.appendChild(label);

        // Adds group to DOM
        document.getElementById("select-type").appendChild(group);

        // Sets default checkbox selection
        selectedGroups.push(d);
        document.getElementById("entity-type-" + d).checked = true;
    });

    // Adds event handler to update graph based on type selected
    d3.selectAll(".entities").on("click", function(event, d) {
        if (this.checked && selectedGroups.indexOf(this.value) == -1) {
            selectedGroups.push(this.value);
        }
        else if (!this.checked && selectedGroups.indexOf(this.value) != -1) {
            selectedGroups.splice(selectedGroups.indexOf(this.value), 1);
        }

        // Updates graph
        loadGraph(true, 1);                 // update == true, ID of network graph == 1
    });

    // Adds button to clear selection
    var clearButton = document.createElement("button");
    clearButton.setAttribute("id", "clear");
    clearButton.appendChild(document.createTextNode("START OVER"));
    document.getElementById("clear").appendChild(clearButton);

    // Adds event handler for button to clear selection
    d3.select("#clear").on("click", function(event, d) {
        selectedNodes = [];
        selectedGroups = [];
        displayFiles = [];

        TYPES.forEach(function (this_type) {
            document.getElementById("entity-type-" + this_type).checked = true;
            selectedGroups.push(this_type);
        });

        // Updates graph
        loadGraph(true, 1);                 // update == true, ID of network graph == 1
    });

    // Creates full graph for initial view of data
    loadGraph(false, ID);                   // update == false
}