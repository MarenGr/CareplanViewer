/**
 * Created by Maren on 07.06.2017.
 */

/**
 * Initiates parsing of data and building layout for care plan centric view
 */
function buildCarePlanMap(){
    if(!jQuery.isEmptyObject(gCareplans)) {
        var json = parseDataT();
        console.log(json);
        buildTreeMap(json);
    }
}

/**
 * Parses careplan data for care plan centric view
 * @returns {{name: string, children: Array, numberCP: number, categories: Array}} a preproccessed object containing cp data for cp-view
 */
function parseDataT(){
    // all -> practitioners -> type -> care plans
    //var data = {"name": bundle["link"][0]["url"], "children": []};
    var data = {"name": "all", "children": [], "numberCP": 0, "categories": []};
    var urlArray = [];

    for(var i in gCareplans){
        var indexPerformer = insertPerformer(data, gCareplans[i], urlArray);
        var indexCategory = insertCategory(data, gCareplans[i], indexPerformer);
        insertCarePlan(data, gCareplans[i], indexPerformer, indexCategory);
    }

    layout = "cpCentric";
    performer(data, urlArray);
    layout = "pCentric";
    //sort(data['children']);
    return data;
}

/**
 * Sorts the logged performer if found in the care plans to the
 * last position of the performer array in order to display it
 * in the top left corner of the tree map
 * @param performer
 */
function sort(performer){
    var i = 0;
    for(i; i < performer.length; i++){
        if(performer[i]['reference'] === gLoggedUser){
            break;
        }
    }
    var temp = performer[i];
    performer.splice(i, 1);
    performer.push(temp);
    console.log(performer);
}

/**
 * Inserts the performer layer for a new performer if not yet existing
 * and returns the index of the new or existing array position where the
 * rest of the care plan information is to be inserted
 * @param data      the resulting data object
 * @param rawdata   the care plan rawdata
 * @param urlArray  the url array of performer references that have been found yet
 * @returns {*}     the index position of the performer layer for current care plan
 */
function insertPerformer(data, rawdata, urlArray){
    var performer;
    if("author" in rawdata){
        performer = rawdata["author"][0]["reference"];
    }else{
        performer = "n/a";
    }
    var i = 0;

    var index = jQuery.inArray(performer, urlArray);
    if(index < 0){
        urlArray.push(performer);
        data["children"].push({"reference": performer, "children": []});
        return data.children.length-1;
    }else {
        return index;
    }
}

/**
 * Inserts the category layer for a new category if not yet existing
 * and returns the index of the new or existing array position where the
 * rest of the care plan information is to be inserted
 * @param data          the resulting data object
 * @param rawdata       the care plan rawdata
 * @param performer     the index position of the performer layer for current care plan
 * @returns {number}    the index position of the category layer for current care plan
 */
function insertCategory(data, rawdata, performer){
    var category;
    if("category" in rawdata){
        if("text" in rawdata.category[0]) {
            category = rawdata["category"][0]["text"];
        }else if("display" in rawdata["category"][0]["coding"][0]){
            category = rawdata["category"][0]["coding"][0]["display"];
        }else{
            category = "unspecified";
        }
    }else{
        category = "n/a";
    }
    var i = 0;
    var length = data["children"][performer]["children"].length;
    find:while(i < length){
        if(category == data["children"][performer]["children"][i]){
            break;
        }
        i++;
    }
    if(i == length){ //means that performer is not yet in array
        i = length;
        data["children"][performer]["children"].push({"name": category, "children": []});
        if(jQuery.inArray(category, data['categories']) < 0){
            data['categories'].push(category);
        }
    }
    return i;
}

/**
 * Inserts the care plan information
 * @param data      the resulting data object
 * @param rawdata   the care plan rawdata
 * @param performer the index position of the performer layer for current care plan
 * @param category  the index position of the category layer for current care plan
 */
function insertCarePlan(data, rawdata, performer, category){
    var name, size, end, specialty, status;
    if("description" in rawdata){
        name = rawdata["description"];
    }else if("text" in rawdata && "div" in rawdata.text){
        name = rawdata.text.div;
    }else{
        name = "Unspecified Care Plan";
    }
    if("period" in rawdata){
        if("end" in rawdata["period"]){
            end = rawdata["period"]["end"];
        }else{
            end = "ongoing";
        }
    }else{
        end = "ongoing";
    }
    if("status" in rawdata){
        status = rawdata.status;
    }

    var activity = parseActs(rawdata);
    size = calculatePriority(rawdata, data['children'][performer]['reference'], activity);

    var object = {"name": name, "size": size, "id": rawdata["id"], "activity": activity, "end": end, "status": status};
    data["children"][performer]["children"][category]["children"].push(object);
    data["numberCP"]++;
}

