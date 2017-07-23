/**
 * Created by Maren on 07.06.2017.
 */

function buildCarePlanMap(entries){
    if(entries.length > 0) {
        var json = parseDataT(entries);
        buildTreeMap(json);
    }
}

function parseDataT(entries){
    // all -> practitioners -> type -> care plans
    //var data = {"name": bundle["link"][0]["url"], "children": []};
    var data = {"name": "all", "children": [], "numberCP": 0, "categories": []};

    for(var i = 0; i < entries.length; i++){
        var indexPerformer = insertPerformer(data, entries, i);
        var indexCategory = insertCategory(data, entries, i, indexPerformer);
        insertCarePlan(data, entries, i, indexPerformer, indexCategory);
    }


    var urlArray = [];
    for(var j = 0; j < data['children'].length; j++){
        urlArray.push(data['children'][j]['reference']);
    }
    performer(data, urlArray);
    //sort(data['children']);
    console.log(data['children']);
    return data;
}

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
        if(performer == data["children"][i]["reference"]){
            break find;
        }
        i++;
    }

    if(i == length){
        i = length;
        data["children"].push({"reference": performer, "children": []});
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
    if(i == length){ //means that performer is not yet in array
        i = length;
        data["children"][performer]["children"].push({"name": category, "children": []});
        if(jQuery.inArray(category, data['categories']) < 0){
            data['categories'].push(category);
        }
    }
    return i;
}

