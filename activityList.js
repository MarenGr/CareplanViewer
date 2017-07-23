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

    var specificData;
    var resource;

    if("detail" in rawdata['activity'][actIndex]){
        resource = rawdata['activity'][actIndex]["detail"];
    }else if("reference" in rawdata['activity'][actIndex]) {
        resource = getActResource(rawdata['activity'][actIndex]["reference"]);
    }
    switch(category){
        case "Medicine": specificData = getMedicineData(rawdata['activity'][actIndex]);
        case "Exercise": specificData = getExerciseData(rawdata['activity'][actIndex]);
        case "Diet": specificData = getDietData(rawdata['activity'][actIndex]);
        case "Blood Measurement": specificData = getBloodMData(rawdata['activity'][actIndex]);
        case "Weight Measurement": specificData = getWeightMData(rawdata['activity'][actIndex]);
        default: specificData = {};
    }

    data[index]['children'].push({"title": title,
        "performer": {"reference": performer, "specialty": specialty},
        "end": end, "purpose": name, "specific": specificData});

}

function getActResource(reference){
    $.ajax({
        url: 'scriptUrl.php',
        type: 'POST',
        dataType: 'JSON',
        data: {
            "data": reference
        },
        async: false,
        success: function (response) {
            $button.button('reset');
            //Error Handling
            if (typeof response.result.issue !== 'undefined') {
                console.log(response);
                /*if (response.result.issue["0"].severity === "error") {
                    $('#error-alert-content').append(response.result.issue["0"].diagnostics);
                    $("#error-alert-content").fadeIn();
                }*/
                return null;
            } else {
                console.log(response);
                if ("entry" in response['result']) {
                    return response['result']['entry'][0]['resource'];
                } else {
                    $('#res').html("No results found for this query.");
                    $('#res').fadeIn();
                }
            }

        },
        error: function (xhr, ajaxOptions, thrownError) {
            alert(xhr.status + " " + thrownError);
            moreToSearch = false;
        }
    });
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
    $('#patientCentric').append('<div class="row head">' +
        '<div class="col-sm-1"></div>' +
        '<div class="col-sm-11">' +
        '<div class="row">' +
            '<div class="col-sm-2">TITLE</div>' +
            '<div class="col-sm-6">SPECIFIC DATA</div>' +
            '<div class="col-sm-1"><span class="fa fa-bullseye" style="font-size:20px;"></span> END</div>' +
            '<div class="col-sm-2"><span class="fa fa-user-md" style="font-size:20px;"></span> PERFORMER </div>' +
            '<div class="col-sm-1">NOTES</span></div>' +
        '</div></div></div>');

    var categoryElement = [
        '<div class="row list" id="', //Spot for Category
        '"><div class="col-sm-1">',  //Spot for icon
        '</div><div class="col-sm-11">',            //Spot for List of Acitivity Details
        '</div></div>'];

    for(var i = 0; i < data.length; i++){
        var build = categoryElement[0];
        build += data[i]["name"]+ categoryElement[1];
        build += '<span class="'+data[i]["category"]+' fa-3x"></span>';
        build += categoryElement[2];
        for(var j = 0; j < data[i]["children"].length; j++){
            console.log(i + " " + j);
            build += buildActivityRow(data[i]["children"][j], data[i]["name"]);
        }
        build += categoryElement[3];
        $('#patientCentric').append(build);
    }
}