/**
 * Parses treatment (activity) information of the current care plan
 * @param resource  the care plan resource
 * @returns {{}}    an object of activities, with icon as key and arrays of treatment titles as values
 */
function parseActs(resource){
    var acts = {};
    var listCategories = [];
    if("activity" in resource){
        for(var i = 0; i < resource.activity.length; i++){
            if("reference" in resource.activity[i]){
                var current = gActivities[resource.activity[i].reference.reference];
                var category = getActivityType(true, current);
                var icon = getGlyphicon(category[0]);
                var title = getActivityTitle(current) + '<br>';
                if(jQuery.inArray(icon, listCategories) < 0){
                    listCategories.push(icon);
                    acts[icon] = title;
                }else{
                    acts[icon] += title;
                }
            }
        }
    }
    for(var i in acts){
        acts[i] = acts[i].substring(0, acts[i].length - 4);
    }
    return acts;
}

/**Calculates the priority for specific care plan, depending on
 * - logged on Practitioner (is subject/performer/actor/author/patient?)
 * - status of careplan (active, etc.)
 * - number of activities
 * - period of careplan
 * @param careplan care plan for which priority is calculated
 * @param loggedUser the user who is logged in (physician or patient)
 * @param activity the parsed activity infos
 * @returns priority (integer)
 */
function calculatePriority(careplan, performer, activity){
    var priority = 0;
    var weights = {"user": 0.2, "status": 0.2, "activities": 0.4, "period": 0.2};
    switch(careplan["status"]){
        case "active":{
            priority += weights["status"]*10;
            break;
        }
        case "suspended": case "draft":{
            priority += weights["status"]*7;
            break;
        }
        case "completed": case "unknown":{
            priority += weights["status"]*4;
            break;
        }
        case "entered-in-error": case "cancelled":{
            priority += weights["status"]*1;
            break;
        }
    }

    var count = 0;
    for(var i in activity){
        count++;
    }
    priority += weights["activities"] * (count);

    var today = new Date();
    var parseDate = d3.time.format("%Y-%m-%d").parse;
    if("period" in careplan) {
        if (!("end" in careplan["period"]) || today <= parseDate(careplan["period"]["end"])){
            if ("start" in careplan["period"] && today < parseDate(careplan["period"]["start"])) {
                priority += weights["period"] * 6;
            }else{
                priority += weights["period"] * 10;
            }
        } else {
            priority += weights["period"] * 3;
        }

    }else{
        priority += weights["period"]*7;
    }

    if(gLoggedUser === performer){
        priority += weights["user"]*5;
    }

    return Math.round(priority)*100;
}

/**
 * Builds the tree map based on the preprocessed data
 * @param data  preprocessed data
 */
