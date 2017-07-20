/**
 * Created by Maren on 18.07.2017.
 */
function makeList(entries){
    var data = parseDataL(entries);
    sortData(data);
    console.log(data);
    buildList(data);
    addHoverList();
}

function parseDataL(rawdata){
    var data = [];
    var typeList = [];
    var performerArray = [];

    for(var i = 0; i < rawdata.length; i++){
        var current = rawdata[i]['resource'];

        if("activity" in current) {
            for(var j = 0; j < current["activity"].length; j++) {
                var icon;
                var type;
                if ("reference" in current.activity[j]) {
                    type = getActivityType(true, current.activity[j]["reference"]);
                    icon = getGlyphicon(type[0]);
                } else {
                    type = getActivityType(false, current.activity[j]["detail"]);
                    icon = getGlyphicon(type[0]);
                }
                var index = jQuery.inArray(icon, typeList);
                var category = getCategory(icon);
                if (index < 0) {
                    typeList.push(icon);
                    data.push({"name": category, "category": icon, "children": []});
                    index = data.length - 1;
                }

                insertActivity(data, index, current, i, j,  category, performerArray, type[1]);
            }
        }
    }
    performer(data, performerArray);
    return data;
}

function insertActivity(data, index, rawdata, resCount, actIndex, category, performerArray, title){
    var name, end, specialty, performer;
    if("title" in rawdata){
        name = rawdata["title"];
    }else{
        name = "Care Plan "+resCount;
    }

    if("period" in rawdata){
        if("end" in rawdata["period"]){
            end = rawdata["period"]["end"];
        }else{
            end = "unknown";
        }
    }else{
        end = "unknown";
    }

    if("performer" in rawdata){
        if("specialty" in rawdata['performer']){
            specialty = rawdata['performer']['specialty'];
        }else{
            specialty = "n/a";
        }
        if("reference" in rawdata["performer"]){
            performer = rawdata["performer"]["reference"];
        }else{
            performer = "n/a";
        }
    }else {
        specialty = "n/a";
        performer = "n/a";
    }
    if(jQuery.inArray(performer, performerArray) < 0){
        performerArray.push(performer);
    }

    var specificData = [];
    /*TODO: switch(category){
        case "Medicine": specificData = getMedicineData(rawdata['activity'][actIndex]);
        case "Exercise": specificData = getMedicineData(rawdata['activity'][actIndex]);
        case "Diet": specificData = getMedicineData(rawdata['activity'][actIndex]);
        case "Blood Measurement": specificData = getMedicineData(rawdata['activity'][actIndex]);
        case "Weight Measurement": specificData = getMedicineData(rawdata['activity'][actIndex]);
    }*/

    data[index]['children'].push({"title": title,
        "performer": {"reference": performer, "specialty": specialty},
        "end": end, "purpose": name, "specific": specificData});

}



function sortData(data){
    //sort activity types by their priority
    data.sort(function(a,b){
        return getPriority(a["name"]) - getPriority(b["name"]);
    });

    //push clicked category to first position on site
    /*if(clicked !== null){
        var index = 0;
        for(var i = 0; i<data.length; i++){
            if(data[i]['category'] === clicked){
                index = i;
                break;
            }
        }
        var temp = data[index];
        data.splice(index, 1);
        data.splice(0, 0, temp);
    }*/

    //sort entries of each list by performer
    for(var j = 0; j < data.length; j++){
        var index = [];
        for(var k = 0; k < data[j]['children'].length; k++){
            if(data[j]['children'][k]['performer']['reference'] === gLoggedUser){
                index.push(k);
            }
        }
        if(index.length !== 0) {
            var temp = [];
            var length = index.length -1;
            for(var p = length; p >= 0 ; p--) {
                temp.push(data[j]["children"][index[p]]);
                data[j]['children'].splice(index[p], 1);
            }
            for(var q = 0; q < temp.length; q++ ){
                data[j]['children'].splice(0, 0, temp[q]);

            }
        }
    }

}

function buildList(data){
    $('.list').remove();
    var categoryElement = [
        '<div class="row list"><div class="col-sm-1">',  //Spot for icon
        '</div><div class="col-sm-11">',            //Spot for List of Acitivity Details
        '</div></div>'];

    for(var i = 0; i < data.length; i++){
        var build = categoryElement[0];
        build += '<span class="'+data[i]["category"]+' fa-3x"></span>';
        build += categoryElement[1];
        for(var j = 0; j < data[i]["children"].length; j++){
            build += buildActivityRow(data[i]["children"][j], data[i]["name"]);
        }
        build += categoryElement[2];
        $('#patientCentric').append(build);
    }
}

function buildActivityRow(activity, category){
    var elements = getActivityRow(category);
    var string = '';
    string += elements[0] + activity["purpose"] + elements[1] + activity["title"] + elements[2];
    var index = 4;
    if(activity["specific"].length > 0){
        string += elements[index++];
    }
    for(var i = 0; i < activity["specific"].length; i++){
        string += activity["specific"][i] +elements[4+i];
        index++;
    }

    string +=  elements[index] + activity["end"];
    index++;
    string += elements[index] + activity["performer"]["specialty"] + elements[index+1] + activity["performer"]["name"];
    index = index+2;
    /*TODO activity["note"] */
    string += elements[index] + elements[index+1];
    return string;
}

function getActivityRow(category){
    var all = ['<div class="row">'+
        '<div class="col-sm-2 title" data-purpose="', '">' , '</div>'+
        '<div class="col-sm-6 specific">', '</div>'+
        '<div class="col-sm-1 end">', '</div>'+
        '<div class="col-sm-2 performer" data-specialty="', '">',' </div>'+
        '<div class="col-sm-1 note" data-details="', '"><span class="fa fa-sticky-note-o"></span></div></div>'];
    var specific;
    switch(category){
        case "Medicine": specific = '';
        case "Exercise": specific = '';
        case "Diet": specific = '';
        case "Blood Measurement": specific = '';
        case "Weight Measurement": specific = '';
    }
    all.splice(3, 0, specific);
    return all;
}

function addHoverList(){
    var hover = $('#hover');

    $('.title').on("mouseover", function(){
        var current = $(this);
        var coords = current.offset();
        var details = current.data("purpose");
        if(details.length > 0){
            hover.show()
                .html(details)
                .offset({left: coords.left+100, top: coords.top-8});
        }
    });
    $('.title').on("mouseleave", function(){
        hover.hide();
    });

    $('.performer').on("mouseover", function(){
        var current = $(this);
        var coords = current.offset();
        var details = current.data("specialty");
        if(details.length > 0){
            hover.show()
                .html(details)
                .offset({left: coords.left+100, top: coords.top-8});
        }
    });
    $('.performer').on("mouseleave", function(){
        hover.hide();
    });
}


function fillPerformer2(data, response){
    var urlLookup = {};
    for(var p = 0; p < response.result.length; p++){
        if(typeof response.result[p].issue !== 'undefined'){
            urlLookup[response.url[p]] = "not found";
        }else if(response.result[p] === "n/a"){
            urlLookup[response.url[p]] = "n/a";
        }else{
            var name = getName(response.result[p]);
            urlLookup[response.url[p]] = name;
        }

    }

    for(var i = 0; i < data.length; i++){
        for(var j = 0; j < data[i]["children"].length; j++){
            data[i]["children"][j]["performer"]["name"] = urlLookup[data[i]["children"][j]["performer"]["reference"]];
        }
    }

}
