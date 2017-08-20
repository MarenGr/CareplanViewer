/**
 * Created by Maren on 18.07.2017.
 */

/**
 * Initiates parsing of data and building layout for patient centric view
 */
function makeList(){
    var data = parseDataL();
    sortData(data);
    console.log(data);
    buildList(data);
    addHoverList();
}

/**
 * Parses careplan data for patient centric view
 * @returns {{}} a preproccessed object containing cp data for p-view
 */
function parseDataL(){
    var data = {};
    var typeList = [];
    var performerArray = [];
    var activityArray = [];

    var keys = gCareplans.keys;
    for(var i in gCareplans){
        var current = gCareplans[i];

        if("activity" in current) {
            for(var j = 0; j < current["activity"].length; j++) {
                if("reference" in current.activity[j]) {
                    insertActivityReference(data, gActivities[current.activity[j].reference.reference], performerArray, typeList);
                }else{
                    var type = getActivityType(false, current.activity[j]["detail"]);
                    var icon = getGlyphicon(type[0]);
                    var index = jQuery.inArray(icon, typeList);
                    var category = getCategory(icon);
                    if (index < 0) {
                        typeList.push(icon);
                        data[category] = {"name": category, "category": icon, "children": []};
                    }
                    insertActivityDetail(data, current, i, j, category, performerArray, type[1]);
                }
            }
        }
    }
    performer(data, performerArray);
    return data;
}

/**
 * Inserts information for a specific treatment resource into the resulting data object
 * @param data              the data object the info is inserted into
 * @param resource          the treatment resource to be parsed
 * @param performerArray    a list of performer references that have yet been found
 * @param typeList          a list of treatment categories that have yet been found
 */