function buildTreeMap(data){
    var number = 0;
    var rects = [];

    //configurations for the tree map
    //if many care plans in patient history, the treemap size will be increased
    var i = data["numberCP"]/7;
    if(i < 1) i=1;
    var legendRectSize = 18, legendSpacing = 4;
    var margin = {top: 10, right: 10, bottom: 10, left: 0},
        legendHeight = data['categories'].length * (legendRectSize+legendSpacing)+10,
        width = $('#content').width() - margin.left - margin.right,
        height = width/4*2*i,

        // configurations for color-category-mapping
        domainName = [  'Clinical management plan', 'Mental health personal health plan', 'Cancer care plan', 'Mental health crisis plan',
                        'Asthma clinical management plan', 'Chronic obstructive pulmonary disease clinical management plan',
                        'Diabetes clinical management plan', 'Hyperlipidemia clinical management plan',
                        'CPA care plan','Hypertension clinical management plan', 'Hypothyroidism clinical management plan',
                        'Coronary heart disease risk clinical management plan',
                        'Psychiatry care plan', 'Angina self management plan', 'Ankle brachial pressure index management plan',
                        'Diabetes self management plan',
                        'Transient ischemic attack clinical management plan', 'Patient written birth plan',
                        'Heart failure self management plan'  /*,default*/],
        color = d3.scale.category20c().domain(domainName);

    //starts building tree map, setting the size
    var svg = d3.select("#careplanCentric").append("svg")
            .attr("id", "careplanMap")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom + legendHeight)
            .attr("xmlns", "http://www.w3.org/2000/svg")
        .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    //configurations for building the treemap with padding, sort function, sizing and where to find size value
    var treemap = d3.layout.treemap()
        .padding(function(d){
            if(d.parent && !d.parent.parent){
                if(d.reference === gLoggedUser){
                    return 10;
                }
            }
            return 0;
        })
        .sort(function(a,b){
            if(a.parent && !a.parent.parent && b.parent && !b.parent.parent){
                if(a.reference === gLoggedUser && b.reference !== gLoggedUser){
                    return 1;
                }else if(b.reference === gLoggedUser && a.reference !== gLoggedUser){
                    return -1;
                }
            }
            return 0;
        })
        .size([width, height])
        .value(function(d){return d.size;});

    //enters data, creating a mapping between the data and the tree map elements
    var cell = svg.data([data]).selectAll("g")
        .data(treemap.nodes)
        .enter().append("g")
        .attr("class", "cell")
        .attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        })
        .style("opacity", function(d){
            if(!d.children){
                return getOpacity(d.status);
            }
            return 1;
        });

    //creates rectangles for data content
    cell.append("rect")
        .attr("class", "treemap")
        .attr("width", function (d) {
            return d.dx;
        })
        .attr("height", function (d) {
            return d.dy;
        })
        .style("fill", function (d) {       //fills rectangle with color
            if(d.children && d.parent && d.parent.parent){
                return color(d.name);
            }else if(!d.children){
                return 'white';
            }else if(d.reference === gLoggedUser){
                return 'grey';
            }else{
                return null;
            }
        })
        .style("opacity", function(d){      //sets opacity for rectangles
            if(!d.children){
                var opacity = getOpacity(d.status);
                if(opacity = 1){
                    return 0;
                }
                return 1-opacity+(1-opacity)*0.25;
            }
            return 1;
        })
        .attr("data-id", function(d){       //sets id for rectangle SVG element
            return d.id;
        });

    //show tree map. otherwise it won't be possible to get size of elements
    $('#careplanCentric').show();
    //margins configurations for rectangle content
    var oMarginTop = 10, oMarginLeft = 10, oMarginBottom = 15, oMarginRight = 10;
    //fills rectangle with foreignObject where HTML elements can be put in
    var content = cell.append("foreignObject")
        .attr("x", oMarginLeft)
        .attr("y", oMarginTop)
        .attr("height", function(){
            return jQuery(this).parent("g").height() - oMarginTop - oMarginBottom;
        })
        .attr("width", function(){
            return jQuery(this).parent("g").width() - oMarginLeft - oMarginRight;
        })
        .attr("dy", ".35em")
        .attr("text-anchor", "start");

    //starts filling foreign objects with content (row + oclumn + title)
    content.append("xhtml:div")
        .attr("class", "row")
        .attr("id", "row1")     //row with 2 columns for title and performer
        .append("xhtml:div")
            .attr("class", function(){  //width of 1. column (if performer doesn't fit right due to small width of rectangle)
                var div = jQuery(this);
                var width = div.parent("div").parent("foreignObject").width();
                var col;
                for(col = 8; width/12*(12-col) < 82 && col >= 6; col--){
                }
                return "col-sm-"+col;
            })
            .attr("id", "titel")
            .append("xhtml:label")      //content of 1. column (title)
                .attr("class", "titel")
                .text(function (d) {
                    var label = jQuery(this);
                    if(!d.children){
                        number++;
                        label.parent("div").parent("div").parent("foreignObject").parent("g").addClass("field").data("opacity", getOpacity(d.status));
                        var g = label.parent("div").parent("div").parent("foreignObject").parent("g")
                        var value = g[0].firstChild.attributes.style.value;
                        console.log(value);
                        g[0].firstChild.attributes.style.value = value.replace("0", 1-getOpacity(d.status));
                        value = g[0].firstChild.attributes.style.value;
                        console.log(value);
                        return d.name;
                    }else{return null;}
                });

    //sets font-size of the title depending on size of the rectangle
    for(var i = 17; i > 10; i--) {
        var titel = $('.titel').css("font-size", function () {
            var cur = jQuery(this);
            if(cur.width()*2 < cur.height()){
                cur.css("font-size", i);
            }
        });
    }

    //fills second column of 1. row with performer info
    d3.selectAll("#row1").append("xhtml:div")
        .attr("class", function(){      //width of 2. column (if performer doesn't fit right due to small width of rectangle)
            var div = jQuery(this);
            var width = div.parent("div").parent("foreignObject").width();
            var col;
            var count = 1;
            for(col = 4; width/12*col < 82 && col <= 6; col++);{
                count++;
            }
            return "col-sm-"+col;
        })
        .attr("style", "height:68px;")
        .html(function(d){      //performer content (icon + name + specialty as data-attribute for hover)
            if(!d.children) {
                var icon = ['<p class="center performer" data-specialty="', '">' +
                            getPerformerIcon() +'<br>', '</p>'];

                var string =  icon[0] + d.parent.parent.specialty + icon[1] + d.parent.parent.name + icon[2];
                return string;
            }else{return null;}
        });
    $('#careplanCentric').hide();       //can hide tree map again

    //append 2. row
    var row2 = content.append("xhtml:div")
        .attr("class", "row")
        .attr("id", "row2")
        .attr("padding-left", "15px")
        .attr("padding-right", "15px");

    //append end date in 3. row
    content.append("xhtml:div")
        .attr("class", "row")
        .attr("id", "enddate")
        .html(function(d){
            if(!d.children) {
                return '<span class="fa fa-bullseye" style="font-size:15px;padding-left:15px;"> ' + d.end + '</span>';
            }else{return null;}
        });

    //show again to fill rectangle/foreignObject with treatment/activity data
    $('#careplanCentric').show();
    row2.html(function (d) {
        var row = $(this);
        if(!d.children) {
            var listElements = [];
            var categories = [];
            for(var i in d.activity){
                categories.push(i);
            }
            categories.sort(function(a,b){      //sorts treatment categories
                return getPriority(getCategory(a)) - getPriority(getCategory(b));
            });
            for(var i = 0; i < categories.length; i++) {    //fills array of string elements for icons
                listElements.push(wrapper(categories[i], d.activity[categories[i]]));
            }
            var height = row.parent("foreignObject").height() - row.prevAll().height() - 30;
            var width = row.parent("foreignObject").width() - 20;
            return fillEvenly(height, width, listElements);
        }else{return null;}
    });
    $('#careplanCentric').hide(); //can hide again

    //starts building legend for tree map
    var legend = svg.selectAll('.legend')
        //.data(color.domain().slice(0, color.domain().length))
        .data(data['categories'])
        .enter()
        .append('g')
        .attr('class', 'legend')
        .attr('transform', function(d, i){
            var vert = i * (legendRectSize+legendSpacing) + 10 + height;
            var vert = i * (legendRectSize+legendSpacing) + 10 + height;
            return 'translate( 0,' + vert + ')';
        });

    legend.append('rect')
        .attr('width', legendRectSize)
        .attr('height', legendRectSize)
        .style('fill', color)
        .style('stroke', color);

    legend.append('text')
        .attr('x', legendRectSize + legendSpacing)
        .attr('y', legendRectSize - legendSpacing)
        .text(function(d) { return d; });

    addHover();
}

