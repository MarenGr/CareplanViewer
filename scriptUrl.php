<?php
	
	if(isset($_POST['data'])){
        /*$input = array();
        parse_str($_POST['data'], $input);
        echo $input['data'];*/
        $response = array(
            'url' => $_POST['data'],
            'result' => ""
        );

        //TODO sort bundle automatically by performer --> url input (What happens for no performer?)
        $result = file_get_contents($_POST['data'], false,
            stream_context_create(
                array(
                    'http' => array(
                        'ignore_errors' => true
                    )
                )
            ));
        //$result = file_get_contents("careplanBundleTest.json");
        //$result = file_get_contents("appointment.json");
        $response['result'] = json_decode($result);


		//$response = $result;
		
		header('Content-Type: application/json');
		echo json_encode($response);
		//echo $response;
		exit;
	}else if(!isset($_POST['urlData'])){
		echo "no data";
	}
?>