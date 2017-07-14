/**
 * Created by Maren on 07.06.2017.
 */

function buildCarePlanMap(entries){
    if(entries.length > 0) {
        var json = parseData(entries);
        buildTreeMap(json);
    }
}

function parseData(entries){
    //TODO sort bundle automatically by performer --> url input (What happens for no performer?)
    // all -> practitioners -> type -> care plans
    //var data = {"name": bundle["link"][0]["url"], "children": []};
    var data = {"name": "test", "children": [], "number": 0};

    for(var i = 0; i < entries.length; i++){
        var indexPerformer = insertPerformer(data, entries, i);
        var indexCategory = insertCategory(data, entries, i, indexPerformer);
        insertCarePlan(data, entries, i, indexPerformer, indexCategory);
    }
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
        name = "Care Plan "+index;
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
    data["children"][performer]["children"][category]["children"].push(object);
    data["number"]++;
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

    var i = data["number"]/7;
    if(i < 1) i=1;

    var margin = {top: 10, right: 10, bottom: 10, left: 0},
        legendwidth = 250;
        width = $('#results').width() - margin.left - margin.right - legendwidth,
        height = width/3*2*i,
        color = d3.scale.category20c();

    var svg = d3.select("#content").append("svg")
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

    var oMarginTop = 10, oMarginLeft = 10, oMarginBottom = 15, oMarginRight = 10;
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
        .attr("text-anchor", "start")
        .attr("id", "content");
    content.append("xhtml:div")
        .attr("class", "row")
        .attr("id", "row1")
        .append("xhtml:div")
            .attr("class", "col-sm-8")
            .attr("id", "titel")
            .append("xhtml:label")
                .attr("class", "titel")
                .text(function (d) {
                    if(!d.children){
                        number++;
                        jQuery(this).parent("div").parent("div").parent("foreignObject").parent("g").addClass("field");
                        //rects.push(this.parentElement);
                        return d.name;
                    }else{return null;}
                    //return d.children ? null : d.name;
                });


    d3.selectAll("#row1").append("xhtml:div")
        .attr("class", "col-sm-4")
        .attr("id", function(d){
            return d.name.replace(/ /g, "");
        })
        .attr("style", "height:68px;");
        /*.html(function(d){
            if(!d.children) {
                var div = $(this);
                var string =  getPerformerName(d.name, d.parent.parent.name);
                console.log(string);
                return string;
                //return null;
            }else{return null;}
        })*/;
    performer(data);
    //fillPerformerName(0);

    var row2 = content.append("xhtml:div")
        .attr("class", "row")
        .attr("id", "row2")
        .attr("padding-left", "15px")
        .attr("padding-right", "15px");


    content.append("xhtml:div")
        .attr("class", "row")
        .attr("id", "enddate")
        .html(function(d){
            if(!d.children) {
                return '<span class="fa fa-bullseye" style="font-size:15px;padding-left:15px;"> ' + d.end + '</span>';
            }else{return null;}
        });


    row2.html(function (d) {
        var row = $(this);
        if(!d.children) {
            var listElements = [];
            var listCategories = [];
            for (var i = 0; i < d.activity.length; i++) {
                var type = "";
                if ("reference" in d.activity[i]) {
                    type = getActivityType(true, d.activity[i]["reference"]);
                } else {
                    type = getActivityType(false, d.activity[i]["detail"]);
                }
                var icon = getGlyphicon(type[0]);
                var index;
                if(jQuery.inArray(icon, listCategories) < 0) {
                    listCategories.push(icon);
                    listElements.push(wrapper(icon));
                    index = listElements.length-1;
                }else{
                    index = jQuery.inArray(icon, listCategories);
                }
                insertDetails(listElements, index, type[1]);
            }
            var height = row.parent("foreignObject").height() - row.prevAll().height() - 30;
            var width = row.parent("foreignObject").width() - 20;
            return fillEvenly(height, width, listElements);
        }else{return null;}
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

    addHover();
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
        default: return "fa fa-circle-o";
    }
}

function wrapper(type){
    return "<xhtml:span class='icon "+type+"'></xhtml:span><br>";
}

function wrapperAndInserter(type, text){
    return "<xhtml:span class='"+type+"'> "+text+"</xhtml:span><br>";
}


function getActivityType(reference, input){
    var type;
    if(reference){
        type = [getRescoure(input), ""];
    }else{ //inline definition
        if("category" in input){
            type = [input["category"]["code"]];
            if("code" in input){
                type.push(input["code"]["coding"][0]["display"])
            }else{type.push("");}
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
            return [list[i], display];
        }
    }
    return ["", display];
}


function getResource(input){
    var array = input.split("/");
    return array[array.length -2];
}


function fillEvenly(height, width, array){
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

    var fontSize = 30;
    var string = "<div class='container-fluid'>";
    while(horizontalCount*verticalCount < amount && fontSize > 15){
        limitW = limitW - 3.725, limitH = limitH - 1;
        horizontalCount = Math.floor(width/limitW);
        verticalCount = Math.floor(height/limitH);
        fontSize = fontSize-1;
    }
    var ratioWH = width/height;
    var curRatio = ratio/ratioWH;

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
        } else { console.log("Columns greater than 12!");
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
                        '<p class="center">' + applyFontSize(array[count], fontSize) + '</p>' +
                        '</div>';
                    count++;
                }
            }else if(columns == 9){
                for(var p = 0; p < 3 && count < amount; p++)
                {
                    string += '<div class="col-sm-' + 3 + '">' +
                        '<p class="center">' + applyFontSize(array[count], fontSize) + '</p>' +
                        '</div>';
                    count++;
                }
            }else {
                string += '<p class="center">' + applyFontSize(array[count], fontSize) + '</p>';
                count++;
            }

            string += '</div>';
        }

        string += '</div>';
    }
    string += "</div>";
    return string;


}