/**
 * Algorithm to evenly fill the symbols into an area
 * @param height    height of the area to be filled
 * @param width     width of the area to be filled
 * @param array     array of symbols (string representation of HTML elements)
 * @returns {string}    string of HTML elements of resulting grid system with symbols included
 */
function fillEvenly(height, width, array){
    //initial configuration
    if(height <= 0) height = 1;
    var limitW = 100;
    var limitH = 50;
    var ratio = 2;

    var amount = array.length;
    var count = 0;

    var horizontalCount = Math.floor(width/limitW);
    if(horizontalCount == 0) horizontalCount = 1;
    var verticalCount = Math.floor(height/limitH);
    if(verticalCount == 0) verticalCount = 1;

    var fontSize = 50;
    var string = "<div class='container-fluid'>";
    while(horizontalCount*verticalCount < amount && fontSize >= 15){    //decreases font-size if necessary
        limitW = limitW - 11, limitH = limitH - 5;
        horizontalCount = Math.floor(width/limitW);
        verticalCount = Math.floor(height/limitH);
        fontSize = fontSize-5;
    }
    var ratioWH = width/height;
    var curRatio = ratio/ratioWH;       //row column ratio

    //computes amount of rows and columns depending on ratio
    var columns = Math.sqrt(amount/curRatio);
    var rows = columns * curRatio;
    if(Math.floor(columns)*Math.floor(rows) >= amount){
        columns = Math.floor(columns);
        rows = Math.floor(rows);
    }else if(Math.ceil(columns)*Math.floor(rows) >= amount){
        columns = Math.ceil(columns);
        rows = Math.floor(rows);
    }else if(Math.floor(columns)*Math.ceil(rows) >= amount){
        columns = Math.floor(columns);
        rows = Math.ceil(rows);
    }else{
        columns = Math.ceil(columns);
        rows = Math.ceil(rows);
    }

    var grid = 12/columns;
    if(12%columns != 0) { //handle cases to fit to 12grid layout of bootstrap
        if (columns < 12) {
            switch (columns) {
                case 5: {
                    grid = 2;
                    break;
                }
                case 7:
                case 8: {
                    grid = 3;
                    break;
                }
                case 9: {
                    grid = 4;
                    break;
                }
                case 10:
                case 11: {
                    grid = 12;
                    break;
                }
            }
        } else { console.log("Columns greater than 12!"); //should not happen
        }
    }

    //builds grid system and inserts symbols
    for(var i = 0; i <= rows && count < amount; i++){
        string += '<div class="row" style="height:'+height/rows+'px">';
        for(var j = 0; j < columns && count < amount; j++){
            string += '<div class="col-sm-'+grid+'">';

            if(columns == 7 || columns == 8) {
                for(var p = 0; p < 2 && count < amount; p++)
                {
                    var temp = '<div class="col-sm-' + 2 + '">' +
                        '<p class="center">' + applyFontSize(array[count], fontSize) + '</p>' +
                        '</div>';
                    temp = center(temp, height, rows, fontSize);
                    string += temp;
                    count++;
                }
            }else if(columns == 9){
                for(var p = 0; p < 3 && count < amount; p++)
                {
                    var temp = '<div class="col-sm-' + 3 + '">' +
                        '<p class="center">' + applyFontSize(array[count], fontSize) + '</p>' +
                        '</div>';
                    temp = center(temp, height, rows, fontSize);
                    string += temp;
                    count++;
                }
            }else {
                var temp = '<p class="center">' + applyFontSize(array[count], fontSize) + '</p>';
                temp = center(temp, height, rows, fontSize);
                string += temp;
                count++;
            }
            string += '</div>';
        }
        string += '</div>';
    }
    string += "</div>";
    return string;
}

