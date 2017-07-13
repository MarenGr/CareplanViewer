function displayPatientInfo(patient){
    var name = getNameP(patient);
    $("#name").html(name);
    $("#birthdate").html(" "+patient['birthDate']);
    $("#gender").html(" "+patient['gender']);
    $("#phone").html(" "+patient['telecom'][0]['value']);
}

function getNameP(patient){
    if("name" in patient){
        for(var i = 0; i < patient['name'].length; i++){
            if(patient['name'][i]['use'] == "official"){
                if('display' in patient['name'][i]){
                    return patient['name'][i]['display'];
                }else {
                    return patient['name'][i]['given'][0] +" "+ patient['name'][i]['family'];
                }
            }
        }
        return '"John Doe"';

    }else{
        return '"John Doe"';
    }
}