function buildActivityRow(activity, category){
    var withDetails = false;
    if(activity["specific"].length > 0){
        withDetails = true;
    }
    var elements = getActivityRow(category, withDetails);
    var string = '';
    string += elements[0] + activity["purpose"] + elements[1] + activity["title"] + elements[2];
    var index = 3;
    if(activity.specific.length > 0) {
        console.log("here");
        switch (category) {
            case "Medicine": {
                string += elements[index++];
                if ("status" in activity["specific"][i]) {
                    string += activity["specific"][i]["status"];
                }
                string += elements[index++];
                if ("priority" in activity["specific"][i]) {
                    string += activity["specific"][i]["priority"];
                }
                string += elements[index++];
                if ("intent" in activity["specific"][i]) {
                    string += activity["specific"][i]["intent"];
                }
                string += elements[index++];
                if ("timing" in activity["specific"][i]) {
                    string += activity["specific"][i]["timing"];
                }
                string += elements[index++];
                if ("dose" in activity["specific"][i]) {
                    string += activity["specific"][i]["dose"];
                }
                string += elements[index++];
                break;
            }
            case "Exercise": case "Blood Measurement": case "Weight Measurement": {
                string += elements[index++];
                if ("status" in activity["specific"][i]) {
                    string += activity["specific"][i]["status"];
                }
                string += elements[index++];
                if ("priority" in activity["specific"][i]) {
                    string += activity["specific"][i]["priority"];
                }
                string += elements[index++];
                if ("intent" in activity["specific"][i]) {
                    string += activity["specific"][i]["intent"];
                }
                string += elements[index++];
                if ("occurrence" in activity["specific"][i]) {
                    string += activity["specific"][i]["occurrence"];
                }
                string += elements[index++];
                break;
            }
            case "Diet": {
                for (var i = 0; i < activity["specific"].length; i++) {
                    string += elements[index + 1];
                    if ("status" in activity["specific"][i]) {
                        string += activity["specific"][i]["status"];
                    }
                    string += elements[index + 2];
                    if ("type" in activity["specific"][i]) {
                        string += activity["specific"][i]["type"];
                    }
                    string += elements[index + 3];
                    if ("schedule" in activity["specific"][i]) {
                        string += activity["specific"][i]["schedule"];
                    }
                    string += elements[index + 4];
                    if ("nutrient" in activity["specific"][i]) {
                        string += activity["specific"][i]["nutrient"];
                    } else if ("quantity" in activity["specific"][i]) {
                        string += activity["specific"][i]["quantity"];
                    }
                    string += elements[index + 5];
                    if ("texture" in activity["specific"][i]) {
                        string += activity["specific"][i]["texture"];
                    }
                    string += elements[index + 6];
                }
                index = index + (6 * activity.specific.length);
                break;
            }
        }
    }
    string +=  elements[index++] + activity["end"];
    string += elements[index++] + activity["performer"]["specialty"] + elements[index++] + activity["performer"]["name"];
    /*TODO activity["note"] */
    string += elements[index++] + elements[index++];
    return string;
}