/**
 * Applies font size to a symbol
 * @param string        string of HTML symbol element
 * @param fontSize      font-size
 * @returns {string}    resulting string of HTML symbol element
 */
function applyFontSize(string, fontSize){
    var temp = string.split('></x', string.length - 10);
    return temp[0]+' style="font-size:'+fontSize+'px;"></x'+ temp[1];
}

/**
 * Centers the symbols (vertically) in the grid system element using the margin-attribute
 * @param string    string of HTML symbol element
 * @param height    height of the area to be filled
 * @param rows      amount of rows in the area
 * @param fontSize  font-size of symbol
 * @returns {string}    resulting string of HTML symbol element
 */
function center(string, height, rows, fontSize){
    var temp;
    temp = string.split('style="');
    var padding = (height/rows - fontSize)/2;
    return temp[0]+'style="margin-top:'+padding+'px;'+temp[1];
}

/**
 * Parses the data about performer (practitioners),
 * filling name and specialty into the data object
 * @param data  the data object the info is inserted into
 */
function fillPerformer(data){
    for(var i = 0; i < data["children"].length; i++){
        var current = data["children"][i];
        current["name"] = gPerformer[current["reference"]].name;
        current["specialty"] = gPerformer[current["reference"]].specialty;
    }
}

/**
 * Adds the hover functionality for the rectangle contents
 * icons and performer
 */
function addHover(){
    var hover = $('#hover');

    $('.icon').on("mouseover", function(){
        var current = $(this);
        var coords = current.offset();
        var details = current.data("titles");
        if(details.length > 0){
            hover.show()
                .html(details)
                .offset({left: coords.left+60, top: coords.top});
        }

    });
    $('.icon').on("mouseleave", function(){
        hover.hide();
    });

    $('.performer').on("mouseover", function(){
        var current = $(this);
        var coords = current.offset();
        var width = current.width();
        hover.show()
            .html(current.data('specialty'));
        hover.offset({left: coords.left+width/2-hover.width()/2, top: coords.top});
    });
    $('.performer').on("mouseleave", function(){
        hover.hide();
    });
}
