/**
 * Created by Maren on 07.06.2017.
 */

function buildCarePlanMap(entries){
    if(entries.length > 0) {
        var json = parseData(entries);
        buildTreeMap(json);
    }
}

function parseData(entries){ //TODO sort bundle automatically by performer --> url input (What happens for no performer?)
    // all -> practitioners -> type -> care plans
    //var data = {"name": bundle["link"][0]["url"], "children": []};
    var data = {"name": "test", "children": []};

    for(var i = 0; i < entries.length; i++){
        var indexPerformer = insertPerformer(data, entries, i);
        var indexCategory = insertCategory(data, entries, i, indexPerformer);
        insertCarePlan(data, entries, i, indexPerformer, indexCategory);
    }
    console.log(data);
    return data;
}

function parseCarePlanData(entries){
    var array = [];
    var status = ["status", []];
    var intent = ["intent", []];
    var categories = ["category", []];
    var parseDate = d3.time.format("%Y-%m-%d").parse;
    var period = [];
    array.push(status);
    array.push(intent);
    array.push(categories);
    array.push(period);

    for(var i = 0; i < entries.length; i++){
        var current = entries[i]["resource"]
        var temp;
        if("status" in current){
            temp = current["status"];
        }else{
            temp = "n/a";
        }
        insert(array, 0, temp);

        if("intent" in current){
            temp = current["intent"];
        }else{
            temp = "n/a"
        }
        insert(array, 1, temp);

        if("category" in current){
            temp = current["category"][0]["coding"][0]["code"];
        }else{
            temp = "n/a";
        }
        insert(array, 2, temp);

        if("period" in current && "start" in current["period"] && "end" in current["period"]){
            var start = new Date(current["period"]["start"]);
            var end = new Date(current["period"]["end"]);
            temp = (end - start)/1000/60/60/24;
            period.push(temp);
        }
    }
    return array;
}

function insertPerformer(data, rawdata, index){
    var performer;
    if("performer" in rawdata[index]["resource"]){
        performer = rawdata[index]["resource"]["performer"]["reference"];
    }else{
        performer = "n/a";
    }
    var i = 0;
    var length = data["children"].length;
    find:while(i < length){
        if(performer == data["children"][i]["name"]){
            break find;
        }
        i++;
    }
    if(i == length){
        i = length;
        data["children"].push({"name": performer, "children": []});
    }
    return i;
}

function insertCategory(data, rawdata, index, performer){
    var category;
    if("category" in rawdata[index]["resource"]){
        category = rawdata[index]["resource"]["category"][0]["coding"][0]["display"];
    }else{
        category = "n/a";
    }
    var i = 0;
    var length = data["children"][performer]["children"].length;
    find:while(i < length){
        if(category == data["children"][performer]["children"][i]){
            break find;
        }
        i++;
    }
    if(i == length){
        i = length;
        data["children"][performer]["children"].push({"name": category, "children": []});
    }
    return i;
}

function insertCarePlan(data, rawdata, index, performer, category){
    var name, size, end;
    if("title" in rawdata[index]["resource"]){
        name = rawdata[index]["resource"]["title"];
    }else{
        name = "CarePlan "+index;
    }
    if("period" in rawdata[index]["resource"]){
        if("end" in rawdata[index]["resource"]["period"]){
            end = rawdata[index]["resource"]["period"]["end"];
        }else{
            end = "unknown";
        }
    }else{
        end = "unknown";
    }
    size = calculatePriority(rawdata[index]["resource"]); //Todo param logged User

    var object = {"name": name, "size": size, "id": rawdata[index]["resource"]["id"], "activity": rawdata[index]["resource"]["activity"], "end": end};
    console.log(object);
    data["children"][performer]["children"][category]["children"].push(object);
}

/**Calculates Priority btwn 1 and 5 for specific care plan, depending on
 * - logged on Practitioner (is subject/performer/actor/author/patient?)
 * - status of careplan (active, etc.)
 * - number of activities
 * - period of careplan
 * @param careplan care plan for which priority is calculated
 * @param loggedUser the user who is logged in (physician or patient)
 * @returns priority
 */
