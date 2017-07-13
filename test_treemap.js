/**
 * Created by Maren on 07.06.2017.
 */

function buildCarePlanMap(response){
    if(response.length > 0){
        var json = parseData(response);
        buildTreeMap(json);
    }else{
        //TODO message
    }
}

function parseData(entries){ //TODO sort bundle automatically by performer --> url input (What happens for no performer?)
    // all -> practitioners -> type -> care plans
    console.log(entries);
    //var data = {"name": bundle["link"][0]["url"], "children": []};
    var data = {"name": "test", "children": []};

    var index = 0;
    while(index < entries.length){
        var indexPerformer = insertPerformer(data, entries, index);
        var indexCategory = insertCategory(data, entries, index, indexPerformer);
        insertCarePlan(data, entries, index, indexPerformer, indexCategory);
        index++;
    }
    console.log(data);
    return data;
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
        category = rawdata[index]["resource"]["category"][0]["coding"][0]["code"];
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
    var name, size;
    if("title" in rawdata[index]["resource"]){
        name = rawdata[index]["resource"]["title"];
    }else{
        name = "CarePlan "+index;
    }
    size = calculatePriority(rawdata[index]["resource"]); //Todo param logged User

    var object = {"name": name, "size": size, "activity": rawdata[index]["resource"]["activity"]};
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
        width = 960 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom,
        color = d3.scale.category20c();

    var svg = d3.select("body").append("svg")
            .attr("width", width + margin.left + margin.right)
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
        });

    cell.append("text")
        .attr("x", function (d) {
            //return d.dx / 2;
            return 70;
        })
        .attr("y", function (d) {
            //return d.dy / 2;
            return 30;
        })
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .text(function (d) {
            if(!d.children){
                number++;
                jQuery(this).parent("g").addClass("field");
                //rects.push(this.parentElement);
                return d.name;
            }else{return null;}
            //return d.children ? null : d.name;
        });

    var rMarginTop = 60, rMarginLeft = 30, rMarginBottom = 20, rMarginRight = 30;

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
                console.log(content);
            }
            return content;
        })
        .attr("class", "content");


    d3.selectAll(".field").append("foreignObject")
        .attr("width", 50)
        .attr("height",50)
        .attr("x", function(d){return d.dx-50})
        .attr("y", 20)
        .append("xhtml:a")
            .html(function(d){return wrapper("glyphicon-user")+ d.parent.parent.name;});

    var content = d3.selectAll(".content");
    console.log(content);

    content.html(function (d) {
        var string = "";
        for(var i = 0; i < d.activity.length; i++){
            var type = getGlyphicon(d.activity[i]["detail"]["code"]["coding"][0]["code"]);
            string += wrapper(type);
        }
        return string;
    })


}

function getGlyphicon(code){
    return "glyphicon-plus";
}

function wrapper(type){
    return "<xhtml:span class='glyphicon "+type+"'></xhtml:span>";
}