function getActivityRow(category, withDetails){
    var all = ['<div class="row"><div class="col-sm-2 title" data-purpose="',
                '">',
                '</div><div class="col-sm-6 specific">',
                '</div><div class="col-sm-1 end">',
                '</div><div class="col-sm-2 performer" data-specialty="',
                '">',
                '</div><div class="col-sm-1 note" data-details="',
                '"><span class="fa fa-sticky-note-o"></span></div></div>'];
    if(withDetails) {
        var specific = [];
        switch (category) {
            case "Medicine":
            case "Diet": {
                specific.push('<div class="row">' +
                    '<div class="col-sm-2">');
                specific.push('</div><div class="col-sm-2">');
                specific.push('</div><div class="col-sm-2">');
                specific.push('</div><div class="col-sm-3">');
                specific.push('</div><div class="col-sm-3">');
                specific.push('</div></div>');
                break;
            }
            case "Exercise":
            case "Blood Measurement":
            case "Weight Measurement": {
                specific.push('<div class="row">' +
                    '<div class="col-sm-2">');
                specific.push('</div><div class="col-sm-2">');
                specific.push('</div><div class="col-sm-2">');
                specific.push('</div><div class="col-sm-6">');
                specific.push('</div></div>');
                break;
            }
        }
        for (var i = 0; i < specific.length; i++) {
            all.splice(3 + i, 0, specific[i]);
        }
    }
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

function getMedicineData(activity){
    var specific = {};
    if("status" in activity){
        specific["status"] = activity["status"];
    }
    if("priority" in activity){
        specific["priority"] = activity["priority"];
    }
    if("intent" in activity){
        specific["intent"] = activity["intent"];
    }
    if("dosageInstruction" in activity){
        if("timing" in activity["dosageInstruction"]){
            specific["timing"] = activity["dosageInstruction"]["timing"];
        }else if("asNeededBoolean"){
            specific["timing"] = "as Needed";
        }
        if("dose" in activity["dosageInstruction"]) {
            if ("doseQuantity" in activity["dosageInstruction"]["dose"]) {
                specific["dose"] = activity["dosageInstruction"]["dose"]["doseQuantity"];
            } else if ("doseRate" in activity["dosageInstruction"]["dose"]) {
                specific["dose"] = activity["dosageInstruction"]["dose"]["doseRate"];
            }
        }
    }
    return specific;
}

function getExerciseData(activity){
    var specific = {};
    if("status" in activity){
        specific["status"] = activity["status"];
    }
    if("priority" in activity){
        specific["priority"] = activity["priority"];
    }
    if("intent" in activity){
        specific["intent"] = activity["intent"];
    }
    if("occurrenceDateTime" in activity){
        specific["occurrence"] = activity["occurrenceDateTime"];
    }else if("occurrencePeriod" in activity){
        specific["occurrence"] = c
    }else if("occurrencTiming" in activity){
        //TODO: https://www.hl7.org/fhir/datatypes.html#Timing
        specific["occurrence"] = activity["occurrencTiming"];
    }
    return specific;
}

function getDietData(activity){
    var specific = [];
    var status;
    if("status" in activity){
        status = activity["status"];
    }
    if("oralDiet" in activity){
        specific.push({"status": status});
        if("type" in activity["oralDiet"]){
            specific[0]["type"] = activity["oralDiet"]["type"];
        }
        if("schedule" in activity["oralDiet"]){
            specific[0]["schedule"] = activity["oralDiet"]["schedule"];
        }
        if("nutrient" in activity["oralDiet"]){
            var nutrientList = "";
            var nutrients = activity["oralDiet"]["nutrient"];
            for(var i = 0; i < nutrients.length; i++){
                var string = "";
                if("amount" in nutrients[i] && "modifier" in nutrients[i]){
                    string += nutrients[i]["amount"]+ " of ";
                    string += nutrients[i]["modifier"]["coding"][0]["display"];
                }
                nutrientList += string + ", ";
            }
            if(nutrientList.length > 0){
                specific[0]["nutrient"] = nutrientList.substring(0, nutrientList.length - 2);
            }
        }
        if("texture" in activity["oralDiet"]){
            var textureList = "";
            var textures = activity["oralDiet"]["nutrient"];
            for(var i = 0; i < textures.length; i++){
                if("modifier" in textures[i]){
                    textureList += textures[i]["modifier"]["coding"][0]["display"] + ", ";
                }
            }
            if(textureList.length > 0){
                specific[0]["texture"] = textureList.substring(0, textureList.length - 2);
            }
        }else if("fluidConsistencyType" in activity["oralDiet"]){
            specific[0]["texture"] = activity["oralDiet"]["fluidConsistencyType"]["coding"][0]["display"];
        }
    }
    if("supplement" in activity){
        var index = specific.length;
        specific.push({"status": status});
        if("productName" in activity["supplement"]){
            specific[index]["type"] = activity["supplement"]["productName"];
        }else if("type" in activity["supplement"]){
            specific[index]["type"] = activity["supplement"]["type"]["coding"][0]["display"];
        }
        if("schedule" in activity["supplemennt"]){
            specific[index]["schedule"] = activity["supplemennt"]["schedule"];
        }
        if("quantity" in activity["supplement"]){
            specific[index]["quantity"] = activity["supplemennt"]["quantity"];
        }
    }
    if("enteralFormular" in activity){
        var index = specific.length;
        specific.push({"status": status});
        if("baseFormularProductName" in activity["enteralFormular"]){
            specific[index]["type"] = activity["enteralFormular"]["baseFormularProductName"];
        }else if("baseFormularType" in activity["enteralFormular"]){
            specific[index]["type"] = activity["enteralFormular"]["baseFormularType"]["coding"][0]["display"];
        }else if("additiveProductName" in activity["enteralFormular"]){
            specific[index]["type"] = activity["enteralFormular"]["additiveProductName"];
        }else if("additiveType" in activity["enteralFormular"]){
            specific[index]["type"] = activity["enteralFormular"]["additiveType"]["coding"][0]["display"];
        }
        if("administration" in activity["enteralFormular"]) {
            var administration = activity["enteralFormular"]["administration"];
            if ("schedule" in administration) {
                specific[index]["schedule"] = administration["schedule"];
            }
            if ("quantity" in administration) {
                specific[index]["quantity"] = administration["quantity"];
            }
        }
    }
    return specific;
}

function getBloodMData(activity){
    var specific = {};
    if("status" in activity){
        specific["status"] = activity["status"];
    }
    if("priority" in activity){
        specific["priority"] = activity["priority"];
    }
    if("intent" in activity){
        specific["intent"] = activity["intent"];
    }
    if("occurrenceDateTime" in activity){
        specific["occurrence"] = activity["occurrenceDateTime"];
    }else if("occurrencePeriod" in activity){
        specific["occurrence"] = activity["occurrencePeriod"]["start"] +" - "+ activity["occurrencePeriod"]["end"];
    }else if("occurrencTiming" in activity){
        //TODO: https://www.hl7.org/fhir/datatypes.html#Timing
        specific["occurrence"] = activity["occurrencTiming"];
    }
    return specific;
}

function getWeightMData(activity){
    var specific = {};
    if("status" in activity){
        specific["status"] = activity["status"];
    }
    if("priority" in activity){
        specific["priority"] = activity["priority"];
    }
    if("intent" in activity){
        specific["intent"] = activity["intent"];
    }
    if("occurrenceDateTime" in activity){
        specific["occurrence"] = activity["occurrenceDateTime"];
    }else if("occurrencePeriod" in activity){
        specific["occurrence"] = activity["occurrencePeriod"]["start"] +" - "+ activity["occurrencePeriod"]["end"];
    }else if("occurrencTiming" in activity){
        //TODO: https://www.hl7.org/fhir/datatypes.html#Timing
        specific["occurrence"] = activity["occurrencTiming"];
    }
    return specific;
}
