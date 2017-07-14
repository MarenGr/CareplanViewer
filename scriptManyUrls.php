<?php
/**
 * Created by PhpStorm.
 * User: Maren
 * Date: 14.07.2017
 * Time: 19:51
 */

	if(isset($_POST['data'])){
	    /*echo $_POST['data'];
        $input = array();
        /*parse_str($_POST['data'], $input);
        /*echo $input['data'];*/
        $response = array(
            'url' => $_POST['data'],
            'result' => ""
        );

        foreach ($_POST['data'] as $key => $value) {
            if($value == "n/a"){
                $response['result'][] = "n/a";
            }else {
                $result = file_get_contents("http://fhirtest.uhn.ca/baseDstu3/".$value, false,
                    stream_context_create(
                        array(
                            'http' => array(
                                'ignore_errors' => true
                            )
                        )
                    ));
                $response['result'][] = json_decode($result);
            }
        }
        unset($value);


        //$result = file_get_contents("careplanBundleTest.json");
        //$result = file_get_contents("appointment.json");



        //$response = $result;

        header('Content-Type: application/json');
        echo json_encode($response);
        //echo $response;
        exit;
    }else if(!isset($_POST['urlData'])){
        echo "no data";
    }
?>