/**
 * Created by Maren on 18.07.2017.
 */

function getActivityType(reference, input){
    var type;
    if(reference){
        type = [getResource(input), ""];
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

function getResource(input){
    var temp = input.reference.split("/");
    return temp[0];
}

function getCarePlanDescription(reference){
    var temp = reference.split("/");
    for(var i = 0; i < gActivities.length; i++){
        if(gActivites[i].id = temp[1]){
            if("text" in gActivities[i]){
                return gActivities[i].text.div;
            }else{
                return "";
            }
        }
    }
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
        case "diet": return "fa fa-cutlery";
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
        case "NutritionOrder": return "fa fa-cutlery";
        default: return "fa fa-circle-o";
    }
}

function getCategory(code){
    switch(code){
        case "fa fa-cutlery": return "Diet";
        case "fa fa-soccer-ball-o": return "Exercise";
        case "fa fa-minus-circle fa-rotate-140 fa-inverse": return "Medicine";
        case "fa fa-calendar": return "Apppointment";
        case "fa fa-circle-o": return "Other";
        case "fa fa-eye": return "Observation";
        case "fa fa-shopping-cart": return "Supply";
        case "fa fa-stethoscope": return "Procedure";

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
        case "Blood Measurement": return 4;
        case "Weight Measurement": return 5;
        case "Appointment": return 6;
        case "Observation": return 7;
        case "Supply": return 8;
        case "Other": return 9;
    }
}

function wrapper(type){
    return "<xhtml:span class='icon "+type+"'></xhtml:span><br>";
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

function activities(array, urlArray, resCount, performerArray){
    if(gActivities.length !== 0){
        if(layout === 'cpCentric'){
            //TODO
        }else{
            parseActivities(array, response, resCount, performerArray);
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
                gActivities = response;
                if(layout === "cpCentric") {
                    //TODO
                }else {
                    console.log("pCentric");
                    parseActivities(array, response, resCount, performerArray);

                }
            },
            error: function (xhr, ajaxOptions, thrownError) {
                alert(xhr.status + " " + thrownError);
            }
        });
    }
}

function performer(array, urlArray){
    if(gPerformer.length !== 0){
        if(layout === 'cpCentric'){
            fillPerformer(array, gPerformer['result']);
        }else{
            fillPerformer2(array, gPerformer);
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
                gPerformer = response;
                //TODO page distinction
                if(layout === "cpCentric") {
                    fillPerformer(array, response['result']);
                }else {
                    fillPerformer2(array, response);
                }
            },
            error: function (xhr, ajaxOptions, thrownError) {
                alert(xhr.status + " " + thrownError);
            }
        });
    }
}

function getName(resource){
    var name = 'n/a';
    if( 'name' in resource){
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

function getSpecialty(resource){
    var specialty = '';
    if( 'qualification' in resource){
        for(var i = 0; i < resource['qualification'].length; i++){
            specialty += resource.qualification[i].code.coding.display + ' ';
        }
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

