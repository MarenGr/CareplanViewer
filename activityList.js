/**
 * Created by Maren on 18.07.2017.
 */
function makeList(entries, clicked){
    var data = parseData(entries);
    sortData(data, clicked);
    buildList(data);
}

function parseData(rawdata){
    var data = [];
    var typeList = [];
    var performerArray = [];

    for(var i = 0; i < rawdata.length; i++){
        var current = rawdata[i]['resource'];

        if("activity" in current) {
            for(var j = 0; j < current["activity"].length; j++) {
                var icon;
                if ("reference" in current.activity[i]) {
                    icon = getGlyphicon(getActivityType(true, d.activity[i]["reference"]));
                } else {
                    icon = getGlyphicon(getActivityType(false, d.activity[i]["detail"]));
                }
                var index = jQuery.inArray(icon, typeList);
                var category = getCategory(icon);
                if (index < 0) {
                    typeList.push(icon);
                    data.push({"name": category, "category": icon, "children": []});
                    index = data.length - 1;
                }

                insertActivity(data, index, current, i, category, performerArray);
            }
        }
    }
    return data;
}

function insertActivity(data, index, rawdata, resCount, category, performerArray){
    var name, end, specialty, performer;
    if("title" in rawdata){
        name = rawdata["title"];
    }else{
        name = "Care Plan "+resCount;
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
        if("specialty" in rawdata['performer']){
            specialty = rawdata['performer']['specialty'];
        }else{
            specialty = "n/a";
        }
        if("reference" in rawdata["performer"]){
            performer = current["performer"]["reference"];
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
        case "Medicine": specificData = getMedicineData(rawdata);
        case "Exercise": specificData = getMedicineData(rawdata);
        case "Diet": specificData = getMedicineData(rawdata);
        case "Blood Measurement": specificData = getMedicineData(rawdata);
        case "Weight Measurement": specificData = getMedicineData(rawdata);
    }*/

    data[index]['children'].push({"title": "",//TODO
        "performer": {"reference": performer, "specialty": specialty},
        "end": end, "purpose": name, "specific": specificData});
}



function sortData(data, clicked){
    //sort activity types by their priority
    data.sort(function(a,b){
        return getPriority(b["name"]) - getPriority(a["name"]);
    });

    //push clicked category to first position on site
    if(clicked !== null){
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
    }

    //sort entries of each list by performer
    for(var j = 0; j < data.length; j++){
        var index = 0;
        for(var k = 0; j < data[j]['children'].length; k++){
            if(data[j]['children'][k]['performer']['reference'] === gLoggedUser){
                index = i;
                break;
            }
        }
        var temp = data[index];
        data[j]['children'].splice(index, 1);
        data[j]['children'].splice(0, 0, temp);
    }
}

function buildList(data){
    var categoryElement = [
        '<div class="row"><div class="col-sm-2">',  //Spot for icon
        '</div><div class="col-sm-10">',            //Spot for List of Acitivity Details
        '</div></div>'];

    for(var i = 0; i < data.length; i++){
        var build = categoryElement[0];
        build += '<span class="'+data[i]["category"]+'"></span>';
        build += categoryElement[1];
        for(var j = 0; j < data[i]["children"].length; j++){
            build += buildActivityRow(data[i]["children"][j], data[i]["name"]);
        }
        build += categoryElement[2];
        $('#content').append(build);
    }
}

function buildActivityRow(activity, category){
    var elements = getActivityRow(category);

    var string = '';

    return string;
}

function getActivityRow(category){
    var all = ['<div class="row">'+
        '<div class="col-sm-1 title">, </div>'+
        '<div class="col-sm-7 specific">', '</div>'+
        '<div class="col-sm-1 purpose">, </div>'+
        '<div class="col-sm-1 end">, </div>'+
        '<div class="col-sm-1 performer" data-specialty="', '">, </div>'+
        '<div class="col-sm-1 note" data-details="', '"><span class="fa fa-sticky-note-o"></span></div>'+
        '</div>'];
    var specific;
    switch(category){
        case "Medicine": specific = '';
        case "Exercise": specific = '';
        case "Diet": specific = '';
        case "Blood Measurement": specific = '';
        case "Weight Measurement": specific = '';
    }
    return all.splice(2, 0, specific);
}