function insertCarePlan(data, rawdata, index, performer, category){
    var name, size, end, specialty;
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
    if("performer" in rawdata[index]['resource']){
        if("specialty" in rawdata[index]['resource']['performer']){
            specialty = rawdata[index]['resource']['performer']['specialty'];
        }else{
            specialty = "n/a";
        }
    }else{
        specialty = "n/a";
    }
    size = calculatePriority(rawdata[index]["resource"], data['children'][performer]['reference']);

    var object = {"name": name, "size": size, "id": rawdata[index]["resource"]["id"], "activity": rawdata[index]["resource"]["activity"], "end": end, "specialty": specialty};
    data["children"][performer]["children"][category]["children"].push(object);
    data["numberCP"]++;
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
function calculatePriority(careplan, performer){
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
        priority += weights["activities"] * (careplan["activity"].length / 4 );
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

    if(gLoggedUser == performer){
        priority += weights["user"]*5;
    }

    return Math.round(priority)*100;
}

function ownColorScale(d){
    switch(d) {
        case '288832002':
        case 'CPA care plan': {
            return '#1f77b4';
            break;
        }
        case '395082007':
        case 'Cancer care plan': {
            return '#aec7e8';
            break;
        }
        case '401276009':
        case 'Mental health crisis plan': {
            return '#ff7f0e';
            break;
        }
        case '412774003':
        case 'Clinical management plan': {
            return '#ffbb78';
            break;
        }
        case '412775002':
        case 'Asthma clinical management plan': {
            return '#2ca02c';
            break;
        }
        case '412776001':
        case 'Chronic obstructive pulmonary disease clinical management plan': {
            return '#98df8a';
            break;
        }
        case '412777005':
        case 'Diabetes clinical management plan': {
            return '#d62728';
            break;
        }
        case '412778000':
        case 'Hyperlipidemia clinical management plan': {
            return '#ff9896';
            break;
        }
        case '412779008':
        case 'Hypertension clinical management plan': {
            return '#9467bd';
            break;
        }
        case '412780006':
        case 'Hypothyroidism clinical management plan': {
            return '#c5b0d5';
            break;
        }
        case '412781005':
        case 'Coronary heart disease risk clinical management plan': {
            return '#8c564b';
            break;
        }
        case '414672009':
        case 'Mental health personal health plan': {
            return '#c49c94';
            break;
        }
        case '415213008':
        case 'Psychiatry care plan': {
            return '#e377c2';
            break;
        }
        case '698358001':
        case 'Angina self management plan': {
            return '#f7b6d2';
            break;
        }
        case '698359009':
        case 'Ankle brachial pressure index management plan': {
            return '#7f7f7f';
            break;
        }
        case '698360004':
        case 'Diabetes self management plan': {
            return '#c7c7c7';
            break;
        }
        case '698361000':
        case 'Heart failure self management plan': {
            return '#bcbd22';
            break;
        }
        case '704127004':
        case 'Transient ischemic attack clinical management plan': {
            return '#dbdb8d';
            break;
        }
        case '3911000175103':
        case 'Patient written birth plan': {
            return '#17becf';
            break;
        }
        default: {
            return '#9edae5';
            break;
        }
    }
}

function buildTreeMap(data){
    var number = 0;
    var rects = [];

    var i = data["numberCP"]/7;
    if(i < 1) i=1;

    var legendRectSize = 18, legendSpacing = 4;
    var margin = {top: 10, right: 10, bottom: 10, left: 0},
        legendHeight = data['categories'].length * (legendRectSize+legendSpacing)+10,
        width = $('#content').width() - margin.left - margin.right,
        height = width/4*2*i,
        //color = ownColorScale();
        domainCode = [  288832002, 395082007, 401276009, 412774003, 412775002,
                        412776001, 412777005, 412778000, 412779008, 412780006,
                        412781005, 414672009, 415213008, 698358001, 698359009,
                        698360004, 698361000, 704127004, 3911000175103 /*, default*/ ],
        domainName = [  'CPA care plan', 'Cancer care plan', 'Mental health crisis plan', 'Clinical management plan',
                        'Asthma clinical management plan', 'Chronic obstructive pulmonary disease clinical management plan',
                        'Diabetes clinical management plan', 'Hyperlipidemia clinical management plan', 'Hypertension clinical management plan',
                        'Hypothyroidism clinical management plan', 'Coronary heart disease risk clinical management plan',
                        'Mental health personal health plan', 'Psychiatry care plan', 'Angina self management plan',
                        'Ankle brachial pressure index management plan', 'Diabetes self management plan', 'Heart failure self management plan',
                        'Transient ischemic attack clinical management plan', 'Patient written birth plan' /*,default*/],
        color = d3.scale.category20c().domain(domainName);

    var svg = d3.select("#careplanCentric").append("svg")
            .attr("id", "careplanMap")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom + legendHeight)
            .attr("xmlns", "http://www.w3.org/2000/svg")
        .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

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
                if(a.reference === gLoggedUser && b.referennce !== gLoggedUser){
                    return 1;
                }else if(b.reference === gLoggedUser && a.referennce !== gLoggedUser){
                    return -1;
                }
            }
            return 0;
        })
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
            if(d.children && d.parent && d.parent.parent){
                return color(d.name);
            }else if(d.reference === gLoggedUser){
                return 'black';
            }else{
                return null;
            }
            //return "none";
        })
        .attr("data-id", function(d){
            return d.id;
        });

    $('#careplanCentric').show();
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
    $('#careplanCentric').hide();

    d3.selectAll("#row1").append("xhtml:div")
        .attr("class", "col-sm-4")
        .attr("style", "height:68px;")
        .html(function(d){
            if(!d.children) {
                var icon = ['<p class="center performer" data-specialty="', '">' +
                            getPerformerIcon() +'<br>', '</p>'];

                var string =  icon[0] + d.specialty + icon[1] + d.parent.parent.name + icon[2];
                return string;
            }else{return null;}
        });



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


    $('#careplanCentric').show();
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
    });
    $('#careplanCentric').hide();

    console.log(data['categories']);


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


function fillPerformer(data, response){
    var result = response["result"];
    for(var i = 0; i < result.length; i++){
        if(typeof result[i].issue !== 'undefined'){
            data['children'][i]['name'] = "not found";
        }else if(result[i] === "n/a"){
            data['children'][i]['name'] = "n/a";
        }else{
            var name = getName(result[i]);
            data['children'][i]['name'] = name;
        }

    }
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
    var hover = $('#hover');

    $('.icon').on("mouseover", function(){
        var current = $(this);
        var coords = current.offset();
        var details = "";
        for(var i = 0; jQuery.type(current.data(""+i)) !== "undefined"; i++){
            details += current.data(""+i);
            details += "<br>";
        }
        if(details.length > 0){
            hover.show()
                .html(details)
                .offset({left: coords.left+30, top: coords.top});
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