function insertActivityReference(data, resource, performerArray, typeList){
    var title, purpose, end, specialty, requester;

    //get Category of treatment
    var type = getActivityType(true, resource);
    var icon = getGlyphicon(type[0]);
    var index = jQuery.inArray(icon, typeList);
    var category = getCategory(icon);
    if (index < 0) {
        typeList.push(icon);
        data[category] = {"name": category, "category": icon, "children": []};
    }

    title = getActivityTitle(resource); //get treatment title

    //get treatment purpose
    purpose = "";
    if("basedOn" in resource){
        if(jQuery.type(resource.basedOn) === 'array'){
            for(var i = 0; i < resource.basedOn.length; i++) {
                purpose += getCarePlanDescription(resource.basedOn[i].reference) + " ";
            }
        }else{
            purpose = getCarePlanDescription(resource.basedOn.reference);
        }
        if(purpose.length === 0){
            if("reason" in resource){
                purpose = resource.reason.coding.display;
            }else if("reasonCode" in resource){
                purpose = resource.reasonCode.coding.display;
            }else{
                purpose = "";
            }
        }
    }else{
        if("reason" in resource){
            purpose = resource.reason.coding.display;
        }else if("reasonCode" in resource){
            purpose = resource.reasonCode.coding.display;
        }else{
            purpose = "";
        }
    }

    //get treatment period depending on resource type
    if("period" in resource) {
        end = getEnd(resource.period, "");
    }else if("occurrenceTiming" in resource){           //DevReq, ProReq
        end = getEnd("", resource.occurrenceTiming);
    }else if("occurrencePeriod"  in resource){          //DevReq, ProReq
        end = getEnd(resource.occurrencePeriod, "");
    }else if("occurrenceDateTime" in resource){          //DevReq, ProReq
        end = resource.occurrenceDateTime;
    }else if("dosageInstruction" in resource){              //MedReq
        var max;
        for(var i = 0; i < resource.dosageInstruction.length; i++) {
            if("timing" in resource.dosageInstruction[i]) {
                var temp = getEnd("", resource.dosageInstruction[i].timing);
                if(temp === "ongoing"){
                    max = temp;
                    break;
                }
                if(jQuery.type(max) === 'undefined' || Date(max) < Date(temp)){
                    max = temp;
                }
            }
        }
        end = max;
    }else if("oralDiet" in resource && "schedule" in resource.oralDiet){    //NutO
        end = getEnd("", resource.oralDiet.schedule);
    }else if("supplement" in resource){                                     //NutO
        var max;
        for(var i = 0; i < resource.supplement.length; i++) {
            if("schedule" in resource.supplement[i]) {
                var temp = getEnd("", resource.supplement[i].schedule);
                if(temp === "ongoing"){
                    max = temp;
                    break;
                }
                if(jQuery.type(max) === 'undefined' || Date(max) < Date(temp)){
                    max = temp;
                }
            }
        }
        end = max;
    }else if("enteralFormular" in resource && "administration" in resource.enteralFormular && "schedule" in resource.enteralFormular.administration[0]) {    //NutO
        end = getEnd("", resource.enteralFormular.administration[0].schedule);
    }else if("executionPeriod" in resource){                                 //Task
        end = getEnd(resource.executionPeriod, "");
    }else if("basedOn" in resource){
        if(jQuery.type(resource.basedOn) === "array") {
            if ("reference" in resource.basedOn[0]) {        //else
                end = getCarePlanEnd(resource.basedOn[0].reference);
            }
        }else{
            if ("reference" in resource.basedOn) {        //else
                end = getCarePlanEnd(resource.basedOn.reference);
            }
        }
    }else{      //if not even Careplan found
        end = "";
    }

    //get requester/performer for treatment
    if("requester" in resource) {
        requester = resource.requester.agent.reference;
    }else{
        requester = "n/a";
    }
    if(jQuery.inArray(requester, performerArray) < 0){
        performerArray.push(requester);
    }

    //get specific data with respect to supported treatment categories
    //if no category applicable, no specific information will be processed
    var specificData = [];
    switch(category){
        case "Medicine": {specificData = getMedicineData(resource); break;}
        case "Exercise": {specificData = getExerciseData(resource);break;}
        case "Diet": {specificData = getDietData(resource); break;}
        case "BloodMeasurement": case "WeightMeasurement": case "Measurement":{
            specificData = getDevData(resource); break;}
        case "Procedure": {specificData = getProcedureData(resource); break;}
        default: specificData = [];
    }

    //all gathered information is inserted into the data object into the respecting category
    data[category]['children'].push({"title": title,
        "performer": {"reference": requester},
        "end": end, "purpose": purpose, "specific": specificData});

}


/**
 * Inserts information for a specific treatment
 * when implemented as the inline definition of a care plan
 * @param data              the data object the info is inserted into
 * @param rawdata           the current care plan that is parsed
 * @param resCount          the resource counter
 * @param actIndex          the index of the treatment to be parsed
 * @param category          the category of the treatment to be parsed
 * @param performerArray    a list of performer references that have yet been found
 * @param title             the title of the treatment
 */
