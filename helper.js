/**
 * Created by Maren on 18.07.2017.
 */
function splitAndSafe(resources){
    for(var i = 0; i < resources.length; i++){
        if(resources[i].search.mode === "match"){
            gCareplans[resources[i].fullUrl.replace(baseAddress, '')] = resources[i].resource;
        }else if(resources[i].resource.resourceType === "Patient"){
            gPatient = resources[i].resource;
        }else{
            gActivities[resources[i].fullUrl.replace(baseAddress, '')] = resources[i].resource;
        }
    }
}

function displayPatientInfo(){
    var name = getName(gPatient);
    console.log(name);
    $("#name").html(name);
    $("#birthdate").html(" "+gPatient['birthDate']);
    $("#gender").html(" "+gPatient['gender']);
    $("#phone").html(" "+gPatient['telecom'][0]['value']);
}

function getActivityType(reference, input){
    var type;
    if(reference){
        var resource = input.resourceType;
        if(resource === "DeviceRequest" || resource === "ProcedureRequest"){
            type = differentiate(resource, input);
        }else{
            type = resource;
        }
        type = [type, ""];

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

function getCarePlanDescription(reference){
    var careplan = gCareplans[reference];
    if("text" in careplan && "div" in careplan.text){
        var temp = careplan.text.div;
        temp = temp.replace(new RegExp(' xmlns="http://www.w3.org/1999/xhtml"', 'g'), "");
        temp = temp.replace(new RegExp('\<a name="mm"\/\>', 'g'), "");
        return temp;
    }else if("description" in careplan){
        return careplan.description.replace(new RegExp(' xmlns="http://www.w3.org/1999/xhtml"', 'g'), "");
    }else{
        return "";
    }
}

function getCarePlanEnd(reference){
    var careplan = gCareplans[reference];
    if("period" in careplan){
        return getEnd(careplan.period, "");
    }
    return "ongoing";
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

function getGlyphicon(code){
    switch(code){
        //inline Codes
        case "diet": case "Diet": return "fa fa-cutlery";
        case "exercise": return "fa fa-soccer-ball-o";
        case "drug": case "medicine": case "Medicine": return "fa fa-minus-circle fa-rotate-140";
        case "encounter": return "fa fa-calendar";
        case "observation": return "fa fa-eye";
        case "procedure": case "Procedure": return "fa fa-stethoscope";
        case "supply": return "fa fa-shopping-cart";
        case "plus": return "glyphicon glyphicon-plus";
        case "other": return "fa fa-circle-o";
        case "measurement": case "Measurement": return "fa fa-thermometer-half";
        //references
        case "Task": return "fa fa-circle-o";
        case "Appointment": return "fa fa-calendar";
        case "NutritionOrder": return "fa fa-cutlery";
        case "MedicationRequest": return "fa fa-minus-circle fa-rotate-140";
        case "ProcedureRequest": return "fa fa-stethoscope";
        case "DeviceRequest": return "fa fa-thermometer-half";
        case "Exercise": return "fa fa-soccer-ball-o";
        case "BloodMeasurement": return "fa fa-heart";
        case "WeightMeasurement": return "fa fa-balance-scale";
        default: return "fa fa-circle-o";
    }
}

function getCategory(code){
    switch(code){
        case "fa fa-cutlery": return "Diet";
        case "fa fa-soccer-ball-o": return "Exercise";
        case "fa fa-minus-circle fa-rotate-140": return "Medicine";
        case "fa fa-calendar": return "Apppointment";
        case "fa fa-circle-o": return "Other";
        case "fa fa-eye": return "Observation";
        case "fa fa-shopping-cart": return "Supply";
        case "fa fa-stethoscope": return "Procedure";
        case "fa fa-thermometer-half": return "Measurement";
        case "fa fa-heart": return "BloodMeasurement";
        case "fa fa-balance-scale": return "WeightMeasurement";

        /*TODO:
         case "fa fa-": return "Blood Measurement";
         case "fa fa-": return "Weight Meassurement";*/
    }
}

/*
 * Defines the default ordering of the activity categories.
 * @param category   The Category of the Activity
 * @return           The priority of the Category
 */
function getPriority(category){
    switch(category){
        case "Medicine": return 0;
        case "Diet": return 1;
        case "Procedure": return 2;
        case "Exercise": return 3;
        case "Measurement": return 4;
        case "BloodMeasurement": return 5;
        case "WeightMeasurement": return 6;
        case "Appointment": return 7;
        case "Observation": return 8;
        case "Supply": return 9;
        case "Other": return 10;
    }
}

function wrapper(type, details){
    return "<xhtml:span class='icon "+type+"' data-titles='"+details+"'></xhtml:span><br>";
}

function wrapperAndInserter(type, text){
    return "<xhtml:span class='"+type+"'> "+text+"</xhtml:span><br>";
}

function fillPatientSelector(){
    var patients =  '<option data-id="cf-1501883394767">Maisie Hurst</option>' +
                    '<option data-id="cf-1502036237033">Tom Buckley</option>' +
                    '<option data-id="cf-1502030067739">Harley Hobbs</option>';

    $('#patientSelect').append(patients);
}

function performer(array, urlArray){
    if(!jQuery.isEmptyObject(gPerformer)){
        if(layout === 'cpCentric'){
            //TODO verbessern mit gPerformer
            fillPerformer(array);
        }else{
            fillPerformer2(array);
        }
    }else {
        $.ajax({
            url: 'scriptManyUrls.php',
            type: 'POST',
            dataType: 'JSON',
            async: false,
            data: {
                "data": urlArray
            },
            success: function (response) {
                savePerformer(response);
                //TODO page distinction
                if(layout === "cpCentric") {
                    fillPerformer(array);
                }else {
                    fillPerformer2(array);
                }
            },
            error: function (xhr, ajaxOptions, thrownError) {
                alert(xhr.status + " " + thrownError);
            }
        });
    }
}

function savePerformer(response){
    for(var p = 0; p < response.result.length; p++){
        if(typeof response.result[p].issue !== 'undefined'){
            gPerformer[response.url[p]] = { "resource": {},
                "name": "notFound", "specialty": "notFound"};
        }else if(response.result[p] === "n/a"){
            gPerformer[response.url[p]] = { "resource": {},
                "name": "n/a", "specialty": "n/a"};
        }else{
            var name = getName(response.result[p]);
            var specialty = getSpecialty(response.result[p]);
            gPerformer[response.url[p]] = { "resource": response.result[p],
                                            "name": name, "specialty": specialty};
        }
    }
}

function getName(resource){
    if( 'name' in resource){
        if(jQuery.type(resource['name']) !== "array") {
            resource['name'] = [resource["name"]];
        }
        for(var i = 0; i < resource['name'].length; i++){
            if(resource['name'][i]['use'] == "official"){
                if('display' in resource['name'][i]){
                    return resource['name'][i]['display'];
                }else if('text' in resource['name'][i]){
                    return resource['name'][i]['text'];
                }else {
                    return resource['name'][i]['given'][0] +" "+ resource['name'][i]['family'];
                }
            }
        }
        if(resource.resourceType === "Patient") {
            return "John Doe";
        }else{
            return "n/a";
        }
    }else{
        if(resource.resourceType === "Patient") {
            return "John Doe";
        }else{
            return "n/a";
        }
    }
}

function getSpecialty(resource){
    var specialty = '';
    if('qualification' in resource){
        for(var i = 0; i < resource['qualification'].length; i++){
            specialty += resource.qualification[i]["code"]["coding"][0]["display"] + ',<br>';
        }
        specialty = specialty.substring(0, specialty.length-5);
    }
    if(specialty.length === 0){
        specialty = 'n/a';
    }
    return specialty;
}

function getPerformerIcon(){
    return '<span class="fa-stack fa-lg center">'+
        '<i class="fa fa-square fa-stack-1x"></i>' +
        '<i class="fa fa-user-md fa-stack-1x fa-inverse"></i>' +
        '</span>';
}

function getOpacity(status){
    switch(status){
        case "active": return 1;
        case "requested": return 0.9
        case "on-hold": return 0.89;
        case "completed": return 0.3;
        case "cancelled": return 0.29;
        case "entered-in-error": return 0.2;
        case "stopped": return 0.28;
        case "draft": return 0.6;
        case "unknown": return 1;
    }
}

function getStatusIcon(code){
    switch(code){
        case "active": return "fa fa-spinner";
        case "requested": return "fa fa-exclamation";
        case "on-hold": return "fa fa-pause";
        case "completed": return "fa fa-check";
        case "cancelled": return "fa fa-ban";
        case "entered-in-error": return "fa fa-bolt";
        case "stopped": return "fa fa-stip";
        case "draft": return "fa fa-send";
        default: return "fa fa-question"
    }
}

function parseNotes(note){
    var string = '';
    for(var i = 0; i < note.length; i++){
        if(jQuery.type(note[i] !== 'array')){
            string += note[i] + '<br>';
        }else{
            string = string.substring(0, string.length-4) + ': ';
            for(var p = 0; p < note[i].length; p++){
                string += note[i][p] + ', ';
            }
            string = string.substring(0, string.length-2) + '<br>';
        }
    }
    return string;
}

function getEnd(period, timing){
    if(jQuery.type(period) !== "undefined" && period !== ""){
        if ("end" in period) {
            return period["end"];
        } else {
            return "ongoing";
        }
    }
    if(jQuery.type(timing) !== "undefined" && timing !== ""){
        if(jQuery.type(timing) !== 'array'){
            timing = [timing];
        }
        var max;
        for(var i = 0; i < timing.length; i++) {
            if ("repeat" in timing[i] && "boundsPeriod" in timing[i].repeat) {
                var end = getEnd(timing[i].repeat.boundsPeriod, "");
                console.log(end);
                if(end === "ongoing"){
                    console.log("here");
                    return end;
                }
                if(jQuery.type(max) === 'undefined' || Date(max) < Date(end)){
                    max = end;
                }
            }
        }
        if(jQuery.type(max) === "undefined"){
            max = "ongoing";
        }console.log("max: "+max);
        return max;
    }
}

function getActivityTitle(resource){
    if("text" in resource){
        return resource.text.div.replace(new RegExp(' xmlns="http://www.w3.org/1999/xhtml"', 'g'), "");
    }else if("description" in resource){
        return resource.description.replace(new RegExp(' xmlns="http://www.w3.org/1999/xhtml"', 'g'), "");
    }else{
        return "Unspecified " + resource.resourceType;
        //title = "Unspecified "+getCategory(getGlyphicon(resource.resourceType));
    }
}

function getRows(details){
    rows = [];
    var titles = $('.title');
    var keys = [];
    jQuery.each(titles, function(key, value) {
        keys.push(key);
    });
    for(var i = 0; i < keys.length; i++){
        for(var j = 0; j < details.length; j++) {
            if (titles[keys[i]].innerHTML === details[j]) {
                rows.push(titles[keys[i]].parentNode);
            }
        }
    }
}

function toString(actRows, status){
    var string = "";
    for(var p = 0; p < status.length; p++){
        for(var q = 0; q < actRows[status[p]].length; q++){
            string += actRows[status[p]][q];
        }
    }
    return string;
}

function differentiate(type, resource){
    switch(type){
        case "DeviceRequest":{
            if("text" in resource.codeCodeableConcept) {
                if (/exercise/i.test(resource.codeCodeableConcept.text)) {
                    return "Exercise";
                } else if (/(blood|heart)/i.test(resource.codeCodeableConcept.text)) {
                    return "BloodMeasurement";
                } else if (/(scale|weight)/i.test(resource.codeCodeableConcept.text)) {
                    return "WeightMeasurement";
                }
            }else if("display" in resource.codeCodeableConcept.coding[0]){
                if (/exercise/i.test(resource.codeCodeableConcept.coding[0].display)) {
                    return "Exercise";
                } else if (/(blood|heart)/i.test(resource.codeCodeableConcept.coding[0].display)) {
                    return "BloodMeasurement";
                } else if (/(scale|weight)/i.test(resource.codeCodeableConcept.coding[0].display)) {
                    return "WeightMeasurement";
                }
            }
            return "DeviceRequest";
        }
        case "ProcedureRequest":{
            if(/exercise/i.test(resource.code.text)){
                return "Exercise";
            }
            return "ProcedureRequest";
        }
    }
}