<?php
/**
 * Created by PhpStorm.
 * User: Maren
 * Date: 08.06.2017
 */
	if(isset($_POST['data'])){

        $response = array(
            'url' => $_POST['data'],
            'result' => ""
        );

        $result = file_get_contents("http://fhirtest.uhn.ca/baseDstu3/".$_POST['data'], false,
            stream_context_create(
                array(
                    'http' => array(
                        'ignore_errors' => true
                    )
                )
            ));
        $response['result'] = json_decode($result);

		header('Content-Type: application/json');
		echo json_encode($response);
		exit;
	}else if(!isset($_POST['urlData'])){
		echo "no data";
	}
?>