function insertActivityDetail(data, rawdata, resCount, actIndex, category, performerArray, title){
    var name, end, specialty, performer;

    //get purpose of the treatment (here title of care plan)
    if("title" in rawdata){
        name = rawdata["title"];
    }else{
        name = "Care Plan "+resCount;
    }

    //get period of treatment (here of care plan)
    if("period" in rawdata){
        if("end" in rawdata["period"]){
            end = rawdata["period"]["end"];
        }else{
            end = "unknown";
        }
    }else{
        end = "unknown";
    }

    //get author/requester/performer of treatment (here of care plan)
    if("author" in rawdata){
        if("specialty" in rawdata['author'][0]){
            specialty = rawdata['author'][0]['specialty'];
        }else{
            specialty = "n/a";
        }
        if("reference" in rawdata["author"][0]){
            performer = rawdata["author"][0]["reference"];
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

    //gathered info is inserted into the data object into the respecting category
    data[category]['children'].push({"title": title,
        "performer": {"reference": performer, "specialty": specialty},
        "end": end, "purpose": name, "specific": {}});

}

/**
 * Sorts the preprocessed data regarding the performer
 * @param data object that is being sorted
 */
function sortData(data){
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

/**
 * Builds the lists for each category
 * @param data the data foundation from which to build the lists/tables
 */
function buildList(data){
    //removes lists for a previous patient
    $('#res').hide();
    $('.list').remove();

    //build or show table head
    if($('.head').length === 0) {
        $('#patientCentric').append('<div class="row head">' +
            '<div class="col-sm-1"></div>' +
            '<div class="col-sm-11">' +
            '<div class="row">' +
            '<div class="col-sm-2">TITLE</div>' +
            '<div class="col-sm-2">STATUS</div>' +
            '<div class="col-sm-5">SPECIFIC DATA</div>' +
            '<div class="col-sm-1"><span class="fa fa-bullseye" style="font-size:20px;"></span> END</div>' +
            '<div class="col-sm-1"><span class="fa fa-user-md" style="font-size:20px;"></span> OWNER </div>' +
            '<div class="col-sm-1">NOTES</span></div>' +
            '</div></div></div>');
    }
    $('.head').show();

    //foundation for each category list
    var categoryElement = [
        '<div class="row list" id="', //Spot for Category
        '"><div class="col-sm-1">',  //Spot for icon
        '</div><div class="col-sm-11">',            //Spot for List of Acitivity Details
        '</div></div>'];

    //gets and sorts all categories found for the current patient history
    var categories = [];
    jQuery.each(data, function(key, value) {
        categories.push(key);
    });
    categories.sort(function(a,b){
        return getPriority(a) - getPriority(b);
    });

    //builds a list for each of the categories given
    for(var i = 0; i < categories.length; i++){
        var build = categoryElement[0];
        build += data[categories[i]]["name"]+ categoryElement[1];
        build += '<span class="'+getGlyphicon(categories[i])+' fa-3x"></span>';
        build += categoryElement[2];
        var actRows = {};
        var status = [];
        for(var j = 0; j < data[categories[i]]["children"].length; j++){
            var temp = buildActivityRow(data[categories[i]]["children"][j], data[categories[i]]["name"]);
            if(!actRows.hasOwnProperty(temp[0])){
                actRows[temp[0]] = [];
                status.push(temp[0]);
            }
            actRows[temp[0]].push(temp[1]);
        }
        //sorts the entries of the list according to the status of the treatments
        status.sort(function(a,b){
            return getOpacity(b) - getOpacity(a);
        })
        build += toString(actRows, status);
        build += categoryElement[3];
        $('#patientCentric').append(build);
    }

    //waits for all lists to be shown and enlarges bottom padding for last element of each list
    while($(".list").length !== categories.length){}
    var list = $(".list");
    var keys = [];
    jQuery.each(list, function(key, value) {
        keys.push(key);
    });
    for(var i = 0; i < keys.length; i++){
        list[keys[i]].lastChild.lastChild.attributes[1].value += 'padding-bottom: 10px;';
    }
}

/**
 * Builds the string from which to build the HTML elements for the table content of a single treatment
 * @param activity  the treatment data to be processed
 * @param category  the category of the treatment
 * @returns {[*,*]} an array containing the status of the treatment and the string of resulting HTML elements
 */
function buildActivityRow(activity, category){
    var withDetails = false;
    var opacity = 1;
    var elements;
    var status = ["active"];

    var toggable = "' data-toggable='true";
    //if status is applicable, get it, else set to 'active', get opacity factor
    if(activity["specific"].length > 0){
        withDetails = true;
        status[0] = activity.specific[0].status;
        opacity = getOpacity(status[0]);
        status.push(wrapper(getStatusIcon(status[0]), status[0] + toggable).replace('icon', 'status'));
    }

    //gets the foundation of HTML elements for a treatment entry in the list without content
    var elements = getActivityRow(category, withDetails, opacity);

    //build the list content inserting content into the string of HTML elements
    var string = '';
    string += elements[0] + ' style="background-color: rgba(255,255,255,'+(1-opacity)+');"';
    string += elements[1] + activity["purpose"] + elements[2] + activity["title"] + elements[3];
    var index = 4;
    if(withDetails) {   //fills the part of the table for specific data
        switch (category) {     //depending on the category
            case "Medicine": {
                for (var i = 0; i < activity["specific"].length; i++) {
                    string += elements[index];
                    if ("status" in activity["specific"][i]) {
                        string += status[1];
                    }
                    string += elements[index+1];
                    if ("priority" in activity["specific"][i]) {
                        string += activity["specific"][i]["priority"];
                    }
                    string += elements[index+2];
                    if ("intent" in activity["specific"][i]) {
                        string += activity["specific"][i]["intent"];
                    }
                    string += elements[index+3];
                    if ("timing" in activity["specific"][i]) {
                        string += activity["specific"][i]["timing"];
                    }
                    string += elements[index+4];
                    if ("medicine" in activity["specific"][i]) {
                        string += activity["specific"][i]["medicine"];
                    }
                    string += elements[index+5];
                    if ("dose" in activity["specific"][i]) {
                        string += activity["specific"][i]["dose"] +
                            ' (' +activity["specific"][i]["route"]+ ')';
                    }
                    string += elements[index+6];
                }
                index = index + 6 +1;
                break;
            }
            case "Procedure": {
                string += elements[index];
                if ("status" in activity["specific"][0]) {
                    string += status[1];
                }
                string += elements[index+1];
                if ("priority" in activity["specific"][0]) {
                    string += activity["specific"][0]["priority"];
                }
                string += elements[index+2];
                if ("intent" in activity["specific"][0]) {
                    string += activity["specific"][0]["intent"];
                }
                string += elements[index+3];
                if ("timing" in activity["specific"][0]) {
                    string += activity["specific"][0]["timing"];
                }
                string += elements[index+4];
                if ("procedure" in activity["specific"][0]) {
                    string += activity["specific"][0]["procedure"];
                }
                string += elements[index+5];
                index = index + 5 + 1;
                break;
            }
            case "Exercise": case "BloodMeasurement": case "WeightMeasurement": case "Measurement": {
                string += elements[index];
                if ("status" in activity["specific"][0]) {
                    string += status[1];
                }
                string += elements[index+1];
                if ("priority" in activity["specific"][0]) {
                    string += activity["specific"][0]["priority"];
                }
                string += elements[index+2];
                if ("intent" in activity["specific"][0]) {
                    string += activity["specific"][0]["intent"];
                }
                string += elements[index+3];
                if ("occurrence" in activity["specific"][0]) {
                    string += activity["specific"][0]["occurrence"];
                }
                string += elements[index+4];
                if("device" in activity["specific"][0]){
                    string += activity["specific"][0]["device"];
                }
                string += elements[index+5];
                index = index + 5 + 1;
                break;
            }
            case "Diet": {
                for (var i = 0; i < activity["specific"].length; i++) {
                    string += elements[index];
                    if ("status" in activity["specific"][i]) {
                        string += status[1];
                    }
                    string += elements[index + 1];
                    if ("texture" in activity["specific"][i]) {
                        string += activity["specific"][i]["texture"];
                    }
                    string += elements[index + 2];
                    if ("schedule" in activity["specific"][i]) {
                        string += activity["specific"][i]["schedule"];
                    }
                    string += elements[index + 3];
                    if ("type" in activity["specific"][i]) {
                        string += activity["specific"][i]["type"];
                    }
                    string += elements[index + 4];
                    if ("nutrient" in activity["specific"][i]) {
                        string += activity["specific"][i]["nutrient"];
                    } else if ("quantity" in activity["specific"][i]) {
                        string += activity["specific"][i]["quantity"];
                    }
                    string += elements[index + 5];
                }
                index = index + 5 +1;
                break;
            }
        }
    }
    string += elements[index++] + activity["end"];
    string += elements[index++] + activity["performer"]["specialty"] + elements[index++] + activity["performer"]["name"];
    string += elements[index++];
    if(withDetails && "note" in activity["specific"][0] && activity.specific[0].note.length !== 0) {
        string += parseNotes(activity["specific"][0]["note"]);
        string += elements[index++];
    }
    string += elements[index++] + elements[elements.length-1];
    return [status[0], string];
}

/**
 * Return an array of strings that represent the HTML elements for
 * a table entry depending on the treatment category
 * @param category      the category for which the elements are requested
 * @param withDetails   whether or not a table structure for specific data is necessary
 * @param opacity       the opacity of the table entry
 * @returns {[string,*,*,*,string]} the array of strings of HTML element strings
 */
function getActivityRow(category, withDetails, opacity){
    var o = ' style="opacity:'+opacity+';"'
    var all = ['<div class="row"',
                '><div class="col-sm-2 title" data-purpose="',
                '"'+o+'>',
                '</div><div class="col-sm-7 specific"'+o+'>',
                '</div><div class="col-sm-1 end"'+o+'>',
                '</div><div class="col-sm-1 performer" data-specialty="',
                '"'+o+'>',
                '</div><div class="col-sm-1 note" data-details="',
                '"'+o+'>',
                '<span class="fa fa-sticky-note-o"></span>',
                '</div></div>'];
    if(withDetails) {
        var specific = [];
        switch (category) {
            case "Medicine": {
                specific.push('<div class="row">' +
                    '<div class="col-sm-1">');
                specific.push('</div><div class="col-sm-1">');
                specific.push('</div><div class="col-sm-2">');
                specific.push('</div><div class="col-sm-3">');
                specific.push('</div><div class="col-sm-3">');
                specific.push('</div><div class="col-sm-2">');
                specific.push('</div></div>');
                break;
            }
            case "Diet": {
                specific.push('<div class="row">' +
                    '<div class="col-sm-1">');
                specific.push('</div><div class="col-sm-3">');
                specific.push('</div><div class="col-sm-3">');
                specific.push('</div><div class="col-sm-3">');
                specific.push('</div><div class="col-sm-2">');
                specific.push('</div></div>');
                break;
            }
            case "BloodMeasurement": case "WeightMeasurement": case "Measurement": case "Exercise": case "Procedure":{
                specific.push('<div class="row">' +
                    '<div class="col-sm-1">');
                specific.push('</div><div class="col-sm-1">');
                specific.push('</div><div class="col-sm-2">');
                specific.push('</div><div class="col-sm-3">');
                specific.push('</div><div class="col-sm-5">');
                specific.push('</div></div>');
                break;
            }
        }
        //table elements for specific entries is inserted into the general row elements
        for (var i = 0; i < specific.length; i++) {
            all.splice(4 + i, 0, specific[i]);
        }
    }
    return all;
}

/**
 * Adds the hover functionality for the table entries
 * title, performer, note and status
 */
function addHoverList(){
    var hover = $('#hover');

    $('.title').on("mouseover", function(){
        var current = $(this);
        var coords = current.offset();
        var details = current.data("purpose");
        if(details.length > 0){
            hover.show()
                .html(details)
                .offset({left: coords.left+200, top: coords.top-8});
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
                .offset({left: coords.left-hover.width()-20, top: coords.top-8});
        }
    });
    $('.performer').on("mouseleave", function(){
        hover.hide();
    });

    $('.note').on("mouseover", function(){
        var current = $(this);
        var coords = current.offset();
        var details = current.data("details");
        if(details.length > 0){
            hover.show()
                .html(details)
                .offset({left: coords.left-hover.width()-20, top: coords.top-8});
        }
    });
    $('.note').on("mouseleave", function(){
        hover.hide();
    });

    $('.status').on("mouseover", function(){
        var current = $(this);
        var coords = current.offset();
        var details = current.data("titles");
        if(details.length > 0){
            hover.show()
                .html(details)
                .offset({left: coords.left+30, top: coords.top - 5});
        }

    });
    $('.status').on("mouseleave", function(){
        hover.hide();
    });
}

/**
 * Parses the data about performer (practitioners),
 * filling name and specialty into the data object
 * @param data  the data object the info is inserted into
 */
function fillPerformer2(data){
    for(var i in data){
        for(var j = 0; j < data[i]["children"].length; j++){
            var current = data[i]["children"][j]["performer"];
            current["name"] = gPerformer[current["reference"]].name;
            current["specialty"] = gPerformer[current["reference"]].specialty;
        }
    }
}

/**
 * Gets the specific data for treatments of category Medicine
 * @param activity  treatment rawdata
 * @returns {Array} array of specific data to be displayed
 */
function getMedicineData(activity){
    var specific = [];
    var status, priority, intent, medicine, note = [];
    if("status" in activity){
        status = activity["status"];
    }
    if("priority" in activity){
        priority = activity["priority"];
    }
    if("intent" in activity){
        intent = activity["intent"];
    }
    if("medicationCodeableConcept" in activity){
        medicine = activity.medicationCodeableConcept.text;
    }

    if("note" in activity){
        for(var i = 0; i < activity.note.length; i++){
            note.push(activity.note[i].text);
        }
    }

    //get timing and note
    if("dosageInstruction" in activity){
        for(var p = 0; p < activity["dosageInstruction"].length; p++) {
            specific.push({"status": status, "priority": priority, "intent": intent, "medicine": medicine, "note": note});
            if("timing" in activity["dosageInstruction"][p]) {
                specific[p]["timing"] = parseSchedule(activity["dosageInstruction"][p]["timing"]);
            } else if("asNeededBoolean" in activity["dosageInstruction"][p] && activity["dosageInstruction"][p]["asNeededBoolean"]) {
                specific[p]["timing"] = "as Needed";
            } else{
                speciific[p]["timing"] = "";
            }
            if(specific[p]["timing"] === "" && "basedOn" in activity){
                specific[p]["timing"] = getCarePlanEnd(activity["basedOn"][0]["reference"]);
            }
            if("route" in activity["dosageInstruction"][p]){
                specific[p]["route"] = activity["dosageInstruction"][p]["route"]["text"];
            }
            if ("doseQuantity" in activity["dosageInstruction"][p]) {
                specific[p]["dose"] = parseQuantity(activity["dosageInstruction"][p]["doseQuantity"]);
            } else if ("doseRange" in activity["dosageInstruction"][p]) {
                specific[p]["dose"] = "Btwn "+ parseQuantity(activity["dosageInstruction"][p]["doseRange"]["low"])+
                                        " and "+ parseQuantity(activity["dosageInstruction"][p]["doseRange"]["high"]);
            } else if("rateRatio" in activity["dosageInstruction"][p]){
                var temp = activity["dosageInstruction"][p]["rateRatio"];
                specific[p]["dose"] = temp["numerator"]["value"] + temp["numerator"]["unit"] + ' / ' +
                                        temp["denominator"]["value"] + temp["denominator"]["unit"];
            }
            if("text" in activity.dosageInstruction[p]){
                specific[p]["note"].push(activity.dosageInstruction[p].text);
            }
            if("additionalInstruction" in activity.dosageInstruction[p]){
                for(var z = 0; z < activity.dosageInstruction[p].additionalInstruction.length; z++) {
                    specific[p]["note"].push(activity.dosageInstruction[p].additionalInstruction[z].text);
                }
            }
        }
    }
    return specific;
}

/**
 * Gets the specific data for treatments of category Exercise
 * @param activity  treatment rawdata
 * @returns {Array} array of specific data to be displayed
 */
function getExerciseData(activity){
    var specific = {};
    if("status" in activity){
        specific["status"] = activity["status"];
    }
    if("priority" in activity){
        specific["priority"] = activity["priority"];
    }
    if("intent" in activity){
        if(jQuery.type(activity.intent) === "string"){
            specific["intent"] = activity["intent"];
        }else {
            specific["intent"] = activity["intent"].coding[0].display;
        }
    }
    if("occurrenceDateTime" in activity){
        specific["occurrence"] = "On "+activity["occurrenceDateTime"];
    }else if("occurrencePeriod" in activity){
        specific["occurrence"] = "From "+activity.occurrencePeriod.start;
    }else if("occurrenceTiming" in activity){
        specific["occurrence"] = parseSchedule(activity["occurrenceTiming"]);
    }
    if("code" in activity){
        specific["device"] = activity.code.text;
    }else if("codeCodeableConcept" in activity){
        specific["device"] = activity.codeCodeableConcept.coding[0].display;
    }

    return [specific];
}

/**
 * Gets the specific data for treatments of category Diet
 * @param activity  treatment rawdata
 * @returns {Array} array of specific data to be displayed
 */
function getDietData(activity){
    var specific = [];
    var status, note=[];
    if("status" in activity){
        status = activity["status"];
    }
    if("foodPreferenceModifier" in activity){
        note.push("foodPreference:",[])
        for(var i = 0; i < activity.foodPreferenceModifier.length; i++){
            note[note.length-1].push(activity.foodPreferenceModifier[i].text);
        }
    }
    if("excludeFoodModifier" in activity){
        note.push("excludeFood:",[])
        for(var i = 0; i < activity.excludeFoodModifier.length; i++){
            note[note.length-1].push(activity.excludeFoodModifier[i].text);
        }
    }
    if("oralDiet" in activity){
        specific.push({"status": status, "note": note});
        if("type" in activity["oralDiet"]){
            specific[0]["type"] = activity["oralDiet"]["type"][0].text;
        }
        if("schedule" in activity["oralDiet"]){
            specific[0]["schedule"] = parseSchedule(activity["oralDiet"]["schedule"]);
        }
        if("nutrient" in activity["oralDiet"]){
            var nutrientList = "";
            var nutrients = activity["oralDiet"]["nutrient"];
            for(var i = 0; i < nutrients.length; i++){
                var string = "";
                if("amount" in nutrients[i] && "modifier" in nutrients[i]){
                    string += nutrients[i]["amount"]["value"] + nutrients[i]["amount"]["value"]+ " of ";
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
        for(var p = 0; p < activity.supplement.length; p++) {
            specific.push({"status": status, "note": note});
            if ("productName" in activity["supplement"][p]) {
                specific[index]["type"] = activity["supplement"][p]["productName"];
            } else if ("type" in activity["supplement"][p]) {
                specific[index]["type"] = activity["supplement"][p]["type"]["coding"][0]["display"];
            }
            if ("schedule" in activity["supplement"][p]) {
                specific[index]["schedule"] = parseSchedule(activity["supplement"][p]["schedule"]);
            }
            if ("quantity" in activity["supplement"][p]) {
                specific[index]["quantity"] = parseQuantity(activity["supplement"][p]["quantity"]);
            }
        }
    }
    if("enteralFormular" in activity){
        var index = specific.length;
        specific.push({"status": status, "note": note});
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

/**
 * Gets the specific data for treatments of category Measurement,
 * Blood Measurement and Weight Measurement (from resource DeviceRequest)
 * @param activity  treatment rawdata
 * @returns {Array} array of specific data to be displayed
 */
function getDevData(activity){
    var specific = {};
    if("status" in activity){
        specific["status"] = activity["status"];
    }
    if("priority" in activity){
        specific["priority"] = activity["priority"];
    }
    if("intent" in activity){
        specific["intent"] = activity["intent"]["coding"][0]["code"];
    }
    if("occurrenceDateTime" in activity){
        specific["occurrence"] = "On " +activity["occurrenceDateTime"];
    }else if("occurrencePeriod" in activity){
        specific["occurrence"] = "From "+activity["occurrencePeriod"]["start"];
    }else if("occurrenceTiming" in activity){
        specific["occurrence"] = parseSchedule(activity["occurrenceTiming"]);
    }
    if("codeCodeableConcept" in activity){
        specific["device"] = activity["codeCodeableConcept"]["coding"][0]["display"];
    }
    return [specific];
}

/**
 * Gets the specific data for treatments of category Procedure
 * @param activity  treatment rawdata
 * @returns {Array} array of specific data to be displayed
 */
function getProcedureData(activity){
    var specific = [];
    var status, priority, intent, procedure, timing;
    if("status" in activity){
        status = activity["status"];
    }
    if("priority" in activity){
        priority = activity["priority"];
    }
    if("intent" in activity){
        intent = activity["intent"];
    }
    if("code" in activity){
        procedure = activity.code.text;
    }
    if("occurrenceTiming" in activity){
        timing = parseSchedule(activity["occurrenceTiming"]);
    }else if("occurrencePeriod" in activity){
        timing = "From " + activity["occurrencePeriod"]["start"];
    }else if("occurrenceDateTime" in activity){
        timing = "On " + activity["occurrenceDateTime"];
    }
    specific.push({"status": status, "priority": priority, "intent": intent, "procedure": procedure, "timing": timing});
    return specific;
}

/**
 * Parses the timing information (FHIR definition of Timing (data type))
 * @param schedule      the timing rawdata
 * @returns {string}    the displayed timing string
 */
function parseSchedule(schedule){
    if(jQuery.type(schedule) === "object"){
        schedule = [schedule];
    }
    var string = "";
    for(var i = 0; i < schedule.length; i++){
        if("repeat" in schedule[i]){
            if("boundsPeriod" in schedule[i].repeat){               //1994-11-12 - ongoing:
                string += "From "+schedule[i].repeat.boundsPeriod.start +": ";
                /*if("end" in schedule[i].repeat.boundsPeriod){
                    string += schedule[i].repeat.boundsPeriod.end +": ";
                }else{
                    string += "ongoing: ";
                }*/
            }else if("boundsDuration" in schedule[i].repeat){
                string += "For "+schedule[i].repeat.boundsDuration.value+" "+schedule[i].repeat.boundsDuration.unit+":"; //For 4 weeks:
            }
        }
        if("code" in schedule[i]){
            string += schedule[i].code.text;
            if("repeat" in schedule[i]){
                if("timeOfDay" in schedule[i].repeat){
                    var temp = '';
                    for(var q = 0; q < schedule[i].repeat.timeOfDay.length; q++){
                        temp += schedule[i].repeat.timeOfDay[q] +', ';
                    }
                    temp = temp.substring(0, temp.length-2);
                    string = string.replace("institution specified times", temp);
                }
            }
        }else{
            if("repeat" in schedule[i] && "frequency" in schedule[i]["repeat"]){
                string += schedule[i].repeat.frequency +" time(s) per "+ schedule[i].repeat.period+schedule[i].repeat.periodUnit; //2 times per 1d
            }
        }
        string += "<br>";
    }
    return string.substring(0, string.length-4) //-<br>
}

/**
 * Parses the quantity information (FHIR definition of Quantity (data type))
 * @param quantity  the quantity rawdata
 * @returns {*}     the displayed quantity string
 */
function parseQuantity(quantity){
    return quantity.value + quantity.unit;
}