function calculatePriority(careplan /*, loggedUser*/){
    var priority = 0;
    var weights = {"user": 0.2, "status": 0.3, "activities": 0.2, "period": 0.3}; //TODO play with weights
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
    /**var scale = d3.scale.linear()
     .domain([1, 20])   //TODO überprüfe ob Obergrenze sinnvoll
     .range([1, 10]);
     priority += weights["activities"] * scale(careplan["activity"].length);*/
    if("activity" in careplan) {
        priority += weights["activities"] * (careplan["activity"].length / 2 );
    }else{
        priority += weights["activities"] * 5;
    }

    var today = new Date();
    var parseDate = d3.time.format("%Y-%m-%d").parse;
    if("period" in careplan) {
        if ( !("end" in careplan["period"]) || today <= parseDate(careplan["period"]["end"])) {
            if ("start" in careplan["period"] && today < parseDate(careplan["period"]["start"])) {
                priority += weights["period"] * 6;
            } else {
                priority += weights["period"] * 10;
            }
        } else {
            priority += weights["period"] * 2;
        }
    }else{
        priority += weights["period"]*7;
    }

    //TODO logged User:
    priority += weights["user"] * 10;
    return Math.round(priority)*100;
}

function buildTreeMap(data){
    var number = 0;
    var rects = [];

    var margin = {top: 10, right: 30, bottom: 30, left: 30},
        legendwidth = 250;
        width = $('#results').width() - margin.left - margin.right - legendwidth,
        height = width/3*2,
        color = d3.scale.category20c();

    var svg = d3.select("#results").append("svg")
            .attr("width", width + margin.left + margin.right + legendwidth)
            .attr("height", height + margin.top + margin.bottom)
            .attr("xmlns", "http://www.w3.org/2000/svg")
        .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var treemap = d3.layout.treemap()
        .padding(3)
        .size([width, height])
        .value(function(d){return d.size;});

    var cell = svg.data([data]).selectAll("g")
        .data(treemap.nodes)
        .enter().append("g")
        .attr("class", "cell")
        .attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        });

    cell.append("rect")
        .attr("class", "treemap")
        .attr("width", function (d) {
            return d.dx;
        })
        .attr("height", function (d) {
            return d.dy;
        })
        .style("fill", function (d) {
            return d.children ? color(d.name) : null;
            //return "none";
        })
        .attr("data-id", function(d){
            return d.id;
        });

    cell.append("foreignObject")
        .attr("x", function (d) {
            //return d.dx / 2;
            return 20;
        })
        .attr("y", function (d) {
            //return d.dy / 2;
            return 15;
        })
        .attr("height", 25)
        .attr("width", function(){
            return jQuery(this).parent("g").width() - 100;
        })
        .attr("dy", ".35em")
        .attr("text-anchor", "start")
        .append("xhtml:label")
        .attr("class", "titel")
        .text(function (d) {
            if(!d.children){
                number++;
                jQuery(this).parent("foreignObject").parent("g").addClass("field");
                //rects.push(this.parentElement);
                return d.name;
            }else{return null;}
            //return d.children ? null : d.name;
        });

    var rMarginTop = 80, rMarginLeft = 30, rMarginBottom = 50, rMarginRight = 30;

    d3.selectAll(".field").append("foreignObject")
        .attr("width", function(d){ return d.dx - rMarginLeft - rMarginRight;})
        .attr("height", function(d){ return d.dy - rMarginTop - rMarginBottom;})
        .attr("x", rMarginLeft)
        .attr("y", rMarginTop)
        .append("xhtml:div")
        .text(function(d){
            var content;
            if(d.activity != undefined){
                for(var entry = 0; entry < d.activity.length; entry++){
                    content += d.activity[entry]["detail"]["code"]["coding"][0]["display"];
                }
            }
            return content;
        })
        .attr("class", "content");

    d3.selectAll(".field").append("foreignObject")
        .attr("width", function(d){ return d.dx - rMarginLeft - rMarginRight;})
        .attr("height", 15)
        .attr("x", rMarginLeft)
        .attr("y", function(d){return rMarginTop + (d.dy - rMarginTop - rMarginBottom);})
        .append("xhtml:div")
        .html(function(d){
            return '<span class="fa fa-bullseye" style="font-size:15px;"> '+d.end+'</span>';
        });


    d3.selectAll(".field").append("foreignObject")
        .attr("width", 100)
        .attr("height",55)
        .attr("x", function(d){return d.dx-100})
        .attr("y", 10)
        .append("xhtml:a")
        .html(function(d){
            return '<p class="center">'+
                '<span class="fa-stack fa-lg center">'+
                '<i class="fa fa-square fa-stack-1x"></i>' +
                '<i class="fa fa-user-md fa-stack-1x fa-inverse"></i>' +
                '</span><br>' + d.parent.parent.name + '</p>';});

            //return wrapper("fa fa-user-md") + d.parent.parent.name;});

    var content = d3.selectAll(".content");

    content.html(function (d) {
        var list = [];
        for(var i = 0; i < d.activity.length; i++){
            var type = "";
            if("reference" in d.activity[i]){
                type = getActivityType(true, d.activity[i]["reference"]);
            }else{
                type = getActivityType(false, d.activity[i]["detail"]);
            }
            var icon = getGlyphicon(type);
            if(jQuery.type(icon) === "array"){
                //string += wrapperAndInserter(icon[0], icon[1]);
                list.push(wrapperAndInserter(icon[0], icon[1]));
            }else{
                //string += wrapper(icon);
                if(jQuery.inArray(wrapper(icon), list) < 0) {
                    list.splice(0, 0, wrapper(icon));
                }
            }
        }

        return fillEvenly($(this).parent("foreignObject").height(), $(this).parent("foreignObject").width(), list);
    })

    var legendRectSize = 18;
    var legendSpacing = 4;

    var legend = svg.selectAll('.legend')
        .data(color.domain().slice(1, color.domain().length))
        .enter()
        .append('g')
        .attr('class', 'legend')
        .attr('transform', function(d, i) {
            var height = legendRectSize + legendSpacing;
            var offset =  height * color.domain().length;
            var horz = width + legendRectSize;
            var vert = i * height +10; // + offset;
            return 'translate(' + horz + ',' + vert + ')';
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
}

function getGlyphicon(code){
    switch(code){
        //inline Codes
        case "diet": return "fa fa-apple";
        case "exercise": return "fa fa-soccer-ball-o";
        case "drug": return "fa fa-minus-circle fa-rotate-140 fa-inverse";
        case "encounter": return "fa fa-calendar";
        case "observation": return "fa fa-eye";
        case "procedure": return "fa fa-stethoscope";
        case "supply": return "fa fa-shopping-cart";
        case "plus": return "glyphicon glyphicon-plus";
        case "other": return "fa fa-circle-o";
        //references
        case "Task": return "fa fa-soccer-ball-o";
        case "Appointment": return "fa fa-calendar";
        case "NutritionOrder": return "fa fa-apple";
        default: return ["fa fa-circle-o", code];
    }
}

function wrapper(type){
    return "<xhtml:span class='"+type+"'></xhtml:span><br>";
}

function wrapperAndInserter(type, text){
    return "<xhtml:span class='"+type+"'> "+text+"</xhtml:span><br>";
}


function getActivityType(reference, input){
    var type;
    if(reference){
        type = getRescoure(input);
    }else{ //inline definition
        if("category" in input){
            type = input["category"]["code"];
        }else if("code" in input){
            type = input["code"]["coding"][0]["display"];
            type = checkContent(type);
        }
    }
    return type;
}

function checkContent(display){
    var list = ["diet", "exercise", "drug", "medication", "immunization", "encounter", "appointment", "observation", "procedure", "supply"];
    for(var i = 0; i < list.length; i++){
        if(display.toLowerCase().indexOf(list[i]) >= 0){
            return list[i];
        }
    }
    return display;
}


function getResource(input){
    var array = input.split("/");
    return array[array.length -2];
}


function fillEvenly(height, width, array){
    var limitW = 150;
    var limitH = 40;
    var ratio = 4;

    var amount = array.length;
    var count = 0;

    var horizontalCount = width%limitW;
    var verticalCount = height%limitH;

    var string = "";
    if(horizontalCount*verticalCount >= amount){
        var ratioWH = width/height;
        var curRatio = ratio/ratioWH;

        var columns = Math.sqrt(amount/curRatio);
        var rows = columns * curRatio;

        if(Math.floor(columns)*Math.floor(rows) >= amount){
            columns = Math.floor(columns);
            rows = Math.floor(rows);
        }else if(Math.floor(columns)*Math.ceil(rows) >= amount){
            columns = Math.floor(columns);
            rows = Math.ceil(rows);
        }else if(Math.ceil(columns)*Math.floor(rows) >= amount){
            columns = Math.ceil(columns);
            rows = Math.floor(rows);
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
            } else {
                console.alert("Columns greater than 12!");
            }
        }

        for(var i = 0; i <= rows && count < amount; i++){
            string += '<div class="row" style="height:'+height/rows+'px">';
            for(var j = 0; j < columns && count < amount; j++){
                string += '<div class="col-sm-'+grid+'">';

                if(columns == 7 || columns == 8) {
                    for(var p = 0; p < 2 && count < amount; p++)
                    {
                        string += '<div class="col-sm-' + 2 + '">' +
                            '<p class="center">' + array[count] + '</p>' +
                            '</div>';
                        count++;
                    }
                }else if(columns == 9){
                    for(var p = 0; p < 3 && count < amount; p++)
                    {
                        string += '<div class="col-sm-' + 3 + '">' +
                            '<p class="center">' + array[count] + '</p>' +
                            '</div>';
                        count++;
                    }
                }else {
                    string += '<p class="center">' + array[count] + '</p>';
                    count++;
                }

                string += '</div>';
            }

            string += '</div>';
        }
        return string;

    }else{
        return array;
    }
}