function applyFontSize(string, fontSize){
    var temp;
    /*if(string.indexOf("circle-o") >= 0){
        temp = string.split('> ', string.length - 10);
        return temp[0]+" style='font-size:"+fontSize[1]+"px;'> "+ temp[1];
    }else{*/
        temp = string.split('></x', string.length - 10);
        return temp[0]+" style='font-size:"+fontSize+"px;'></x"+ temp[1];
    //}
}

function performer(data){
    var icon = ['<p class="center performer">' +
    '<span class="fa-stack fa-lg center">' +
    '<i class="fa fa-square fa-stack-1x"></i>' +
    '<i class="fa fa-user-md fa-stack-1x fa-inverse"></i>' +
    '</span><br></p>'];

    var urlArray = [];
    var cpToUrlIndex = [];
    var careplanArray = [];
    for(var i = 0; i < data["children"].length; i++){ //parse through performers
        var performer = data["children"][i]["name"];
        for(var j = 0; j < data["children"][i]["children"].length; j++){ //parse through categories
            for(var k = 0; k < data["children"][i]["children"][j]["children"].length; k++){ //parse through individual careplans
                var careplan = data["children"][i]["children"][j]["children"][k]["name"];
                careplan = careplan.replace(/ /g, "");
                $("#"+careplan).append(icon);
                careplanArray.push(careplan);

                var url = performer;
                var index = jQuery.inArray(url, urlArray);
                if(index < 0){  //if url not yet in array
                    urlArray.push(url);
                    cpToUrlIndex.push(urlArray.length -1);
                }else{
                    cpToUrlIndex.push(index);
                }
            }
        }
    }

    $.ajax({
        url: 'scriptManyUrls.php',
        type: 'POST',
        dataType: 'JSON',
        data: {
            "data": urlArray
        },
        mapper: cpToUrlIndex,
        careplans: careplanArray,
        success: function (response) {
            fillPerformer(response['result'], this.mapper, this.careplans);
        },
        error: function (xhr, ajaxOptions, thrownError) {
            alert(xhr.status + " " + thrownError);
        }
    });
}

function fillPerformer(result, mapper, careplans){
    console.log(careplans);
    for(var i = 0; i < careplans.length; i++){
        var urlIndex = mapper[i];
        if(typeof result[urlIndex].issue !== 'undefined'){
            $('#'+careplans[i])[0].firstChild.append("not found");
        }else if(result[urlIndex] == "n/a"){
            $('#'+careplans[i])[0].firstChild.append("n/a");
        }else{
            var name = getName(result[urlIndex]);
            $('#'+careplans[i])[0].firstChild.append(name);
        }
    }
}


function getName(resource){
    var name = 'n/a';
    if( 'name' in resource){
        console.log(jQuery.type(resource['name']));
        if(jQuery.type(resource['name']) == "array"){
            if('text' in resource['name']['0']){
                name = resource['name']['0']['text'];
            } else {
                name = resource['name']['0']['family'];
            }
        }else{
            if('text' in resource['name']){
                name = resource['name']['text'];
            } else {
                name = resource['name']['family'];
            }
        }
    }
    return name;
}

function insertDetails(listElements, index, detail){
    var i = 0;
    while(true){
        if(listElements[index].indexOf("data-"+i) < 0) break;
        else i++;
    }
    var temp = listElements[index].split("></xhtml:span>");
    listElements[index] = temp[0] + " data-"+i+"='"+detail+"'></xhtml:span>" + temp[1];
}


function addHover(){
    var icons = $('.icon');
    icons.on("mouseover", function(){
        var current = $(this);
        var coords = current.offset();
        var details = "";
        for(var i = 0; jQuery.type(current.data(""+i)) !== "undefined"; i++){
            details += current.data(""+i);
            details += "<br>";
        }
        if(details.length > 0){
            $('#hover').html("");
            $('#hover').html(details);
            $('#hover').show();
            $('#hover').offset({left: coords.left+30, top: coords.top});
        }
    });
    icons.on("mouseleave", function(){
        $('#hover').hide();
    })
}





